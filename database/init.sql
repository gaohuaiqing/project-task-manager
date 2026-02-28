-- MySQL数据库初始化脚本
-- 适用于Task Manager系统
-- 版本: 1.0
-- 日期: 2026-02-15

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE task_manager;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'tech_manager', 'dept_manager', 'engineer') NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(50),
  status ENUM('active', 'terminated') DEFAULT 'active',
  termination_reason VARCHAR(255),
  termination_timestamp BIGINT,
  created_at BIGINT NOT NULL,
  last_accessed BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('planning', 'in_progress', 'completed', 'delayed') DEFAULT 'planning',
  project_type ENUM('product_development', 'other') DEFAULT 'other',
  planned_start_date DATE,
  planned_end_date DATE,
  progress INT DEFAULT 0,
  task_count INT DEFAULT 0,
  completed_task_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 项目里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  planned_date DATE NOT NULL,
  description TEXT,
  status ENUM('pending', 'completed', 'delayed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 项目成员关联表
CREATE TABLE IF NOT EXISTS project_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (project_id, user_id)
);

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, config_key)
);

-- 数据变更日志表
CREATE TABLE IF NOT EXISTS data_changes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  change_type ENUM('create', 'update', 'delete') NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  user_id INT NOT NULL,
  change_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX idx_data_changes_entity ON data_changes(entity_type, entity_id);
CREATE INDEX idx_data_changes_created_at ON data_changes(created_at);

-- 插入默认管理员用户（密码: admin123）
INSERT IGNORE INTO users (username, password, role, name) 
VALUES ('admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', '系统管理员');

-- 插入默认测试用户
INSERT IGNORE INTO users (username, password, role, name) 
VALUES 
('tech_manager', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'tech_manager', '技术经理'),
('dept_manager', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'dept_manager', '部门经理'),
('engineer', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'engineer', '工程师');

-- ⚠️ 注意：以下测试数据已被禁用，避免覆盖用户创建的数据
-- 如果需要测试数据，请在开发环境手动创建，不要自动插入

-- -- 插入示例项目 (已禁用)
-- INSERT IGNORE INTO projects (code, name, description, status, project_type, created_by)
-- VALUES
-- ('MX30', 'MX30项目', '示例项目描述', 'in_progress', 'product_development', 1),
-- ('PROJ001', '测试项目1', '测试项目描述1', 'planning', 'other', 1),
-- ('PROJ002', '测试项目2', '测试项目描述2', 'completed', 'other', 1);

-- -- 插入示例里程碑 (已禁用)
-- INSERT IGNORE INTO milestones (project_id, name, planned_date, description)
-- VALUES
-- (1, '项目启动', '2026-01-01', '项目正式启动'),
-- (1, '需求分析完成', '2026-01-15', '完成需求分析'),
-- (1, '开发完成', '2026-02-15', '完成开发任务'),
-- (1, '项目验收', '2026-02-28', '项目验收阶段');

-- -- 插入示例项目成员 (已禁用)
-- INSERT IGNORE INTO project_members (project_id, user_id)
-- VALUES
-- (1, 1),
(1, 2),
(1, 3),
(1, 4),
(2, 1),
(2, 2),
(3, 1),
(3, 4);

-- 插入示例用户配置
INSERT IGNORE INTO user_configs (user_id, config_key, config_value) 
VALUES 
(1, 'dashboard_preferences', '{"layout": "default", "widgets": ["tasks", "projects", "milestones"]}'),
(2, 'dashboard_preferences', '{"layout": "compact", "widgets": ["tasks", "projects"]}'),
(3, 'dashboard_preferences', '{"layout": "default", "widgets": ["projects"]}'),
(4, 'dashboard_preferences', '{"layout": "default", "widgets": ["tasks"]}');

