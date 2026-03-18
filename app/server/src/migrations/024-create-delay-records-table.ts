/**
 * 延期记录表迁移
 *
 * 功能：
 * 1. 创建 delay_records 表，存储任务延期原因记录
 * 2. 支持延期分析和统计
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { databaseService } from '../services/DatabaseService.js';
import { createMigrationRunner } from './migration-utils.js';

const MIGRATION_VERSION = '024';
const MIGRATION_NAME = 'create_delay_records_table';

const migration = createMigrationRunner({
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME
});

/** 创建 delay_records 表 */
export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始创建 delay_records 表...`);

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS delay_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      task_id INT NOT NULL COMMENT '任务ID',
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
  `;

  await databaseService.query(createTableSql);
  console.log(`[Migration ${MIGRATION_VERSION}] delay_records 表创建成功`);
}

/** 删除 delay_records 表（回滚） */
export async function down(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始删除 delay_records 表...`);
  await databaseService.query('DROP TABLE IF EXISTS delay_records');
  console.log(`[Migration ${MIGRATION_VERSION}] delay_records 表删除成功`);
}

/** 执行迁移 024（统一接口） */
export const runMigration024 = migration.runMigration.bind(migration, up);

// 直接执行迁移
migration.runDirect(up);
