/**
 * 数据库迁移 036: 为 audit_logs 添加 category 字段
 *
 * 目标:
 * 1. 添加 category 字段用于分类（security/project/task/org/config）
 * 2. 添加索引优化查询性能
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '036';
const MIGRATION_NAME = 'add_audit_log_category';

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
    const pool = getPool();
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
  await pool.execute<ResultSetHeader>(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

async function checkFieldExists(tableName: string, fieldName: string): Promise<boolean> {
  const pool = getPool();
  const [columns] = await pool.execute<RowDataPacket[]>(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, fieldName]);
  return columns.length > 0;
}

async function checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  const [indexes] = await pool.execute<RowDataPacket[]>(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
  `, [tableName, indexName]);
  return indexes.length > 0;
}

async function addCategoryField(): Promise<boolean> {
  try {
    const hasCategory = await checkFieldExists('audit_logs', 'category');
    if (hasCategory) {
      log('Step 1', 'warning', 'category 字段已存在，跳过');
      return true;
    }

    const pool = getPool();
    await pool.execute(`
      ALTER TABLE audit_logs
      ADD COLUMN category VARCHAR(20) NULL DEFAULT 'task'
      COMMENT '日志分类: security/project/task/org/config'
      AFTER actor_role
    `);
    log('Step 1', 'success', 'category 字段添加成功');
    return true;
  } catch (error) {
    log('Step 1', 'error', 'category 字段添加失败');
    console.error(error);
    return false;
  }
}

async function addIndexes(): Promise<boolean> {
  try {
    const pool = getPool();
    // 索引1: category + created_at
    const hasCategoryIndex = await checkIndexExists('audit_logs', 'idx_audit_category_time');
    if (!hasCategoryIndex) {
      await pool.execute(`
        CREATE INDEX idx_audit_category_time ON audit_logs (category, created_at DESC)
      `);
      log('Step 2', 'success', 'idx_audit_category_time 索引添加成功');
    } else {
      log('Step 2', 'warning', 'idx_audit_category_time 索引已存在，跳过');
    }

    // 索引2: actor_user_id + created_at
    const hasUserIndex = await checkIndexExists('audit_logs', 'idx_audit_user_time');
    if (!hasUserIndex) {
      await pool.execute(`
        CREATE INDEX idx_audit_user_time ON audit_logs (actor_user_id, created_at DESC)
      `);
      log('Step 3', 'success', 'idx_audit_user_time 索引添加成功');
    } else {
      log('Step 3', 'warning', 'idx_audit_user_time 索引已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 2-3', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

async function updateExistingData(): Promise<boolean> {
  try {
    const pool = getPool();
    // 根据表名更新现有数据的 category
    const updates: Array<{ tables: string[]; category: string }> = [
      { tables: ['users', 'sessions'], category: 'security' },
      { tables: ['projects', 'project_members', 'milestones'], category: 'project' },
      { tables: ['wbs_tasks', 'task_dependencies', 'plan_changes', 'delay_records'], category: 'task' },
      { tables: ['departments', 'members', 'member_capabilities', 'capability_models'], category: 'org' },
      { tables: ['config_project_types', 'config_task_types', 'holidays', 'task_type_model_mapping'], category: 'config' },
    ];

    for (const update of updates) {
      for (const table of update.tables) {
        await pool.execute(
          'UPDATE audit_logs SET category = ? WHERE table_name = ? AND category = ?',
          [update.category, table, 'task']
        );
      }
    }

    log('Step 4', 'success', '现有数据分类更新完成');
    return true;
  } catch (error) {
    log('Step 4', 'warning', '现有数据更新跳过（可能无数据）');
    return true;
  }
}

export async function runMigration036(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 036: 添加 audit_logs.category 字段');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 036 已执行，跳过');
      return true;
    }

    const steps = [
      addCategoryField,
      addIndexes,
      updateExistingData,
    ];

    let allSuccess = true;
    for (const step of steps) {
      const success = await step();
      if (!success) {
        allSuccess = false;
        break;
      }
    }

    if (allSuccess) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 036 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 036 完成！');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 036...');
  await runMigration036();
}
