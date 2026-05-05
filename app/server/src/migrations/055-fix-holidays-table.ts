/**
 * 数据库迁移 055: 修复 holidays 表结构
 *
 * 目标：
 * 确保 holidays 表有 holiday_name 列
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '055';
const MIGRATION_NAME = 'fix_holidays_table_structure';

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * 记录迁移执行
 */
async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

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
async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[Migration ${MIGRATION_VERSION}] Database pool not available, skipping`);
    return;
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 开始修复 holidays 表结构...`);

  // 确保 holidays 表存在
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      holiday_date DATE NOT NULL UNIQUE COMMENT '日期',
      holiday_name VARCHAR(100) COMMENT '节日名称',
      is_working_day BOOLEAN DEFAULT FALSE COMMENT '是否为工作日（调休）',
      year INT COMMENT '年份',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_holiday_date (holiday_date),
      INDEX idx_year (year),
      INDEX idx_is_working_day (is_working_day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 检查并添加 holiday_name 列
  const hasHolidayName = await columnExists('holidays', 'holiday_name');
  if (!hasHolidayName) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 holiday_name 列...`);
    await pool.execute(`ALTER TABLE holidays ADD COLUMN holiday_name VARCHAR(100) COMMENT '节日名称' AFTER holiday_date`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] holiday_name 列已存在，跳过`);
  }

  // 检查并添加 year 列
  const hasYear = await columnExists('holidays', 'year');
  if (!hasYear) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 year 列...`);
    await pool.execute(`ALTER TABLE holidays ADD COLUMN year INT COMMENT '年份' AFTER is_working_day`);
  }

  // 检查并添加 is_working_day 列
  const hasIsWorkingDay = await columnExists('holidays', 'is_working_day');
  if (!hasIsWorkingDay) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 is_working_day 列...`);
    await pool.execute(`ALTER TABLE holidays ADD COLUMN is_working_day BOOLEAN DEFAULT FALSE COMMENT '是否为工作日（调休）' AFTER holiday_name`);
  }

  // 检查并添加 updated_at 列
  const hasUpdatedAt = await columnExists('holidays', 'updated_at');
  if (!hasUpdatedAt) {
    console.log(`[Migration ${MIGRATION_VERSION}] 添加 updated_at 列...`);
    await pool.execute(`ALTER TABLE holidays ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'`);
  }

  // 更新现有数据的 year 字段
  await pool.execute(`UPDATE holidays SET year = YEAR(holiday_date) WHERE year IS NULL`);

  await recordMigration();
  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成！`);
}

/**
 * 导出迁移函数
 */
export { up };
