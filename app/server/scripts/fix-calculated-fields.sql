-- 修复 WBS 任务表中计算字段为空的历史数据
-- 执行时间: 2026-03-29
-- 说明: 修复 planned_duration, actual_duration, actual_cycle 字段

-- 1. 修复计划周期 (planned_duration = 结束日期 - 开始日期 + 1)
UPDATE wbs_tasks
SET planned_duration = DATEDIFF(end_date, start_date) + 1
WHERE start_date IS NOT NULL
  AND end_date IS NOT NULL
  AND planned_duration IS NULL;

-- 查看受影响的行数
SELECT ROW_COUNT() AS '修复计划周期行数';

-- 2. 修复实际工期 (actual_duration = 实际开始到实际结束的工作日数)
-- 注意: 这里简化为日历天数，实际应该排除周末和节假日
-- 后续应该用后端的工作日计算函数重新计算
UPDATE wbs_tasks
SET actual_duration = DATEDIFF(actual_end_date, actual_start_date) + 1
WHERE actual_start_date IS NOT NULL
  AND actual_end_date IS NOT NULL
  AND actual_duration IS NULL;

SELECT ROW_COUNT() AS '修复实际工期行数';

-- 3. 修复实际周期 (actual_cycle = 实际结束日期 - 实际开始日期 + 1)
UPDATE wbs_tasks
SET actual_cycle = DATEDIFF(actual_end_date, actual_start_date) + 1
WHERE actual_start_date IS NOT NULL
  AND actual_end_date IS NOT NULL
  AND actual_cycle IS NULL;

SELECT ROW_COUNT() AS '修复实际周期行数';

-- 验证修复结果
SELECT
  COUNT(*) AS 总任务数,
  SUM(CASE WHEN start_date IS NOT NULL AND end_date IS NOT NULL AND planned_duration IS NULL THEN 1 ELSE 0 END) AS 计划周期仍为空,
  SUM(CASE WHEN actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL AND actual_duration IS NULL THEN 1 ELSE 0 END) AS 实际工期仍为空,
  SUM(CASE WHEN actual_start_date IS NOT NULL AND actual_end_date IS NOT NULL AND actual_cycle IS NULL THEN 1 ELSE 0 END) AS 实际周期仍为空
FROM wbs_tasks;
