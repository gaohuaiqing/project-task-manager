/**
 * 数据库查询优化工具
 * 提供分页、字段选择、缓存等功能
 */

import { databaseService } from '../services/DatabaseService.js';

export interface QueryOptions {
  page?: number;       // 页码（从 1 开始）
  pageSize?: number;   // 每页数量
  fields?: string[];   // 要返回的字段（空数组表示返回所有字段）
  orderBy?: string;    // 排序字段
  order?: 'ASC' | 'DESC'; // 排序方向
  where?: string;      // WHERE 条件
  params?: any[];      // WHERE 参数
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 分页查询助手
 */
export class QueryOptimizer {
  /**
   * 构建分页查询
   */
  static async paginatedQuery<T>(
    tableName: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      pageSize = 50,
      fields = [],
      orderBy = 'created_at',
      order = 'DESC',
      where = '',
      params = []
    } = options;

    // 验证分页参数
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 500); // 最大 500 条/页
    const offset = (validPage - 1) * validPageSize;

    // 构建字段列表
    const fieldList = fields.length > 0 ? fields.join(', ') : '*';

    // 构建查询
    let sql = `SELECT ${fieldList} FROM ${tableName}`;
    const queryParams: any[] = [];

    if (where) {
      sql += ` WHERE ${where}`;
      queryParams.push(...params);
    }

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM ${tableName}${where ? ` WHERE ${where}` : ''}`;
    const countResult = await databaseService.query(countSql, queryParams) as { total: number }[];
    const total = countResult[0]?.total || 0;

    // 添加排序和分页
    sql += ` ORDER BY ${orderBy} ${order} LIMIT ${validPageSize} OFFSET ${offset}`;

    // 执行查询
    const data = await databaseService.query(sql, queryParams) as T[];

    return {
      data,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages: Math.ceil(total / validPageSize)
      }
    };
  }

  /**
   * 构建字段选择查询
   */
  static async selectFields<T>(
    tableName: string,
    fields: string[],
    options: Omit<QueryOptions, 'fields'> = {}
  ): Promise<T[]> {
    const { where = '', params = [], orderBy = 'id', order = 'ASC' } = options;

    const fieldList = fields.length > 0 ? fields.join(', ') : '*';
    let sql = `SELECT ${fieldList} FROM ${tableName}`;
    const queryParams: any[] = [];

    if (where) {
      sql += ` WHERE ${where}`;
      queryParams.push(...params);
    }

    sql += ` ORDER BY ${orderBy} ${order}`;

    return await databaseService.query(sql, queryParams) as T[];
  }

  /**
   * 批量获取（使用 IN 查询）
   */
  static async batchGet<T>(
    tableName: string,
    field: string,
    values: any[],
    selectFields: string[] = []
  ): Promise<T[]> {
    if (values.length === 0) return [];

    const fieldList = selectFields.length > 0 ? selectFields.join(', ') : '*';
    const placeholders = values.map(() => '?').join(',');

    const sql = `SELECT ${fieldList} FROM ${tableName} WHERE ${field} IN (${placeholders})`;
    return await databaseService.query(sql, values) as T[];
  }

  /**
   * 存在性检查（只返回是否存在，不获取数据）
   */
  static async exists(
    tableName: string,
    where: string,
    params: any[]
  ): Promise<boolean> {
    const sql = `SELECT 1 as exists FROM ${tableName} WHERE ${where} LIMIT 1`;
    const result = await databaseService.query(sql, params) as any[];
    return result.length > 0;
  }

  /**
   * 计数查询
   */
  static async count(
    tableName: string,
    where: string = '',
    params: any[] = []
  ): Promise<number> {
    const sql = `SELECT COUNT(*) as total FROM ${tableName}${where ? ` WHERE ${where}` : ''}`;
    const result = await databaseService.query(sql, params) as { total: number }[];
    return result[0]?.total || 0;
  }
}

export default QueryOptimizer;
