-- ================================================================
-- 实时同步架构 - 数据库迁移脚本
-- 版本: 2.0.0
-- 日期: 2026-02-18
-- ================================================================

-- 1. 操作队列表（支持离线操作）
CREATE TABLE IF NOT EXISTS operation_queue (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='离线操作队列表';

-- 2. 冲突记录表
CREATE TABLE IF NOT EXISTS sync_conflicts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='同步冲突记录表';

-- 3. 数据指纹表（快速检测变化）
CREATE TABLE IF NOT EXISTS data_fingerprints (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据指纹表';

-- 4. 实时锁表（防止并发编辑）
CREATE TABLE IF NOT EXISTS real_time_locks (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时锁表';

-- 5. 变更日志表（用于审计和增量同步）
CREATE TABLE IF NOT EXISTS real_time_change_log (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实时变更日志表';

-- 6. 优化现有全局数据表（MySQL 不支持 IF NOT EXISTS，使用存储过程）
DROP PROCEDURE IF EXISTS add_fingerprint_column;

DELIMITER //
CREATE PROCEDURE add_fingerprint_column()
BEGIN
  -- 添加 fingerprint 列（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'global_data'
    AND column_name = 'fingerprint'
  ) THEN
    ALTER TABLE global_data ADD COLUMN fingerprint VARCHAR(64) NULL COMMENT '数据指纹';
  END IF;

  -- 添加索引（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'global_data'
    AND index_name = 'idx_fingerprint'
  ) THEN
    CREATE INDEX idx_fingerprint ON global_data(fingerprint);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'global_data'
    AND index_name = 'idx_data_type_updated'
  ) THEN
    CREATE INDEX idx_data_type_updated ON global_data(data_type, updated_at);
  END IF;
END//
DELIMITER ;

CALL add_fingerprint_column();
DROP PROCEDURE add_fingerprint_column;

-- 7. 创建视图：数据同步状态
CREATE OR REPLACE VIEW v_sync_status AS
SELECT
    data_type,
    data_id,
    version,
    last_updated_by,
    last_updated_at,
    (SELECT COUNT(*) FROM operation_queue
     WHERE data_type = g.data_type
     AND data_id = g.data_id
     AND status IN ('pending', 'processing')) AS pending_operations,
    (SELECT COUNT(*) FROM sync_conflicts
     WHERE data_type = g.data_type
     AND data_id = g.data_id
     AND status = 'pending') AS active_conflicts,
    (SELECT COUNT(*) FROM real_time_locks
     WHERE data_type = g.data_type
     AND data_id = g.data_id
     AND status = 'active') AS is_locked
FROM global_data g;

-- 8. 存储过程：获取数据指纹
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_get_data_fingerprint(
    IN p_data_type VARCHAR(50),
    IN p_data_id VARCHAR(100)
)
BEGIN
    SELECT fingerprint, version, last_modified_at
    FROM data_fingerprints
    WHERE data_type = p_data_type AND data_id = p_data_id;
END//
DELIMITER ;

-- 9. 存储过程：更新数据指纹
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_update_data_fingerprint(
    IN p_data_type VARCHAR(50),
    IN p_data_id VARCHAR(100),
    IN p_data JSON,
    IN p_username VARCHAR(50)
)
BEGIN
    DECLARE v_fingerprint VARCHAR(64);

    -- 计算 SHA256 指纹
    SET v_fingerprint = SHA2(JSON_EXTRACT(p_data, '$'), 256);

    -- 插入或更新指纹记录
    INSERT INTO data_fingerprints (data_type, data_id, fingerprint, version, last_modified_by)
    VALUES (p_data_type, p_data_id, v_fingerprint, 1, p_username)
    ON DUPLICATE KEY UPDATE
        fingerprint = v_fingerprint,
        version = version + 1,
        last_modified_by = p_username,
        last_modified_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- 10. 定时清理事件（可选）
CREATE EVENT IF NOT EXISTS evt_cleanup_old_data
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    -- 清理7天前的操作记录
    DELETE FROM operation_queue WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

    -- 清理30天前的冲突记录
    DELETE FROM sync_conflicts WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

    -- 清理90天前的变更日志
    DELETE FROM real_time_change_log WHERE changed_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

    -- 清理过期的锁
    DELETE FROM real_time_locks WHERE expires_at < NOW();
END;

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;
