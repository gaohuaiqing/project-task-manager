/**
 * 数据库迁移 038: 为 audit_logs 添加性能优化索引
 *
 * 目标:
 * 1. 添加 created_at DESC 索引 - 优化按时间倒序查询
 * 2. 添加 operation_type 索引 - 优化按操作类型筛选
 * 3. 添加 (target_type, target_id) 索引 - 优化按目标对象查询
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '038';
const MIGRATION_NAME = 'add_audit_log_indexes';

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
    // 索引1: created_at DESC - 优化时间倒序查询（最常见的查询模式）
    const hasCreatedAtIndex = await checkIndexExists('audit_logs', 'idx_audit_created_at');
    if (!hasCreatedAtIndex) {
      await databaseService.query(`
        CREATE INDEX idx_audit_created_at ON audit_logs (created_at DESC)
      `);
      log('Step 1', 'success', 'idx_audit_created_at 索引添加成功');
    } else {
      log('Step 1', 'warning', 'idx_audit_created_at 索引已存在，跳过');
    }

    // 索引2: operation_type - 优化按操作类型筛选
    const hasOperationIndex = await checkIndexExists('audit_logs', 'idx_audit_operation_type');
    if (!hasOperationIndex) {
      await databaseService.query(`
        CREATE INDEX idx_audit_operation_type ON audit_logs (operation_type)
      `);
      log('Step 2', 'success', 'idx_audit_operation_type 索引添加成功');
    } else {
      log('Step 2', 'warning', 'idx_audit_operation_type 索引已存在，跳过');
    }

    // 索引3: (target_type, target_id) - 优化按目标对象查询
    const hasTargetIndex = await checkIndexExists('audit_logs', 'idx_audit_target');
    if (!hasTargetIndex) {
      await databaseService.query(`
        CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id)
      `);
      log('Step 3', 'success', 'idx_audit_target 索引添加成功');
    } else {
      log('Step 3', 'warning', 'idx_audit_target 索引已存在，跳过');
    }

    // 索引4: 复合索引 (category, created_at DESC, operation_type) - 覆盖常见查询组合
    const hasCompositeIndex = await checkIndexExists('audit_logs', 'idx_audit_composite_query');
    if (!hasCompositeIndex) {
      await databaseService.query(`
        CREATE INDEX idx_audit_composite_query ON audit_logs (category, created_at DESC, operation_type)
      `);
      log('Step 4', 'success', 'idx_audit_composite_query 索引添加成功');
    } else {
      log('Step 4', 'warning', 'idx_audit_composite_query 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 1-4', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration038(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 038: 添加 audit_logs 性能索引');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 038 已执行，跳过');
      return true;
    }

    const success = await addIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 038 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 038 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 038...');
  await runMigration038();
}
