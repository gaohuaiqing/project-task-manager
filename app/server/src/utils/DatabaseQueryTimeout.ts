/**
 * 增强的数据库查询超时保护
 *
 * 功能：
 * 1. 查询超时控制
 * 2. 慢查询检测和日志
 * 3. 查询取消机制
 * 4. 超时降级策略
 * 5. 查询性能统计
 *
 * @author AI Assistant
 * @since 2025-03-04
 */

import { databaseService } from '../services/DatabaseService.js';
import { systemLogger } from '../services/AsyncSystemLogger.js';

// ================================================================
// 查询超时配置（毫秒）
// ================================================================

export const QUERY_TIMEOUT = {
  DEFAULT: parseInt(process.env.QUERY_TIMEOUT_DEFAULT || '5000'),
  SHORT: parseInt(process.env.QUERY_TIMEOUT_SHORT || '2000'),
  MEDIUM: parseInt(process.env.QUERY_TIMEOUT_MEDIUM || '8000'),
  LONG: parseInt(process.env.QUERY_TIMEOUT_LONG || '15000'),
  BATCH: parseInt(process.env.QUERY_TIMEOUT_BATCH || '45000'),
  ANALYTICS: parseInt(process.env.QUERY_TIMEOUT_ANALYTICS || '90000')
};

// ================================================================
// 慢查询配置
// ================================================================

const SLOW_QUERY_THRESHOLDS = {
  WARNING: parseInt(process.env.SLOW_QUERY_WARNING || '1000'),
  CRITICAL: parseInt(process.env.SLOW_QUERY_CRITICAL || '3000'),
  EMERGENCY: parseInt(process.env.SLOW_QUERY_EMERGENCY || '5000')
};

// ================================================================
// 查询统计信息
// ================================================================

interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  timeoutQueries: number;
  cancelledQueries: number;
  avgQueryTime: number;
  maxQueryTime: number;
  slowQueriesList: SlowQueryInfo[];
}

interface SlowQueryInfo {
  sql: string;
  duration: number;
  timestamp: number;
  params?: any[];
}

interface TimeoutOptions {
  timeoutMs?: number;
  description?: string;
  enableCancellation?: boolean;
  fallback?: () => any;
  onTimeout?: (error: Error) => void;
  onSlow?: (duration: number) => void;
}

// ================================================================
// 全局查询统计
// ================================================================

const globalQueryStats: QueryStats = {
  totalQueries: 0,
  slowQueries: 0,
  timeoutQueries: 0,
  cancelledQueries: 0,
  avgQueryTime: 0,
  maxQueryTime: 0,
  slowQueriesList: []
};

// 活跃查询追踪
const activeQueries = new Map<string, {
  startTime: number;
  sql: string;
  params?: any[];
  controller?: AbortController;
}>();

// ================================================================
// 增强的带超时查询包装器
// ================================================================

/**
 * 带超时的查询包装器（增强版）
 *
 * @param queryFn 查询函数
 * @param options 超时选项
 */
