/**
 * 数据库查询超时保护
 * 为长时间运行的查询添加超时限制，防止连接被长时间占用
 */

import { databaseService } from '../services/DatabaseService.js';

// 查询超时配置（毫秒）
const QUERY_TIMEOUT = {
  DEFAULT: 5000,      // 默认 5 秒
  SHORT: 2000,        // 短查询 2 秒
  MEDIUM: 10000,      // 中等查询 10 秒
  LONG: 30000,        // 长查询 30 秒
  BATCH: 60000        // 批量查询 60 秒
};

/**
 * 带超时的查询包装器
 * @param queryFn 查询函数
 * @param timeoutMs 超时时间（毫秒）
 * @param queryDescription 查询描述（用于日志）
 */
export async function withQueryTimeout<T>(
  queryFn: Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT.DEFAULT,
  queryDescription: string = '查询'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`查询超时 (${queryDescription}): ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([queryFn, timeoutPromise]);
    return result;
  } catch (error: any) {
    if (error.message.includes('查询超时')) {
      console.error(`[QueryTimeout] ${queryDescription} 超时 (${timeoutMs}ms)`);
      // 记录到系统日志
      console.error(`[QueryTimeout] 考虑优化查询或增加超时时间`);
    }
    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * 带超时的 databaseService.query 包装
 */
export async function queryWithTimeout<T = any>(
  sql: string,
  values?: any[],
  timeoutMs: number = QUERY_TIMEOUT.DEFAULT
): Promise<T> {
  return withQueryTimeout(
    databaseService.query(sql, values),
    timeoutMs,
    `SQL: ${sql.substring(0, 50)}...`
  );
}

/**
 * 带超时的 databaseService.transaction 包装
 */
export async function transactionWithTimeout<T>(
  callback: (connection: any) => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT.LONG
): Promise<T> {
  return withQueryTimeout(
    databaseService.transaction(callback),
    timeoutMs,
    '事务操作'
  );
}

/**
 * 批量查询带超时
 */
export async function batchQueryWithTimeout<T = any>(
  queries: Array<{ sql: string; values?: any[] }>,
  timeoutMs: number = QUERY_TIMEOUT.BATCH
): Promise<T[]> {
  return withQueryTimeout(
    (async () => {
      const results: T[] = [];
      for (const query of queries) {
        const result = await databaseService.query(query.sql, query.values);
        results.push(result as T);
      }
      return results;
    })(),
    timeoutMs,
    `批量查询 (${queries.length} 个)`
  );
}

/**
 * 为数据库连接添加执行超时
 */
export function setConnectionQueryTimeout(connection: any, timeoutMs: number): void {
  try {
    connection.query(`SET max_execution_time = ${timeoutMs / 1000}`);
  } catch (error) {
    console.warn('[QueryTimeout] 设置连接查询超时失败:', error);
  }
}

/**
 * 监控长时间运行的查询
 */
export function createQueryPerformanceMonitor() {
  const activeQueries = new Map<string, number>();
  const slowQueryThreshold = 3000; // 3 秒

  return {
    startQuery(queryId: string): void {
      activeQueries.set(queryId, Date.now());
    },

    endQuery(queryId: string): void {
      const startTime = activeQueries.get(queryId);
      if (startTime) {
        const duration = Date.now() - startTime;
        if (duration > slowQueryThreshold) {
          console.warn(`[QueryPerformance] 慢查询检测: ${queryId} 耗时 ${duration}ms`);
        }
        activeQueries.delete(queryId);
      }
    },

    getActiveQueries(): Map<string, number> {
      return new Map(activeQueries);
    }
  };
}

// 导出常量
export { QUERY_TIMEOUT };