-- 插入示例数据变更日志
INSERT IGNORE INTO data_changes (change_type, entity_type, entity_id, user_id, change_data) 
VALUES 
('create', 'project', 1, 1, '{"code": "MX30", "name": "MX30项目"}'),
('create', 'project', 2, 1, '{"code": "PROJ001", "name": "测试项目1"}'),
('create', 'project', 3, 1, '{"code": "PROJ002", "name": "测试项目2"}'),
('update', 'project', 1, 1, '{"status": "in_progress", "progress": 50}');

-- 显示创建结果
SELECT '数据库初始化完成' AS result;
SELECT '创建的表:' AS tables;
SHOW TABLES;

SELECT '管理员用户:' AS admin_user;
SELECT id, username, role, name FROM users WHERE role = 'admin';

SELECT '示例项目:' AS sample_projects;
SELECT id, code, name, status FROM projects;

-- ================================================================
-- 权限配置表（替代前端 localStorage 存储）
-- ================================================================

-- 权限配置表
CREATE TABLE IF NOT EXISTS permission_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(255) UNIQUE NOT NULL COMMENT '配置键，如 role_permissions',
  config_value JSON NOT NULL COMMENT '配置内容（JSON格式）',
  version INT DEFAULT 1 COMMENT '配置版本号',
  updated_by INT NOT NULL COMMENT '更新人ID',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限配置表';

-- 权限配置历史表
CREATE TABLE IF NOT EXISTS permission_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_id INT COMMENT '关联的权限配置ID',
  user_id INT NOT NULL COMMENT '操作人ID',
  action VARCHAR(50) NOT NULL COMMENT '操作类型：create/update/delete/add_permission/remove_permission',
  details TEXT COMMENT '操作详情',
  old_value JSON COMMENT '变更前的值',
  new_value JSON COMMENT '变更后的值',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  FOREIGN KEY (config_id) REFERENCES permission_configs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_permission_history_config_id (config_id),
  INDEX idx_permission_history_user_id (user_id),
  INDEX idx_permission_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限变更历史表';

-- 插入默认权限配置
INSERT IGNORE INTO permission_configs (config_key, config_value, version, updated_by) VALUES
('role_permissions', JSON_OBJECT(
  'items', JSON_ARRAY(
    JSON_OBJECT(
      'id', 'manage_users',
      'name', '用户管理',
      'description', '管理系统用户，包括创建、编辑、删除用户',
      'module', '用户管理',
      'permission', 'manage_users',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'assign_user_role',
      'name', '分配角色',
      'description', '为用户分配角色权限',
      'module', '用户管理',
      'permission', 'assign_user_role',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'reset_user_password',
      'name', '重置密码',
      'description', '重置用户密码',
      'module', '用户管理',
      'permission', 'reset_user_password',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'update_org_structure',
      'name', '更新组织结构',
      'description', '更新公司组织结构',
      'module', '组织结构',
      'permission', 'update_org_structure',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'write',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'create_project',
      'name', '创建项目',
      'description', '创建新的项目',
      'module', '项目管理',
      'permission', 'create_project',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'write',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'update_project',
      'name', '更新项目',
      'description', '更新项目信息',
      'module', '项目管理',
      'permission', 'update_project',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'write',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'delete_project',
      'name', '删除项目',
      'description', '删除项目',
      'module', '项目管理',
      'permission', 'delete_project',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'write',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'create_task',
      'name', '创建任务',
      'description', '创建新的任务',
      'module', '任务管理',
      'permission', 'create_task',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'edit_task',
      'name', '编辑任务',
      'description', '编辑任务信息',
      'module', '任务管理',
      'permission', 'edit_task',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'delete_task',
      'name', '删除任务',
      'description', '删除任务',
      'module', '任务管理',
      'permission', 'delete_task',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'approve_task_plan',
      'name', '审批任务计划',
      'description', '审批任务计划',
      'module', '任务管理',
      'permission', 'approve_task_plan',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'force_refresh_task_plan',
      'name', '强制刷新任务计划',
      'description', '强制刷新任务计划',
      'module', '任务管理',
      'permission', 'force_refresh_task_plan',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'write',
        'dept_manager', 'write',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'manage_holidays',
      'name', '假期管理',
      'description', '管理系统假期设置',
      'module', '系统设置',
      'permission', 'manage_holidays',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'manage_task_types',
      'name', '任务类型设置',
      'description', '管理系统任务类型',
      'module', '系统设置',
      'permission', 'manage_task_types',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    ),
    JSON_OBJECT(
      'id', 'manage_permissions',
      'name', '权限配置',
      'description', '管理系统权限配置',
      'module', '系统设置',
      'permission', 'manage_permissions',
      'defaultLevels', JSON_OBJECT(
        'admin', 'full',
        'tech_manager', 'none',
        'dept_manager', 'none',
        'engineer', 'none'
      ),
      'createdAt', UNIX_TIMESTAMP() * 1000,
      'updatedAt', UNIX_TIMESTAMP() * 1000
    )
  ),
  'rolePermissions', JSON_OBJECT(
    'admin', JSON_OBJECT(),
    'tech_manager', JSON_OBJECT(),
    'dept_manager', JSON_OBJECT(),
    'engineer', JSON_OBJECT()
  ),
  'version', 1,
  'lastUpdated', UNIX_TIMESTAMP() * 1000,
  'lastUpdatedBy', 'system'
), 1, 1);

