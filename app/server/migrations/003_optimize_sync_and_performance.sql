-- ============================================================================
-- Project_Task_Manager_3.0 数据库优化迁移脚本
-- 版本: 003
-- 目标: 优化同步机制和性能
-- 日期: 2026-02-18
-- ============================================================================

-- ============================================================================
-- 第一部分: 全局数据表优化
-- ============================================================================

-- 1.1 添加数据指纹和压缩支持
ALTER TABLE global_data
ADD COLUMN IF NOT EXISTS fingerprint CHAR(64) AS (SHA2(JSON_EXTRACT(data_json, '$'), 256)) STORED COMMENT '数据指纹（SHA-256）',
ADD COLUMN IF NOT EXISTS data_size INT UNSIGNED AS (JSON_LENGTH(data_json)) STORED COMMENT '数据大小（字节）',
ADD COLUMN IF NOT EXISTS compressed LONGBLOB NULL COMMENT '压缩数据（大于10KB时启用）',
ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE COMMENT '是否已压缩';

-- 1.2 添加索引
ALTER TABLE global_data
ADD INDEX IF NOT EXISTS idx_fingerprint (fingerprint(8));

-- 1.3 添加数据版本信息
ALTER TABLE global_data
ADD COLUMN IF NOT EXISTS last_modified_by INT NULL COMMENT '最后修改者ID',
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP NULL COMMENT '最后修改时间',
ADD FOREIGN KEY IF NOT EXISTS fk_last_modified_by (last_modified_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 第二部分: 节假日表（新增）
-- ============================================================================

-- 2.1 创建节假日主表
CREATE TABLE IF NOT EXISTS holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '节假日名称',
  holiday_date DATE NOT NULL COMMENT '节假日日期',
  end_date DATE NULL COMMENT '结束日期（NULL表示单日）',
  is_range BOOLEAN DEFAULT FALSE COMMENT '是否为日期范围',
  description TEXT COMMENT '节假日描述',
  year INT NOT NULL COMMENT '年份（用于快速查询）',
  month TINYINT NOT NULL COMMENT '月份（1-12）',
  day TINYINT NOT NULL COMMENT '日期（1-31）',
  version INT DEFAULT 1 COMMENT '版本号',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_date (holiday_date),
  INDEX idx_year_month (year, month),
  INDEX idx_range (holiday_date, end_date),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (year) (
  PARTITION p_2024 VALUES LESS THAN (2025),
  PARTITION p_2025 VALUES LESS THAN (2026),
  PARTITION p_2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 2.2 创建节假日变更日志表
CREATE TABLE IF NOT EXISTS holiday_change_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  holiday_id INT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  old_value JSON,
  new_value JSON,
  changed_by INT NOT NULL,
  change_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_holiday_id (holiday_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (holiday_id) REFERENCES holidays(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 迁移现有节假日数据（从 localStorage 或 global_data）
INSERT INTO holidays (name, holiday_date, end_date, is_range, description, year, month, day, created_by)
SELECT
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.name')),
    STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d'),
    CASE
        WHEN JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.type')) = 'range'
        THEN STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.endDate')), '%Y-%m-%d')
        ELSE NULL
    END,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.type')) = 'range',
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.description')),
    YEAR(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
    MONTH(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
    DAY(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.date')), '%Y-%m-%d')),
    1  -- 默认管理员
FROM global_data
WHERE data_type = 'holidays'
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 第三部分: 数据同步状态表（新增）
-- ============================================================================

-- 3.1 创建客户端同步状态表
CREATE TABLE IF NOT EXISTS client_sync_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL COMMENT '设备唯一标识',
  session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
  data_type VARCHAR(50) NOT NULL COMMENT '数据类型',
  last_sync_version INT DEFAULT 0 COMMENT '最后同步的版本号',
  last_sync_time TIMESTAMP NULL COMMENT '最后同步时间',
  pending_changes INT DEFAULT 0 COMMENT '待同步变更数量',
  client_fingerprint CHAR(64) NULL COMMENT '客户端数据指纹',
  is_offline BOOLEAN DEFAULT FALSE COMMENT '是否离线',
  last_online_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后在线时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_device_type (user_id, device_id, data_type),
  INDEX idx_user_id (user_id),
  INDEX idx_last_sync_time (last_sync_time),
  INDEX idx_pending_changes (pending_changes),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 创建离线操作队列表
CREATE TABLE IF NOT EXISTS offline_operation_queue (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  operation_id VARCHAR(255) UNIQUE NOT NULL,
  operation_type ENUM('create', 'update', 'delete') NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  data_id VARCHAR(255) NOT NULL,
  data_json JSON NOT NULL,
  expected_version INT NULL,
  status ENUM('pending', 'conflict', 'failed', 'synced') DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL,
  INDEX idx_user_device (user_id, device_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 第四部分: 增量同步支持表（新增）
-- ============================================================================

-- 4.1 创建数据变更事件表
CREATE TABLE IF NOT EXISTS data_change_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id CHAR(36) NOT NULL COMMENT '唯一事件ID（UUID）',
  data_type VARCHAR(50) NOT NULL,
  data_id VARCHAR(255) NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  data_version INT NOT NULL COMMENT '数据版本号',
  data_snapshot JSON NULL COMMENT '数据快照（用于冲突解决）',
  fingerprint CHAR(64) NOT NULL COMMENT '数据指纹',
  changed_by INT NOT NULL,
  change_reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_count INT DEFAULT 0 COMMENT '已处理的客户端数量',
  UNIQUE KEY uk_event_id (event_id),
  INDEX idx_data_type_id (data_type, data_id),
  INDEX idx_created_at (created_at),
  INDEX idx_data_type_created (data_type, created_at),
  INDEX idx_fingerprint (fingerprint(8)),
  FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
  PARTITION p_7days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 7 DAY))),
  PARTITION p_30days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 30 DAY))),
  PARTITION p_90days VALUES LESS THAN (UNIX_TIMESTAMP(DATE_ADD(NOW(), INTERVAL 90 DAY))),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 4.2 创建客户端事件处理跟踪表
CREATE TABLE IF NOT EXISTS client_event_tracking (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  event_id CHAR(36) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_device_event (user_id, device_id, event_id),
  INDEX idx_user_device (user_id, device_id),
  INDEX idx_event_id (event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES data_change_events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 第五部分: WBS 任务表优化
-- ============================================================================

-- 5.1 添加完整路径生成列
ALTER TABLE wbs_tasks
ADD COLUMN IF NOT EXISTS full_path VARCHAR(500) GENERATED ALWAYS AS (
  CONCAT(
    COALESCE((SELECT CONCAT(task_code, '.') FROM wbs_tasks parent WHERE parent.id = wbs_tasks.parent_id), ''),
    task_code
  )
) STORED COMMENT '完整WBS路径';

-- 5.2 添加优化索引
ALTER TABLE wbs_tasks
ADD INDEX IF NOT EXISTS idx_full_path (full_path),
ADD INDEX IF NOT EXISTS idx_assignee_status (assignee_id, status),
ADD INDEX IF NOT EXISTS idx_dates (planned_start_date, planned_end_date),
ADD INDEX IF NOT EXISTS idx_project_status (project_id, status);

-- 5.3 创建任务依赖关系表
CREATE TABLE IF NOT EXISTS wbs_task_dependencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  predecessor_id INT NOT NULL COMMENT '前置任务ID',
  successor_id INT NOT NULL COMMENT '后置任务ID',
  dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
  lag_days INT DEFAULT 0 COMMENT '延后天数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_predecessor_successor (predecessor_id, successor_id),
  INDEX idx_predecessor (predecessor_id),
  INDEX idx_successor (successor_id),
  FOREIGN KEY (predecessor_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (successor_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 第六部分: 性能优化视图和存储过程
-- ============================================================================

-- 6.1 创建数据指纹视图（用于快速比对）
CREATE OR REPLACE VIEW v_data_fingerprints AS
SELECT
    data_type,
    data_id,
    fingerprint,
    version,
    updated_at,
    data_size
FROM global_data
WHERE updated_at > DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 6.2 创建同步状态视图
CREATE OR REPLACE VIEW v_sync_status AS
SELECT
    css.user_id,
    u.username,
    css.data_type,
    css.last_sync_version,
    css.last_sync_time,
    css.pending_changes,
    css.is_offline,
    CASE
        WHEN css.last_sync_time < DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'stale'
        WHEN css.pending_changes > 10 THEN 'lagging'
        ELSE 'synced'
    END AS sync_health
FROM client_sync_status css
JOIN users u ON css.user_id = u.id;

-- 6.3 创建性能统计存储过程
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS sp_cleanup_old_events(IN days_to_keep INT)
BEGIN
    DECLARE deleted_count INT;

    -- 删除旧的变更事件
    DELETE FROM data_change_events
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

    SET deleted_count = ROW_COUNT();

    -- 清理相关的事件跟踪记录
    DELETE FROM client_event_tracking
    WHERE event_id NOT IN (SELECT event_id FROM data_change_events);

    SELECT CONCAT('已删除 ', deleted_count, ' 条旧事件记录') AS result;
END$$

CREATE PROCEDURE IF NOT EXISTS sp_compress_large_data(IN size_threshold INT)
BEGIN
    DECLARE updated_count INT DEFAULT 0;

    -- 压缩大型数据
    UPDATE global_data
    SET
        compressed = COMPRESS(data_json),
        is_compressed = TRUE
    WHERE
        data_size > size_threshold
        AND is_compressed = FALSE;

    SET updated_count = ROW_COUNT();

    SELECT CONCAT('已压缩 ', updated_count, ' 条数据') AS result;
END$$

CREATE PROCEDURE IF NOT EXISTS sp_get_sync_summary(IN user_id_param INT)
BEGIN
    SELECT
        data_type,
        COUNT(*) AS total_records,
        SUM(CASE WHEN last_sync_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) AS synced_count,
        SUM(pending_changes) AS total_pending,
        MAX(last_sync_time) AS last_sync_time
    FROM client_sync_status
    WHERE user_id = user_id_param
    GROUP BY data_type;
END$$

DELIMITER ;

-- ============================================================================
-- 第七部分: 触发器（自动维护）
-- ============================================================================

-- 7.1 全局数据变更触发器（记录变更事件）
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_global_data_after_insert
AFTER INSERT ON global_data
FOR EACH ROW
BEGIN
    INSERT INTO data_change_events (
        event_id,
        data_type,
        data_id,
        action,
        data_version,
        data_snapshot,
        fingerprint,
        changed_by,
        created_at
    ) VALUES (
        UUID(),
        NEW.data_type,
        NEW.data_id,
        'create',
        NEW.version,
        NEW.data_json,
        NEW.fingerprint,
        NEW.created_by,
        NOW()
    );
END$$

CREATE TRIGGER IF NOT EXISTS tr_global_data_after_update
AFTER UPDATE ON global_data
FOR EACH ROW
BEGIN
    -- 只在数据实际变更时记录事件
    IF OLD.data_json != NEW.data_json OR OLD.fingerprint != NEW.fingerprint THEN
        INSERT INTO data_change_events (
            event_id,
            data_type,
            data_id,
            action,
            data_version,
            data_snapshot,
            fingerprint,
            changed_by,
            created_at
        ) VALUES (
            UUID(),
            NEW.data_type,
            NEW.data_id,
            'update',
            NEW.version,
            NEW.data_json,
            NEW.fingerprint,
            NEW.updated_by,
            NOW()
        );
    END IF;
END$$

CREATE TRIGGER IF NOT EXISTS tr_global_data_after_delete
AFTER DELETE ON global_data
FOR EACH ROW
BEGIN
    INSERT INTO data_change_events (
        event_id,
        data_type,
        data_id,
        action,
        data_version,
        data_snapshot,
        fingerprint,
        changed_by,
        created_at
    ) VALUES (
        UUID(),
        OLD.data_type,
        OLD.data_id,
        'delete',
        OLD.version,
        OLD.data_json,
        OLD.fingerprint,
        OLD.updated_by,
        NOW()
    );
END$$

DELIMITER ;

-- 7.2 节假日变更触发器
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_holidays_after_insert
AFTER INSERT ON holidays
FOR EACH ROW
BEGIN
    INSERT INTO holiday_change_log (
        holiday_id,
        action,
        new_value,
        changed_by
    ) VALUES (
        NEW.id,
        'create',
        JSON_OBJECT(
            'name', NEW.name,
            'date', NEW.holiday_date,
            'endDate', NEW.end_date,
            'description', NEW.description
        ),
        NEW.created_by
    );
END$$

CREATE TRIGGER IF NOT EXISTS tr_holidays_after_update
AFTER UPDATE ON holidays
FOR EACH ROW
BEGIN
    INSERT INTO holiday_change_log (
        holiday_id,
        action,
        old_value,
        new_value,
        changed_by
    ) VALUES (
        NEW.id,
        'update',
        JSON_OBJECT(
            'name', OLD.name,
            'date', OLD.holiday_date,
            'endDate', OLD.end_date,
            'description', OLD.description
        ),
        JSON_OBJECT(
            'name', NEW.name,
            'date', NEW.holiday_date,
            'endDate', NEW.end_date,
            'description', NEW.description
        ),
        NEW.created_by
    );
END$$

CREATE TRIGGER IF NOT EXISTS tr_holidays_after_delete
AFTER DELETE ON holidays
FOR EACH ROW
BEGIN
    INSERT INTO holiday_change_log (
        holiday_id,
        action,
        old_value,
        changed_by
    ) VALUES (
        OLD.id,
        'delete',
        JSON_OBJECT(
            'name', OLD.name,
            'date', OLD.holiday_date,
            'endDate', OLD.end_date,
            'description', OLD.description
        ),
        OLD.created_by
    );
END$$

DELIMITER ;

-- ============================================================================
-- 第八部分: 初始化数据
-- ============================================================================

-- 8.1 创建默认节假日（2026年）
INSERT INTO holidays (name, holiday_date, end_date, is_range, description, year, month, day, created_by) VALUES
('元旦', '2026-01-01', NULL, FALSE, '元旦节', 2026, 1, 1, 1),
('春节', '2026-02-10', '2026-02-17', TRUE, '春节假期', 2026, 2, 10, 1),
('清明节', '2026-04-04', '2026-04-06', TRUE, '清明节假期', 2026, 4, 4, 1),
('劳动节', '2026-05-01', '2026-05-03', TRUE, '劳动节假期', 2026, 5, 1, 1),
('端午节', '2026-06-09', '2026-06-11', TRUE, '端午节假期', 2026, 6, 9, 1),
('国庆节', '2026-10-01', '2026-10-07', TRUE, '国庆节假期', 2026, 10, 1, 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 第九部分: 权限设置
-- ============================================================================

-- 确保应用用户有正确的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON task_manager.* TO 'taskmanager'@'%';
GRANT EXECUTE ON PROCEDURE task_manager.sp_* TO 'taskmanager'@'%';
GRANT TRIGGER ON task_manager.* TO 'taskmanager'@'%';

FLUSH PRIVILEGES;

-- ============================================================================
-- 第十部分: 验证脚本
-- ============================================================================

-- 验证表是否创建成功
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH / 1024 / 1024 AS 'Size_MB',
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'task_manager'
    AND TABLE_NAME IN (
        'holidays',
        'holiday_change_log',
        'client_sync_status',
        'offline_operation_queue',
        'data_change_events',
        'client_event_tracking',
        'wbs_task_dependencies'
    )
ORDER BY TABLE_NAME;

-- 验证索引是否创建成功
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'task_manager'
    AND TABLE_NAME IN (
        'global_data',
        'holidays',
        'client_sync_status',
        'data_change_events',
        'wbs_tasks'
    )
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 验证触发器是否创建成功
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'task_manager'
ORDER BY TRIGGER_NAME;

-- ============================================================================
-- 迁移完成
-- ============================================================================

SELECT '数据库优化迁移完成！' AS message,
       NOW() AS completed_at;
