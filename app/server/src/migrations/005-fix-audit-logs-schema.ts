/**
 * 数据库迁移 005: 修复 audit_logs 表架构
 *
 * 问题: AuditLogService 尝试插入的列与表定义不匹配
 *
 * 目标:
 * 1. 重命名 id 为 audit_id
 * 2. 重命名 user_id 为 actor_user_id
 * 3. 重命名 username 为 actor_username
 * 4. 添加 actor_role 列
 * 5. 添加 before_data 列
 * 6. 添加 after_data 列
 * 7. 添加 related_operation_id 列
 * 8. 添加 reason 列
 *
 * 回滚:
 * - 005-rollback-fix-audit-logs-schema.ts
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '005';
const MIGRATION_NAME = 'fix_audit_logs_schema';

interface MigrationLog {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const logs: MigrationLog[] = [];

function log(step: string, status: 'success' | 'warning' | 'error', message: string, details?: any) {
  logs.push({ step, status, message, details });
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${step}] ${message}`, details || '');
}

/**
 * 检查迁移是否已执行
 */
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

/**
 * 记录迁移执行
 */
async function recordMigration(): Promise<void> {
  await databaseService.query(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

/**
 * 检查字段是否存在
 */
async function checkFieldExists(tableName: string, fieldName: string): Promise<boolean> {
  const columns = await databaseService.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [tableName, fieldName]) as any[];
  return columns.length > 0;
}

/**
 * 步骤1: 修复 audit_logs 表架构
 */
async function fixAuditLogsSchema(): Promise<boolean> {
  try {
    // 检查表是否需要迁移
    const hasActorUserId = await checkFieldExists('audit_logs', 'actor_user_id');

    if (hasActorUserId) {
      log('Step 1', 'warning', 'audit_logs 表已是新架构，跳过迁移');
      return true;
    }

    // 1. 重命名 id -> audit_id
    try {
      await databaseService.query(`ALTER TABLE audit_logs CHANGE COLUMN id audit_id VARCHAR(36) NOT NULL`);
      log('Step 1', 'success', 'id 列已重命名为 audit_id');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        log('Step 1', 'warning', 'audit_id 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 重命名 user_id -> actor_user_id
    try {
      await databaseService.query(`ALTER TABLE audit_logs CHANGE COLUMN user_id actor_user_id INT NULL`);
      log('Step 1', 'success', 'user_id 列已重命名为 actor_user_id');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        log('Step 1', 'warning', 'actor_user_id 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 重命名 username -> actor_username
    try {
      await databaseService.query(`ALTER TABLE audit_logs CHANGE COLUMN username actor_username VARCHAR(100) NULL`);
      log('Step 1', 'success', 'username 列已重命名为 actor_username');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        log('Step 1', 'warning', 'actor_username 列已存在，跳过');
      } else {
        throw error;
      }
    }

    // 4. 添加 actor_role 列
    const hasActorRole = await checkFieldExists('audit_logs', 'actor_role');
    if (!hasActorRole) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN actor_role VARCHAR(50) NULL AFTER actor_username
      `);
      log('Step 1', 'success', 'actor_role 列添加成功');
    } else {
      log('Step 1', 'warning', 'actor_role 列已存在，跳过');
    }

    // 5. 添加 before_data 列
    const hasBeforeData = await checkFieldExists('audit_logs', 'before_data');
    if (!hasBeforeData) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN before_data JSON NULL AFTER details
      `);
      log('Step 1', 'success', 'before_data 列添加成功');
    } else {
      log('Step 1', 'warning', 'before_data 列已存在，跳过');
    }

    // 6. 添加 after_data 列
    const hasAfterData = await checkFieldExists('audit_logs', 'after_data');
    if (!hasAfterData) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN after_data JSON NULL AFTER before_data
      `);
      log('Step 1', 'success', 'after_data 列添加成功');
    } else {
      log('Step 1', 'warning', 'after_data 列已存在，跳过');
    }

    // 7. 添加 related_operation_id 列
    const hasRelatedOpId = await checkFieldExists('audit_logs', 'related_operation_id');
    if (!hasRelatedOpId) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN related_operation_id VARCHAR(36) NULL AFTER after_data
      `);
      log('Step 1', 'success', 'related_operation_id 列添加成功');
    } else {
      log('Step 1', 'warning', 'related_operation_id 列已存在，跳过');
    }

    // 8. 添加 reason 列
    const hasReason = await checkFieldExists('audit_logs', 'reason');
    if (!hasReason) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN reason VARCHAR(500) NULL AFTER related_operation_id
      `);
      log('Step 1', 'success', 'reason 列添加成功');
    } else {
      log('Step 1', 'warning', 'reason 列已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 1', 'error', '修复 audit_logs 表架构失败', error);
    return false;
  }
}

/**
 * 执行迁移
 */
export async function runMigration005(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 005: 修复 audit_logs 表架构');
  console.log('=' .repeat(70));

  try {
    // 检查是否已执行
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 005 已执行，跳过');
      return true;
    }

    // 执行迁移步骤
    const steps = [
      fixAuditLogsSchema,
    ];

    let allSuccess = true;
    for (const step of steps) {
      const success = await step();
      if (!success) {
        allSuccess = false;
        break;
      }
    }

    // 记录迁移
    if (allSuccess) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    // 输出总结
    console.log('=' .repeat(70));
    console.log('📊 迁移 005 执行总结:');
    console.log(`  总步骤数: ${logs.length}`);
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 005 完成！');
    } else {
      console.log('⚠️ 迁移 005 完成，但存在警告或错误');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

// 导出自动运行函数
export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 005...');
  await runMigration005();
}