-- 为每个角色设置默认权限
UPDATE permission_configs
SET config_value = JSON_SET(
  config_value,
  '$.rolePermissions.admin.manage_users', 'full',
  '$.rolePermissions.admin.assign_user_role', 'full',
  '$.rolePermissions.admin.reset_user_password', 'full',
  '$.rolePermissions.admin.update_org_structure', 'full',
  '$.rolePermissions.admin.create_project', 'full',
  '$.rolePermissions.admin.update_project', 'full',
  '$.rolePermissions.admin.delete_project', 'full',
  '$.rolePermissions.admin.create_task', 'full',
  '$.rolePermissions.admin.edit_task', 'full',
  '$.rolePermissions.admin.delete_task', 'full',
  '$.rolePermissions.admin.approve_task_plan', 'full',
  '$.rolePermissions.admin.force_refresh_task_plan', 'full',
  '$.rolePermissions.admin.manage_holidays', 'full',
  '$.rolePermissions.admin.manage_task_types', 'full',
  '$.rolePermissions.admin.manage_permissions', 'full',
  '$.rolePermissions.tech_manager.create_project', 'none',
  '$.rolePermissions.tech_manager.update_project', 'write',
  '$.rolePermissions.tech_manager.create_task', 'write',
  '$.rolePermissions.tech_manager.edit_task', 'write',
  '$.rolePermissions.tech_manager.delete_task', 'write',
  '$.rolePermissions.tech_manager.approve_task_plan', 'write',
  '$.rolePermissions.tech_manager.force_refresh_task_plan', 'write',
  '$.rolePermissions.dept_manager.update_org_structure', 'write',
  '$.rolePermissions.dept_manager.create_project', 'write',
  '$.rolePermissions.dept_manager.update_project', 'write',
  '$.rolePermissions.dept_manager.delete_project', 'write',
  '$.rolePermissions.dept_manager.force_refresh_task_plan', 'write'
)
WHERE config_key = 'role_permissions';

-- 创建索引
CREATE INDEX idx_permission_configs_key ON permission_configs(config_key);
CREATE INDEX idx_permission_configs_updated_by ON permission_configs(updated_by);

