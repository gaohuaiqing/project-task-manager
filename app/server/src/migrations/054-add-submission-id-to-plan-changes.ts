/**
 * 添加 submission_id 字段到 plan_changes 表
 *
 * 背景：
 * plan_changes 表存储单个字段的变更记录。当用户一次提交多个变更时
 * （例如同时修改 start_date 和 duration），每个字段都会生成一行记录。
 * 需要一个 submission_id 将这些行分组，以便在 UI 中显示为单个审批项。
 *
 * 变更：
 * 1. 添加 submission_id CHAR(36) 字段，默认值为 UUID()
 * 2. 创建索引 idx_plan_changes_submission_id
 * 3. 对现有数据，设置 submission_id = id（每条记录独立成组）
 *
 * @since 2026-04-25
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '054';
const MIGRATION_NAME = 'add_submission_id_to_plan_changes';

/**
 * 检查列是否存在
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

/**
 * 检查索引是否存在
 */
async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始添加 submission_id 字段到 plan_changes 表...`);

  const pool = getPool();

  // 1. 检查并添加 submission_id 列（不使用默认值）
  if (!await columnExists('plan_changes', 'submission_id')) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 submission_id 列...`);
    // 不使用 DEFAULT(UUID())，避免 binlog 不安全错误
    await pool.execute(`
      ALTER TABLE plan_changes
      ADD COLUMN submission_id CHAR(36) COMMENT '提交批次ID，用于分组同一批次的变更'
      AFTER id
    `);
    console.log(`[Migration ${MIGRATION_VERSION}] submission_id 列添加成功`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] submission_id 列已存在，跳过`);
  }

  // 2. 为现有数据设置 submission_id = id（每条记录独立成组）
  console.log(`[Migration ${MIGRATION_VERSION}] 为现有数据设置 submission_id...`);
  await pool.execute(`
    UPDATE plan_changes
    SET submission_id = id
    WHERE submission_id IS NULL OR submission_id = ''
  `);

  // 3. 添加索引
  if (!await indexExists('plan_changes', 'idx_plan_changes_submission_id')) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 idx_plan_changes_submission_id 索引...`);
    await pool.execute(`
      CREATE INDEX idx_plan_changes_submission_id ON plan_changes(submission_id)
    `);
    console.log(`[Migration ${MIGRATION_VERSION}] 索引创建成功`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] 索引已存在，跳过`);
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 迁移完成`);
}

/**
 * 回滚迁移
 */
export async function down(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始回滚...`);

  const pool = getPool();

  // 1. 删除索引
  if (await indexExists('plan_changes', 'idx_plan_changes_submission_id')) {
    console.log(`[Migration ${MIGRATION_VERSION}] 删除索引...`);
    await pool.execute(`DROP INDEX idx_plan_changes_submission_id ON plan_changes`);
  }

  // 2. 删除列
  if (await columnExists('plan_changes', 'submission_id')) {
    console.log(`[Migration ${MIGRATION_VERSION}] 删除 submission_id 列...`);
    await pool.execute(`ALTER TABLE plan_changes DROP COLUMN submission_id`);
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 回滚完成`);
}

// 导出迁移信息
export const migrationInfo = {
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME,
  up,
  down,
};

/**
 * 运行迁移（用于 run-migration.ts 调用）
 */
export async function runMigration054(): Promise<void> {
  await up();
}
