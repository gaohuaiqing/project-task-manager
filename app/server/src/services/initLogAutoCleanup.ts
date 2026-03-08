/**
 * 日志自动清理服务
 * 为所有日志表添加自动清理机制，防止无限增长
 *
 * 🚨 紧急修复：解决 audit_logs 和 data_versions 无限增长问题
 */

import { logDatabaseService } from './LogDatabaseService.js';
import { databaseService } from './DatabaseService.js';

/**
 * 初始化所有日志表的自动清理机制
 */
export async function initLogAutoCleanup(): Promise<void> {
  try {
    const connection = await databaseService.getConnection();

    console.log('[LogAutoCleanup] 开始初始化日志自动清理机制...');

    // ================================================================
    // 1. audit_logs 清理机制
    // ================================================================

    // 创建清理存储过程
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS CleanOldAuditLogs`);
    } catch (e) {
      // 存储过程可能不存在，忽略错误
    }

    await connection.query(`
      CREATE PROCEDURE CleanOldAuditLogs()
      BEGIN
        -- 删除 90 天前的审计日志
        DELETE FROM audit_logs
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

        -- 记录清理结果
        SELECT ROW_COUNT() AS deleted_count;
      END
    `);
    console.log('[LogAutoCleanup] ✅ audit_logs 清理存储过程已创建');

    // 创建定时清理事件（每天凌晨 2 点执行）
    try {
      await connection.query(`DROP EVENT IF EXISTS evt_clean_audit_logs`);
    } catch (e) {
      // 事件可能不存在，忽略错误
    }

    await connection.query(`
      CREATE EVENT IF NOT EXISTS evt_clean_audit_logs
      ON SCHEDULE EVERY 1 DAY
      STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 02:00:00')
      DO
        CALL CleanOldAuditLogs()
    `);
    console.log('[LogAutoCleanup] ✅ audit_logs 定时清理事件已创建（每天凌晨 2 点）');

    // ================================================================
    // 2. data_versions 清理机制
    // ================================================================

    // 创建清理存储过程
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS CleanOldDataVersions`);
    } catch (e) {
      // 存储过程可能不存在，忽略错误
    }

    await connection.query(`
      CREATE PROCEDURE CleanOldDataVersions()
      BEGIN
        -- 删除 180 天前的版本历史
        DELETE FROM data_versions
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY);

        -- 记录清理结果
        SELECT ROW_COUNT() AS deleted_count;
      END
    `);
    console.log('[LogAutoCleanup] ✅ data_versions 清理存储过程已创建');

    // 创建定时清理事件（每天凌晨 3 点执行）
    try {
      await connection.query(`DROP EVENT IF EXISTS evt_clean_data_versions`);
    } catch (e) {
      // 事件可能不存在，忽略错误
    }

    await connection.query(`
      CREATE EVENT IF NOT EXISTS evt_clean_data_versions
      ON SCHEDULE EVERY 1 DAY
      STARTS CONCAT(CURDATE() + INTERVAL 1 DAY, ' 03:00:00')
      DO
        CALL CleanOldDataVersions()
    `);
    console.log('[LogAutoCleanup] ✅ data_versions 定时清理事件已创建（每天凌晨 3 点）');

    // ================================================================
    // 3. system_logs 额外清理（备份机制）
    // ================================================================

    // 创建存储过程：清理超过 24 小时的日志（保留更短时间）
    try {
      await connection.query(`DROP PROCEDURE IF EXISTS CleanOldSystemLogs`);
    } catch (e) {
      // 存储过程可能不存在，忽略错误
    }

    await connection.query(`
      CREATE PROCEDURE CleanOldSystemLogs()
      BEGIN
        -- 删除 24 小时前的系统日志
        DELETE FROM system_logs
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

        -- 记录清理结果
        SELECT ROW_COUNT() AS deleted_count;
      END
    `);
    console.log('[LogAutoCleanup] ✅ system_logs 清理存储过程已创建（24 小时）');

    // ================================================================
    // 4. 启用事件调度器
    // ================================================================

    await connection.query(`SET GLOBAL event_scheduler = ON`);
    console.log('[LogAutoCleanup] ✅ 事件调度器已启用');

    connection.release();

    console.log('[LogAutoCleanup] ✅ 所有日志表的自动清理机制初始化成功');
  } catch (error) {
    console.error('[LogAutoCleanup] ❌ 初始化失败:', error);
    throw error;
  }
}

/**
 * 手动触发清理（用于测试或紧急清理）
 */
export async function manualCleanup(options: {
  auditLogsDays?: number;
  dataVersionsDays?: number;
  systemLogsHours?: number;
}): Promise<{ auditLogs: number; dataVersions: number; systemLogs: number }> {
  const results = {
    auditLogs: 0,
    dataVersions: 0,
    systemLogs: 0
  };

  try {
    const connection = await databaseService.getConnection();

    // 清理 audit_logs
    if (options.auditLogsDays) {
      const [result] = await connection.execute(
        `DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [options.auditLogsDays]
      ) as any[];
      results.auditLogs = result.affectedRows;
      console.log(`[LogAutoCleanup] 清理 audit_logs: ${results.auditLogs} 条`);
    }

    // 清理 data_versions
    if (options.dataVersionsDays) {
      const [result] = await connection.execute(
        `DELETE FROM data_versions WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [options.dataVersionsDays]
      ) as any[];
      results.dataVersions = result.affectedRows;
      console.log(`[LogAutoCleanup] 清理 data_versions: ${results.dataVersions} 条`);
    }

    // 清理 system_logs
    if (options.systemLogsHours) {
      const [result] = await connection.execute(
        `DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [options.systemLogsHours]
      ) as any[];
      results.systemLogs = result.affectedRows;
      console.log(`[LogAutoCleanup] 清理 system_logs: ${results.systemLogs} 条`);
    }

    connection.release();

    return results;
  } catch (error) {
    console.error('[LogAutoCleanup] 手动清理失败:', error);
    return results;
  }
}

/**
 * 获取清理统计信息
 */
export async function getCleanupStats(): Promise<{
  auditLogs: { rows: number; size: string };
  dataVersions: { rows: number; size: string };
  systemLogs: { rows: number; size: string };
}> {
  try {
    const connection = await databaseService.getConnection();

    const [auditResult] = await connection.query(`
      SELECT
        COUNT(*) as rows,
        ROUND(ROUND(DATA_LENGTH / 1024 / 1024, 2)) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'audit_logs'
    `) as any[];

    const [versionsResult] = await connection.query(`
      SELECT
        COUNT(*) as rows,
        ROUND(ROUND(DATA_LENGTH / 1024 / 1024, 2)) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'data_versions'
    `) as any[];

    const [systemResult] = await connection.query(`
      SELECT
        COUNT(*) as rows,
        ROUND(ROUND(DATA_LENGTH / 1024 / 1024, 2)) as size
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'system_logs'
    `) as any[];

    connection.release();

    return {
      auditLogs: auditResult[0] || { rows: 0, size: '0' },
      dataVersions: versionsResult[0] || { rows: 0, size: '0' },
      systemLogs: systemResult[0] || { rows: 0, size: '0' }
    };
  } catch (error) {
    console.error('[LogAutoCleanup] 获取统计信息失败:', error);
    return {
      auditLogs: { rows: 0, size: '0' },
      dataVersions: { rows: 0, size: '0' },
      systemLogs: { rows: 0, size: '0' }
    };
  }
}