-- ================================================================
-- 组织架构表（替代前端 localStorage 存储）
-- ================================================================

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '部门编码',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  parent_id INT DEFAULT NULL COMMENT '上级部门ID',
  level INT DEFAULT 1 COMMENT '部门层级（1=一级部门）',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  description TEXT COMMENT '部门描述',
  manager_id INT COMMENT '部门负责人ID',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '部门状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_departments_code (code),
  INDEX idx_departments_parent_id (parent_id),
  INDEX idx_departments_manager_id (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 技术组表
CREATE TABLE IF NOT EXISTS tech_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '技术组编码',
  name VARCHAR(100) NOT NULL COMMENT '技术组名称',
  department_id INT NOT NULL COMMENT '所属部门ID',
  leader_id INT COMMENT '技术组长ID',
  description TEXT COMMENT '技术组描述',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '技术组状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tech_groups_code (code),
  INDEX idx_tech_groups_department_id (department_id),
  INDEX idx_tech_groups_leader_id (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术组表';

-- 用户部门关联表
CREATE TABLE IF NOT EXISTS user_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  department_id INT NOT NULL COMMENT '部门ID',
  role ENUM('dept_manager', 'member') DEFAULT 'member' COMMENT '在部门中的角色',
  is_primary BOOLEAN DEFAULT FALSE COMMENT '是否为主部门',
  position VARCHAR(100) COMMENT '职位',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入部门时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_department_primary (user_id, is_primary),
  INDEX idx_user_departments_user_id (user_id),
  INDEX idx_user_departments_department_id (department_id),
  INDEX idx_user_departments_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户部门关联表';

-- 用户技术组关联表
CREATE TABLE IF NOT EXISTS user_tech_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  tech_group_id INT NOT NULL COMMENT '技术组ID',
  role ENUM('leader', 'member') DEFAULT 'member' COMMENT '在技术组中的角色',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入技术组时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_group_id) REFERENCES tech_groups(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_tech_group (user_id, tech_group_id),
  INDEX idx_user_tech_groups_user_id (user_id),
  INDEX idx_user_tech_groups_tech_group_id (tech_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户技术组关联表';

-- ================================================================
-- WBS 任务表
-- ================================================================

CREATE TABLE IF NOT EXISTS wbs_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL COMMENT '项目ID',
  parent_id INT DEFAULT NULL COMMENT '父任务ID',
  task_code VARCHAR(50) NOT NULL COMMENT '任务编码（WBS编码）',
  task_name VARCHAR(255) NOT NULL COMMENT '任务名称',
  description TEXT COMMENT '任务描述',
  task_type ENUM('milestone', 'phase', 'task', 'deliverable') DEFAULT 'task' COMMENT '任务类型',
  status ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
  priority INT DEFAULT 2 COMMENT '优先级（1=低，2=中，3=高）',
  estimated_hours DECIMAL(10,2) COMMENT '预估工时',
  actual_hours DECIMAL(10,2) COMMENT '实际工时',
  progress INT DEFAULT 0 COMMENT '进度（0-100）',
  planned_start_date DATE COMMENT '计划开始日期',
  planned_end_date DATE COMMENT '计划结束日期',
  actual_start_date DATE COMMENT '实际开始日期',
  actual_end_date DATE COMMENT '实际结束日期',
  full_time_ratio DECIMAL(5,2) COMMENT '全职比(%)，工程师在任务结束时填写',
  assignee_id INT COMMENT '分配给的用户ID',
  dependencies JSON COMMENT '依赖任务ID列表',
  tags JSON COMMENT '任务标签',
  attachments JSON COMMENT '附件信息',
  version INT DEFAULT 1 COMMENT '版本号（乐观锁）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES wbs_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_wbs_tasks_project_id (project_id),
  INDEX idx_wbs_tasks_parent_id (parent_id),
  INDEX idx_wbs_tasks_assignee_id (assignee_id),
  INDEX idx_wbs_tasks_status (status),
  INDEX idx_wbs_tasks_planned_dates (planned_start_date, planned_end_date),
  UNIQUE KEY uk_project_task_code (project_id, task_code, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WBS任务表';

-- ================================================================
-- 任务审批记录表（替代前端 localStorage 存储）
-- ================================================================

CREATE TABLE IF NOT EXISTS task_approval_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL COMMENT '任务ID',
  task_title VARCHAR(255) NOT NULL COMMENT '任务标题',
  requester_id INT NOT NULL COMMENT '请求人ID',
  requester_name VARCHAR(100) NOT NULL COMMENT '请求人姓名',
  requester_role VARCHAR(50) NOT NULL COMMENT '请求人角色',
  request_type ENUM('create_task', 'date_change') DEFAULT 'create_task' COMMENT '请求类型',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
  approver_id INT COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名',
  approval_date TIMESTAMP NULL COMMENT '审批时间',
  approval_comment TEXT COMMENT '审批意见',
  change_before JSON COMMENT '变更前的数据（用于日期变更）',
  change_after JSON COMMENT '变更后的数据（用于日期变更）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_approval_records_task_id (task_id),
  INDEX idx_task_approval_records_requester_id (requester_id),
  INDEX idx_task_approval_records_approver_id (approver_id),
  INDEX idx_task_approval_records_status (approval_status),
  INDEX idx_task_approval_records_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务审批记录表';

-- ================================================================
-- 任务审批记录表（替代前端 localStorage 存储）
-- ================================================================

-- 任务审批记录表
CREATE TABLE IF NOT EXISTS task_approval_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL COMMENT '任务ID',
  task_title VARCHAR(255) NOT NULL COMMENT '任务标题',
  requester_id INT NOT NULL COMMENT '请求人ID',
  requester_name VARCHAR(100) NOT NULL COMMENT '请求人姓名',
  requester_role VARCHAR(50) NOT NULL COMMENT '请求人角色',
  request_type ENUM('create_task', 'date_change') DEFAULT 'create_task' COMMENT '请求类型',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
  approver_id INT COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名',
  approval_date TIMESTAMP NULL COMMENT '审批时间',
  approval_comment TEXT COMMENT '审批意见',
  change_before JSON COMMENT '变更前的数据（用于日期变更）',
  change_after JSON COMMENT '变更后的数据（用于日期变更）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (task_id) REFERENCES wbs_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_task_approval_records_task_id (task_id),
  INDEX idx_task_approval_records_requester_id (requester_id),
  INDEX idx_task_approval_records_approver_id (approver_id),
  INDEX idx_task_approval_records_status (approval_status),
  INDEX idx_task_approval_records_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务审批记录表';

-- ================================================================
-- 审计日志表（操作合规性审计）
-- ================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  audit_id VARCHAR(255) UNIQUE NOT NULL COMMENT '审计日志唯一标识',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型（如 task_assign, project_create）',
  result ENUM('success', 'failure', 'partial', 'conflict') NOT NULL DEFAULT 'success' COMMENT '操作结果',
  actor_user_id INT COMMENT '操作者用户ID',
  actor_username VARCHAR(100) COMMENT '操作者用户名',
  actor_role VARCHAR(50) COMMENT '操作者角色',
  target_type VARCHAR(50) COMMENT '目标实体类型（如 task, project, user）',
  target_id VARCHAR(255) COMMENT '目标实体ID',
  target_name VARCHAR(500) COMMENT '目标实体名称',
  details JSON COMMENT '操作详情（JSON格式）',
  before_data JSON COMMENT '操作前的数据',
  after_data JSON COMMENT '操作后的数据',
  related_operation_id VARCHAR(255) COMMENT '关联的操作ID（用于关联多个操作）',
  reason TEXT COMMENT '操作原因/备注',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT 'User Agent',
  session_id VARCHAR(255) COMMENT '会话ID',
  server_node VARCHAR(100) DEFAULT 'default' COMMENT '服务器节点标识（用于多服务器部署）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_id (audit_id),
  INDEX idx_audit_logs_operation_type (operation_type),
  INDEX idx_audit_logs_result (result),
  INDEX idx_audit_logs_actor (actor_user_id, actor_username),
  INDEX idx_audit_logs_target (target_type, target_id),
  INDEX idx_audit_logs_related (related_operation_id),
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_server_node (server_node)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志表';