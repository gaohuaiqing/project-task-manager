/**
 * system_logs 表分区初始化
 * 按时间维度为日志表添加分区策略，提升查询性能和数据管理能力
 */

import { databaseService } from './DatabaseService.js';

/**
 * 检查表是否已分区
 */
async function isTablePartitioned(tableName: string): Promise<boolean> {
  const connection = await databaseService.getConnection();

  try {
    const [result] = await connection.query(`
      SELECT PARTITION_NAME
      FROM INFORMATION_SCHEMA.PARTITIONS
      WHERE TABLE_SCHEMA = 'task_manager'
      AND TABLE_NAME = ?
      AND PARTITION_NAME IS NOT NULL
      LIMIT 1
    `, [tableName]) as any[];

    return result && result.length > 0;
  } finally {
    connection.release();
  }
}

/**
 * 为 system_logs 表创建 RANGE 分区（按月分区）
 */
async function createMonthlyPartitions(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 首先需要删除主键（因为分区键必须是主键的一部分）
    try {
      await connection.query(`ALTER TABLE system_logs DROP PRIMARY KEY`);
      console.log('[LogPartitioning] 已删除旧的主键');
    } catch (e) {
      // 主键可能已不存在，继续
    }

    // 添加新的复合主键（包含分区键）
    try {
      await connection.query(`ALTER TABLE system_logs ADD PRIMARY KEY (log_id, created_at)`);
      console.log('[LogPartitioning] 已添加新的复合主键 (log_id, created_at)');
    } catch (e) {
      // 主键可能已存在，继续
    }

    // 删除旧的分区（如果存在）
    try {
      await connection.query(`ALTER TABLE system_logs REMOVE PARTITIONING`);
      console.log('[LogPartitioning] 已删除旧的分区');
    } catch (e) {
      // 表可能未分区，继续
    }

    // 创建分区（当前季度 + 下一个季度）
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    // 计算分区边界
    const partitions = [];

    // 历史数据分区（保留过去3个月的数据在一个分区）
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
    partitions.push({
      name: 'p_history',
      value: `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}01`
    });

    // 当前季度的月份分区
    for (let i = 0; i < 3; i++) {
      const month = (currentQuarter - 1) * 3 + i + 1;
      const year = currentYear;
      const nextMonth = month + 1;
      const nextYear = nextMonth > 12 ? year + 1 : year;
      const normalizedNextMonth = nextMonth > 12 ? 1 : nextMonth;

      partitions.push({
        name: `p_${year}${String(month).padStart(2, '0')}`,
        value: `${nextYear}${String(normalizedNextMonth).padStart(2, '0')}01`
      });
    }

    // 未来分区（下个季度）
    const nextQuarter = currentQuarter + 1;
    if (nextQuarter <= 4) {
      for (let i = 0; i < 3; i++) {
        const month = (nextQuarter - 1) * 3 + i + 1;
        const year = currentYear;
        const nextMonth = month + 1;
        const nextYear = nextMonth > 12 ? year + 1 : year;
        const normalizedNextMonth = nextMonth > 12 ? 1 : nextMonth;

        partitions.push({
          name: `p_${year}${String(month).padStart(2, '0')}`,
          value: `${nextYear}${String(normalizedNextMonth).padStart(2, '0')}01`
        });
      }
    }

    // 添加未来分区（MAXVALUE）
    partitions.push({
      name: 'p_future',
      value: 'MAXVALUE'
    });

    // 构建 ALTER TABLE 语句
    let partitionSql = `ALTER TABLE system_logs PARTITION BY RANGE (TO_DAYS(created_at)) (`;
    const partitionDefs = partitions.map(p => {
      if (p.value === 'MAXVALUE') {
        return `PARTITION ${p.name} VALUES LESS THAN MAXVALUE`;
      }
      return `PARTITION ${p.name} VALUES LESS THAN TO_DAYS('${p.value}')`;
    });
    partitionSql += partitionDefs.join(',\n  ');
    partitionSql += ')';

    await connection.query(partitionSql);
    console.log('[LogPartitioning] ✅ 分区创建成功');
    console.log(`[LogPartitioning] 已创建 ${partitions.length} 个分区`);

  } finally {
    connection.release();
  }
}

