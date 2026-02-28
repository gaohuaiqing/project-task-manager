-- ================================================================
-- 全局数据管理表 - 支持多用户实时协作
-- ================================================================

-- 1. 全局数据表（单一数据源）
-- 存储所有用户共享的业务数据：组织架构、项目、WBS任务、技术组等
CREATE TABLE IF NOT EXISTS global_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  data_type VARCHAR(50) NOT NULL COMMENT '数据类型：organization_units/projects/wbs_tasks/tech_groups/holidays等',
  data_id VARCHAR(100) NOT NULL COMMENT '数据ID：唯一标识一条数据',
  data_json JSON NOT NULL COMMENT '数据内容（JSON格式）',
  version INT DEFAULT 1 COMMENT '乐观锁版本号',
  created_by INT NOT NULL COMMENT '创建者用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_by INT NOT NULL COMMENT '最后更新者用户ID',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  UNIQUE KEY uk_data (data_type, data_id) COMMENT '同一类型的数据ID唯一',
  INDEX idx_data_type (data_type) COMMENT '按数据类型查询',
  INDEX idx_updated_at (updated_at) COMMENT '按更新时间查询',
  INDEX idx_updated_by (updated_by) COMMENT '按更新者查询',

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局共享数据表';

-- 2. 数据变更日志表
-- 记录所有数据变更历史，支持审计和回溯
CREATE TABLE IF NOT EXISTS data_change_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  data_type VARCHAR(50) NOT NULL COMMENT '数据类型',
  data_id VARCHAR(100) NOT NULL COMMENT '数据ID',
  action ENUM('create', 'update', 'delete') NOT NULL COMMENT '操作类型',
  old_value JSON COMMENT '变更前的值',
  new_value JSON COMMENT '变更后的值',
  changed_by INT NOT NULL COMMENT '操作者用户ID',
  change_reason VARCHAR(500) COMMENT '变更原因',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',

  INDEX idx_data (data_type, data_id) COMMENT '按数据查询',
  INDEX idx_changed_by (changed_by) COMMENT '按用户查询',
  INDEX idx_created_at (created_at) COMMENT '按时间查询',
  INDEX idx_action (action) COMMENT '按操作类型查询',

  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据变更日志表';

-- 3. 在线用户表
-- 记录当前在线的用户（Redis持久化备份）
CREATE TABLE IF NOT EXISTS online_users (
  user_id INT PRIMARY KEY COMMENT '用户ID',
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
  device_info TEXT COMMENT '设备信息',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活跃时间',

  INDEX idx_last_seen (last_seen) COMMENT '清理超时用户',
  INDEX idx_session_id (session_id) COMMENT '按会话查询',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='在线用户表';

-- 4. 数据锁表
-- 用于实现悲观锁，防止并发编辑冲突
CREATE TABLE IF NOT EXISTS data_locks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  data_type VARCHAR(50) NOT NULL COMMENT '数据类型',
  data_id VARCHAR(100) NOT NULL COMMENT '数据ID',
  locked_by INT NOT NULL COMMENT '锁持有者用户ID',
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加锁时间',
  expires_at TIMESTAMP NOT NULL COMMENT '锁过期时间',
  lock_reason VARCHAR(255) COMMENT '加锁原因',

  UNIQUE KEY uk_lock (data_type, data_id) COMMENT '同一数据只能有一把锁',
  INDEX idx_locked_by (locked_by) COMMENT '按用户查询',
  INDEX idx_expires_at (expires_at) COMMENT '清理过期锁',

  FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据锁表';

-- 5. 初始化示例数据
-- 插入一个默认的组织架构数据
INSERT INTO global_data (data_type, data_id, data_json, version, created_by, updated_by)
SELECT
  'organization_units',
  'default',
  JSON_ARRAY(),
  1,
  id,
  id
FROM users
WHERE username = 'admin'
LIMIT 1;

-- 创建存储过程来安全创建索引
DELIMITER //
CREATE PROCEDURE CreateIndexIfNotExists()
BEGIN
  -- 创建复合索引
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = 'task_manager'
                 AND table_name = 'global_data'
                 AND index_name = 'idx_global_data_composite') THEN
    CREATE INDEX idx_global_data_composite ON global_data(data_type, updated_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = 'task_manager'
                 AND table_name = 'data_change_log'
                 AND index_name = 'idx_change_log_composite') THEN
    CREATE INDEX idx_change_log_composite ON data_change_log(data_type, data_id, created_at DESC);
  END IF;
END //
DELIMITER ;

-- 执行存储过程
CALL CreateIndexIfNotExists();

-- 删除存储过程
DROP PROCEDURE CreateIndexIfNotExists;

-- 显示创建结果
SELECT 'Tables created successfully!' AS status;
SELECT COUNT(*) AS table_count FROM information_schema.tables
WHERE table_schema = 'task_manager'
AND table_name IN ('global_data', 'data_change_log', 'online_users', 'data_locks');
