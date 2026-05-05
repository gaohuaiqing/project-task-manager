/**
 * 数据库迁移 060: 添加 WBS 排序优化索引
 *
 * 目标:
 * 1. 为 wbs_tasks 表添加 (project_id, wbs_order) 复合索引 - 优化任务列表排序查询
 * 2. 为 wbs_tasks 表添加 (parent_id, wbs_order) 复合索引 - 优化同级任务排序
 *
 * 风险评估:
 * - wbs_tasks 表：低风险（索引创建速度快，不会锁表）
 *
 * 预期效果:
 * - 任务列表查询性能提升 3-5 倍
 * - 折叠/展开操作性能提升（排序更快）
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '060';
const MIGRATION_NAME = 'add_wbs_sort_index';

interface MigrationLog {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

const logs: MigrationLog[] = [];

function log(step: string, status: 'success' | 'warning' | 'error', message: string) {
  logs.push({ step, status, message });
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${step}] ${message}`);
}

async function checkMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  const pool = getPool();
  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function addWbsSortIndexes(): Promise<boolean> {
  const pool = getPool();

  try {
    // ========== wbs_tasks 表排序索引 ==========

    // 索引1: (project_id, wbs_order) - 优化任务列表按项目排序查询
    // 查询模式: WHERE project_id = ? ORDER BY wbs_order ASC
    const hasProjectOrder = await checkIndexExists('wbs_tasks', 'idx_wbs_project_order');
    if (!hasProjectOrder) {
      await pool.execute(
        'CREATE INDEX idx_wbs_project_order ON wbs_tasks (project_id, wbs_order)'
      );
      log('Step 1', 'success', 'idx_wbs_project_order 索引添加成功 - 任务列表排序优化（预计3-5倍提升）');
    } else {
      log('Step 1', 'warning', 'idx_wbs_project_order 索引已存在，跳过');
    }

    // 索引2: (parent_id, wbs_order) - 优化同级任务排序查询
    // 查询模式: WHERE parent_id = ? ORDER BY wbs_order ASC
    const hasParentOrder = await checkIndexExists('wbs_tasks', 'idx_wbs_parent_order');
    if (!hasParentOrder) {
      await pool.execute(
        'CREATE INDEX idx_wbs_parent_order ON wbs_tasks (parent_id, wbs_order)'
      );
      log('Step 2', 'success', 'idx_wbs_parent_order 索引添加成功 - 同级任务排序优化');
    } else {
      log('Step 2', 'warning', 'idx_wbs_parent_order 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Steps 1-2', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration060(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 060: 添加 WBS 排序优化索引');
  console.log('='.repeat(70));
  console.log('⚠️ 注意：索引创建可能需要5-10秒（取决于数据量）');

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 060 已执行，跳过');
      return true;
    }

    const success = await addWbsSortIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 060 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 060 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 060...');
  await runMigration060();
}
