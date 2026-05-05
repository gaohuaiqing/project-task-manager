/**
 * 增强通知表
 *
 * 目的：
 * 添加 project_id 和 task_id 字段，用于通知权限验证和自动清理
 *
 * 问题背景：
 * - 通知发送基于 assignee_id（任务负责人）
 * - WBS 视图查询基于 project_members（项目成员关系）
 * - 当任务转派或用户被移出项目后，历史通知失效但不会被清理
 *
 * 解决方案：
 * 1. 在 notifications 表添加 project_id 和 task_id 字段
 * 2. 用于判断通知的有效性和自动清理
 *
 * @since 2026-04-24
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '049';
const MIGRATION_NAME = 'enhance_notifications_table';

/**
 * 检查列是否存在
 */
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

/**
 * 检查索引是否存在
 */
async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as count FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

/**
 * 执行迁移
 */
export async function runMigration049(): Promise<boolean> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始增强 notifications 表...`);

  const pool = getPool();

  try {
    // 检查 notifications 表是否存在
    const [tables] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    );

    if (tables[0].count === 0) {
      console.log(`[Migration ${MIGRATION_VERSION}] notifications 表不存在，跳过`);
      return true;
    }

    // 添加 project_id 列
    if (!await columnExists('notifications', 'project_id')) {
      console.log(`[Migration ${MIGRATION_VERSION}] 添加 project_id 列...`);
      await pool.execute(`
        ALTER TABLE notifications
        ADD COLUMN project_id VARCHAR(36) NULL
        COMMENT '关联项目ID，用于权限验证'
        AFTER user_id
      `);
      console.log(`[Migration ${MIGRATION_VERSION}] project_id 列添加成功`);
    } else {
      console.log(`[Migration ${MIGRATION_VERSION}] project_id 列已存在，跳过`);
    }

    // 添加 task_id 列
    if (!await columnExists('notifications', 'task_id')) {
      console.log(`[Migration ${MIGRATION_VERSION}] 添加 task_id 列...`);
      await pool.execute(`
        ALTER TABLE notifications
        ADD COLUMN task_id VARCHAR(36) NULL
        COMMENT '关联任务ID，用于精确匹配和清理'
        AFTER project_id
      `);
      console.log(`[Migration ${MIGRATION_VERSION}] task_id 列添加成功`);
    } else {
      console.log(`[Migration ${MIGRATION_VERSION}] task_id 列已存在，跳过`);
    }

    // 添加索引
    if (!await indexExists('notifications', 'idx_notifications_project_id')) {
      console.log(`[Migration ${MIGRATION_VERSION}] 添加 idx_notifications_project_id 索引...`);
      await pool.execute(`ALTER TABLE notifications ADD INDEX idx_notifications_project_id (project_id)`);
    }

    if (!await indexExists('notifications', 'idx_notifications_task_id')) {
      console.log(`[Migration ${MIGRATION_VERSION}] 添加 idx_notifications_task_id 索引...`);
      await pool.execute(`ALTER TABLE notifications ADD INDEX idx_notifications_task_id (task_id)`);
    }

    console.log(`[Migration ${MIGRATION_VERSION}] notifications 表增强完成`);
    return true;
  } catch (error) {
    console.error(`[Migration ${MIGRATION_VERSION}] 失败:`, error);
    return false;
  }
}

/**
 * 回滚迁移
 */
export async function rollbackMigration049(): Promise<void> {
  console.log(`[Migration ${MIGRATION_VERSION}] 开始回滚...`);

  const pool = getPool();

  try {
    // 删除索引
    if (await indexExists('notifications', 'idx_notifications_task_id')) {
      await pool.execute(`ALTER TABLE notifications DROP INDEX idx_notifications_task_id`);
    }

    if (await indexExists('notifications', 'idx_notifications_project_id')) {
      await pool.execute(`ALTER TABLE notifications DROP INDEX idx_notifications_project_id`);
    }

    // 删除列
    if (await columnExists('notifications', 'task_id')) {
      await pool.execute(`ALTER TABLE notifications DROP COLUMN task_id`);
    }

    if (await columnExists('notifications', 'project_id')) {
      await pool.execute(`ALTER TABLE notifications DROP COLUMN project_id`);
    }

    console.log(`[Migration ${MIGRATION_VERSION}] 回滚完成`);
  } catch (error) {
    console.error(`[Migration ${MIGRATION_VERSION}] 回滚失败:`, error);
    throw error;
  }
}

// 导出迁移信息
export const migrationInfo = {
  version: MIGRATION_VERSION,
  name: MIGRATION_NAME,
  up: runMigration049,
  down: rollbackMigration049,
};
