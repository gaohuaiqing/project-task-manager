/**
 * 迁移：添加待审批变更字段
 * 用于存储工程师提交的待审批任务变更数据
 *
 * @description
 * 当工程师修改任务计划时，变更数据暂存在 pending_changes 字段中，
 * 等待审批通过后再应用到任务上。
 */

import type { Pool } from 'mysql2/promise';

export const id = '029-add-pending-changes';
export const name = '添加待审批变更字段';

export async function up(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 添加 pending_changes 字段（JSON格式存储待审批的变更）
    await connection.execute(`
      ALTER TABLE wbs_tasks
      ADD COLUMN pending_changes JSON NULL
      COMMENT '待审批的变更数据（JSON格式）'
      AFTER last_plan_refresh_at
    `);

    // 添加 pending_change_type 字段（变更类型）
    await connection.execute(`
      ALTER TABLE wbs_tasks
      ADD COLUMN pending_change_type VARCHAR(50) NULL
      COMMENT '待审批变更类型：plan_change（计划变更）、other（其他）'
      AFTER pending_changes
    `);

    await connection.commit();
    console.log(`[Migration ${id}] 成功添加 pending_changes 和 pending_change_type 字段`);
  } catch (error) {
    await connection.rollback();
    // 字段可能已存在，跳过
    if ((error as any).code === 'ER_DUP_FIELDNAME') {
      console.log(`[Migration ${id}] 字段已存在，跳过`);
    } else {
      throw error;
    }
  } finally {
    connection.release();
  }
}

export async function down(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(`ALTER TABLE wbs_tasks DROP COLUMN IF EXISTS pending_change_type`);
    await connection.execute(`ALTER TABLE wbs_tasks DROP COLUMN IF EXISTS pending_changes`);

    await connection.commit();
    console.log(`[Migration ${id}] 成功回滚 pending_changes 和 pending_change_type 字段`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 运行迁移函数（用于 run-migration.ts 调用）
import { getPool } from '../core/db';

export async function runMigration029(): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('📋 数据库连接池未初始化，跳过迁移 029');
      return false;
    }

    // 检查字段是否已存在
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wbs_tasks' AND COLUMN_NAME = 'pending_changes'`
    );

    if ((columns as any[]).length > 0) {
      console.log('📋 迁移 029 已执行，字段已存在，跳过');
      return true;
    }

    console.log('🚀 开始执行数据库迁移 029...');
    await up(pool);
    console.log('🎉 迁移 029 完成！');
    return true;
  } catch (error) {
    console.error('❌ 迁移 029 失败:', error);
    return false;
  }
}
