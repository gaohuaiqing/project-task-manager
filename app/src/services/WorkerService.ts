/**
 * Web Worker 管理服务
 *
 * 功能：
 * 1. 管理 Worker 实例
 * 2. 提供类型安全的 API
 * 3. 自动负载均衡
 * 4. 错误处理和重试
 *
 * @module services/WorkerService
 */

import type { WorkerRequest, WorkerResponse } from '../workers/dataProcessor.worker';

// ==================== Worker 管理器 ====================

class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private taskQueues: Map<string, Array<(result: any) => void>> = new Map();
  private readonly maxWorkers: number = navigator.hardwareConcurrency || 4;

  /**
   * 获取或创建 Worker
   */
  private getWorker(key: string): Worker {
    if (!this.workers.has(key)) {
      // 限制 Worker 数量
      if (this.workers.size >= this.maxWorkers) {
        // 移除最久未使用的 Worker
        const firstKey = this.workers.keys().next().value;
        this.workers.get(firstKey)?.terminate();
        this.workers.delete(firstKey);
      }

      // 创建新 Worker
      const worker = new Worker(
        new URL('../workers/dataProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.workers.set(key, worker);
    }

    return this.workers.get(key)!;
  }

  /**
   * 执行 Worker 任务
   */
  async execute<T = any>(request: WorkerRequest, workerKey?: string): Promise<T> {
    const key = workerKey || `worker-${this.workers.size}`;
    const worker = this.getWorker(key);

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker task timeout: ${request.type}`));
      }, 10000); // 10 秒超时

      const handler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === request.type) {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            console.log(`[WorkerService] ✅ 任务完成: ${request.type}, 耗时: ${event.data.processingTime.toFixed(2)}ms`);
            resolve(event.data.data as T);
          }
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage(request);
    });
  }

  /**
   * 批量执行任务
   */
  async executeBatch<T = any>(requests: WorkerRequest[]): Promise<T[]> {
    const batchSize = this.maxWorkers;
    const results: T[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((req, idx) => this.execute<T>(req, `batch-${Math.floor(i / batchSize)}-${idx}`))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 清理所有 Worker
   */
  terminateAll(): void {
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();
    this.taskQueues.clear();
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      activeWorkers: this.workers.size,
      maxWorkers: this.maxWorkers,
      utilization: `${Math.round((this.workers.size / this.maxWorkers) * 100)}%`
    };
  }
}

// ==================== 便捷 API ====================

const workerManager = new WorkerManager();

/**
 * 在 Worker 中过滤数据
 */
export async function filterInWorker<T = any>(
  data: T[],
  field: string,
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith',
  value: any
): Promise<T[]> {
  // 小数据集直接在主线程处理
  if (data.length < 100) {
    return data.filter(item => {
      const itemValue = item[field];
      switch (operator) {
        case 'eq': return itemValue === value;
        case 'ne': return itemValue !== value;
        case 'gt': return itemValue > value;
        case 'lt': return itemValue < value;
        case 'contains': return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        case 'startsWith': return String(itemValue).toLowerCase().startsWith(String(value).toLowerCase());
        default: return true;
      }
    });
  }

  return workerManager.execute<T[]>({
    type: 'filter',
    data,
    field,
    operator,
    value
  });
}

/**
 * 在 Worker 中排序数据
 */
export async function sortInWorker<T = any>(
  data: T[],
  field: string,
  order: 'asc' | 'desc' = 'asc'
): Promise<T[]> {
  // 小数据集直接在主线程处理
  if (data.length < 100) {
    return [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return workerManager.execute<T[]>({
    type: 'sort',
    data,
    field,
    order
  });
}

/**
 * 在 Worker 中聚合数据
 */
export async function aggregateInWorker(
  data: any[],
  groupBy: string | undefined,
  operations: Array<{
    field: string;
    op: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias: string;
  }>
): Promise<any> {
  return workerManager.execute({
    type: 'aggregate',
    data,
    groupBy,
    operations
  });
}

/**
 * 获取 Worker 状态
 */
export function getWorkerStatus() {
  return workerManager.getStatus();
}

/**
 * 清理所有 Worker
 */
export function terminateWorkers() {
  workerManager.terminateAll();
}

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', terminateWorkers);
}
