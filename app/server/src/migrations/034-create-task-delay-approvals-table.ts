/**
 * 数据库迁移 034: 创建任务延期审批表
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2';

const MIGRATION_VERSION = '034';
const MIGRATION_NAME = 'create_task_delay_approvals_table';

async function checkMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const [result] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return result && result.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, now())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

export async function runMigration034(): Promise<boolean> {
  if (await checkMigrationExecuted()) {
    console.log('📋 迁移 034 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 034...');

    // 创建 task_delay_approvals 表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS task_delay_approvals (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
        requester_id INT NOT NULL COMMENT '申请人ID',
        approver_id INT NULL COMMENT '审批人ID',
        delay_days INT NOT NULL COMMENT '延期天数',
        reason TEXT NOT NULL COMMENT '延期原因',
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
        approved_at DATETIME NULL COMMENT '审批时间',
        rejection_reason TEXT NULL COMMENT '拒绝原因',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_task_id (task_id),
        INDEX idx_requester_id (requester_id),
        INDEX idx_approver_id (approver_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ task_delay_approvals 表创建成功');

    await recordMigration();
    console.log('🎉 迁移 034 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 034 失败:', error);
    return false;
  }
}
