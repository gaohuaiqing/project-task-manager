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
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '30'),
    queueLimit: 100,
    charset: 'utf8mb4',
    // 连接健康检查配置
    enableKeepAlive: true,
    keepAliveInitialDelay: 0, // 立即开始 keep-alive
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
