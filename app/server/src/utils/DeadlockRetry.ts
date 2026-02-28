/**
 * 死锁重试机制
 * 检测数据库死锁错误并自动重试，提高并发场景下的成功率
 */

/**
 * MySQL 死锁错误代码
 */
const DEADLOCK_ERROR_CODES = new Set([
  'ER_LOCK_DEADLOCK',        // 通用死锁错误
  '1213',                    // MySQL 5.x 死锁错误码
  '1205',                    // 锁等待超时
  'ER_LOCK_WAIT_TIMEOUT'     // 锁等待超时（命名版本）
]);

/**
 * 死锁重试配置
 */
export interface DeadlockRetryOptions {
  maxRetries?: number;       // 最大重试次数（默认3）
  baseDelay?: number;        // 基础延迟（毫秒，默认100）
  maxDelay?: number;         // 最大延迟（毫秒，默认5000）
  exponentialBackoff?: boolean; // 是否指数退避（默认true）
  onRetry?: (attempt: number, error: any) => void; // 重试回调
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<DeadlockRetryOptions> = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5000,
  exponentialBackoff: true,
  onRetry: (attempt, error) => {
    console.warn(`[DeadlockRetry] 检测到死锁，第 ${attempt} 次重试...`, error?.message || '');
  }
};

/**
 * 判断是否为死锁错误
 */
function isDeadlockError(error: any): boolean {
  if (!error) return false;

  // 检查错误代码
  if (error.code && DEADLOCK_ERROR_CODES.has(error.code)) {
    return true;
  }

  // 检查错误号（errno）
  if (error.errno && (error.errno === 1213 || error.errno === 1205)) {
    return true;
  }

  // 检查错误消息
  const message = error?.message || String(error);
  if (message.includes('Deadlock') ||
      message.includes('deadlock') ||
      message.includes('Lock wait timeout exceeded')) {
    return true;
  }

  return false;
}

/**
 * 计算重试延迟（指数退避）
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  exponentialBackoff: boolean
): number {
  if (!exponentialBackoff) {
    return baseDelay;
  }

  // 指数退避：baseDelay * (2 ^ attempt)，但不超过 maxDelay
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

  // 添加随机抖动（±25%），避免惊群效应
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);

  return Math.max(0, Math.floor(delay + jitter));
}

/**
 * 带死锁重试的异步函数执行
 *
 * @param fn 要执行的异步函数
 * @param options 重试配置
 * @returns 函数执行结果
 *
 * @example
 * ```typescript
 * const result = await withDeadlockRetry(
 *   async () => {
 *     return await databaseService.transaction(async (conn) => {
 *       // 你的数据库操作
 *     });
 *   },
 *   { maxRetries: 5 }
 * );
 * ```
 */
export async function withDeadlockRetry<T>(
  fn: () => Promise<T>,
  options: DeadlockRetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果不是死锁错误或已达到最大重试次数，直接抛出
      if (!isDeadlockError(error) || attempt >= opts.maxRetries) {
        if (attempt >= opts.maxRetries && isDeadlockError(error)) {
          console.error(`[DeadlockRetry] 达到最大重试次数 (${opts.maxRetries})，操作失败`);
        }
        throw error;
      }

      // 计算延迟时间
      const delay = calculateDelay(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.exponentialBackoff
      );

      // 调用重试回调
      opts.onRetry(attempt + 1, error);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要这个
  throw lastError;
}

/**
 * 创建带死锁重试的事务包装器
 *
 * @param transactionFn 原始事务函数
 * @param options 重试配置
 * @returns 包装后的函数
 *
 * @example
 * ```typescript
 * import { databaseService } from './DatabaseService.js';
 * import { createRetryableTransaction } from '../utils/DeadlockRetry.js';
 *
 * const safeUpdate = createRetryableTransaction(
 *   async (connection) => {
 *     await connection.execute('UPDATE ...');
 *   }
 * );
 * await safeUpdate();
 * ```
 */
export function createRetryableTransaction<T>(
  transactionFn: (connection: any) => Promise<T>,
  options: DeadlockRetryOptions = {}
): () => Promise<T> {
  return async () => {
    const { databaseService } = await import('../services/DatabaseService.js');

    return withDeadlockRetry(
      () => databaseService.transaction(transactionFn),
      options
    );
  };
}

/**
 * 死锁统计信息（用于监控）
 */
export class DeadlockMonitor {
  private deadlockCount = 0;
  private retrySuccessCount = 0;
  private retryFailureCount = 0;
  private lastDeadlockTime: number | null = null;

  /**
   * 记录死锁事件
   */
  recordDeadlock(retried: boolean): void {
    this.deadlockCount++;
    this.lastDeadlockTime = Date.now();

    if (retried) {
      this.retrySuccessCount++;
    } else {
      this.retryFailureCount++;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    deadlockCount: number;
    retrySuccessCount: number;
    retryFailureCount: number;
    retrySuccessRate: number;
    lastDeadlockTime: number | null;
  } {
    const totalRetries = this.retrySuccessCount + this.retryFailureCount;
    return {
      deadlockCount: this.deadlockCount,
      retrySuccessCount: this.retrySuccessCount,
      retryFailureCount: this.retryFailureCount,
      retrySuccessRate: totalRetries > 0 ? (this.retrySuccessCount / totalRetries) * 100 : 0,
      lastDeadlockTime: this.lastDeadlockTime
    };
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.deadlockCount = 0;
    this.retrySuccessCount = 0;
    this.retryFailureCount = 0;
    this.lastDeadlockTime = null;
  }
}

// 导出全局单例
export const deadlockMonitor = new DeadlockMonitor();

/**
 * 带监控的死锁重试包装器
 */
export async function withDeadlockRetryMonitored<T>(
  fn: () => Promise<T>,
  options: DeadlockRetryOptions = {}
): Promise<T> {
  const opts = {
    ...options,
    onRetry: (attempt: number, error: any) => {
      deadlockMonitor.recordDeadlock(true);
      if (options.onRetry) {
        options.onRetry(attempt, error);
      } else {
        DEFAULT_OPTIONS.onRetry(attempt, error);
      }
    }
  };

  try {
    return await withDeadlockRetry(fn, opts);
  } catch (error) {
    if (isDeadlockError(error)) {
      deadlockMonitor.recordDeadlock(false);
    }
    throw error;
  }
}