/**
 * 创建自动管理未来分区的存储过程
 */
async function createPartitionManagementProcedure(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的存储过程
    await connection.query(`DROP PROCEDURE IF EXISTS ManageLogPartitions`);

    // 创建存储过程（每月自动添加新分区，删除旧分区）
    await connection.query(`
      CREATE PROCEDURE ManageLogPartitions()
      BEGIN
        DECLARE current_date_str VARCHAR(8);
        DECLARE next_month_str VARCHAR(8);
        DECLARE partition_name VARCHAR(20);
        DECLARE old_partition_name VARCHAR(20);

        -- 获取下个月的第一天
        SET next_month_str = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 2 MONTH), '%Y%m01');

        -- 检查是否需要添加新分区
        SET @partition_exists = (
          SELECT COUNT(*)
          FROM INFORMATION_SCHEMA.PARTITIONS
          WHERE TABLE_SCHEMA = 'task_manager'
          AND TABLE_NAME = 'system_logs'
          AND PARTITION_NAME = CONCAT('p_', DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y%m'))
        );

        IF @partition_exists = 0 THEN
          -- 添加下个月的分区
          SET partition_name = CONCAT('p_', DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y%m'));
          SET @sql = CONCAT(
            'ALTER TABLE system_logs REORGANIZE PARTITION p_future INTO (',
            'PARTITION ', partition_name, ' VALUES LESS THAN TO_DAYS(''', next_month_str, '''),',
            'PARTITION p_future VALUES LESS THAN MAXVALUE)'
          );
          PREPARE stmt FROM @sql;
          EXECUTE stmt;
          DEALLOCATE PREPARE stmt;

          INSERT INTO system_logs (log_id, log_level, log_type, message, created_at)
          VALUES (UUID(), 'INFO', 'SYSTEM', CONCAT('自动添加日志分区: ', partition_name), NOW());
        END IF;

        -- 可选：删除3个月前的历史分区（根据需求调整）
        -- SET old_partition_name = CONCAT('p_', DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 MONTH), '%Y%m'));
        -- SET @sql = CONCAT('ALTER TABLE system_logs DROP PARTITION ', old_partition_name);
        -- PREPARE stmt FROM @sql;
        -- EXECUTE stmt;
        -- DEALLOCATE PREPARE stmt;
      END
    `);

    console.log('[LogPartitioning] 分区管理存储过程已创建');
  } finally {
    connection.release();
  }
}

/**
 * 创建定时事件（每月执行分区管理）
 */
async function createPartitionManagementEvent(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 确保事件调度器已开启
    await connection.query(`SET GLOBAL event_scheduler = ON`);

    // 删除旧事件
    await connection.query(`DROP EVENT IF EXISTS evt_manage_log_partitions`);

    // 创建定时事件（每月1号凌晨执行）
    await connection.query(`
      CREATE EVENT evt_manage_log_partitions
      ON SCHEDULE EVERY 1 MONTH
      STARTS DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01 02:00:00')
      DO
        CALL ManageLogPartitions()
    `);

    console.log('[LogPartitioning] 分区管理定时事件已创建（每月1号凌晨执行）');
  } finally {
    connection.release();
  }
}

/**
 * 初始化日志表分区
 */
export async function initLogPartitioning(): Promise<void> {
  try {
    console.log('[LogPartitioning] 开始初始化日志表分区...');

    // 检查表是否已分区
    const isPartitioned = await isTablePartitioned('system_logs');

    if (isPartitioned) {
      console.log('[LogPartitioning] system_logs 表已分区，跳过初始化');
      return;
    }

    // 创建分区
    await createMonthlyPartitions();

    // 创建分区管理存储过程
    await createPartitionManagementProcedure();

    // 创建分区管理定时事件
    await createPartitionManagementEvent();

    console.log('[LogPartitioning] ✅ 日志表分区初始化成功');
  } catch (error) {
    console.error('[LogPartitioning] ❌ 初始化失败:', error);
    throw error;
  }
}
