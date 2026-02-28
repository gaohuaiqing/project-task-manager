/**
 * 数据库优化迁移脚本 - TypeScript版本
 *
 * 版本: 003
 * 目标: 优化同步机制和性能
 * 日期: 2026-02-18
 *
 * 运行方式:
 *   npx tsx migrations/003_optimize_sync_and_performance.ts
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
}

class DatabaseMigration {
  private connection: mysql.Connection | null = null;
  private dbConfig: mysql.ConnectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    multipleStatements: true,
  };

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection(this.dbConfig);
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ 数据库连接已关闭');
    }
  }

  /**
   * 执行SQL语句
   */
  async execute(sql: string, params?: any[]): Promise<MigrationResult> {
    try {
      if (!this.connection) {
        throw new Error('数据库未连接');
      }

      console.log(`\n执行SQL: ${sql.substring(0, 100)}...`);

      const [result] = await this.connection.execute(sql, params);

      return {
        success: true,
        message: 'SQL执行成功',
        details: result,
      };
    } catch (error: any) {
      // 忽略"已存在"错误
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1061) {
        console.log('⚠️  对象已存在，跳过');
        return {
          success: true,
          message: '对象已存在',
        };
      }

      console.error('❌ SQL执行失败:', error.message);
      return {
        success: false,
        message: error.message,
        details: error,
      };
    }
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('数据库未连接');
    }

    const [rows] = await this.connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [this.dbConfig.database, tableName]
    );

    const result = rows as any[];
    return result[0].count > 0;
  }

  /**
   * 检查列是否存在
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('数据库未连接');
    }

    const [rows] = await this.connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [this.dbConfig.database, tableName, columnName]
    );

    const result = rows as any[];
    return result[0].count > 0;
  }

  /**
   * 添加列（如果不存在）
   */
  async addColumnIfNotExists(
    tableName: string,
    columnName: string,
    definition: string
  ): Promise<MigrationResult> {
    const exists = await this.columnExists(tableName, columnName);

    if (exists) {
      console.log(`⏭️  列 ${tableName}.${columnName} 已存在，跳过`);
      return { success: true, message: '列已存在' };
    }

    return await this.execute(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
    );
  }

  /**
   * 创建表（如果不存在）
   */
  async createTableIfNotExists(
    tableName: string,
    createSql: string
  ): Promise<MigrationResult> {
    const exists = await this.tableExists(tableName);

    if (exists) {
      console.log(`⏭️  表 ${tableName} 已存在，跳过`);
      return { success: true, message: '表已存在' };
    }

    return await this.execute(createSql);
  }

  /**
   * 运行迁移
   */
  async run(): Promise<void> {
    console.log('========================================');
    console.log('数据库优化迁移 - 开始');
    console.log('========================================');

    await this.connect();

    try {
      // 第一部分: 全局数据表优化
      console.log('\n📊 第一部分: 全局数据表优化');
      await this.migrateGlobalDataTable();

      // 第二部分: 节假日表
      console.log('\n📅 第二部分: 节假日表');
      await this.migrateHolidays();

      // 第三部分: 数据同步状态表
      console.log('\n🔄 第三部分: 数据同步状态表');
      await this.migrateSyncStatus();

      // 第四部分: 增量同步支持表
      console.log('\n⚡ 第四部分: 增量同步支持表');
      await this.migrateIncrementalSync();

      // 第五部分: WBS任务表优化
      console.log('\n📋 第五部分: WBS任务表优化');
      await this.migrateWbsTasks();

      // 第六部分: 视图和存储过程
      console.log('\n🔧 第六部分: 视图和存储过程');
      await this.migrateViewsAndProcedures();

      // 第七部分: 触发器
      console.log('\n⚙️  第七部分: 触发器');
      await this.migrateTriggers();

      // 第八部分: 初始化数据
      console.log('\n📝 第八部分: 初始化数据');
      await this.initializeData();

      console.log('\n========================================');
      console.log('✅ 数据库优化迁移完成！');
      console.log('========================================');
    } catch (error) {
      console.error('\n❌ 迁移失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * 迁移全局数据表
   */
  private async migrateGlobalDataTable(): Promise<void> {
    // 添加数据指纹列
    await this.addColumnIfNotExists(
      'global_data',
      'fingerprint',
      "CHAR(64) AS (SHA2(JSON_EXTRACT(data_json, '$'), 256)) STORED COMMENT '数据指纹（SHA-256）'"
    );

    // 添加数据大小列
    await this.addColumnIfNotExists(
      'global_data',
      'data_size',
      "INT UNSIGNED AS (JSON_LENGTH(data_json)) STORED COMMENT '数据大小（字节）'"
    );

    // 添加压缩列
    await this.addColumnIfNotExists(
      'global_data',
      'compressed',
      'LONGBLOB NULL COMMENT "压缩数据（大于10KB时启用）"'
    );

    await this.addColumnIfNotExists(
      'global_data',
      'is_compressed',
      'BOOLEAN DEFAULT FALSE COMMENT "是否已压缩"'
    );

    // 添加索引
    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_fingerprint ON global_data(fingerprint(8))'
    );

    // 添加版本信息列
    await this.addColumnIfNotExists(
      'global_data',
      'last_modified_by',
      'INT NULL COMMENT "最后修改者ID"'
    );

    await this.addColumnIfNotExists(
      'global_data',
      'last_modified_at',
      'TIMESTAMP NULL COMMENT "最后修改时间"'
    );

    console.log('✅ 全局数据表优化完成');
  }

  /**
   * 迁移节假日表
   */
  private async migrateHolidays(): Promise<void> {
    const holidaysTableSql = `
      CREATE TABLE holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL COMMENT '节假日名称',
        holiday_date DATE NOT NULL COMMENT '节假日日期',
        end_date DATE NULL COMMENT '结束日期（NULL表示单日）',
        is_range BOOLEAN DEFAULT FALSE COMMENT '是否为日期范围',
        description TEXT COMMENT '节假日描述',
        year INT NOT NULL COMMENT '年份（用于快速查询）',
        month TINYINT NOT NULL COMMENT '月份（1-12）',
        day TINYINT NOT NULL COMMENT '日期（1-31）',
        version INT DEFAULT 1 COMMENT '版本号',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_date (holiday_date),
        INDEX idx_year_month (year, month),
        INDEX idx_range (holiday_date, end_date),
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      PARTITION BY RANGE (year) (
        PARTITION p_2024 VALUES LESS THAN (2025),
        PARTITION p_2025 VALUES LESS THAN (2026),
        PARTITION p_2026 VALUES LESS THAN (2027),
        PARTITION p_future VALUES LESS THAN MAXVALUE
      )
    `;

    await this.createTableIfNotExists('holidays', holidaysTableSql);

    const holidayChangeLogSql = `
      CREATE TABLE holiday_change_log (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        holiday_id INT NOT NULL,
        action ENUM('create', 'update', 'delete') NOT NULL,
        old_value JSON,
        new_value JSON,
        changed_by INT NOT NULL,
        change_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_holiday_id (holiday_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (holiday_id) REFERENCES holidays(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.createTableIfNotExists('holiday_change_log', holidayChangeLogSql);

    // 迁移现有节假日数据
    await this.execute(`
      INSERT IGNORE INTO holidays (name, holiday_date, end_date, is_range, description, year, month, day, created_by)
      SELECT
          JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.name')),
          STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d'),
          CASE
              WHEN JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.type')) = 'range'
              THEN STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.endDate')), '%Y-%m-%d')
              ELSE NULL
          END,
          JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.type')) = 'range',
          JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.description')),
          YEAR(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
          MONTH(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
          DAY(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
          1
      FROM global_data
      WHERE data_type = 'holidays'
    `);

    console.log('✅ 节假日表迁移完成');
  }

  /**
   * 迁移同步状态表
   */
  private async migrateSyncStatus(): Promise<void> {
    const clientSyncStatusSql = `
      CREATE TABLE client_sync_status (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL COMMENT '设备唯一标识',
        session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
        data_type VARCHAR(50) NOT NULL COMMENT '数据类型',
        last_sync_version INT DEFAULT 0 COMMENT '最后同步的版本号',
        last_sync_time TIMESTAMP NULL COMMENT '最后同步时间',
        pending_changes INT DEFAULT 0 COMMENT '待同步变更数量',
        client_fingerprint CHAR(64) NULL COMMENT '客户端数据指纹',
        is_offline BOOLEAN DEFAULT FALSE COMMENT '是否离线',
        last_online_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后在线时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_device_type (user_id, device_id, data_type),
        INDEX idx_user_id (user_id),
        INDEX idx_last_sync_time (last_sync_time),
        INDEX idx_pending_changes (pending_changes),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.createTableIfNotExists('client_sync_status', clientSyncStatusSql);

    const offlineOperationQueueSql = `
      CREATE TABLE offline_operation_queue (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        operation_id VARCHAR(255) UNIQUE NOT NULL,
        operation_type ENUM('create', 'update', 'delete') NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        data_id VARCHAR(255) NOT NULL,
        data_json JSON NOT NULL,
        expected_version INT NULL,
        status ENUM('pending', 'conflict', 'failed', 'synced') DEFAULT 'pending',
        retry_count INT DEFAULT 0,
        error_message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        synced_at TIMESTAMP NULL,
        INDEX idx_user_device (user_id, device_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.createTableIfNotExists('offline_operation_queue', offlineOperationQueueSql);

    console.log('✅ 同步状态表迁移完成');
  }

  /**
   * 迁移增量同步支持表
   */
  private async migrateIncrementalSync(): Promise<void> {
    const dataChangeEventsSql = `
      CREATE TABLE data_change_events (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        event_id CHAR(36) NOT NULL COMMENT '唯一事件ID（UUID）',
        data_type VARCHAR(50) NOT NULL,
        data_id VARCHAR(255) NOT NULL,
        action ENUM('create', 'update', 'delete') NOT NULL,
        data_version INT NOT NULL COMMENT '数据版本号',
        data_snapshot JSON NULL COMMENT '数据快照（用于冲突解决）',
        fingerprint CHAR(64) NOT NULL COMMENT '数据指纹',
        changed_by INT NOT NULL,
        change_reason VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_count INT DEFAULT 0 COMMENT '已处理的客户端数量',
        UNIQUE KEY uk_event_id (event_id),
        INDEX idx_data_type_id (data_type, data_id),
        INDEX idx_created_at (created_at),
        INDEX idx_data_type_created (data_type, created_at),
        INDEX idx_fingerprint (fingerprint(8)),
        FOREIGN KEY (changed_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
        PARTITION p_7days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 7 DAY))),
        PARTITION p_30days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 30 DAY))),
        PARTITION p_90days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 90 DAY))),
        PARTITION p_future VALUES LESS THAN MAXVALUE
      )
    `;

    await this.createTableIfNotExists('data_change_events', dataChangeEventsSql);

    const clientEventTrackingSql = `
      CREATE TABLE client_event_tracking (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        event_id CHAR(36) NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_device_event (user_id, device_id, event_id),
        INDEX idx_user_device (user_id, device_id),
        INDEX idx_event_id (event_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES data_change_events(event_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.createTableIfNotExists('client_event_tracking', clientEventTrackingSql);

    console.log('✅ 增量同步支持表迁移完成');
  }

  /**
   * 迁移WBS任务表
   */
  private async migrateWbsTasks(): Promise<void> {
    // 添加完整路径生成列
    await this.addColumnIfNotExists(
      'wbs_tasks',
      'full_path',
      `VARCHAR(500) GENERATED ALWAYS AS (
        CONCAT(
          COALESCE((SELECT CONCAT(task_code, '.') FROM wbs_tasks parent WHERE parent.id = wbs_tasks.parent_id), ''),
          task_code
        )
      ) STORED COMMENT '完整WBS路径'`
    );

    // 添加优化索引
    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_full_path ON wbs_tasks(full_path)'
    );

    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_assignee_status ON wbs_tasks(assignee_id, status)'
    );

    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_dates ON wbs_tasks(planned_start_date, planned_end_date)'
    );

    await this.execute(
      'CREATE INDEX IF NOT EXISTS idx_project_status ON wbs_tasks(project_id, status)'
    );

    // 创建任务依赖关系表
    const taskDependenciesSql = `
      CREATE TABLE wbs_task_dependencies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        predecessor_id INT NOT NULL COMMENT '前置任务ID',
        successor_id INT NOT NULL COMMENT '后置任务ID',
        dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
        lag_days INT DEFAULT 0 COMMENT '延后天数',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_predecessor_successor (predecessor_id, successor_id),
        INDEX idx_predecessor (predecessor_id),
        INDEX idx_successor (successor_id),
        FOREIGN KEY (predecessor_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (successor_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.createTableIfNotExists('wbs_task_dependencies', taskDependenciesSql);

    console.log('✅ WBS任务表优化完成');
  }

  /**
   * 迁移视图和存储过程
   */
  private async migrateViewsAndProcedures(): Promise<void> {
    // 创建数据指纹视图
    await this.execute(`
      CREATE OR REPLACE VIEW v_data_fingerprints AS
      SELECT
          data_type,
          data_id,
          fingerprint,
          version,
          updated_at,
          data_size
      FROM global_data
      WHERE updated_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // 创建同步状态视图
    await this.execute(`
      CREATE OR REPLACE VIEW v_sync_status AS
      SELECT
          css.user_id,
          u.username,
          css.data_type,
          css.last_sync_version,
          css.last_sync_time,
          css.pending_changes,
          css.is_offline,
          CASE
              WHEN css.last_sync_time < DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'stale'
              WHEN css.pending_changes > 10 THEN 'lagging'
              ELSE 'synced'
          END AS sync_health
      FROM client_sync_status css
      JOIN users u ON css.user_id = u.id
    `);

    // 创建存储过程
    await this.execute(`
      CREATE PROCEDURE IF NOT EXISTS sp_cleanup_old_events(IN days_to_keep INT)
      BEGIN
          DECLARE deleted_count INT;

          DELETE FROM data_change_events
          WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

          SET deleted_count = ROW_COUNT();

          DELETE FROM client_event_tracking
          WHERE event_id NOT IN (SELECT event_id FROM data_change_events);

          SELECT CONCAT('已删除 ', deleted_count, ' 条旧事件记录') AS result;
      END
    `);

    await this.execute(`
      CREATE PROCEDURE IF NOT EXISTS sp_compress_large_data(IN size_threshold INT)
      BEGIN
          DECLARE updated_count INT DEFAULT 0;

          UPDATE global_data
          SET
              compressed = COMPRESS(data_json),
              is_compressed = TRUE
          WHERE
              data_size > size_threshold
              AND is_compressed = FALSE;

          SET updated_count = ROW_COUNT();

          SELECT CONCAT('已压缩 ', updated_count, ' 条数据') AS result;
      END
    `);

    await this.execute(`
      CREATE PROCEDURE IF NOT EXISTS sp_get_sync_summary(IN user_id_param INT)
      BEGIN
          SELECT
              data_type,
              COUNT(*) AS total_records,
              SUM(CASE WHEN last_sync_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) AS synced_count,
              SUM(pending_changes) AS total_pending,
              MAX(last_sync_time) AS last_sync_time
          FROM client_sync_status
          WHERE user_id = user_id_param
          GROUP BY data_type;
      END
    `);

    console.log('✅ 视图和存储过程迁移完成');
  }

  /**
   * 迁移触发器
   */
  private async migrateTriggers(): Promise<void> {
    // 全局数据变更触发器
    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_global_data_after_insert
      AFTER INSERT ON global_data
      FOR EACH ROW
      BEGIN
          INSERT INTO data_change_events (
              event_id, data_type, data_id, action,
              data_version, data_snapshot, fingerprint,
              changed_by, created_at
          ) VALUES (
              UUID(), NEW.data_type, NEW.data_id, 'create',
              NEW.version, NEW.data_json, NEW.fingerprint,
              NEW.created_by, NOW()
          );
      END
    `);

    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_global_data_after_update
      AFTER UPDATE ON global_data
      FOR EACH ROW
      BEGIN
          IF OLD.data_json != NEW.data_json OR OLD.fingerprint != NEW.fingerprint THEN
              INSERT INTO data_change_events (
                  event_id, data_type, data_id, action,
                  data_version, data_snapshot, fingerprint,
                  changed_by, created_at
              ) VALUES (
                  UUID(), NEW.data_type, NEW.data_id, 'update',
                  NEW.version, NEW.data_json, NEW.fingerprint,
                  NEW.updated_by, NOW()
              );
          END IF;
      END
    `);

    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_global_data_after_delete
      AFTER DELETE ON global_data
      FOR EACH ROW
      BEGIN
          INSERT INTO data_change_events (
              event_id, data_type, data_id, action,
              data_version, data_snapshot, fingerprint,
              changed_by, created_at
          ) VALUES (
              UUID(), OLD.data_type, OLD.data_id, 'delete',
              OLD.version, OLD.data_json, OLD.fingerprint,
              OLD.updated_by, NOW()
          );
      END
    `);

    // 节假日变更触发器
    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_holidays_after_insert
      AFTER INSERT ON holidays
      FOR EACH ROW
      BEGIN
          INSERT INTO holiday_change_log (
              holiday_id, action, new_value, changed_by
          ) VALUES (
              NEW.id, 'create',
              JSON_OBJECT('name', NEW.name, 'date', NEW.holiday_date,
                         'endDate', NEW.end_date, 'description', NEW.description),
              NEW.created_by
          );
      END
    `);

    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_holidays_after_update
      AFTER UPDATE ON holidays
      FOR EACH ROW
      BEGIN
          INSERT INTO holiday_change_log (
              holiday_id, action, old_value, new_value, changed_by
          ) VALUES (
              NEW.id, 'update',
              JSON_OBJECT('name', OLD.name, 'date', OLD.holiday_date,
                         'endDate', OLD.end_date, 'description', OLD.description),
              JSON_OBJECT('name', NEW.name, 'date', NEW.holiday_date,
                         'endDate', NEW.end_date, 'description', NEW.description),
              NEW.created_by
          );
      END
    `);

    await this.execute(`
      CREATE TRIGGER IF NOT EXISTS tr_holidays_after_delete
      AFTER DELETE ON holidays
      FOR EACH ROW
      BEGIN
          INSERT INTO holiday_change_log (
              holiday_id, action, old_value, changed_by
          ) VALUES (
              OLD.id, 'delete',
              JSON_OBJECT('name', OLD.name, 'date', OLD.holiday_date,
                         'endDate', OLD.end_date, 'description', OLD.description),
              OLD.created_by
          );
      END
    `);

    console.log('✅ 触发器迁移完成');
  }

  /**
   * 初始化数据
   */
  private async initializeData(): Promise<void> {
    // 初始化默认节假日
    const holidays = [
      { name: '元旦', date: '2026-01-01', endDate: null, description: '元旦节' },
      { name: '春节', date: '2026-02-10', endDate: '2026-02-17', description: '春节假期' },
      { name: '清明节', date: '2026-04-04', endDate: '2026-04-06', description: '清明节假期' },
      { name: '劳动节', date: '2026-05-01', endDate: '2026-05-03', description: '劳动节假期' },
      { name: '端午节', date: '2026-06-09', endDate: '2026-06-11', description: '端午节假期' },
      { name: '国庆节', date: '2026-10-01', endDate: '2026-10-07', description: '国庆节假期' },
    ];

    for (const holiday of holidays) {
      const [dateParts] = holiday.date.split('-');
      const year = parseInt(dateParts);

      await this.execute(
        `INSERT IGNORE INTO holidays
         (name, holiday_date, end_date, is_range, description, year, month, day, created_by)
         VALUES (?, ?, ?, ?, ?, ?, MONTH(?), DAY(?), 1)`,
        [
          holiday.name,
          holiday.date,
          holiday.endDate,
          holiday.endDate !== null,
          holiday.description,
          year,
          holiday.date,
          holiday.date,
        ]
      );
    }

    console.log('✅ 初始化数据完成');
  }
}

// 运行迁移
async function main() {
  const migration = new DatabaseMigration();

  try {
    await migration.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export { DatabaseMigration };
