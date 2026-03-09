/**
 * 日志系统专用数据库服务
 * 使用独立的连接池，避免日志系统占用主业务连接池资源
 *
 * 🚨 紧急修复：解决连接池耗尽问题
 */

import mysql from 'mysql2/promise';

/**
 * 日志专用连接池配置
 */
const LOG_POOL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'task_manager',
  // 🚨 关键配置：独立的日志连接池
  connectionLimit: parseInt(process.env.LOG_DB_CONNECTION_LIMIT || '5'),  // 仅 5 个连接
  queueLimit: parseInt(process.env.LOG_DB_QUEUE_LIMIT || '50'),          // 队列限制 50
  maxIdle: 2,                                                             // 最大空闲连接
  idleTimeout: 60000,                                                     // 空闲超时 60 秒
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  timezone: '+08:00',
};

class LogDatabaseService {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;

  /**
   * 初始化日志专用连接池
   */
  async init(): Promise<void> {
    try {
      // 检查是否有密码
      const dbPassword = process.env.DB_PASSWORD;
      const poolConfig: any = { ...LOG_POOL_CONFIG };

      if (dbPassword && dbPassword.trim() !== '') {
        poolConfig.password = dbPassword;
      }

      this.pool = mysql.createPool(poolConfig);

      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
      connection.release();

      this.isConnected = true;
      console.log('[LogDatabaseService] ✅ 日志专用连接池已启动');
      console.log(`[LogDatabaseService] 连接数: ${LOG_POOL_CONFIG.connectionLimit}, 队列: ${LOG_POOL_CONFIG.queueLimit}`);
    } catch (error) {
      console.error('[LogDatabaseService] ❌ 初始化失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 检查连接是否可用
   */
  checkConnected(): boolean {
    return this.pool !== null && this.isConnected;
  }

  /**
   * 获取日志专用连接
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool || !this.isConnected) {
      throw new Error('[LogDatabaseService] 连接池未初始化');
    }

    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      console.error('[LogDatabaseService] 获取连接失败:', error);
      throw error;
    }
  }

  /**
   * 执行日志写入（带超时保护）
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    let connection: mysql.PoolConnection | null = null;

    try {
      connection = await this.getConnection();

      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('查询超时')), 2000);
      });

      const queryPromise = connection.query(sql, params);

      const result = await Promise.race([queryPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[LogDatabaseService] 慢查询: ${duration}ms`);
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[LogDatabaseService] 查询失败 (${duration}ms):`, error.message);
      throw error;
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (e) {
          console.error('[LogDatabaseService] 连接释放失败:', e);
        }
      }
    }
  }

  /**
   * 批量写入日志
   */
  async batchInsert(table: string, columns: string[], values: any[][]): Promise<number> {
    if (values.length === 0) return 0;

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.map(() => '(?)').join(', ')}`;
    const flatValues = values.flat();

    const result = await this.query(sql, flatValues);
    return (result as any).affectedRows;
  }

  /**
   * 清理过期日志（带超时保护）
   */
  async cleanOldLogs(table: string, dateColumn: string, interval: string): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${dateColumn} < DATE_SUB(NOW(), INTERVAL ${interval})`;

    try {
      const result = await this.query(sql);
      return (result as any).affectedRows;
    } catch (error) {
      console.error(`[LogDatabaseService] 清理日志失败 (${table}):`, error);
      return 0;
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus(): { total: number; active: number; free: number; queued: number; usageRate: string } | null {
    if (!this.pool) return null;

    try {
      const pool = this.pool.pool as any;
      const totalConnections = pool.connectionLimit || 0;
      const allConnections = pool._allConnections?.length || 0;
      const freeConnections = pool._freeConnections?.length || 0;
      const queuedRequests = pool._connectionQueue?.length || 0;
      const activeConnections = allConnections - freeConnections;
      const usageRate = totalConnections > 0 ? ((activeConnections / totalConnections) * 100).toFixed(1) : '0';

      return {
        total: totalConnections,
        active: activeConnections,
        free: freeConnections,
        queued: queuedRequests,
        usageRate
      };
    } catch (error) {
      console.error('[LogDatabaseService] 获取连接池状态失败:', error);
      return null;
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        console.log('[LogDatabaseService] 日志专用连接池已关闭');
      } catch (error) {
        console.error('[LogDatabaseService] 关闭连接池失败:', error);
      }
      this.pool = null;
      this.isConnected = false;
    }
  }
}

// 导出单例
export const logDatabaseService = new LogDatabaseService();
export default logDatabaseService;
