/**
 * 数据库迁移 063: 为 sessions 表添加 device_fingerprint 字段
 *
 * 目标：
 * 1. 添加 device_fingerprint 列用于设备指纹识别
 * 2. 添加复合索引优化查询性能
 */

import { getPool } from '../core/db';
import type { RowDataPacket } from 'mysql2/promise';

const MIGRATION_VERSION = '063';
const MIGRATION_NAME = 'add_device_fingerprint';

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

export async function up(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log(`[Migration ${MIGRATION_VERSION}] Database pool not available, skipping`);
    return;
  }

  console.log(`[Migration ${MIGRATION_VERSION}] 开始添加 device_fingerprint 字段...`);

  // 添加 device_fingerprint 列
  const hasColumn = await columnExists('sessions', 'device_fingerprint');
  if (!hasColumn) {
    await pool.execute(
      `ALTER TABLE sessions ADD COLUMN device_fingerprint VARCHAR(64) NULL COMMENT '设备指纹' AFTER user_agent`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] device_fingerprint 列已添加`);
  } else {
    console.log(`[Migration ${MIGRATION_VERSION}] device_fingerprint 列已存在，跳过`);
  }

  // 添加索引：user_id + status 复合索引
  const hasUserStatusIdx = await indexExists('sessions', 'idx_sessions_user_status');
  if (!hasUserStatusIdx) {
    await pool.execute(
      `ALTER TABLE sessions ADD INDEX idx_sessions_user_status (user_id, status)`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] idx_sessions_user_status 索引已添加`);
  }

  // 添加索引：device_fingerprint
  const hasFingerprintIdx = await indexExists('sessions', 'idx_sessions_fingerprint');
  if (!hasFingerprintIdx) {
    await pool.execute(
      `ALTER TABLE sessions ADD INDEX idx_sessions_fingerprint (device_fingerprint)`
    );
    console.log(`[Migration ${MIGRATION_VERSION}] idx_sessions_fingerprint 索引已添加`);
  }

  console.log(`✅ 迁移 ${MIGRATION_VERSION} 完成！`);
}
