/**
 * 数据库迁移 047: 添加缺失的查询优化索引
 *
 * 目标:
 * 1. 为 notifications 表添加 (user_id, is_read) 复合索引 - 优化通知查询和批量标记已读
 * 2. 为 audit_logs 表添加 (actor_user_id, created_at) 复合索引 - 优化按用户查询操作日志
 *
 * 风险评估:
 * - notifications 表：低风险（小表，索引创建时间短）
 * - audit_logs 表：中等风险（需评估数据量，建议夜间执行）
 *
 * 预期效果:
 * - 通知列表查询性能提升 5-10 倍
 * - 批量标记已读性能提升 5-10 倍
 * - 用户操作日志查询性能提升 10-50 倍
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '047';
const MIGRATION_NAME = 'add_missing_query_indexes';

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

async function checkTableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function addMissingIndexes(): Promise<boolean> {
  const pool = getPool();

  try {
    // ========== notifications 表复合索引 ==========

    // 检查表是否存在
    const notificationsExists = await checkTableExists('notifications');
    if (!notificationsExists) {
      log('Step 1', 'warning', 'notifications 表不存在，跳过索引添加');
    } else {
      // 索引1: (user_id, is_read) - 优化通知列表查询和批量标记已读
      // 查询模式: WHERE user_id = ? AND is_read = ?
      // 更新模式: UPDATE ... WHERE user_id = ? AND is_read = false
      const hasUserReadIndex = await checkIndexExists('notifications', 'idx_notifications_user_read');
      if (!hasUserReadIndex) {
        await pool.execute(
          'CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read)'
        );
        log('Step 1', 'success', 'idx_notifications_user_read 索引添加成功 - 通知查询优化（预计5-10倍提升）');
      } else {
        log('Step 1', 'warning', 'idx_notifications_user_read 索引已存在，跳过');
      }
    }

    // ========== audit_logs 表复合索引 ==========

    const auditLogsExists = await checkTableExists('audit_logs');
    if (!auditLogsExists) {
      log('Step 2', 'warning', 'audit_logs 表不存在，跳过索引添加');
    } else {
      // 索引2: (actor_user_id, created_at DESC) - 优化按用户查询操作日志
      // 查询模式: WHERE actor_user_id = ? ORDER BY created_at DESC
      const hasActorIndex = await checkIndexExists('audit_logs', 'idx_audit_actor_time');
      if (!hasActorIndex) {
        // 使用 ALGORITHM=INPLACE, LOCK=NONE 避免锁表（MySQL 5.6+）
        await pool.execute(
          'CREATE INDEX idx_audit_actor_time ON audit_logs (actor_user_id, created_at DESC) ALGORITHM=INPLACE LOCK=NONE'
        );
        log('Step 2', 'success', 'idx_audit_actor_time 索引添加成功 - 用户操作日志查询优化（预计10-50倍提升）');
      } else {
        log('Step 2', 'warning', 'idx_audit_actor_time 索引已存在，跳过');
      }

      // 索引3: (target_type, created_at DESC) - 优化按目标类型查询变更记录
      // 查询模式: WHERE target_type = ? ORDER BY created_at DESC
      // 检查 target_type 列是否存在（原 table_name 列不存在）
      const [targetTypeCol] = await pool.execute<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'target_type'`
      );
      if (targetTypeCol.length > 0) {
        const hasTableTimeIndex = await checkIndexExists('audit_logs', 'idx_audit_target_time');
        if (!hasTableTimeIndex) {
          await pool.execute(
            'CREATE INDEX idx_audit_target_time ON audit_logs (target_type, created_at DESC) ALGORITHM=INPLACE LOCK=NONE'
          );
          log('Step 3', 'success', 'idx_audit_target_time 索引添加成功 - 目标类型变更记录查询优化');
        } else {
          log('Step 3', 'warning', 'idx_audit_target_time 索引已存在，跳过');
        }
      } else {
        log('Step 3', 'warning', 'audit_logs 表无 target_type 列，跳过索引');
      }
    }

    return true;
  } catch (error) {
    log('Steps 1-3', 'error', '索引添加失败');
    console.error(error);
    return false;
  }
}

export async function runMigration047(): Promise<boolean> {
  console.log('🚀 开始执行数据库迁移 047: 添加缺失的查询优化索引');
  console.log('='.repeat(70));
  console.log('⚠️ 注意：audit_logs 表索引创建可能需要30-60秒（取决于数据量）');
  console.log('建议在低峰期执行，避免影响在线服务');

  try {
    if (await checkMigrationExecuted()) {
      console.log('📋 迁移 047 已执行，跳过');
      return true;
    }

    const success = await addMissingIndexes();

    if (success) {
      await recordMigration();
      console.log('📝 迁移记录已保存');
    }

    console.log('='.repeat(70));
    console.log('📊 迁移 047 执行总结:');
    console.log(`  成功: ${logs.filter(l => l.status === 'success').length}`);
    console.log(`  警告: ${logs.filter(l => l.status === 'warning').length}`);
    console.log(`  失败: ${logs.filter(l => l.status === 'error').length}`);

    if (success) {
      console.log('🎉 迁移 047 完成！');
    }

    return success;
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

export async function runPendingMigrations(): Promise<void> {
  console.log('🔍 检查待执行的数据库迁移 047...');
  await runMigration047();
}