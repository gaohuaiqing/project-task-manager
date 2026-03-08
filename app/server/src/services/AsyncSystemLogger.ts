/**
 * 异步日志服务
 * 将日志写入操作放入队列异步执行，避免阻塞主流程
 * 🚨 紧急修复：使用日志专用连接池，避免占用主业务连接池
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './DatabaseService.js';
import { logDatabaseService } from './LogDatabaseService.js';  // 🚨 新增：日志专用连接池
import { withQueryTimeout, QUERY_TIMEOUT } from '../utils/DatabaseQueryTimeout.js';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogType = 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE';

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
  skipDatabase?: boolean;
  timestamp?: number;  // 添加时间戳
  retryCount?: number;  // 添加重试计数（修复Bug-P2-002）
}

/**
 * 异步日志队列管理器
 * 🚨 紧急修复：增加熔断器机制
 */
class AsyncLogQueue {
  private queue: LogEntry[] = [];
  private isProcessing: boolean = false;
  private batchSize: number = 100;  // 🚨 优化：增加到 100，减少写入频率
  private flushInterval: number = 10000;  // 🚨 优化：增加到 10 秒
  private maxQueueSize: number = 500;  // 🚨 优化：降低到 500，减少内存占用
  private flushTimer: NodeJS.Timeout | null = null;

  // 🚨 新增：熔断器机制
  private failureCount: number = 0;
  private circuitBreakerOpen: boolean = false;
  private readonly failureThreshold: number = 10;  // 10 次失败后熔断
  private readonly cooldownTime: number = 60000;  // 1 分钟冷却

  constructor() {
    this.startFlushTimer();
  }

  /**
   * 添加日志到队列
   * 🚨 紧急修复：增加熔断器检查
   */
  enqueue(entry: LogEntry): void {
    // 🚨 熔断器检查
    if (this.circuitBreakerOpen) {
      // 熔断开启，静默丢弃
      if (entry.level === 'ERROR') {
        console.error('[AsyncLogQueue] 🔴 熔断中，丢弃错误日志:', entry.message);
      }
      return;
    }

    // 添加时间戳和重试计数（修复Bug-P2-002）
    entry.timestamp = Date.now();
    entry.retryCount = entry.retryCount || 0;

    // 检查队列大小
    if (this.queue.length >= this.maxQueueSize) {
      // 队列已满，丢弃最旧的日志（WARNING/INFO 优先丢弃）
      const dropIndex = this.queue.findIndex(e => e.level === 'INFO' || e.level === 'DEBUG');
      if (dropIndex !== -1) {
        this.queue.splice(dropIndex, 1);
        console.warn('[AsyncLogQueue] 队列已满，丢弃低优先级日志');
      } else {
        console.error('[AsyncLogQueue] 队列已满且无法丢弃，丢弃当前日志');
        return;
      }
    }

    this.queue.push(entry);

    // 如果队列达到批量大小，立即刷新
    if (this.queue.length >= this.batchSize) {
      this.flush().catch(err => console.error('[AsyncLogQueue] 刷新失败:', err));
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.error('[AsyncLogQueue] 定时刷新失败:', err));
    }, this.flushInterval);
  }

  /**
   * 刷新队列到数据库
   * 🚨 紧急修复：使用日志专用连接池
   */
  private async flush(): Promise<void> {
    // 如果已经在处理中，跳过
    if (this.isProcessing) {
      return;
    }

    // 如果队列为空，跳过
    if (this.queue.length === 0) {
      return;
    }

    // 🚨 熔断器检查
    if (this.circuitBreakerOpen) {
      return;
    }

    this.isProcessing = true;

    // 取出当前需要处理的日志
    const logsToProcess = this.queue.splice(0, this.batchSize);

    if (logsToProcess.length === 0) {
      this.isProcessing = false;
      return;
    }

    try {
      // 🚨 关键修复：使用日志专用连接池
      const connection = await logDatabaseService.getConnection();

      try {
        // 批量插入日志
        const values = logsToProcess.map(log => [
          log.logId || uuidv4(),
          log.level,
          log.type,
          log.message,
          log.details ? JSON.stringify(log.details) : null,
          log.userId || null,
          log.username || null,
          log.sessionId || null,
          log.ipAddress || null,
          log.userAgent || null
        ]);

        const sql = `INSERT INTO system_logs
          (log_id, log_level, log_type, message, details,
           user_id, username, session_id, ip_address, user_agent)
          VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`;

        const flatValues = values.flat();

        await connection.query(sql, flatValues);

        // 🚨 成功，重置失败计数
        this.failureCount = 0;

        console.log(`[AsyncLogQueue] ✅ 已写入 ${logsToProcess.length} 条日志`);
      } finally {
        connection.release();
      }
    } catch (error) {
      this.failureCount++;
      console.error('[AsyncLogQueue] ❌ 批量写入日志失败:', error);

      // 🚨 检查是否需要熔断
      if (this.failureCount >= this.failureThreshold) {
        this.circuitBreakerOpen = true;
        console.error(`[AsyncLogQueue] 🔴 熔断器开启！连续失败 ${this.failureCount} 次`);

        // 1 分钟后自动恢复
        setTimeout(() => {
          this.circuitBreakerOpen = false;
          this.failureCount = 0;
          console.log('[AsyncLogQueue] ✅ 熔断器已恢复');
        }, this.cooldownTime);
      }

      // 修复Bug-P2-002: 添加重试次数限制，防止无限重试导致内存泄漏
      const maxRetries = 3;
      const logsToRetry = logsToProcess.filter(log => {
        const retryCount = (log.retryCount || 0) + 1;
        log.retryCount = retryCount;
        return retryCount <= maxRetries;
      });

      if (logsToRetry.length < logsToProcess.length) {
        console.warn(`[AsyncLogQueue] ${logsToProcess.length - logsToRetry.length} 条日志超过最大重试次数，已丢弃`);
      }

      // 写入失败，将日志放回队列头部（优先处理）
      this.queue.unshift(...logsToRetry);

      // 等待一段时间后重试
      if (logsToRetry.length > 0) {
        setTimeout(() => {
          this.flush().catch(err => console.error('[AsyncLogQueue] 重试刷新失败:', err));
        }, 5000);
      }
    } finally {
      this.isProcessing = false;

      // 如果还有日志待处理，继续刷新
      if (this.queue.length > 0) {
        setImmediate(() => {
          this.flush().catch(err => console.error('[AsyncLogQueue] 继续刷新失败:', err));
        });
      }
    }
  }

  /**
   * 强制刷新所有日志（关闭时调用）
   */
  async flushAll(): Promise<void> {
    // 停止定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 刷新剩余日志
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queueSize: number; isProcessing: boolean } {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing
    };
  }
}

