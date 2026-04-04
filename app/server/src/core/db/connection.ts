// app/server/src/core/db/connection.ts
import * as mysql from 'mysql2/promise';
import type { Pool, PoolOptions } from 'mysql2/promise';

let pool: Pool | null = null;

export function createPool(options?: Partial<PoolOptions>): Pool {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '30'), // 增加连接池大小以支持更高并发
    queueLimit: 100, // 限制排队请求数，防止无限积压
    charset: 'utf8mb4',
    // 连接健康检查配置
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // 10秒后开始keep-alive
    // 连接空闲超时
    idleTimeout: 60000, // 60秒后释放空闲连接
    ...options,
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createPool first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
