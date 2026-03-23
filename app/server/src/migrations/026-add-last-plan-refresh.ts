/**
 * 数据库迁移：添加计划刷新时间字段
 * 用于延期次数累计规则判断
 */
import { getPool } from '../core/db';
import type { ResultSetHeader } from 'mysql2/promise';

export async function up(): Promise<void> {
  const pool = getPool();

  // 添加 last_plan_refresh_at 字段
  try {
    await pool.execute<ResultSetHeader>(
      `ALTER TABLE wbs_tasks
       ADD COLUMN last_plan_refresh_at TIMESTAMP NULL COMMENT '计划最后刷新时间'`
    );
    console.log('Migration 026: Added last_plan_refresh_at column to wbs_tasks');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Migration 026: Column last_plan_refresh_at already exists, skipping');
    } else {
      throw error;
    }
  }
}

export async function down(): Promise<void> {
  const pool = getPool();

  await pool.execute<ResultSetHeader>(
    `ALTER TABLE wbs_tasks DROP COLUMN IF EXISTS last_plan_refresh_at`
  );
  console.log('Migration 026 rollback: Removed last_plan_refresh_at column');
}
