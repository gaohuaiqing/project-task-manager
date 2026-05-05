/**
 * 数据库迁移 062: 修复 sort_order 为 NULL 的任务数据
 *
 * 问题：创建任务时未设置 sort_order，导致排序混乱
 * 解决：按项目和父任务分组，为 NULL 的 sort_order 重新计算
 */

import { databaseService } from '../services/DatabaseService';

const MIGRATION_VERSION = '062';
const MIGRATION_NAME = 'fix_null_sort_order';

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

async function fixNullSortOrder(): Promise<boolean> {
  try {
    // 检查是否有 sort_order 为 NULL 的任务
    const nullCountResult = await databaseService.query(
      'SELECT COUNT(*) as count FROM wbs_tasks WHERE sort_order IS NULL'
    ) as any[];
    const nullCount = nullCountResult[0]?.count || 0;

    if (nullCount === 0) {
      log('Step 1', 'success', '没有 sort_order 为 NULL 的任务，无需修复');
      return true;
    }

    log('Step 1', 'warning', `发现 ${nullCount} 个 sort_order 为 NULL 的任务`);

    // 获取所有需要修复的项目和父任务组合
    const groups = await databaseService.query(`
      SELECT DISTINCT project_id, parent_id
      FROM wbs_tasks
      WHERE sort_order IS NULL
    `) as any[];

    log('Step 2', 'success', `需要处理 ${groups.length} 个分组`);

    // 对每个分组进行修复
    for (const group of groups) {
      const { project_id, parent_id } = group;

      // 获取该分组内的所有任务（包括已有 sort_order 的）
      const tasks = await databaseService.query(`
        SELECT id, sort_order, created_at
        FROM wbs_tasks
        WHERE project_id = ? AND parent_id ${parent_id ? '= ?' : 'IS NULL'}
        ORDER BY COALESCE(sort_order, 999999999), created_at ASC
      `, parent_id ? [project_id, parent_id] : [project_id]) as any[];

      // 找到当前最大的 sort_order
      const existingMaxOrder = Math.max(0, ...tasks.filter(t => t.sort_order !== null).map(t => t.sort_order));

      // 为 NULL 的任务分配 sort_order
      let nextOrder = existingMaxOrder + 100;
      for (const task of tasks) {
        if (task.sort_order === null) {
          await databaseService.query(
            'UPDATE wbs_tasks SET sort_order = ? WHERE id = ?',
            [nextOrder, task.id]
          );
          nextOrder += 100;
        }
      }
    }

    log('Step 3', 'success', '所有 NULL sort_order 已修复');

    return true;
  } catch (error) {
    log('Steps 1-3', 'error', '修复 sort_order 失败');
    console.error(error);
    return false;
  }
}

export async function runMigration062(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 062: 修复 sort_order NULL 值');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 062 已执行，跳过');
      return true;
    }

    const success = await fixNullSortOrder();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 062 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 062 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 062...');
  await runMigration062();
}
