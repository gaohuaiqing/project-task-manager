-- 清除项目和任务相关数据
-- 执行顺序：先清除外键依赖表，再清除主表

SET FOREIGN_KEY_CHECKS = 0;

-- 1. 清除任务相关数据
TRUNCATE TABLE progress_records;
TRUNCATE TABLE task_delay_approvals;
TRUNCATE TABLE delay_records;
TRUNCATE TABLE plan_changes;
TRUNCATE TABLE notifications;
TRUNCATE TABLE attachments;

-- 2. 清除时间线相关数据
TRUNCATE TABLE timeline_tasks;
TRUNCATE TABLE timelines;

-- 3. 清除里程碑
TRUNCATE TABLE milestones;

-- 4. 清除任务主表
TRUNCATE TABLE wbs_tasks;

-- 5. 清除项目成员
TRUNCATE TABLE project_members;

-- 6. 清除项目主表
TRUNCATE TABLE projects;

-- 7. 清除协作数据
TRUNCATE TABLE data_versions;

-- 8. 清除审计日志（可选，建议保留）
-- TRUNCATE TABLE audit_logs;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '数据清除完成' AS status;
