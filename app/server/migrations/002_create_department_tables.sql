-- ================================================================
-- 部门管理表 - 支持多部门数据隔离
-- ================================================================

-- 1. 部门表
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '部门编码',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  description TEXT COMMENT '部门描述',
  manager_id INT COMMENT '部门经理用户ID',
  parent_id INT COMMENT '上级部门ID（支持部门层级）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  UNIQUE KEY uk_code (code),
  INDEX idx_manager_id (manager_id),
  INDEX idx_parent_id (parent_id),

  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 2. 技术组表
CREATE TABLE IF NOT EXISTS tech_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT '技术组编码',
  name VARCHAR(100) NOT NULL COMMENT '技术组名称',
  description TEXT COMMENT '技术组描述',
  department_id INT NOT NULL COMMENT '所属部门ID',
  leader_id INT COMMENT '组长用户ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  UNIQUE KEY uk_code (code),
  INDEX idx_department_id (department_id),
  INDEX idx_leader_id (leader_id),

  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术组表';

-- 3. 用户-部门关联表（支持用户在多个部门）
CREATE TABLE IF NOT EXISTS user_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  department_id INT NOT NULL COMMENT '部门ID',
  role VARCHAR(50) NOT NULL COMMENT '部门角色：dept_manager(部门经理), member(成员)',
  is_primary BOOLEAN DEFAULT FALSE COMMENT '是否为主部门',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',

  UNIQUE KEY uk_user_dept (user_id, department_id),
  INDEX idx_user_id (user_id),
  INDEX idx_department_id (department_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-部门关联表';

-- 4. 用户-技术组关联表（支持用户在多个技术组）
CREATE TABLE IF NOT EXISTS user_tech_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  tech_group_id INT NOT NULL COMMENT '技术组ID',
  role VARCHAR(50) NOT NULL COMMENT '组内角色：leader(组长), member(成员)',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',

  UNIQUE KEY uk_user_group (user_id, tech_group_id),
  INDEX idx_user_id (user_id),
  INDEX idx_tech_group_id (tech_group_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_group_id) REFERENCES tech_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-技术组关联表';

-- 5. 为项目表添加部门字段（如果存在）
-- 注意：由于项目表已存在，使用 ALTER TABLE
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS department_id INT NOT NULL DEFAULT 1 COMMENT '所属部门ID' AFTER id,
ADD COLUMN IF NOT EXISTS created_by_dept INT COMMENT '创建者部门ID' AFTER created_by;

-- 添加外键约束
ALTER TABLE projects
ADD CONSTRAINT fk_projects_dept FOREIGN KEY (department_id) REFERENCES departments(id),
ADD CONSTRAINT fk_projects_created_by_dept FOREIGN KEY (created_by_dept) REFERENCES departments(id);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by_dept ON projects(created_by_dept);

-- 6. 为WBS任务表添加部门和技术组字段（如果存在）
-- 注意：WBS任务可能存储在全局数据中，这里仅为数据库表设计参考

-- ================================================================
-- 初始化示例数据
-- ================================================================

-- 插入默认部门
INSERT INTO departments (code, name, description, manager_id) VALUES
('RD', '研发部', '负责产品研发和技术创新', NULL),
('MKT', '市场部', '负责市场推广和品牌建设', NULL),
('OPS', '运营部', '负责产品运营和用户增长', NULL)
ON DUPLICATE KEY UPDATE name=name;

-- 插入研发部技术组
INSERT INTO tech_groups (code, name, description, department_id) VALUES
('FE', '前端技术组', '负责前端开发和用户体验设计',
 (SELECT id FROM departments WHERE code='RD'),
 (SELECT id FROM users WHERE username='admin' LIMIT 1)),
('BE', '后端技术组', '负责后端开发和系统架构',
 (SELECT id FROM departments WHERE code='RD',
 (SELECT id FROM users WHERE username='admin' LIMIT 1))
ON DUPLICATE KEY UPDATE name=name;

-- 插入市场部技术组
INSERT INTO tech_groups (code, name, description, department_id) VALUES
('MKT-TEAM', '市场组', '负责市场推广活动',
 (SELECT id FROM departments WHERE code='MKT'),
 (SELECT id FROM users WHERE username='admin' LIMIT 1))
ON DUPLICATE KEY UPDATE name=name;

-- 为现有用户分配部门（将admin用户分配到研发部）
INSERT INTO user_departments (user_id, department_id, role, is_primary)
SELECT u.id, d.id, 'dept_manager', TRUE
FROM users u
CROSS JOIN departments d
WHERE u.username = 'admin' AND d.code = 'RD'
ON DUPLICATE KEY UPDATE is_primary=TRUE;

-- ================================================================
-- 显示创建结果
-- ================================================================
SELECT 'Tables created successfully!' AS status;
SELECT COUNT(*) AS department_count FROM departments;
SELECT COUNT(*) AS tech_group_count FROM tech_groups;
