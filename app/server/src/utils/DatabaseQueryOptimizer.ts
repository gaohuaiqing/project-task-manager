/**
 * 数据库查询优化工具
 * 分析查询性能并提供优化建议
 */

import { databaseService } from '../services/DatabaseService.js';

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowCount: number;
  suggestions: string[];
  hasIndex: boolean;
  recommendedIndex?: string;
}

/**
 * 查询性能分析器
 */
export class QueryAnalyzer {
  /**
   * 分析查询并提供优化建议
   */
  static async analyzeQuery(query: string, params: any[] = []): Promise<QueryAnalysis> {
    const startTime = Date.now();

    try {
      // 执行 EXPLAIN 分析查询计划
      const explainResult = await databaseService.query(`EXPLAIN ${query}`, params) as any[];

      // 执行实际查询
      const result = await databaseService.query(query, params) as any[];
      const executionTime = Date.now() - startTime;

      // 分析查询计划
      const suggestions: string[] = [];
      let hasIndex = true;
      let recommendedIndex: string | undefined;

      // 检查是否使用了全表扫描
      const hasFullScan = explainResult.some((row: any) => row.type === 'ALL');
      if (hasFullScan) {
        suggestions.push('查询使用了全表扫描，考虑添加适当的索引');
        hasIndex = false;
      }

      // 检查是否使用了文件排序
      const hasFilesort = explainResult.some((row: any) => row.Extra?.includes('Using filesort'));
      if (hasFilesort) {
        suggestions.push('查询使用了文件排序，考虑添加索引或优化 ORDER BY 子句');
      }

      // 检查是否使用了临时表
      const hasTemporary = explainResult.some((row: any) => row.Extra?.includes('Using temporary'));
      if (hasTemporary) {
        suggestions.push('查询使用了临时表，考虑优化查询结构或添加索引');
      }

      // 检查 WHERE 条件
      const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/is);
      if (whereMatch && hasFullScan) {
        const whereClause = whereMatch[1].trim();
        // 提取可能的字段名
        const fieldMatches = whereClause.match(/(\w+)\s*=/g);
        if (fieldMatches) {
          const fields = fieldMatches.map(m => m.replace(/\s*=/, '')).join(', ');
          recommendedIndex = `CREATE INDEX idx_recommended ON table_name (${fields})`;
        }
      }

      return {
        query,
        executionTime,
        rowCount: result.length,
        suggestions,
        hasIndex,
        recommendedIndex
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      return {
        query,
        executionTime,
        rowCount: 0,
        suggestions: [`查询执行失败: ${error.message}`],
        hasIndex: false
      };
    }
  }

  /**
   * 检查表的索引使用情况
   */
  static async checkTableIndexes(tableName: string): Promise<any[]> {
    const query = `
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        SEQ_IN_INDEX,
        CARDINALITY
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;

    return await databaseService.query(query, [tableName]);
  }

  /**
   * 获取表的统计信息
   */
  static async getTableStats(tableName: string): Promise<any> {
    const query = `
      SELECT
        TABLE_ROWS,
        AVG_ROW_LENGTH,
        DATA_LENGTH,
        INDEX_LENGTH,
        UPDATE_TIME,
        AUTO_INCREMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `;

    const result = await databaseService.query(query, [tableName]) as any[];
    return result[0] || null;
  }

  /**
   * 识别慢查询
   */
  static async identifySlowQueries(thresholdMs: number = 1000): Promise<QueryAnalysis[]> {
    // 这里可以集成慢查询日志分析
    // 目前返回空数组，可以后续扩展
    return [];
  }
}

/**
 * 查询构建器 - 生成优化的查询
 */
export class QueryBuilder {
  /**
   * 构建优化的 SELECT 查询
   */
  static buildSelectQuery(options: {
    table: string;
    columns?: string[];
    where?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
    params?: any[];
  }): { sql: string; params: any[] } {
    const { table, columns = ['*'], where, orderBy, limit, offset, params = [] } = options;

    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;

    const queryParams: any[] = [...params];

    if (where) {
      sql += ` WHERE ${where}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ?`;
      queryParams.push(limit);
    }

    if (offset) {
      sql += ` OFFSET ?`;
      queryParams.push(offset);
    }

    return { sql, params: queryParams };
  }

  /**
   * 构建批量插入查询
   */
  static buildBatchInsert(table: string, columns: string[], values: any[][]): { sql: string; params: any[] } {
    const placeholders = values.map(row =>
      `(${row.map(() => '?').join(', ')})`
    ).join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
    const params = values.flat();

    return { sql, params };
  }

  /**
   * 构建批量更新查询
   */
  static buildBatchUpdate(
    table: string,
    updates: Array<{ id: number | string; [key: string]: any }>,
    idColumn: string = 'id'
  ): { sql: string; params: any[] } {
    const sql = `UPDATE ${table} SET
      ${updates.map((_, i) => `
        CASE
          WHEN ${idColumn} = ? THEN ?
        END
      `.join(', ')).join(', ')}
    WHERE ${idColumn} IN (${updates.map(() => '?').join(', ')})`;

    const params: any[] = [];
    updates.forEach(update => {
      Object.keys(update).forEach(key => {
        if (key !== idColumn) {
          params.push(update[idColumn]);
          params.push(update[key]);
        }
      });
    });
    updates.forEach(update => params.push(update[idColumn]));

    return { sql, params };
  }
}

export default QueryAnalyzer;
