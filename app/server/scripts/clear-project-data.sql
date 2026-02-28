-- ================================================================
-- 清空项目数据脚本
-- ================================================================
-- 说明：删除所有项目、任务、里程碑等业务数据
-- 保留：用户、会话、成员、节假日、组织架构等基础数据
-- ================================================================

-- 开始事务（支持回滚）
START TRANSACTION;

-- 1. 清空任务分配历史表
DELETE FROM task_assignments;

-- 2. 清空 WBS 任务表
DELETE FROM wbs_tasks;

-- 3. 清空项目里程碑表
DELETE FROM milestones;

-- 4. 清空项目成员关联表
DELETE FROM project_members;

-- 5. 清空项目表
DELETE FROM projects;

-- 6. 重置自增ID（可选）
ALTER TABLE task_assignments AUTO_INCREMENT = 1;
ALTER TABLE wbs_tasks AUTO_INCREMENT = 1;
ALTER TABLE milestones AUTO_INCREMENT = 1;
ALTER TABLE project_members AUTO_INCREMENT = 1;
ALTER TABLE projects AUTO_INCREMENT = 1;

-- 提交事务
COMMIT;

-- 验证结果
SELECT '项目数据清空完成' AS status;
SELECT COUNT(*) AS remaining_projects FROM projects;
SELECT COUNT(*) AS remaining_tasks FROM wbs_tasks;
SELECT COUNT(*) AS remaining_milestones FROM milestones;
SELECT COUNT(*) AS remaining_members FROM project_members;
SELECT COUNT(*) AS remaining_assignments FROM task_assignments;
