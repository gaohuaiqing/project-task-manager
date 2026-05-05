/**
 * 数据库迁移 061: WBS 编码优化
 *
 * 变更内容：
 * 1. 删除 wbs_code 列（不再存储，改为实时计算）
 * 2. 删除 wbs_order 列（不再存储）
 * 3. 新增 sort_order 列（手动排序值）
 * 4. 清空现有测试数据
 */

import { databaseService } from '../services/DatabaseService';

const MIGRATION_VERSION = '061';
const MIGRATION_NAME = 'wbs_code_optimization';

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

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const columns = await databaseService.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, columnName]) as any[];
  return columns.length > 0;
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

async function executeMigration(): Promise<boolean> {
  try {
    // Step 1: 清空现有测试数据
    log('Step 1', 'warning', '清空 wbs_tasks 表测试数据...');
    await databaseService.query('DELETE FROM wbs_tasks');
    log('Step 1', 'success', '测试数据已清空');

    // Step 2: 删除 wbs_code 列
    const hasWbsCode = await checkColumnExists('wbs_tasks', 'wbs_code');
    if (hasWbsCode) {
      // 先删除相关索引
      const hasWbsCodeIndex = await checkIndexExists('wbs_tasks', 'idx_wbs_code');
      if (hasWbsCodeIndex) {
        await databaseService.query('ALTER TABLE wbs_tasks DROP INDEX idx_wbs_code');
        log('Step 2a', 'success', 'idx_wbs_code 索引已删除');
      }
      await databaseService.query('ALTER TABLE wbs_tasks DROP COLUMN wbs_code');
      log('Step 2b', 'success', 'wbs_code 列已删除');
    } else {
      log('Step 2', 'warning', 'wbs_code 列不存在，跳过');
    }

    // Step 3: 删除 wbs_order 列
    const hasWbsOrder = await checkColumnExists('wbs_tasks', 'wbs_order');
    if (hasWbsOrder) {
      // 先删除相关索引
      const hasWbsOrderIndex = await checkIndexExists('wbs_tasks', 'idx_wbs_order');
      if (hasWbsOrderIndex) {
        await databaseService.query('ALTER TABLE wbs_tasks DROP INDEX idx_wbs_order');
        log('Step 3a', 'success', 'idx_wbs_order 索引已删除');
      }
      await databaseService.query('ALTER TABLE wbs_tasks DROP COLUMN wbs_order');
      log('Step 3b', 'success', 'wbs_order 列已删除');
    } else {
      log('Step 3', 'warning', 'wbs_order 列不存在，跳过');
    }

    // Step 4: 新增 sort_order 列
    const hasSortOrder = await checkColumnExists('wbs_tasks', 'sort_order');
    if (!hasSortOrder) {
      await databaseService.query(`
        ALTER TABLE wbs_tasks
        ADD COLUMN sort_order INT DEFAULT NULL COMMENT '手动排序值，拖拽后存储'
      `);
      await databaseService.query(`
        CREATE INDEX idx_sort_order ON wbs_tasks (project_id, parent_id, sort_order)
      `);
      log('Step 4', 'success', 'sort_order 列和索引已添加');
    } else {
      log('Step 4', 'warning', 'sort_order 列已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Migration', 'error', '迁移执行失败');
    console.error(error);
    return false;
  }
}

export async function runMigration061(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 061: WBS 编码优化');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 061 已执行，跳过');
      return true;
    }

    const success = await executeMigration();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 061 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 061 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 061...');
  await runMigration061();
}
