/**
 * 修复 delay_records 表 task_id 字段类型
 *
 * 问题：迁移024中 task_id 定义为 INT，但 wbs_tasks.id 是 VARCHAR(36)（UUID）
 * 导致：
 * 1. 外键约束类型不匹配
 * 2. 使用 UUID 字符串查询时报错
 *
 * 修复：
 * 1. 删除旧的外键约束
 * 2. 修改 task_id 为 VARCHAR(36)
 * 3. 修改 id 为 VARCHAR(36)（支持UUID）
 * 4. 重新添加外键约束
 *
 * @since 2026-04-25
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '052';
const MIGRATION_NAME = 'fix_delay_records_id_type';

/**
 * 检查表是否存在
 */
async function tableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

/**
 * 获取当前表结构
 */
async function getTableStructure(tableName: string): Promise<RowDataPacket[]> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `DESCRIBE ${tableName}`
  );
  return rows;
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始修复 delay_records 表结构...`);

  const pool = getPool();

  if (!await tableExists('delay_records')) {
    console.log(`[Migration ${MIGRATION_VERSION}] delay_records 表不存在，创建新表...`);

    // 创建正确结构的表
    await pool.execute(`
      CREATE TABLE delay_records (
        id VARCHAR(36) PRIMARY KEY COMMENT '记录ID（UUID）',
        task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
        delay_days INT NOT NULL COMMENT '延期天数',
        reason TEXT NOT NULL COMMENT '延期原因',
        recorded_by INT NOT NULL COMMENT '记录人ID',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

        INDEX idx_delays_task (task_id),
        INDEX idx_delays_created (created_at),
        INDEX idx_delays_recorded_by (recorded_by),

        CONSTRAINT fk_delays_task FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_delays_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务延期记录表'
    `);

    console.log(`[Migration ${MIGRATION_VERSION}] delay_records 表创建成功`);
    return;
  }

  // 表已存在，检查并修复结构
  const columns = await getTableStructure('delay_records');
  const taskIdColumn = columns.find(c => c.Field === 'task_id');
  const idColumn = columns.find(c => c.Field === 'id');

  const needsTaskIdFix = taskIdColumn && taskIdColumn.Type.includes('int');
  const needsIdFix = idColumn && idColumn.Type.includes('int');

  if (needsTaskIdFix || needsIdFix) {
    console.log(`[Migration ${MIGRATION_VERSION}] 发现类型不匹配，需要修复...`);
    console.log(`[Migration ${MIGRATION_VERSION}] task_id 类型: ${taskIdColumn?.Type}, id 类型: ${idColumn?.Type}`);

    // 1. 删除旧的外键约束
    try {
      await pool.execute(`ALTER TABLE delay_records DROP FOREIGN KEY IF EXISTS fk_delays_task`);
      console.log(`[Migration ${MIGRATION_VERSION}] 已删除 fk_delays_task 外键`);
    } catch (e) {
      console.log(`[Migration ${MIGRATION_VERSION}] 删除 fk_delays_task 失败（可能不存在）`);
    }

    try {
      await pool.execute(`ALTER TABLE delay_records DROP FOREIGN KEY IF EXISTS fk_delays_recorded_by`);
      console.log(`[Migration ${MIGRATION_VERSION}] 已删除 fk_delays_recorded_by 外键`);
    } catch (e) {
      console.log(`[Migration ${MIGRATION_VERSION}] 删除 fk_delays_recorded_by 失败（可能不存在）`);
    }

    // 2. 删除旧的索引（如果存在）
    try {
      await pool.execute(`ALTER TABLE delay_records DROP INDEX IF EXISTS idx_delays_task`);
    } catch (e) { /* ignore */ }

    // 3. 清空表数据（因为类型不兼容，INT和UUID数据无法转换）
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM delay_records`
    );
    const existingCount = countRows[0].count;
    if (existingCount > 0) {
      console.log(`[Migration ${MIGRATION_VERSION}] 警告：将清空 ${existingCount} 条延期记录（类型不兼容）`);
      await pool.execute(`TRUNCATE TABLE delay_records`);
    }

    // 4. 修改 id 字段类型（如果是 INT）
    if (needsIdFix) {
      await pool.execute(`ALTER TABLE delay_records MODIFY id VARCHAR(36) NOT NULL COMMENT '记录ID（UUID）'`);
      console.log(`[Migration ${MIGRATION_VERSION}] id 字段已修改为 VARCHAR(36)`);
    }

    // 5. 修改 task_id 字段类型
    if (needsTaskIdFix) {
      await pool.execute(`ALTER TABLE delay_records MODIFY task_id VARCHAR(36) NOT NULL COMMENT '任务ID'`);
      console.log(`[Migration ${MIGRATION_VERSION}] task_id 字段已修改为 VARCHAR(36)`);
    }

    // 6. 重新添加索引
    try {
      await pool.execute(`ALTER TABLE delay_records ADD INDEX idx_delays_task (task_id)`);
    } catch (e) { /* 可能已存在 */ }
    try {
      await pool.execute(`ALTER TABLE delay_records ADD INDEX idx_delays_created (created_at)`);
    } catch (e) { /* 可能已存在 */ }
    try {
      await pool.execute(`ALTER TABLE delay_records ADD INDEX idx_delays_recorded_by (recorded_by)`);
    } catch (e) { /* 可能已存在 */ }

    // 7. 重新添加外键约束
    await pool.execute(`
      ALTER TABLE delay_records
      ADD CONSTRAINT fk_delays_task FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE
    `);
    await pool.execute(`
      ALTER TABLE delay_records
      ADD CONSTRAINT fk_delays_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
    `);

    console.log(`[Migration ${MIGRATION_VERSION}] delay_records 表结构修复成功`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] task_id 已为 VARCHAR(36) 类型，无需修复`);
  }
}

/**
 * 回滚迁移
 */
export async function down(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始回滚...`);

  const pool = getPool();

  // 删除外键约束
  try {
    await pool.execute(`ALTER TABLE delay_records DROP FOREIGN KEY IF EXISTS fk_delays_task`);
    await pool.execute(`ALTER TABLE delay_records DROP FOREIGN KEY IF EXISTS fk_delays_recorded_by`);
  } catch (e) { /* ignore */ }

  // 删除表
  await pool.execute(`DROP TABLE IF EXISTS delay_records`);

  console.log(`[Migration ${MIGRATION_VERSION}] 回滚完成`);
}

// 导出迁移信息
export const migrationInfo = {
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME,
  up,
  down,
};
