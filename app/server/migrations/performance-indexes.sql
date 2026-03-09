-- ================================================
-- 性能优化索引 SQL
-- 生成时间: 2026-03-09
-- 目的: 优化数据库查询性能
-- ================================================

-- ==================== 项目表索引 ====================
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_status_type ON projects(status, project_type);

-- ==================== 用户表索引 ====================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==================== 会话表索引 ====================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status);

-- ==================== WBS 任务表索引 ====================
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_project_id ON wbs_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_parent_id ON wbs_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_status ON wbs_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_assignee_id ON wbs_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_project_status ON wbs_tasks(project_id, status);

-- ==================== 项目成员关联表索引 ====================
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- ==================== 里程碑表索引 ====================
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_planned_date ON milestones(planned_date);
