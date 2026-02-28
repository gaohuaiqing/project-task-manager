-- 修复数据库字符集
ALTER DATABASE task_manager CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 删除旧的 system_logs 表
DROP TABLE IF EXISTS system_logs;

-- 重新创建 system_logs 表（服务器会自动创建）
-- 这个命令只是确保表被删除，服务器重启时会自动创建正确的表
