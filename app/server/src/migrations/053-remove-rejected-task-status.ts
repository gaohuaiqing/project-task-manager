/**
 * 迁移：移除任务状态中的 rejected 枚举值
 *
 * 背景：
 * - 驳回后任务状态不应该保持为 rejected，而应根据日期正常计算
 * - 驳回结果已在 plan_changes 表的历史记录中体现，无需作为任务状态
 *
 * 步骤：
 * 1. 将现有 rejected 状态的任务更新为正确计算的状态
 * 2. 修改 ENUM 移除 rejected 值
 *
 * @since 2026-04-25
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '053';
const MIGRATION_NAME = 'remove_rejected_task_status';

/**
 * 检查迁移是否已执行
 */
async function isMigrationApplied(): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM schema_migrations WHERE version = ?`,
    [MIGRATION_VERSION]
  );
  return rows[0].count > 0;
}

/**
 * 记录迁移已执行
 */
async function markMigrationApplied(): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO schema_migrations (version, name, executed_at) VALUES (?, ?, NOW())`,
    [MIGRATION_VERSION, MIGRATION_NAME]
  );
}

/**
 * 执行迁移
 */
export async function up(): Promise<void> {
  // 检查是否已执行
  if (await isMigrationApplied()) {
    console.log(`迁移 ${MIGRATION_VERSION} 已执行，跳过`);
    return;
  }

  console.log(`开始迁移 ${MIGRATION_VERSION}: 移除任务状态 rejected...`);
  const pool = getPool();

  // 1. 将现有 rejected 状态的任务更新为正确的状态
  // 根据是否有实际开始日期决定：有则 in_progress，无则 not_started
  console.log('  更新 rejected 状态的任务...');
  const [updateResult] = await pool.execute<ResultSetHeader>(
    `UPDATE wbs_tasks
     SET status = CASE
       WHEN actual_start_date IS NOT NULL AND actual_end_date IS NULL THEN 'in_progress'
       WHEN actual_end_date IS NOT NULL THEN 'overdue_completed'
       ELSE 'not_started'
     END
     WHERE status = 'rejected'`
  );
  console.log(`    已更新 ${updateResult.affectedRows} 条记录`);

  // 2. 修改 ENUM 移除 rejected 值
  console.log('  修改 ENUM 移除 rejected...');
  await pool.execute(
    `ALTER TABLE wbs_tasks
     MODIFY COLUMN status ENUM(
       'pending_approval', 'not_started', 'in_progress',
       'early_completed', 'on_time_completed', 'delay_warning',
       'delayed', 'overdue_completed'
     ) DEFAULT 'not_started' COMMENT '任务状态'`
  );

  // 3. 记录迁移已执行
  await markMigrationApplied();

  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成: 已移除 rejected 任务状态`);
}
