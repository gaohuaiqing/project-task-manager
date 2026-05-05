/**
 * 数据库迁移 051: 修复 audit_logs 表目标字段
 *
 * 问题: audit_logs 表可能缺少 target_id, target_type, target_name 字段
 *
 * 目标:
 * 1. 添加 target_id 字段（VARCHAR 类型，支持 UUID）
 * 2. 添加 target_type 字段
 * 3. 添加 target_name 字段
 */

import { databaseService } from '../services/DatabaseService.js';

const MIGRATION_VERSION = '051';
const MIGRATION_NAME = 'fix_audit_logs_target_fields';

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

async function fixAuditLogsTargetFields(): Promise<boolean> {
  try {
    // 检查 target_id 字段
    const hasTargetId = await checkFieldExists('audit_logs', 'target_id');
    if (!hasTargetId) {
      // 检查是否有旧的 record_id 字段需要重命名
      const hasRecordId = await checkFieldExists('audit_logs', 'record_id');
      if (hasRecordId) {
        // 重命名 record_id -> target_id，并改为 VARCHAR 类型
        await databaseService.query(`
          ALTER TABLE audit_logs
          CHANGE COLUMN record_id target_id VARCHAR(36) NULL
        `);
        log('Step 1', 'success', 'record_id 重命名为 target_id，类型改为 VARCHAR(36)');
      } else {
        // 直接添加 target_id 字段
        await databaseService.query(`
          ALTER TABLE audit_logs
          ADD COLUMN target_id VARCHAR(36) NULL AFTER category
        `);
        log('Step 1', 'success', 'target_id 字段添加成功');
      }
    } else {
      log('Step 1', 'warning', 'target_id 字段已存在，跳过');
    }

    // 检查 target_type 字段
    const hasTargetType = await checkFieldExists('audit_logs', 'target_type');
    if (!hasTargetType) {
      // 检查是否有旧的 table_name 字段需要重命名
      const hasTableName = await checkFieldExists('audit_logs', 'table_name');
      if (hasTableName) {
        await databaseService.query(`
          ALTER TABLE audit_logs
          CHANGE COLUMN table_name target_type VARCHAR(100) NULL
        `);
        log('Step 2', 'success', 'table_name 重命名为 target_type');
      } else {
        await databaseService.query(`
          ALTER TABLE audit_logs
          ADD COLUMN target_type VARCHAR(100) NULL AFTER target_id
        `);
        log('Step 2', 'success', 'target_type 字段添加成功');
      }
    } else {
      log('Step 2', 'warning', 'target_type 字段已存在，跳过');
    }

    // 检查 target_name 字段
    const hasTargetName = await checkFieldExists('audit_logs', 'target_name');
    if (!hasTargetName) {
      await databaseService.query(`
        ALTER TABLE audit_logs
        ADD COLUMN target_name VARCHAR(255) NULL AFTER target_type
      `);
      log('Step 3', 'success', 'target_name 字段添加成功');
    } else {
      log('Step 3', 'warning', 'target_name 字段已存在，跳过');
    }

    return true;
  } catch (error) {
    log('Step 1-3', 'error', '修复 audit_logs 目标字段失败');
    console.error(error);
    return false;
  }
}

export async function runMigration051(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 051: 修复 audit_logs 目标字段');
  console.log('='.repeat(70));

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 051 已执行，跳过');
      return true;
    }

    const steps = [
      fixAuditLogsTargetFields,
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
    console.log('📊 迁移 051 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (allSuccess) {
      console.log('🎉 迁移 051 完成！');
    }

    return allSuccess;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 051...');
  await runMigration051();
}