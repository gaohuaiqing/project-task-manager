/**
 * 数据库迁移 040: 添加时间线进度和状态字段
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2';

const MIGRATION_VERSION = '040';
const MIGRATION_NAME = 'add_timeline_progress_status';

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

export async function runMigration040(): Promise<boolean> {
  if (await checkMigrationExecuted()) {
    console.log('📋 迁移 040 已执行，跳过');
    return true;
  }

  const pool = getPool();
  if (!pool) return false;

  try {
    console.log('🚀 开始执行数据库迁移 040...');

    // 添加 progress 列
    await pool.execute(`
      ALTER TABLE timelines
      ADD COLUMN progress INT DEFAULT 0 COMMENT '进度百分比 0-100'
    `);
    console.log('✅ 添加 progress 列成功');

    // 添加 status 列
    await pool.execute(`
      ALTER TABLE timelines
      ADD COLUMN status VARCHAR(20) DEFAULT 'not_started' COMMENT '状态: not_started, in_progress, completed, delayed'
    `);
    console.log('✅ 添加 status 列成功');

    // 添加索引
    await pool.execute(`
      ALTER TABLE timelines ADD INDEX idx_status (status)
    `);
    console.log('✅ 添加 status 索引成功');

    await recordMigration();
    console.log('🎉 迁移 040 完成！');
    return true;
  } catch (error: any) {
    // 如果列已存在，忽略错误
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('📋 列已存在，跳过');
      await recordMigration();
      return true;
    }
    console.error('❌ 迁移 040 失败:', error);
    return false;
  }
}
