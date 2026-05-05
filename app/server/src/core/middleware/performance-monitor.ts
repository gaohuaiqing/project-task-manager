/**
 * 性能监控中间件
 *
 * 功能:
 * 1. 记录慢请求（响应时间超过阈值）
 * 2. 统计请求响应时间分布
 * 3. 异步日志写入，避免阻塞请求处理
 *
 * 配置:
 * - SLOW_REQUEST_THRESHOLD_MS: 慢请求阈值（默认500ms）
 * - WARN_REQUEST_THRESHOLD_MS: 警告阈值（默认200ms）
 * - ENABLE_PERF_MONITORING: 是否启用监控（默认true）
 */

import { logger } from '../logger';
import type { Request, Response, NextFunction } from 'express';

// 配置阈值
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '500', 10);
const WARN_REQUEST_THRESHOLD_MS = parseInt(process.env.WARN_REQUEST_THRESHOLD_MS || '200', 10);
const ENABLE_PERF_MONITORING = process.env.ENABLE_PERF_MONITORING !== 'false';

// 环形缓冲区大小
const BUFFER_SIZE = 1000;

/**
 * 环形缓冲区（Circular Buffer）
 * 用于高效存储最近1000个响应时间样本，避免 shift() 的 O(n) 开销
 */
class CircularBuffer {
  private buffer: number[] = new Array(BUFFER_SIZE);
  private index = 0;
  private count = 0;

  push(value: number): void {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % BUFFER_SIZE;
    if (this.count < BUFFER_SIZE) {
      this.count++;
    }
  }

  getValues(): number[] {
    if (this.count === 0) return [];
    if (this.count < BUFFER_SIZE) {
      return this.buffer.slice(0, this.count);
    }
    // 缓冲区已满，需要按正确顺序返回
    const result = new Array(BUFFER_SIZE);
    for (let i = 0; i < BUFFER_SIZE; i++) {
      result[i] = this.buffer[(this.index + i) % BUFFER_SIZE];
    }
    return result;
  }

  reset(): void {
    this.index = 0;
    this.count = 0;
    this.buffer = new Array(BUFFER_SIZE);
  }
}

// 统计数据（内存缓存，每小时重置）
interface PerformanceStats {
  totalRequests: number;
  slowRequests: number;
  warnRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  responseTimeBuffer: CircularBuffer; // 使用环形缓冲区替代数组
}

const stats: PerformanceStats = {
  totalRequests: 0,
  slowRequests: 0,
  warnRequests: 0,
  avgResponseTime: 0,
  maxResponseTime: 0,
  p95ResponseTime: 0,
  responseTimeBuffer: new CircularBuffer(),
};

// 每小时重置统计
setInterval(() => {
  if (stats.totalRequests > 0) {
    logger.info('📊 性能统计（过去一小时）: 总请求=%d, 慢请求=%d, 平均响应=%dms, P95=%dms',
      stats.totalRequests, stats.slowRequests, Math.round(stats.avgResponseTime), stats.p95ResponseTime);
  }
  stats.totalRequests = 0;
  stats.slowRequests = 0;
  stats.warnRequests = 0;
  stats.avgResponseTime = 0;
  stats.maxResponseTime = 0;
  stats.p95ResponseTime = 0;
  stats.responseTimeBuffer.reset();
}, 60 * 60 * 1000);

/**
 * 计算P95响应时间
 */
function calculateP95(times: number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index] || 0;
}

/**
 * 性能监控中间件
 */
export function performanceMonitorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!ENABLE_PERF_MONITORING) {
    next();
    return;
  }

  const startTime = Date.now();
  const requestPath = req.path;
  const requestMethod = req.method;

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // 更新统计
    stats.totalRequests++;
    stats.responseTimeBuffer.push(duration);
    stats.avgResponseTime = (stats.avgResponseTime * (stats.totalRequests - 1) + duration) / stats.totalRequests;
    stats.maxResponseTime = Math.max(stats.maxResponseTime, duration);
    stats.p95ResponseTime = calculateP95(stats.responseTimeBuffer.getValues());

    // 慢请求日志
    if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
      stats.slowRequests++;
      logger.warn('🔴 慢请求: %s %s - %dms (状态码: %d)',
        requestMethod, requestPath, duration, res.statusCode);
    } else if (duration >= WARN_REQUEST_THRESHOLD_MS) {
      stats.warnRequests++;
      logger.info('⚠️ 较慢请求: %s %s - %dms',
        requestMethod, requestPath, duration);
    }
  });

  next();
}

/**
 * 获取当前性能统计数据
 */
export function getPerformanceStats(): Omit<PerformanceStats, 'responseTimeBuffer'> & {
  responseTimeCount: number;
} {
  return {
    totalRequests: stats.totalRequests,
    slowRequests: stats.slowRequests,
    warnRequests: stats.warnRequests,
    avgResponseTime: stats.avgResponseTime,
    maxResponseTime: stats.maxResponseTime,
    p95ResponseTime: stats.p95ResponseTime,
    responseTimeCount: 1000, // 环形缓冲区容量
  };
}

/**
 * 获取慢请求阈值配置
 */
export function getThresholdConfig(): {
  slowThreshold: number;
  warnThreshold: number;
  enabled: boolean;
} {
  return {
    slowThreshold: SLOW_REQUEST_THRESHOLD_MS,
    warnThreshold: WARN_REQUEST_THRESHOLD_MS,
    enabled: ENABLE_PERF_MONITORING,
  };
}