-- ================================================================
-- 系统日志表 - 用于记录系统运行日志和用户操作日志
-- 版本: 1.0.0
-- 日期: 2026-02-19
-- ================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  log_id VARCHAR(36) UNIQUE NOT NULL COMMENT '日志唯一标识',
  log_level ENUM('ERROR', 'WARN', 'INFO', 'DEBUG') NOT NULL COMMENT '日志级别',
  log_type ENUM('SYSTEM', 'USER_ACTION', 'AUTH', 'DATA_SYNC', 'PERFORMANCE') NOT NULL COMMENT '日志类型',
  message TEXT NOT NULL COMMENT '日志消息',
  details JSON COMMENT '详细信息（堆栈、参数等）',
  user_id INT COMMENT '操作用户ID',
  username VARCHAR(50) COMMENT '用户名',
  session_id VARCHAR(36) COMMENT '会话ID',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT '浏览器信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  -- 索引优化查询性能
  INDEX idx_level_time (log_level, created_at),
  INDEX idx_type_time (log_type, created_at),
  INDEX idx_user_time (user_id, created_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';

-- 创建存储过程：自动清理24小时前的日志
DELIMITER //
CREATE PROCEDURE CleanOldLogs()
BEGIN
  DELETE FROM system_logs
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

  SELECT ROW_COUNT() AS deleted_count;
END//
DELIMITER ;

-- 创建定时事件：每小时执行一次清理
DROP EVENT IF EXISTS evt_clean_system_logs;
CREATE EVENT IF NOT EXISTS evt_clean_system_logs
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanOldLogs();

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- 显示创建结果
SELECT 'System logs table created successfully!' AS status;
SELECT COUNT(*) AS table_exists FROM information_schema.tables
WHERE table_schema = 'task_manager'
AND table_name = 'system_logs';
