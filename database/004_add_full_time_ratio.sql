-- 添加全职比字段到 wbs_tasks 表
-- 迁移版本: 004
-- 创建时间: 2026-02-24

-- 添加 full_time_ratio 字段
ALTER TABLE wbs_tasks
ADD COLUMN full_time_ratio DECIMAL(5,2) NULL
COMMENT '全职比(%)，工程师在任务结束时填写'
AFTER actual_end_date;
