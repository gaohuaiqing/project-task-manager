/**
 * 数据库迁移脚本 - 实时同步架构 v2（简化版）
 * 运行方式: node migrations/migrate-002.js
 */

import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_manager',
  multipleStatements: false // 禁用多语句执行，逐个执行
};

const MIGRATIONS = [
  // 1. 操作队列表
  `CREATE TABLE IF NOT EXISTS operation_queue (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operation_id VARCHAR(36) UNIQUE NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    operation_type ENUM('create', 'update', 'delete') NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_id VARCHAR(100) NOT NULL,
    data_json JSON NOT NULL,
    expected_version INT DEFAULT 0,
    priority INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_session_status (session_id, status),
    INDEX idx_data_type_id (data_type, data_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status_priority (status, priority)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='离线操作队列表'`,

  // 2. 冲突记录表
  `CREATE TABLE IF NOT EXISTS sync_conflicts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conflict_id VARCHAR(36) UNIQUE NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_id VARCHAR(100) NOT NULL,
    conflict_type ENUM('version', 'delete', 'dependency', 'permission') NOT NULL,
    local_version INT NOT NULL,
    remote_version INT NOT NULL,
    local_data JSON NOT NULL,
    remote_data JSON NOT NULL,
    detected_by VARCHAR(50) NOT NULL,
    status ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
    resolution_method VARCHAR(50) NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_data_status (data_type, data_id, status),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同步冲突记录表'`,

  // 3. 数据指纹表
  `CREATE TABLE IF NOT EXISTS data_fingerprints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    data_type VARCHAR(50) NOT NULL,
    data_id VARCHAR(100) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL COMMENT 'SHA256哈希值',
    version INT NOT NULL DEFAULT 1,
    last_modified_by VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) DEFAULT 0,
    UNIQUE KEY uk_data (data_type, data_id),
    INDEX idx_fingerprint (fingerprint),
    INDEX idx_data_type (data_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据指纹表'`,

  // 4. 实时锁表
  `CREATE TABLE IF NOT EXISTS real_time_locks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    lock_id VARCHAR(36) UNIQUE NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_id VARCHAR(100) NOT NULL,
    locked_by VARCHAR(50) NOT NULL,
    locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    status ENUM('active', 'released') DEFAULT 'active',
    UNIQUE KEY uk_data_lock (data_type, data_id, status),
    INDEX idx_expires (expires_at, status),
    INDEX idx_locked_by (locked_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时锁表'`,

  // 5. 变更日志表
  `CREATE TABLE IF NOT EXISTS real_time_change_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    change_id VARCHAR(36) UNIQUE NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_id VARCHAR(100) NOT NULL,
    operation_type ENUM('create', 'update', 'delete') NOT NULL,
    old_data JSON NULL,
    new_data JSON NULL,
    changed_fields JSON NULL COMMENT '变更的字段列表',
    version INT NOT NULL,
    changed_by VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(36) NOT NULL,
    ip_address VARCHAR(45) NULL,
    INDEX idx_data_type_time (data_type, changed_at),
    INDEX idx_changed_by (changed_by, changed_at),
    INDEX idx_data_id (data_type, data_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时变更日志表'`
];

async function runMigration() {
  let connection;

  try {
    console.log('[Migration] 开始连接数据库...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[Migration] 数据库连接成功');

    // 执行每个迁移
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const sql = MIGRATIONS[i];
      console.log(`[Migration] 执行迁移 ${i + 1}/${MIGRATIONS.length}...`);

      try {
        await connection.query(sql);
        console.log(`[Migration] ✅ 迁移 ${i + 1} 成功`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`[Migration] ⚠️  表已存在，跳过`);
        } else {
          throw err;
        }
      }
    }

    console.log('[Migration] ✅ 所有迁移成功完成！');

    // 启用事件调度器
    try {
      await connection.query('SET GLOBAL event_scheduler = ON');
      console.log('[Migration] ✅ 事件调度器已启用');
    } catch (error) {
      console.warn('[Migration] ⚠️  无法启用事件调度器（需要SUPER权限）');
    }

    // 显示创建的表
    const [tables] = await connection.query("SHOW TABLES LIKE 'real_time_%' OR SHOW TABLES LIKE '%_queue' OR SHOW TABLES LIKE '%_conflicts' OR SHOW TABLES LIKE 'data_fingerprints'");
    console.log('[Migration] 创建的表:', tables.map(row => Object.values(row)[0]));

  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
runMigration();
