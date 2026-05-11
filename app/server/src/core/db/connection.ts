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
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '50'),
    queueLimit: 0,
    charset: 'utf8mb4',
    // 连接健康检查配置
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // 10秒后开始keep-alive
    // 连接空闲超时（毫秒）
    idleTimeout: 60000, // 60秒空闲后释放
    // 最大连接生命周期（防止内存泄漏）
    maxLifetime: 1800000, // 30分钟后强制重建连接
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
