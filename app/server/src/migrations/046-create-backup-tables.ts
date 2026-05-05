/**
 * 数据库迁移 046: 创建数据备份相关表
 *
 * 目标:
 * 1. 创建 backup_config 表（单行配置表）
 * 2. 创建 backup_records 表（备份记录表）
 * 3. 添加必要的索引
 */

import { getPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const MIGRATION_VERSION = '046';
const MIGRATION_NAME = 'create_backup_tables';

async function isMigrationExecuted(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
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
  if (!pool) return;
  await pool.execute(
    'INSERT INTO migrations (name, version, executed_at) VALUES (?, ?, NOW())',
    [MIGRATION_NAME, MIGRATION_VERSION]
  );
}

/**
 * 创建备份配置表（单行配置）
 */
async function createBackupConfigTable(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS backup_config (
        id VARCHAR(36) PRIMARY KEY COMMENT 'UUID主键',
        backup_interval VARCHAR(20) NOT NULL DEFAULT 'daily' COMMENT '备份间隔: hourly/6hours/daily/weekly/biweekly/monthly',
        target_path VARCHAR(500) NOT NULL DEFAULT './backups/' COMMENT '存储路径',
        retention_count INT NOT NULL DEFAULT 10 COMMENT '保留数量',
        backup_format VARCHAR(10) NOT NULL DEFAULT 'both' COMMENT '备份格式: sql/excel/both',
        remote_type VARCHAR(20) NULL COMMENT '远程类型: local/ssh/ftp/smb',
        remote_host VARCHAR(255) NULL COMMENT '远程主机地址',
        remote_port INT NULL COMMENT '远程端口',
        remote_username VARCHAR(100) NULL COMMENT '远程用户名',
        remote_password_encrypted TEXT NULL COMMENT '加密后的密码',
        enabled BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用自动备份',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='备份配置表'
    `);
    console.log(`✅ [迁移046] backup_config 表创建成功`);

    // 插入默认配置（单行）
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM backup_config'
    );
    if (existing[0].count === 0) {
      await pool.execute(
        `INSERT INTO backup_config (id, backup_interval, target_path, retention_count, backup_format, enabled)
         VALUES (UUID(), 'daily', './backups/', 10, 'both', true)`
      );
      console.log(`✅ [迁移046] 默认备份配置已插入`);
    }

    return true;
  } catch (error) {
    console.error(`❌ [迁移046] 创建 backup_config 表失败:`, error);
    return false;
  }
}

/**
 * 创建备份记录表
 */
async function createBackupRecordsTable(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS backup_records (
        id VARCHAR(36) PRIMARY KEY COMMENT 'UUID主键',
        backup_time DATETIME NOT NULL COMMENT '备份时间',
        backup_type VARCHAR(10) NOT NULL COMMENT '备份类型: auto/manual',
        file_format VARCHAR(10) NOT NULL COMMENT '文件格式: sql/excel/both',
        sql_file_path VARCHAR(500) NULL COMMENT 'SQL文件路径',
        excel_file_path VARCHAR(500) NULL COMMENT 'Excel文件路径',
        file_size_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '文件总大小(字节)',
        status VARCHAR(10) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/running/success/failed',
        operator_id INT NULL COMMENT '操作人ID（手动备份）',
        error_message TEXT NULL COMMENT '错误信息',
        data_snapshot JSON NULL COMMENT '备份时数据统计快照',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_backup_time (backup_time DESC) COMMENT '备份时间索引',
        INDEX idx_backup_status (status) COMMENT '状态索引',
        INDEX idx_backup_type (backup_type) COMMENT '类型索引',
        FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='备份记录表'
    `);
    console.log(`✅ [迁移046] backup_records 表创建成功`);
    return true;
  } catch (error) {
    console.error(`❌ [迁移046] 创建 backup_records 表失败:`, error);
    return false;
  }
}

export async function runMigration046(): Promise<boolean> {
  if (await isMigrationExecuted()) {
    console.log(`📋 [迁移046] 已执行，跳过`);
    return true;
  }

  console.log(`🔄 [迁移046] 开始执行: ${MIGRATION_NAME}`);

  const configTableCreated = await createBackupConfigTable();
  if (!configTableCreated) return false;

  const recordsTableCreated = await createBackupRecordsTable();
  if (!recordsTableCreated) return false;

  await recordMigration();
  console.log(`✅ [迁移046] 迁移完成`);
  return true;
}