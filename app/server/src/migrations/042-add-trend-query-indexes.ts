/**
 * 数据库迁移 042: 添加趋势查询优化索引
 *
 * 目标:
 * 1. 为 wbs_tasks 表添加 created_at 索引 - 优化任务趋势查询
 * 2. 为 wbs_tasks 表添加 updated_at 索引 - 优化任务状态变更查询
 * 3. 为 wbs_tasks 表添加复合索引 - 优化状态+日期组合查询
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '042';
const MIGRATION_NAME = 'add_trend_query_indexes';

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
  try {
    const result = await databaseService.query(
      'SELECT 1 FROM migrations WHERE version = ?',
      [MIGRATION_VERSION]
    ) as any[];
    return result && result.length > 0;
  } catch {
    return false;
  }
}

async function recordMigration(): Promise<void> {
  await databaseService.query(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
  const indexes = await databaseService.query(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [tableName, indexName]) as any[];
  return indexes.length > 0;
}

async function addIndexes(): Promise<boolean> {
  try {
    // ========== wbs_tasks 表趋势查询索引 ==========

    // 索引1: created_at 索引 - 用于按创建时间查询任务趋势
    const hasCreated = await checkIndexExists('wbs_tasks', 'idx_tasks_created_at');
    if (!hasCreated) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_created_at ON wbs_tasks (created_at)
      `);
      log('Step 1', 'success', 'idx_tasks_created_at 索引添加成功 - 优化任务创建趋势查询');
    } else {
      log('Step 1', 'warning', 'idx_tasks_created_at 索引已存在，跳过');
    }

    // 索引2: updated_at 索引 - 用于按更新时间查询任务状态变更
    const hasUpdated = await checkIndexExists('wbs_tasks', 'idx_tasks_updated_at');
    if (!hasUpdated) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_updated_at ON wbs_tasks (updated_at)
      `);
      log('Step 2', 'success', 'idx_tasks_updated_at 索引添加成功 - 优化任务状态变更查询');
    } else {
      log('Step 2', 'warning', 'idx_tasks_updated_at 索引已存在，跳过');
    }

    // 索引3: status + updated_at 复合索引 - 优化状态变更趋势查询
    const hasStatusUpdated = await checkIndexExists('wbs_tasks', 'idx_tasks_status_updated');
    if (!hasStatusUpdated) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_status_updated ON wbs_tasks (status, updated_at)
      `);
      log('Step 3', 'success', 'idx_tasks_status_updated 索引添加成功 - 优化状态+日期组合查询');
    } else {
      log('Step 3', 'warning', 'idx_tasks_status_updated 索引已存在，跳过');
    }

    // 索引4: project_id + created_at 复合索引 - 优化项目任务创建趋势
    const hasProjectCreated = await checkIndexExists('wbs_tasks', 'idx_tasks_project_created');
    if (!hasProjectCreated) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_project_created ON wbs_tasks (project_id, created_at)
      `);
      log('Step 4', 'success', 'idx_tasks_project_created 索引添加成功 - 优化项目任务创建趋势');
    } else {
      log('Step 4', 'warning', 'idx_tasks_project_created 索引已存在，跳过');
    }

    // 索引5: project_id + updated_at 复合索引 - 优化项目任务更新趋势
    const hasProjectUpdated = await checkIndexExists('wbs_tasks', 'idx_tasks_project_updated');
    if (!hasProjectUpdated) {
      await databaseService.query(`
        CREATE INDEX idx_tasks_project_updated ON wbs_tasks (project_id, updated_at)
      `);
      log('Step 5', 'success', 'idx_tasks_project_updated 索引添加成功 - 优化项目任务更新趋势');
    } else {
      log('Step 5', 'warning', 'idx_tasks_project_updated 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Steps 1-5', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration042(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 042: 添加趋势查询优化索引');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 042 已执行，跳过');
      return true;
    }

    const success = await addIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 042 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 042 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 042...');
  await runMigration042();
}

// 直接执行
if (require.main === module) {
  (async () => {
    try {
      await databaseService.init();
      await runMigration042();
      process.exit(0);
    } catch (error) {
      console.error('❌ 迁移执行失败:', error);
      process.exit(1);
    }
  })();
}
