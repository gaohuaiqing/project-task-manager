/**
 * 初始化系统日志表
 * 在服务器启动时自动执行
 */

import { databaseService } from './DatabaseService';

export async function initSystemLogsTable(): Promise<boolean> {
  let connection;
  try {
    connection = await databaseService.getConnection();

    // 创建 system_logs 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        log_id VARCHAR(36) UNIQUE NOT NULL COMMENT '日志唯一标识',
        log_level ENUM('ERROR', 'WARN', 'INFO', 'DEBUG') NOT NULL COMMENT '日志级别',
        log_type ENUM('SYSTEM', 'USER_ACTION', 'AUTH', 'DATA_SYNC', 'PERFORMANCE', 'FRONTEND') NOT NULL COMMENT '日志类型',
        message TEXT NOT NULL COMMENT '日志消息',
        details JSON COMMENT '详细信息（堆栈、参数等）',
        user_id INT COMMENT '操作用户ID',
        username VARCHAR(50) COMMENT '用户名',
        session_id VARCHAR(36) COMMENT '会话ID',
        ip_address VARCHAR(50) COMMENT 'IP地址',
        user_agent TEXT COMMENT '浏览器信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

        INDEX idx_level_time (log_level, created_at),
        INDEX idx_type_time (log_type, created_at),
        INDEX idx_user_time (user_id, created_at),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表'
    `);

    // 创建清理存储过程（所有管理命令都使用 query，因为 prepared statements 不支持）
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS CleanOldLogs`);
    } catch (e) {
      // 存储过程可能不存在，忽略错误
    }

    try {
      await connection.query(`
        CREATE PROCEDURE CleanOldLogs()
        BEGIN
          DELETE FROM system_logs
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 72 HOUR);
          SELECT ROW_COUNT() AS deleted_count;
        END
      `);
    } catch (e) {
      // 创建存储过程失败，记录错误但继续
      console.warn('[SystemLogs] 创建存储过程失败:', e);
    }

    // 创建定时清理事件
    try {
      await connection.query(`DROP EVENT IF EXISTS evt_clean_system_logs`);
    } catch (e) {
      // 事件可能不存在，忽略错误
    }

    try {
      await connection.query(`
        CREATE EVENT IF NOT EXISTS evt_clean_system_logs
        ON SCHEDULE EVERY 1 HOUR
        DO
          CALL CleanOldLogs()
      `);
    } catch (e) {
      // 创建事件失败，记录错误但继续
      console.warn('[SystemLogs] 创建定时事件失败:', e);
    }

    // 启用事件调度器
    try {
      await connection.query(`SET GLOBAL event_scheduler = ON`);
    } catch (e) {
      console.warn('[SystemLogs] 启用事件调度器失败:', e);
    }

    console.log('[SystemLogs] 系统日志表初始化成功');

    // ================================================================
    // 初始化 data_change_log 清理机制（P0-1: 防止无限增长）
    // ================================================================

    // 创建 data_change_log 清理存储过程
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS CleanOldChangeLogs`);
    } catch (e) {
      // 存储过程可能不存在，忽略错误
    }

    try {
      await connection.query(`
        CREATE PROCEDURE CleanOldChangeLogs()
        BEGIN
          DELETE FROM data_change_log
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
          SELECT ROW_COUNT() AS deleted_count;
        END
      `);
      console.log('[SystemLogs] data_change_log 清理存储过程已创建');
    } catch (e) {
      console.warn('[SystemLogs] 创建 data_change_log 清理存储过程失败:', e);
    }

    // 创建 data_change_log 定时清理事件（每天执行）
    try {
      await connection.query(`DROP EVENT IF EXISTS evt_clean_change_log`);
    } catch (e) {
      // 事件可能不存在，忽略错误
    }

    try {
      await connection.query(`
        CREATE EVENT IF NOT EXISTS evt_clean_change_log
        ON SCHEDULE EVERY 1 DAY
        STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 02:00:00')
        DO
          CALL CleanOldChangeLogs()
      `);
      console.log('[SystemLogs] data_change_log 定时清理事件已创建（每天凌晨2点执行）');
    } catch (e) {
      console.warn('[SystemLogs] 创建 data_change_log 定时事件失败:', e);
    }

    return true;
  } catch (error) {
    console.error('[SystemLogs] 初始化系统日志表失败:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}
