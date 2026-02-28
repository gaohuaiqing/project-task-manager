/**
 * 系统日志服务
 * 用于记录系统运行日志和用户操作日志
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './DatabaseService';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogType = 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE' | 'FRONTEND';

export interface LogEntry {
  logId?: string;
  level: LogLevel;
  type: LogType;
  message: string;
  details?: any;
  userId?: number;
  username?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  skipDatabase?: boolean; // 新增：跳过数据库写入，仅用于防止循环依赖
}

export interface LogQueryOptions {
  level?: LogLevel;
  type?: LogType;
  userId?: number;
  username?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

class SystemLogger {
  private isEnabled: boolean = true;
  private activeLogCount: number = 0; // 使用计数器代替布尔值，更好地处理并发
  private maxConcurrentLogs: number = 1; // 最大并发日志数
  private logQueue: LogEntry[] = []; // 日志队列，当数据库不可用时暂存
  private maxQueueSize: number = 1000; // 最大队列大小
  private pendingConnections: Set<Promise<any>> = new Set(); // 追踪待处理的连接请求

  /**
   * 获取数据库连接，带超时保护（修复连接泄漏）
   * 使用控制器模式确保超时时能正确取消连接请求
   */
  private async getConnectionWithTimeout(timeoutMs: number = 1000): Promise<any> {
    let connectionPromise: Promise<any> | null = null;
    let timeoutHandle: NodeJS.Timeout | null = null;
    let isTimedOut = false;

    // 创建可取消的超时 Promise
    const timeoutPromise = new Promise<any>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        isTimedOut = true;
        reject(new Error('Connection timeout'));
      }, timeoutMs);
    });

    try {
      // 获取连接的 Promise
      connectionPromise = databaseService.getConnection();
      this.pendingConnections.add(connectionPromise);

      // 竞争：连接 vs 超时
      const connection = await Promise.race([connectionPromise, timeoutPromise]);

      // 如果这里执行，说明连接成功了
      return connection;
    } catch (error: any) {
      if (isTimedOut && connectionPromise) {
        // 超时发生，但连接可能仍在后台获取
        // 我们需要等待并释放那个连接，避免泄漏
        try {
          const leakedConnection = await connectionPromise;
          console.warn('[SystemLogger] 检测到潜在连接泄漏，正在释放超时获取的连接');
          leakedConnection.release();
        } catch (releaseError) {
          // 连接获取失败，忽略
        }
      }
      throw error;
    } finally {
      // 清理
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (connectionPromise) {
        this.pendingConnections.delete(connectionPromise);
      }
    }
  }

  /**
   * 记录日志（修复连接泄漏）
   */
  async log(entry: LogEntry): Promise<boolean> {
    if (!this.isEnabled) return false;

    // 防止过多并发日志调用（递归保护）
    if (this.activeLogCount >= this.maxConcurrentLogs) {
      // 静默跳过，避免产生大量控制台输出
      return false;
    }

    // 如果标记为跳过数据库，仅输出到控制台
    if (entry.skipDatabase) {
      console.log(`[SystemLogger] ${entry.level}: ${entry.message}`, entry.details || '');
      return true;
    }

    // 增加活跃日志计数
    this.activeLogCount++;

    let connection: any = null;
    try {
      // 使用带超时的连接获取，避免无限期阻塞
      connection = await this.getConnectionWithTimeout(1000);

      // 强制设置字符集为utf8mb4
      await connection.query('SET character_set_client=utf8mb4');
      await connection.query('SET character_set_connection=utf8mb4');
      await connection.query('SET character_set_results=utf8mb4');

      // 使用 execute() 和 Prepared Statements 来避免字符集问题
      const sql = `INSERT INTO system_logs (
        log_id, log_level, log_type, message, details,
        user_id, username, session_id, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        entry.logId || uuidv4(),
        entry.level,
        entry.type,
        entry.message,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.userId || null,
        entry.username || null,
        entry.sessionId || null,
        entry.ipAddress || null,
        entry.userAgent || null
      ];

      await connection.execute(sql, params);

      return true;
    } catch (error: any) {
      // 连接池耗尽、超时或数据库错误时，仅输出到控制台，不再重试
      // 重要：不在此处调用 systemLogger.log() 避免递归
      if (error.code === 'ER_CON_COUNT_ERROR' ||
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.message?.includes('Queue limit reached') ||
          error.message?.includes('Pool closed') ||
          error.message?.includes('Connection timeout')) {
        console.warn(`[SystemLogger] 数据库不可用/超时，日志仅输出到控制台 - ${entry.level}: ${entry.message}`);
        return false;
      }
      // 其他日志记录失败不应该影响主流程
      console.error('[SystemLogger] 记录日志失败:', error);
      return false;
    } finally {
      // 确保连接被释放
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          console.error('[SystemLogger] 连接释放失败:', releaseError);
        }
      }
      // 减少活跃日志计数
      this.activeLogCount--;
    }
  }

  /**
   * 便捷方法：记录错误
   */
  async error(message: string, details?: any, userId?: number, username?: string): Promise<boolean> {
    return this.log({
      level: 'ERROR',
      type: 'SYSTEM',
      message,
      details,
      userId,
      username
    });
  }

  /**
   * 便捷方法：记录警告
   */
  async warn(message: string, details?: any, userId?: number, username?: string): Promise<boolean> {
    return this.log({
      level: 'WARN',
      type: 'SYSTEM',
      message,
      details,
      userId,
      username
    });
  }

  /**
   * 便捷方法：记录信息
   */
  async info(message: string, details?: any, userId?: number, username?: string): Promise<boolean> {
    return this.log({
      level: 'INFO',
      type: 'SYSTEM',
      message,
      details,
      userId,
      username
    });
  }

  /**
   * 便捷方法：记录用户操作
   */
  async logUserAction(
    action: string,
    details?: any,
    userId?: number,
    username?: string,
    sessionId?: string,
    ipAddress?: string
  ): Promise<boolean> {
    return this.log({
      level: 'INFO',
      type: 'USER_ACTION',
      message: `用户操作: ${action}`,
      details: { action, ...details },
      userId,
      username,
      sessionId,
      ipAddress
    });
  }

  /**
   * 便捷方法：记录认证事件
   */
  async logAuth(
    event: string,
    userId?: number,
    username?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    return this.log({
      level: 'INFO',
      type: 'AUTH',
      message: `认证事件: ${event}`,
      details: { event },
      userId,
      username,
      ipAddress,
      userAgent
    });
  }

  /**
   * 便捷方法：记录性能指标
   */
  async logPerformance(
    metric: string,
    value: number,
    details?: any
  ): Promise<boolean> {
    return this.log({
      level: 'INFO',
      type: 'PERFORMANCE',
      message: `性能指标: ${metric} = ${value}ms`,
      details: { metric, value, ...details }
    });
  }

  /**
   * 查询日志
   */
  async queryLogs(options: LogQueryOptions = {}): Promise<{ logs: any[]; total: number }> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      // 确保连接使用正确的字符集
      await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');

      // 构建查询条件
      const conditions: string[] = [];
      const params: any[] = [];

      if (options.level) {
        conditions.push('log_level = ?');
        params.push(options.level);
      }

      if (options.type) {
        conditions.push('log_type = ?');
        params.push(options.type);
      }

      if (options.userId) {
        conditions.push('user_id = ?');
        params.push(options.userId);
      }

      if (options.username) {
        conditions.push('username = ?');
        params.push(options.username);
      }

      if (options.startTime) {
        conditions.push('created_at >= ?');
        params.push(options.startTime);
      }

      if (options.endTime) {
        conditions.push('created_at <= ?');
        params.push(options.endTime);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 查询总数
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
        params
      ) as any[];
      const total = countResult[0].total;

      // 查询日志列表
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      console.log('[SystemLogger] 查询日志 - whereClause:', whereClause, 'params:', params, 'limit:', limit, 'offset:', offset);

      // 使用参数化查询防止SQL注入（修复Bug-P1-001）
      const [logs] = await connection.execute(
        `SELECT * FROM system_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as any[];

      console.log('[SystemLogger] 查询结果 - logs 数量:', logs?.length || 0, 'total:', total);

      return { logs, total };
    } catch (error) {
      console.error('[SystemLogger] 查询日志失败:', error);
      return { logs: [], total: 0 };
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 清理过期日志
   */
  async cleanOldLogs(hours: number = 24): Promise<number> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      const [result] = await connection.execute(
        `DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [hours]
      ) as any[];

      return result.affectedRows;
    } catch (error) {
      console.error('[SystemLogger] 清理日志失败:', error);
      return 0;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 清空所有日志
   */
  async clearAllLogs(): Promise<number> {
    let connection;
    try {
      connection = await databaseService.getConnection();

      const [result] = await connection.execute(
        `DELETE FROM system_logs`
      ) as any[];

      return result.affectedRows;
    } catch (error) {
      console.error('[SystemLogger] 清空日志失败:', error);
      return 0;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * 启用/禁用日志记录
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// 导出单例实例
export const systemLogger = new SystemLogger();
