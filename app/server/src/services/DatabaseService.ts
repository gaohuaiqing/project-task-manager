/**
 * 数据库服务 - 迁移脚本专用
 * 提供统一的数据库查询接口
 */

import { getPool, createPool } from '../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export const databaseService = {
  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    createPool();
  },

  /**
   * 执行查询
   */
  async query(sql: string, params?: unknown[]): Promise<RowDataPacket[] | ResultSetHeader> {
    const pool = getPool();
    if (params && params.length > 0) {
      const [result] = await pool.execute(sql, params);
      return result as RowDataPacket[] | ResultSetHeader;
    }
    const [result] = await pool.execute(sql);
    return result as RowDataPacket[] | ResultSetHeader;
  },
};

export default databaseService;