export async function withQueryTimeout<T>(
  queryFn: Promise<T> | (() => Promise<T>),
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = QUERY_TIMEOUT.DEFAULT,
    description = '查询',
    enableCancellation = false,
    fallback,
    onTimeout,
    onSlow
  } = options;

  // 生成查询ID
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // 创建超时Promise
  let timeoutHandle: NodeJS.Timeout | null = null;
  let controller: AbortController | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      // 取消查询（如果支持）
      if (enableCancellation && controller) {
        controller.abort();
      }

      const error = new Error(`查询超时 (${description}): ${timeoutMs}ms`);
      (error as any).code = 'QUERY_TIMEOUT';
      (error as any).queryId = queryId;
      reject(error);
    }, timeoutMs);
  });

  // 如果支持取消，创建AbortController
  if (enableCancellation) {
    try {
      controller = new AbortController();
    } catch (e) {
      // Node.js < 15.0.0 不支持 AbortController
      console.warn('[QueryTimeout] AbortController 不支持，取消功能不可用');
    }
  }

  try {
    // 执行查询
    const queryPromise = typeof queryFn === 'function' ? queryFn() : queryFn;

    // 追踪活跃查询
    activeQueries.set(queryId, {
      startTime,
      sql: description,
      controller: controller || undefined
    });

    // 等待结果
    const result = await Promise.race([queryPromise, timeoutPromise]);

    // 计算执行时间
    const duration = Date.now() - startTime;

    // 更新统计
    updateQueryStats(duration, description);

    // 慢查询检测
    if (duration > SLOW_QUERY_THRESHOLDS.WARNING) {
      handleSlowQuery(description, duration);
      onSlow?.(duration);
    }

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // 处理超时错误
    if (error.message.includes('查询超时') || error.code === 'QUERY_TIMEOUT') {
      globalQueryStats.timeoutQueries++;

      console.error(`[QueryTimeout] ${description} 超时 (${timeoutMs}ms)`);

      // 记录超时到系统日志
      await systemLogger.error(
        `[QueryTimeout] ${description} 超时`,
        {
          timeoutMs,
          actualDuration: duration,
          queryId
        },
        0,
        'system'
      );

      // 执行回调
      onTimeout?.(error);

      // 尝试降级策略
      if (fallback) {
        console.warn(`[QueryTimeout] 执行降级策略: ${description}`);
        try {
          return await fallback();
        } catch (fallbackError) {
          console.error('[QueryTimeout] 降级策略失败:', fallbackError);
        }
      }
    }

    // 处理取消错误
    if (error.name === 'AbortError') {
      globalQueryStats.cancelledQueries++;
      console.warn(`[QueryTimeout] 查询已取消: ${description}`);
      throw new Error(`查询已取消: ${description}`);
    }

    throw error;
  } finally {
    // 清理
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    activeQueries.delete(queryId);
  }
}

// ================================================================
// 带超时的 databaseService.query 包装
// ================================================================

export async function queryWithTimeout<T = any>(
  sql: string,
  values?: any[],
  timeoutMs: number = QUERY_TIMEOUT.DEFAULT
): Promise<T> {
  const sqlPreview = sql.substring(0, 100) + (sql.length > 100 ? '...' : '');

  return withQueryTimeout(
    databaseService.query(sql, values),
    {
      timeoutMs,
      description: `SQL: ${sqlPreview}`,
      onSlow: (duration) => {
        console.warn(`[QueryTimeout] 慢查询检测 (${duration}ms): ${sqlPreview}`);
      }
    }
  );
}

// ================================================================
// 带超时的事务操作
// ================================================================

export async function transactionWithTimeout<T>(
  callback: (connection: any) => Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT.LONG
): Promise<T> {
  return withQueryTimeout(
    databaseService.transaction(callback),
    {
      timeoutMs,
      description: '事务操作',
      onSlow: (duration) => {
        console.warn(`[QueryTimeout] 慢事务检测 (${duration}ms)`);
      }
    }
  );
}

// ================================================================
// 批量查询带超时
// ================================================================

export async function batchQueryWithTimeout<T = any>(
  queries: Array<{ sql: string; values?: any[] }>,
  timeoutMs: number = QUERY_TIMEOUT.BATCH
): Promise<T[]> {
  const description = `批量查询 (${queries.length} 个)`;

  return withQueryTimeout(
    (async () => {
      const results: T[] = [];
      for (const query of queries) {
        const result = await databaseService.query(query.sql, query.values);
        results.push(result as T);
      }
      return results;
    })(),
    {
      timeoutMs,
      description,
      onSlow: (duration) => {
        console.warn(`[QueryTimeout] 慢批量查询检测 (${duration}ms): ${queries.length} 个查询`);
      }
    }
  );
}

// ================================================================
// 查询性能监控器
// ================================================================

