/**
 * IndexedDB 同步服务
 *
 * 职责：
 * 1. 提供跨浏览器数据持久化
 * 2. 支持 localStorage 数据备份到 IndexedDB
 * 3. 用于离线场景和数据恢复
 */

import { frontendLogger } from './FrontendLogger';

const DB_NAME = 'ProjectTaskManager';
const DB_VERSION = 1;
const STORE_NAME = 'sync_data';

// ================================================================
// 类型定义
// ================================================================

interface SyncDataEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

// ================================================================
// IndexedDBSyncService 类
// ================================================================

class IndexedDBSyncServiceClass {
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._init();

    try {
      await this.initPromise;
      this.isInitialized = true;
      frontendLogger.logSystem('IndexedDB 同步服务初始化成功');
    } catch (error) {
      console.error('[IndexedDBSyncService] 初始化失败:', error);
      throw error;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * 内部初始化方法
   */
  private async _init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`无法打开 IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * 保存数据到 IndexedDB
   */
  async saveData<T>(key: string, data: T): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB 未初始化'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry: SyncDataEntry<T> = {
        key,
        data,
        timestamp: Date.now()
      };

      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 从 IndexedDB 获取数据
   */
  async getData<T>(key: string): Promise<T | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB 未初始化'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as SyncDataEntry<T> | undefined;
        resolve(result?.data ?? null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除数据
   */
  async deleteData(key: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB 未初始化'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB 未初始化'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有键
   */
  async getAllKeys(): Promise<string[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB 未初始化'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// ================================================================
// 导出单例
// ================================================================

export const indexedDBSyncService = new IndexedDBSyncServiceClass();

// ================================================================
// 便捷函数
// ================================================================

export async function initIndexedDBSync(): Promise<void> {
  return indexedDBSyncService.init();
}

export async function saveToIndexedDB<T>(key: string, data: T): Promise<void> {
  return indexedDBSyncService.saveData(key, data);
}

export async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  return indexedDBSyncService.getData<T>(key);
}

export async function deleteFromIndexedDB(key: string): Promise<void> {
  return indexedDBSyncService.deleteData(key);
}

export async function clearIndexedDB(): Promise<void> {
  return indexedDBSyncService.clear();
}

export function isIndexedDBReady(): boolean {
  return indexedDBSyncService.isReady();
}
