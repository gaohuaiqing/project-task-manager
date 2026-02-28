/**
 * 持久化操作队列服务
 *
 * 使用 IndexedDB 存储离线操作，防止页面刷新丢失数据
 * 支持离线操作队列的持久化、恢复和同步
 */

import type { Operation } from '@/types/operation';

// ================================================================
// 常量定义
// ================================================================

const DB_NAME = 'TaskManagerQueue';
const DB_VERSION = 1;
const STORE_NAME = 'operations';

// ================================================================
// 类型定义
// ================================================================

export interface StoredOperation extends Operation {
  /** 最后重试时间戳 */
  lastRetryTime?: number;
  /** 创建时间戳 */
  createdAt: number;
}

export interface QueueStats {
  /** 总操作数 */
  total: number;
  /** 待发送操作数 */
  pending: number;
  /** 已发送等待确认操作数 */
  sent: number;
  /** 失败操作数 */
  failed: number;
  /** 冲突操作数 */
  conflict: number;
  /** 已确认操作数 */
  acknowledged: number;
}

// ================================================================
// IndexedDBOperationQueue 类
// ================================================================

class IndexedDBOperationQueue {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDBQueue] 打开数据库失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDBQueue] 数据库初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建操作存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // 创建索引
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('dataType', 'dataType', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });

          console.log('[IndexedDBQueue] 对象存储创建成功');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 入队操作
   */
  async enqueue(operation: Omit<Operation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
    await this.init();

    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const storedOp: StoredOperation = {
      ...operation,
      id,
      timestamp: now,
      status: 'pending',
      retryCount: 0,
      createdAt: now
    };

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(storedOp);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      console.log(`[IndexedDBQueue] 操作入队: ${id}, 类型: ${operation.type}, 数据: ${operation.dataType}/${operation.dataId}`);
      return id;
    } catch (error) {
      console.error('[IndexedDBQueue] 入队失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有待发送操作（按时间排序）
   */
  async getPendingOperations(): Promise<StoredOperation[]> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      const operations = await new Promise<StoredOperation[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredOperation[]);
        request.onerror = () => reject(request.error);
      });

      // 按创建时间排序
      operations.sort((a, b) => a.createdAt - b.createdAt);
      return operations;
    } catch (error) {
      console.error('[IndexedDBQueue] 获取待发送操作失败:', error);
      return [];
    }
  }

  /**
   * 获取指定操作
   */
  async getOperation(operationId: string): Promise<StoredOperation | undefined> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(operationId);

      return await new Promise<StoredOperation>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredOperation);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[IndexedDBQueue] 获取操作失败:', error);
      return undefined;
    }
  }

  /**
   * 更新操作状态
   */
  async updateOperation(operationId: string, updates: Partial<StoredOperation>): Promise<boolean> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // 获取现有操作
      const getRequest = store.get(operationId);

      const existing = await new Promise<StoredOperation | undefined>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result as StoredOperation);
        getRequest.onerror = () => reject(getRequest.error);
      });

      if (!existing) {
        console.warn(`[IndexedDBQueue] 操作不存在: ${operationId}`);
        return false;
      }

      // 更新操作
      const updated: StoredOperation = {
        ...existing,
        ...updates,
        id: operationId // 确保ID不被覆盖
      };

      const putRequest = store.put(updated);

      await new Promise<void>((resolve, reject) => {
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });

      console.log(`[IndexedDBQueue] 操作状态已更新: ${operationId}, 状态: ${updates.status}`);
      return true;
    } catch (error) {
      console.error('[IndexedDBQueue] 更新操作状态失败:', error);
      return false;
    }
  }

  /**
   * 标记为已发送
   */
  async markAsSent(operationId: string): Promise<boolean> {
    return this.updateOperation(operationId, { status: 'sent' });
  }

  /**
   * 处理服务器响应
   */
  async handleResponse(operationId: string, response: any): Promise<boolean> {
    const op = await this.getOperation(operationId);
    if (!op) {
      console.warn(`[IndexedDBQueue] 操作不存在: ${operationId}`);
      return false;
    }

    if (response.success) {
      // 标记为已确认，延迟删除
      await this.updateOperation(operationId, { status: 'acknowledged' });
      console.log(`[IndexedDBQueue] 操作已确认: ${operationId}, 版本: ${response.version}`);

      // 10秒后删除已确认的操作
      setTimeout(async () => {
        await this.deleteOperation(operationId);
        console.log(`[IndexedDBQueue] 操作已删除: ${operationId}`);
      }, 10000);

      return true;
    } else if (response.conflict) {
      // 标记为冲突，保留等待用户处理
      await this.updateOperation(operationId, {
        status: 'conflict',
        lastRetryTime: Date.now()
      });
      console.warn(`[IndexedDBQueue] 操作冲突: ${operationId}`);
      return true;
    } else {
      // 标记为失败，增加重试次数
      const newRetryCount = (op.retryCount || 0) + 1;
      await this.updateOperation(operationId, {
        status: 'failed',
        retryCount: newRetryCount,
        lastRetryTime: Date.now()
      });
      console.error(`[IndexedDBQueue] 操作失败: ${operationId}, 重试次数: ${newRetryCount}`);

      // 如果未达到最大重试次数，自动重试
      const maxRetryCount = 5;
      if (newRetryCount < maxRetryCount) {
        const delay = 1000 * Math.pow(2, newRetryCount - 1); // 指数退避
        setTimeout(async () => {
          await this.retryOperation(operationId);
        }, delay);
      }

      return true;
    }
  }

  /**
   * 重试操作
   */
  async retryOperation(operationId: string): Promise<boolean> {
    return this.updateOperation(operationId, { status: 'pending' });
  }

  /**
   * 重试所有失败操作
   */
  async retryFailedOperations(): Promise<number> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('failed'));

      let count = 0;

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const op = cursor.value as StoredOperation;
            if (op.retryCount < 5) {
              cursor.update({ ...op, status: 'pending' });
              count++;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`[IndexedDBQueue] 重试了 ${count} 个失败操作`);
      return count;
    } catch (error) {
      console.error('[IndexedDBQueue] 重试失败操作失败:', error);
      return 0;
    }
  }

  /**
   * 删除操作
   */
  async deleteOperation(operationId: string): Promise<boolean> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(operationId);

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[IndexedDBQueue] 操作已删除: ${operationId}`);
      return true;
    } catch (error) {
      console.error('[IndexedDBQueue] 删除操作失败:', error);
      return false;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStats(): Promise<QueueStats> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      const operations = await new Promise<StoredOperation[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredOperation[]);
        request.onerror = () => reject(request.error);
      });

      const stats: QueueStats = {
        total: operations.length,
        pending: 0,
        sent: 0,
        acknowledged: 0,
        conflict: 0,
        failed: 0
      };

      operations.forEach(op => {
        stats[op.status]++;
      });

      return stats;
    } catch (error) {
      console.error('[IndexedDBQueue] 获取队列状态失败:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        acknowledged: 0,
        conflict: 0,
        failed: 0
      };
    }
  }

  /**
   * 清空队列
   */
  async clear(): Promise<number> {
    await this.init();

    try {
      // 先获取统计
      const stats = await this.getQueueStats();
      const count = stats.total;

      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log(`[IndexedDBQueue] 队列已清空，删除 ${count} 个操作`);
      return count;
    } catch (error) {
      console.error('[IndexedDBQueue] 清空队列失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有操作
   */
  async getAllOperations(): Promise<StoredOperation[]> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      return await new Promise<StoredOperation[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as StoredOperation[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[IndexedDBQueue] 获取所有操作失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的已确认操作（超过1小时）
   */
  async cleanAcknowledged(): Promise<number> {
    await this.init();

    try {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('acknowledged'));

      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1小时
      let count = 0;

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const op = cursor.value as StoredOperation;
            if (now - op.createdAt > maxAge) {
              cursor.delete();
              count++;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      if (count > 0) {
        console.log(`[IndexedDBQueue] 清理了 ${count} 个过期操作`);
      }

      return count;
    } catch (error) {
      console.error('[IndexedDBQueue] 清理过期操作失败:', error);
      return 0;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('[IndexedDBQueue] 数据库连接已关闭');
    }
  }
}

// ================================================================
// 导出单例
// ================================================================

export const indexedDBOperationQueue = new IndexedDBOperationQueue();

// 为了向后兼容，同时导出类
export { IndexedDBOperationQueue };
