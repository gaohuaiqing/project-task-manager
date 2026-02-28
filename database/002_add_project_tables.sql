-- 项目管理模块扩展表迁移脚本
-- 版本: 002
-- 日期: 2024-02-23
-- 说明: 添加项目成员和项目里程碑表

-- ==================== 项目成员表 ====================

CREATE TABLE IF NOT EXISTS project_members (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  project_id INT NOT NULL COMMENT '项目ID',
  member_id INT NOT NULL COMMENT '成员ID',
  role ENUM('owner', 'manager', 'member', 'viewer') DEFAULT 'member' COMMENT '成员角色',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  created_by INT COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间',

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,

  UNIQUE KEY uk_project_member (project_id, member_id, deleted_at) COMMENT '同一成员在同一项目中只能有一条有效记录',
  INDEX idx_project_id (project_id) COMMENT '项目ID索引',
  INDEX idx_member_id (member_id) COMMENT '成员ID索引',
  INDEX idx_role (role) COMMENT '角色索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目成员关联表';

-- ==================== 项目里程碑表 ====================

CREATE TABLE IF NOT EXISTS project_milestones (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  project_id INT NOT NULL COMMENT '项目ID',
  name VARCHAR(200) NOT NULL COMMENT '里程碑名称',
  description TEXT COMMENT '里程碑描述',
  planned_date DATE NOT NULL COMMENT '计划日期',
  actual_date DATE DEFAULT NULL COMMENT '实际完成日期',
  status ENUM('pending', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'pending' COMMENT '里程碑状态',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_by INT COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间',

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

  INDEX idx_project_id (project_id) COMMENT '项目ID索引',
  INDEX idx_planned_date (planned_date) COMMENT '计划日期索引',
  INDEX idx_status (status) COMMENT '状态索引',
  INDEX idx_sort_order (sort_order) COMMENT '排序索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目里程碑表';

-- ==================== 迁移完成记录 ====================

-- 记录迁移执行
INSERT INTO migrations (name, version, executed_at)
VALUES ('add_project_tables', '002', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();

-- ==================== 初始数据（可选） ====================

-- 为现有产品开发类项目添加默认里程碑（如果需要）
-- INSERT INTO project_milestones (project_id, name, description, planned_date, sort_order, created_by)
-- SELECT
--   p.id as project_id,
--   '项目启动' as name,
--   '项目正式启动，团队组建完成' as description,
--   p.planned_start_date as planned_date,
--   1 as sort_order,
--   p.created_by
-- FROM projects p
-- WHERE p.project_type = 'product_development'
--   AND p.deleted_at IS NULL
--   AND p.planned_start_date IS NOT NULL;

-- 验证表创建
SELECT
  'project_members' as table_name,
  TABLE_ROWS as row_count
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_members'
UNION ALL
SELECT
  'project_milestones' as table_name,
  TABLE_ROWS as row_count
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_milestones';
