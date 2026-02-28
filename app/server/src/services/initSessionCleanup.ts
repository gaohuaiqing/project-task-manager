/**
 * 初始化会话自动清理机制
 * 使用 MySQL 定时事件每5分钟自动清理过期会话
 */

import { databaseService } from './DatabaseService.js';

/**
 * 创建会话清理的存储过程
 */
async function createSessionCleanupProcedure(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的存储过程（如果存在）
    await connection.query(`DROP PROCEDURE IF EXISTS CleanExpiredSessions`);

    // 创建存储过程
    await connection.query(`
      CREATE PROCEDURE CleanExpiredSessions()
      BEGIN
        DECLARE cleaned_count INT DEFAULT 0;

        -- 更新过期的活动会话为已终止状态
        UPDATE sessions
        SET status = 'terminated',
            termination_reason = 'timeout',
            termination_timestamp = FLOOR(UNIX_TIMESTAMP() * 1000)
        WHERE status = 'active'
          AND expires_at < FLOOR(UNIX_TIMESTAMP() * 1000);

        SET cleaned_count = ROW_COUNT();

        -- 如果有清理的会话，记录日志
        IF cleaned_count > 0 THEN
          INSERT INTO system_logs (log_id, log_level, log_type, message, created_at)
          VALUES (UUID(), 'INFO', 'SYSTEM', CONCAT('自动清理过期会话: ', cleaned_count, ' 个'), NOW());
        END IF;
      END
    `);

    console.log('[SessionCleanup] 存储过程创建成功');
  } finally {
    connection.release();
  }
}

/**
 * 创建定时事件
 */
async function createSessionCleanupEvent(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 确保事件调度器已开启
    await connection.query(`SET GLOBAL event_scheduler = ON`);

    // 删除旧的事件（如果存在）
    await connection.query(`DROP EVENT IF EXISTS evt_clean_expired_sessions`);

    // 创建定时事件（每5分钟执行一次）
    await connection.query(`
      CREATE EVENT evt_clean_expired_sessions
      ON SCHEDULE EVERY 5 MINUTE
      DO
        CALL CleanExpiredSessions()
    `);

    console.log('[SessionCleanup] 定时事件创建成功（每5分钟执行一次）');
  } finally {
    connection.release();
  }
}

/**
 * 初始化会话清理机制
 */
export async function initSessionCleanup(): Promise<void> {
  try {
    await createSessionCleanupProcedure();
    await createSessionCleanupEvent();

    // 立即执行一次清理，清除现有的过期会话
    const connection = await databaseService.getConnection();
    try {
      await connection.query(`CALL CleanExpiredSessions()`);
      console.log('[SessionCleanup] 初始清理完成');
    } finally {
      connection.release();
    }

    console.log('[SessionCleanup] ✅ 会话自动清理机制初始化成功');
  } catch (error) {
    console.error('[SessionCleanup] ❌ 初始化失败:', error);
    throw error;
  }
}

/**
 * 禁用会话清理机制
 */
export async function disableSessionCleanup(): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    await connection.query(`DROP EVENT IF EXISTS evt_clean_expired_sessions`);
    await connection.query(`DROP PROCEDURE IF EXISTS CleanExpiredSessions`);
    console.log('[SessionCleanup] 会话自动清理机制已禁用');
  } finally {
    connection.release();
  }
}
