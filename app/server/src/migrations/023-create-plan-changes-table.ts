/**
 * 计划变更审批表迁移
 *
 * 功能：
 * 1. 创建 plan_changes 表，存储计划变更审批记录
 * 2. 支持任务计划字段的变更审批流程
 * 3. 记录审批状态、超时等信息
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { databaseService } from '../services/DatabaseService.js';
import { createMigrationRunner } from './migration-utils.js';

const MIGRATION_VERSION = '023';
const MIGRATION_NAME = 'create_plan_changes_table';

const migration = createMigrationRunner({
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME
});

/** 创建 plan_changes 表 */
export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始创建 plan_changes 表...`);

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS plan_changes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      task_id INT NOT NULL COMMENT '任务ID',
      user_id INT NOT NULL COMMENT '申请人ID',
      change_type VARCHAR(50) NOT NULL COMMENT '变更类型：start_date, end_date, duration, predecessor_id, lag_days',
      old_value TEXT NULL COMMENT '原值',
      new_value TEXT NOT NULL COMMENT '新值',
      reason TEXT NOT NULL COMMENT '变更原因',
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
      approver_id INT NULL COMMENT '审批人ID',
      approved_at DATETIME NULL COMMENT '审批时间',
      rejection_reason TEXT NULL COMMENT '驳回原因',
      is_timeout BOOLEAN DEFAULT FALSE COMMENT '是否超时',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

      INDEX idx_changes_task (task_id),
      INDEX idx_changes_user (user_id),
      INDEX idx_changes_status (status),
      INDEX idx_changes_approver (approver_id),
      INDEX idx_changes_created (created_at),

      CONSTRAINT fk_changes_task FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
      CONSTRAINT fk_changes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_changes_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计划变更审批表'
  `;

  await databaseService.query(createTableSql);
  console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 表创建成功`);
}

/** 删除 plan_changes 表（回滚） */
export async function down(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始删除 plan_changes 表...`);
  await databaseService.query('DROP TABLE IF EXISTS plan_changes');
  console.log(`[Migration ${MIGRATION_VERSION}] plan_changes 表删除成功`);
}

/** 执行迁移 023（统一接口） */
export const runMigration023 = migration.runMigration.bind(migration, up);

// 直接执行迁移
migration.runDirect(up);
