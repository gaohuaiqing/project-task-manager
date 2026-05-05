/**
 * 数据库迁移 056: 添加 warning_days 列到 wbs_tasks 表
 *
 * 目标：
 * 确保 wbs_tasks 表有 warning_days 列（延期预警天数）
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '056';
const MIGRATION_NAME = 'add_warning_days_column';

/**
 * 检查列是否存在
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[Migration ${MIGRATION_VERSION}] Database pool not available, skipping`);
    return;
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 开始添加 warning_days 列...`);

  const hasColumn = await columnExists('wbs_tasks', 'warning_days');
  if (!hasColumn) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 warning_days 列...`);
    await pool.execute(`ALTER TABLE wbs_tasks ADD COLUMN warning_days INT DEFAULT 3 COMMENT '延期预警天数' AFTER is_six_day_week`);
    // 更新现有数据
    await pool.execute(`UPDATE wbs_tasks SET warning_days = 3 WHERE warning_days IS NULL`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] warning_days 列已存在，跳过`);
  }

  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成！`);
}
