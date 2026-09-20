/**
 * 数据库迁移 064: 新增 overdue_start（逾期未开始）任务状态
 *
 * 目标：
 * 1. 扩展 wbs_tasks.status ENUM 至 9 值（含 overdue_start，不含已废弃的 rejected，与 053 终态一致）
 * 2. 存量初始化：满足逾期未开始实时条件的 not_started 任务刷新为 overdue_start
 *    （口径与 task.service.ts calculateStatus 规则7.5 及 analytics/constants.ts MUTEX_STATUS_CONDITIONS.overdueStart 一致）
 *
 * 幂等性：
 * - 外层 run-migration.ts 通过 migrations 表（isMigrationExecuted/recordMigration）保证只执行一次
 * - 内部另以 ENUM 值存在性检查兜底，重复执行安全
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '064';

/**
 * 检查 wbs_tasks.status ENUM 是否已包含指定值
 */
async function statusEnumHas(value: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wbs_tasks' AND COLUMN_NAME = 'status'`
  );
  const columnType = String(rows[0]?.COLUMN_TYPE ?? '');
  return columnType.includes(`'${value}'`);
}

export async function up(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 新增 overdue_start 任务状态...`);
  const pool = getPool();

  // 1. 扩展 ENUM（9 值）
  const hasOverdueStart = await statusEnumHas('overdue_start');
  if (!hasOverdueStart) {
    await pool.execute(
      `ALTER TABLE wbs_tasks
       MODIFY COLUMN status ENUM(
         'pending_approval', 'not_started', 'overdue_start', 'in_progress',
         'early_completed', 'on_time_completed', 'delay_warning',
         'delayed', 'overdue_completed'
       ) DEFAULT 'not_started' COMMENT '任务状态'`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] status ENUM 已扩展至 9 值（含 overdue_start）`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] ENUM 已含 overdue_start，跳过 ALTER`);
  }

  // 2. 存量初始化：满足逾期未开始实时条件的 not_started 任务刷新状态
  //    （无实际开始/结束 + 已过计划开始日期 + 未进入延期/预警窗口；end_date 为空同样适用）
  //    UPDATE 天然幂等：仅命中 status='not_started' 的行，重复执行无副作用
  const [updateResult] = await pool.execute<ResultSetHeader>(
    `UPDATE wbs_tasks
     SET status = 'overdue_start'
     WHERE status = 'not_started'
       AND actual_start_date IS NULL AND actual_end_date IS NULL
       AND start_date IS NOT NULL AND start_date < CURDATE()
       AND (end_date IS NULL OR end_date >= DATE_ADD(CURDATE(), INTERVAL COALESCE(warning_days, 3) DAY))`
  );
  console.log(`[Migration ${MIGRATION_VERSION}] 已刷新 ${updateResult.affectedRows} 条记录为 overdue_start`);

  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成`);
}
