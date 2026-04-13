/**
 * 数据库迁移 043: 添加 wbs_order 列优化排序性能
 *
 * 目标:
 * 1. 为 wbs_tasks 表添加 wbs_order 列 - 存储预计算的排序值
 * 2. 创建索引优化排序查询
 * 3. 更新现有数据的 wbs_order 值
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '043';
const MIGRATION_NAME = 'add_wbs_order_column';

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

async function addWbsOrderColumn(): Promise<boolean> {
  try {
    // 检查列是否已存在
    const hasColumn = await checkColumnExists('wbs_tasks', 'wbs_order');
    if (hasColumn) {
      log('Step 1', 'warning', 'wbs_order 列已存在，跳过');
      return true;
    }

    // 添加 wbs_order 列
    await databaseService.query(`
      ALTER TABLE wbs_tasks
      ADD COLUMN wbs_order VARCHAR(255) DEFAULT NULL COMMENT 'WBS排序路径，格式: 001.002.003'
    `);
    log('Step 1', 'success', 'wbs_order 列添加成功');

    // 添加索引
    await databaseService.query(`
      CREATE INDEX idx_wbs_order ON wbs_tasks (wbs_order)
    `);
    log('Step 2', 'success', 'idx_wbs_order 索引添加成功');

    // 更新现有数据的 wbs_order 值
    // 使用递归 CTE 计算每个任务的排序路径
    await databaseService.query(`
      UPDATE wbs_tasks t
      SET t.wbs_order = (
        SELECT
          CONCAT(
            LPAD(COALESCE(parent3.wbs_code, parent2.wbs_code, parent1.wbs_code, t.wbs_code), 4, '0'),
            '.',
            LPAD(COALESCE(parent2.wbs_code, parent1.wbs_code, t.wbs_code), 4, '0'),
            '.',
            LPAD(COALESCE(parent1.wbs_code, t.wbs_code), 4, '0'),
            '.',
            LPAD(t.wbs_code, 4, '0')
          )
        FROM wbs_tasks t2
        LEFT JOIN wbs_tasks parent1 ON t2.parent_id = parent1.id
        LEFT JOIN wbs_tasks parent2 ON parent1.parent_id = parent2.id
        LEFT JOIN wbs_tasks parent3 ON parent2.parent_id = parent3.id
        WHERE t2.id = t.id
      )
    `);
    log('Step 3', 'success', '现有数据 wbs_order 值更新成功');

    return true;
  } catch (error) {
    log('Steps 1-3', 'error', 'wbs_order 列添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration043(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 043: 添加 wbs_order 列');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 043 已执行，跳过');
      return true;
    }

    const success = await addWbsOrderColumn();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 043 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 043 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 043...');
  await runMigration043();
}

// 直接执行
if (require.main === module) {
  (async () => {
    try {
      await databaseService.init();
      await runMigration043();
      process.exit(0);
    } catch (error) {
      console.error('❌ 迁移执行失败:', error);
      process.exit(1);
    }
  })();
}
