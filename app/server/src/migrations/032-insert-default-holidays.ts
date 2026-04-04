/**
 * 数据库迁移 032: 插入中国法定节假日数据
 *
 * 目标：
 * 插入2024年、2026年中国法定节假日，用于工作日计算
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '032';
const MIGRATION_NAME = 'insert_default_holidays';

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
 * 确保holidays表存在
 */
async function ensureHolidaysTable(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      holiday_date DATE NOT NULL UNIQUE COMMENT '日期',
      holiday_name VARCHAR(100) NOT NULL COMMENT '节日名称',
      is_working_day BOOLEAN DEFAULT FALSE COMMENT '是否为工作日（调休）',
      year INT NOT NULL COMMENT '年份',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      INDEX idx_holiday_date (holiday_date),
      INDEX idx_year (year),
      INDEX idx_is_working_day (is_working_day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

/**
 * 插入中国法定节假日数据（补充缺失数据）
 */
async function insertHolidays(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // 中国法定节假日数据 (2024, 2026)
  // 格式: [日期, 名称, 是否工作日(调休)]
  const holidays: [string, string, boolean][] = [
    // 2024年
    ['2024-01-01', '元旦', false],
    ['2024-02-10', '春节', false],
    ['2024-02-11', '春节', false],
    ['2024-02-12', '春节', false],
    ['2024-02-13', '春节', false],
    ['2024-02-14', '春节', false],
    ['2024-02-15', '春节', false],
    ['2024-02-16', '春节', false],
    ['2024-02-17', '春节', false],
    ['2024-02-04', '春节调休', true],  // 调休上班
    ['2024-02-18', '春节调休', true],  // 调休上班
    ['2024-04-04', '清明节', false],
    ['2024-04-05', '清明节', false],
    ['2024-04-06', '清明节', false],
    ['2024-04-07', '清明节调休', true], // 调休上班
    ['2024-05-01', '劳动节', false],
    ['2024-05-02', '劳动节', false],
    ['2024-05-03', '劳动节', false],
    ['2024-05-04', '劳动节', false],
    ['2024-05-05', '劳动节', false],
    ['2024-04-28', '劳动节调休', true], // 调休上班
    ['2024-05-11', '劳动节调休', true], // 调休上班
    ['2024-06-08', '端午节', false],
    ['2024-06-09', '端午节', false],
    ['2024-06-10', '端午节', false],
    ['2024-09-15', '中秋节', false],
    ['2024-09-16', '中秋节', false],
    ['2024-09-17', '中秋节', false],
    ['2024-10-01', '国庆节', false],
    ['2024-10-02', '国庆节', false],
    ['2024-10-03', '国庆节', false],
    ['2024-10-04', '国庆节', false],
    ['2024-10-05', '国庆节', false],
    ['2024-10-06', '国庆节', false],
    ['2024-10-07', '国庆节', false],
    ['2024-09-29', '国庆节调休', true], // 调休上班
    ['2024-10-12', '国庆节调休', true], // 调休上班

    // 2026年（国务院公布）
    // 元旦：1月1日-3日放假，共3天，1月4日(周日)上班
    ['2026-01-01', '元旦', false],
    ['2026-01-02', '元旦', false],
    ['2026-01-03', '元旦', false],
    ['2026-01-04', '元旦调休', true], // 调休上班

    // 春节：2月17日-23日放假调休，共7天，2月14日(周六)、2月28日(周六)上班
    ['2026-02-14', '春节调休', true], // 调休上班
    ['2026-02-17', '春节', false],
    ['2026-02-18', '春节', false],
    ['2026-02-19', '春节', false],
    ['2026-02-20', '春节', false],
    ['2026-02-21', '春节', false],
    ['2026-02-22', '春节', false],
    ['2026-02-23', '春节', false],
    ['2026-02-28', '春节调休', true], // 调休上班

    // 清明节：4月4日-6日放假，共3天，无调休
    ['2026-04-04', '清明节', false],
    ['2026-04-05', '清明节', false],
    ['2026-04-06', '清明节', false],

    // 劳动节：5月1日-5日放假调休，共5天，4月26日(周日)上班
    ['2026-04-26', '劳动节调休', true], // 调休上班
    ['2026-05-01', '劳动节', false],
    ['2026-05-02', '劳动节', false],
    ['2026-05-03', '劳动节', false],
    ['2026-05-04', '劳动节', false],
    ['2026-05-05', '劳动节', false],

    // 端午节：5月31日放假，共1天，5月30日(周六)上班
    ['2026-05-30', '端午节调休', true], // 调休上班
    ['2026-05-31', '端午节', false],

    // 中秋节、国庆节：10月1日-8日放假调休，共8天，9月27日(周日)、10月10日(周六)上班
    ['2026-09-27', '国庆节调休', true], // 调休上班
    ['2026-10-01', '国庆节', false],
    ['2026-10-02', '国庆节', false],
    ['2026-10-03', '中秋节', false], // 中秋与国庆重叠
    ['2026-10-04', '国庆节', false],
    ['2026-10-05', '国庆节', false],
    ['2026-10-06', '国庆节', false],
    ['2026-10-07', '国庆节', false],
    ['2026-10-08', '国庆节', false],
    ['2026-10-10', '国庆节调休', true], // 调休上班
  ];

  // 批量插入（跳过已存在的数据）
  let insertedCount = 0;
  for (const holiday of holidays) {
    const year = new Date(holiday[0]).getFullYear();
    try {
      await pool.execute(
        `INSERT IGNORE INTO holidays (holiday_date, holiday_name, is_working_day, year)
         VALUES (?, ?, ?, ?)`,
        [holiday[0], holiday[1], holiday[2], year]
      );
      insertedCount++;
    } catch {
      // 忽略重复数据
    }
  }

  console.log(`✅ 已插入 ${insertedCount} 条节假日数据 (2024, 2026)`);
}

/**
 * 执行迁移
 */
export async function runMigration032(): Promise<boolean> {
  try {
    if (await isMigrationExecuted()) {
      console.log('📋 迁移 032 已执行，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 032: 插入中国法定节假日');

    await ensureHolidaysTable();
    await insertHolidays();
    await recordMigration();

    console.log('📝 迁移记录已保存');
    console.log('🎉 迁移 032 完成！');

    return true;
  } catch (error) {
    console.error('❌ 迁移 032 失败:', error);
    return false;
  }
}
