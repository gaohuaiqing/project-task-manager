/**
 * Migration: 添加依赖类型字段到 wbs_tasks 表
 *
 * 依赖类型说明：
 * - FS (Finish-to-Start): 前置任务完成后，后续任务才能开始（默认）
 * - SS (Start-to-Start): 前置任务开始后，后续任务才能开始
 * - FF (Finish-to-Finish): 前置任务完成后，后续任务才能完成
 * - SF (Start-to-Finish): 前置任务开始后，后续任务才能完成
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const migrationName = '030-add-dependency-type';

async function up(): Promise<void> {
  const pool = getPool();

  // 检查字段是否已存在
  const [columns] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'wbs_tasks'
     AND COLUMN_NAME = 'dependency_type'`
  );

  if (columns.length > 0) {
    console.log(`[${migrationName}] dependency_type 字段已存在，跳过迁移`);
    return;
  }

  // 添加依赖类型字段
  await pool.execute(`
    ALTER TABLE wbs_tasks
    ADD COLUMN dependency_type ENUM('FS', 'SS', 'FF', 'SF')
      DEFAULT 'FS'
      COMMENT '依赖类型：FS(完成-开始), SS(开始-开始), FF(完成-完成), SF(开始-完成)'
      AFTER predecessor_id
  `);

  console.log(`[${migrationName}] 成功添加 dependency_type 字段`);
}

async function down(): Promise<void> {
  const pool = getPool();

  // 检查字段是否存在
  const [columns] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'wbs_tasks'
     AND COLUMN_NAME = 'dependency_type'`
  );

  if (columns.length === 0) {
    console.log(`[${migrationName}] dependency_type 字段不存在，跳过回滚`);
    return;
  }

  // 删除字段
  await pool.execute(`
    ALTER TABLE wbs_tasks DROP COLUMN dependency_type
  `);

  console.log(`[${migrationName}] 成功删除 dependency_type 字段`);
}

export { up, down, migrationName };
