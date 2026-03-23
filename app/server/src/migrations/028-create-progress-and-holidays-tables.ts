/**
 * 迁移脚本：创建进展记录表和节假日表
 * 创建时间：2026-03-21
 */

import type { PoolConnection } from 'mysql2/promise';

export async function up(connection: PoolConnection): Promise<void> {
  // 创建进展记录表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS progress_records (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      content TEXT NOT NULL,
      recorded_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_task_id (task_id),
      INDEX idx_recorded_by (recorded_by),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ progress_records 表创建成功');

  // 创建节假日表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      holiday_date DATE NOT NULL UNIQUE,
      holiday_name VARCHAR(100),
      is_working_day BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_holiday_date (holiday_date),
      INDEX idx_is_working_day (is_working_day)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✅ holidays 表创建成功');
}

export async function down(connection: PoolConnection): Promise<void> {
  await connection.execute('DROP TABLE IF EXISTS progress_records');
  await connection.execute('DROP TABLE IF EXISTS holidays');
  console.log('✅ 回滚：progress_records 和 holidays 表已删除');
}