/**
 * 异步日志服务
 */
class AsyncSystemLogger {
  private isEnabled: boolean = true;
  private logQueue: AsyncLogQueue;

  constructor() {
    this.logQueue = new AsyncLogQueue();
  }

  /**
   * 记录日志（异步）
   */
  async log(entry: LogEntry): Promise<boolean> {
    if (!this.isEnabled) return false;

    // 如果标记为跳过数据库，仅输出到控制台
    if (entry.skipDatabase) {
      console.log(`[AsyncSystemLogger] ${entry.level}: ${entry.message}`, entry.details || '');
      return true;
    }

    // 添加到异步队列
    this.logQueue.enqueue(entry);

    // 同时输出到控制台（立即反馈）
    console.log(`[AsyncSystemLogger] ${entry.level}: ${entry.message}`);

    return true;
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
   * 启用/禁用日志记录
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 刷新日志队列（关闭时调用）
   */
  async shutdown(): Promise<void> {
    console.log('[AsyncSystemLogger] 正在刷新剩余日志...');
    await this.logQueue.flushAll();
    console.log('[AsyncSystemLogger] 日志刷新完成');
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queueSize: number; isProcessing: boolean } {
    return this.logQueue.getQueueStatus();
  }

  // ================================================================
  // 管理方法 - 直接数据库查询（不经过队列）
  // ================================================================

  /**
   * 查询日志（带超时保护）
   */
  async queryLogs(options: LogQueryOptions = {}): Promise<{ logs: any[]; total: number }> {
    try {
      const connection = await withQueryTimeout(
        databaseService.getConnection(),
        QUERY_TIMEOUT.DEFAULT,
        'queryLogs-getConnection'
      );

      try {
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

        const [logs] = await connection.query(
          `SELECT * FROM system_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [...params, limit, offset]
        ) as any[];

        return { logs, total };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[AsyncSystemLogger] 查询日志失败:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * 清理过期日志（带超时保护）
   */
  async cleanOldLogs(hours: number = 24): Promise<number> {
    try {
      const result = await withQueryTimeout(
        databaseService.query(
          `DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
          [hours]
        ),
        QUERY_TIMEOUT.MEDIUM,
        `cleanOldLogs(${hours}h)`
      );

      return (result as any).affectedRows || 0;
    } catch (error) {
      console.error('[AsyncSystemLogger] 清理日志失败:', error);
      return 0;
    }
  }

  /**
   * 清空所有日志（带超时保护）
   */
  async clearAllLogs(): Promise<number> {
    try {
      const result = await withQueryTimeout(
        databaseService.query(`DELETE FROM system_logs`),
        QUERY_TIMEOUT.LONG,
        'clearAllLogs'
      );

      return (result as any).affectedRows || 0;
    } catch (error) {
      console.error('[AsyncSystemLogger] 清空日志失败:', error);
      return 0;
    }
  }
}

// 导出单例实例
export const asyncSystemLogger = new AsyncSystemLogger();

// 导出旧版 logger 的别名以保持兼容性
export const systemLogger = asyncSystemLogger;