export function createQueryPerformanceMonitor() {
  const monitorQueries = new Map<string, number>();

  return {
    /**
     * 开始监控查询
     */
    startQuery(queryId: string, sql?: string): void {
      monitorQueries.set(queryId, Date.now());
      if (sql) {
        activeQueries.set(queryId, {
          startTime: Date.now(),
          sql: sql.substring(0, 100)
        });
      }
    },

    /**
     * 结束监控查询
     */
    endQuery(queryId: string): number {
      const startTime = monitorQueries.get(queryId);
      if (!startTime) return 0;

      const duration = Date.now() - startTime;
      monitorQueries.delete(queryId);

      // 更新最大查询时间
      if (duration > globalQueryStats.maxQueryTime) {
        globalQueryStats.maxQueryTime = duration;
      }

      return duration;
    },

    /**
     * 获取活跃查询
     */
    getActiveQueries(): Array<{ id: string; elapsed: number; sql: string }> {
      const now = Date.now();
      return Array.from(activeQueries.entries()).map(([id, info]) => ({
        id,
        elapsed: now - info.startTime,
        sql: info.sql
      }));
    },

    /**
     * 获取长时间运行的查询
     */
    getLongRunningQueries(thresholdMs: number = 5000): Array<{ id: string; elapsed: number; sql: string }> {
      const now = Date.now();
      return Array.from(activeQueries.entries())
        .filter(([_, info]) => now - info.startTime > thresholdMs)
        .map(([id, info]) => ({
          id,
          elapsed: now - info.startTime,
          sql: info.sql
        }));
    }
  };
}

// ================================================================
// 全局查询性能监控器
// ================================================================

export const globalQueryMonitor = createQueryPerformanceMonitor();

// ================================================================
// 慢查询处理
// ================================================================

/**
 * 处理慢查询
 */
function handleSlowQuery(sql: string, duration: number): void {
  globalQueryStats.slowQueries++;

  const slowQueryInfo: SlowQueryInfo = {
    sql: sql.substring(0, 200),
    duration,
    timestamp: Date.now()
  };

  // 添加到慢查询列表（保留最近100条）
  globalQueryStats.slowQueriesList.push(slowQueryInfo);
  if (globalQueryStats.slowQueriesList.length > 100) {
    globalQueryStats.slowQueriesList.shift();
  }

  // 根据执行时间输出不同级别的日志
  if (duration > SLOW_QUERY_THRESHOLDS.EMERGENCY) {
    console.error(`[QueryPerformance] 🔴 紧急慢查询: ${duration}ms - ${sql.substring(0, 100)}`);
  } else if (duration > SLOW_QUERY_THRESHOLDS.CRITICAL) {
    console.warn(`[QueryPerformance] 🟠 严重慢查询: ${duration}ms - ${sql.substring(0, 100)}`);
  } else {
    console.info(`[QueryPerformance] 🟡 慢查询警告: ${duration}ms - ${sql.substring(0, 100)}`);
  }
}

// ================================================================
// 查询统计更新
// ================================================================

/**
 * 更新查询统计
 */
function updateQueryStats(duration: number, sql: string): void {
  globalQueryStats.totalQueries++;

  // 更新平均查询时间（移动平均）
  globalQueryStats.avgQueryTime =
    (globalQueryStats.avgQueryTime * 0.95) + (duration * 0.05);

  // 更新最大查询时间
  if (duration > globalQueryStats.maxQueryTime) {
    globalQueryStats.maxQueryTime = duration;
  }
}

// ================================================================
// 查询统计获取
// ================================================================

/**
 * 获取查询统计信息
 */
export function getQueryStats(): QueryStats {
  return { ...globalQueryStats };
}

/**
 * 获取慢查询报告
 */
export function getSlowQueryReport(limit: number = 20): {
  totalSlowQueries: number;
  slowQueries: SlowQueryInfo[];
  avgSlowQueryTime: number;
  maxSlowQueryTime: number;
} {
  const slowQueries = globalQueryStats.slowQueriesList
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);

  const avgSlowQueryTime = slowQueries.length > 0
    ? slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length
    : 0;

  const maxSlowQueryTime = slowQueries.length > 0
    ? Math.max(...slowQueries.map(q => q.duration))
    : 0;

  return {
    totalSlowQueries: globalQueryStats.slowQueries,
    slowQueries,
    avgSlowQueryTime,
    maxSlowQueryTime
  };
}

/**
 * 重置查询统计
 */
export function resetQueryStats(): void {
  globalQueryStats.totalQueries = 0;
  globalQueryStats.slowQueries = 0;
  globalQueryStats.timeoutQueries = 0;
  globalQueryStats.cancelledQueries = 0;
  globalQueryStats.avgQueryTime = 0;
  globalQueryStats.maxQueryTime = 0;
  globalQueryStats.slowQueriesList = [];

  console.log('[QueryTimeout] 查询统计已重置');
}

/**
 * 打印查询统计报告
 */
export function printQueryStatsReport(): void {
  const stats = getQueryStats();
  const slowReport = getSlowQueryReport(10);

  console.log('\n==================== 查询性能统计 ====================');
  console.log(`总查询数: ${stats.totalQueries}`);
  console.log(`慢查询数: ${stats.slowQueries} (${((stats.slowQueries / stats.totalQueries) * 100).toFixed(2)}%)`);
  console.log(`超时查询数: ${stats.timeoutQueries}`);
  console.log(`取消查询数: ${stats.cancelledQueries}`);
  console.log(`平均查询时间: ${stats.avgQueryTime.toFixed(2)}ms`);
  console.log(`最大查询时间: ${stats.maxQueryTime}ms`);
  console.log(`活跃查询数: ${activeQueries.size}`);

  if (slowReport.totalSlowQueries > 0) {
    console.log('\n-------------------- 前10个慢查询 --------------------');
    slowReport.slowQueries.forEach((query, index) => {
      console.log(`${index + 1}. ${query.duration}ms - ${query.sql}`);
    });
  }

  console.log('======================================================\n');
}

// ================================================================
// 定期统计报告
// ================================================================

setInterval(() => {
  // 每5分钟打印一次统计报告
  if (globalQueryStats.totalQueries > 0) {
    printQueryStatsReport();
  }
}, 300000);

// ================================================================
// 为数据库连接添加执行超时
// ================================================================

export function setConnectionQueryTimeout(connection: any, timeoutMs: number): void {
  try {
    connection.query(`SET max_execution_time = ${timeoutMs / 1000}`);
  } catch (error) {
    console.warn('[QueryTimeout] 设置连接查询超时失败:', error);
  }
}

// ================================================================
// 查询优化建议
// ================================================================

/**
 * 分析慢查询并提供优化建议
 */
export function analyzeSlowQueries(): {
  recommendations: string[];
  criticalIssues: string[];
} {
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];
  const slowReport = getSlowQueryReport(20);

  // 检查超时查询比例
  const timeoutRate = globalQueryStats.timeoutQueries / globalQueryStats.totalQueries;
  if (timeoutRate > 0.01) { // 超过1%
    criticalIssues.push(`超时查询比例过高 (${(timeoutRate * 100).toFixed(2)}%)，建议增加超时时间或优化查询`);
  }

  // 检查平均查询时间
  if (globalQueryStats.avgQueryTime > 1000) {
    recommendations.push(`平均查询时间较长 (${globalQueryStats.avgQueryTime.toFixed(2)}ms)，建议优化索引和查询`);
  }

  // 检查最大查询时间
  if (globalQueryStats.maxQueryTime > 30000) {
    criticalIssues.push(`存在极慢查询 (${globalQueryStats.maxQueryTime}ms)，需要立即优化`);
  }

  // 分析慢查询类型
  const slowQueries = slowReport.slowQueries;
  const hasJoinQueries = slowQueries.some(q => q.sql.toLowerCase().includes('join'));
  const hasAggregationQueries = slowQueries.some(q =>
    q.sql.toLowerCase().includes('group by') ||
    q.sql.toLowerCase().includes('count(') ||
    q.sql.toLowerCase().includes('sum(')
  );

  if (hasJoinQueries) {
    recommendations.push('检测到慢JOIN查询，建议检查关联字段索引');
  }

  if (hasAggregationQueries) {
    recommendations.push('检测到慢聚合查询，建议考虑使用汇总表或缓存');
  }

  return { recommendations, criticalIssues };
}

// ================================================================
// 导出
// ================================================================

export {
  SLOW_QUERY_THRESHOLDS,
  type QueryStats,
  type SlowQueryInfo,
  type TimeoutOptions
};
