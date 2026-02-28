/**
 * IndexedDB 跨浏览器数据同步服务
 *
 * 使用 IndexedDB 实现跨浏览器数据共享
 * IndexedDB 在同一台电脑的所有浏览器中共享数据
 */

import { getDeviceId } from '@/utils/deviceId';

const DB_NAME = 'TaskManagerSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'sync_data';

interface SyncDataRecord {
  key: string;
  data: any;
  timestamp: number;
  deviceId: string;
}

class IndexedDBSyncService {
  private db: IDBDatabase | null = null;
  private deviceId: string;
  private initialized: boolean = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.deviceId = getDeviceId();
  }

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;

    // 检查浏览器是否支持 IndexedDB
    if (!window.indexedDB) {
      console.warn('[IndexedDBSync] 浏览器不支持 IndexedDB');
      return false;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('[IndexedDBSync] 打开数据库失败:', request.error);
          // resolve(false) 而不是 reject，让调用者能够处理失败情况
          resolve(false);
        };

        request.onblocked = () => {
          console.warn('[IndexedDBSync] 数据库打开被阻塞，可能有其他实例正在使用');
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.initialized = true;
          console.log('[IndexedDBSync] 数据库初始化成功');

          // 监听数据库错误事件
          this.db.onerror = (event) => {
            console.error('[IndexedDBSync] 数据库错误:', event);
          };

          this.startPolling();
          resolve(true);
        };

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
          } catch (error) {
            console.error('[IndexedDBSync] 升级数据库失败:', error);
          }
        };
      } catch (error) {
        console.error('[IndexedDBSync] 初始化异常:', error);
        resolve(false);
      }
    });
  }

  /**
   * 保存数据到 IndexedDB（跨浏览器共享）
   */
  async saveData(key: string, data: any): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: SyncDataRecord = {
        key,
        data,
        timestamp: Date.now(),
        deviceId: this.deviceId
      };

      const request = store.put(record);

      request.onsuccess = () => {
        console.log('[IndexedDBSync] 数据已保存:', key);
        resolve(true);
      };

      request.onerror = () => {
        console.error('[IndexedDBSync] 保存数据失败:', request.error);
        reject(false);
      };
    });
  }

  /**
   * 从 IndexedDB 读取数据
   */
  async getData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result as SyncDataRecord | undefined;
        if (record && record.data) {
          resolve(record.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[IndexedDBSync] 读取数据失败:', request.error);
        reject(null);
      };
    });
  }

  /**
   * 监听数据变化（通过轮询实现）
   */
  onDataChange(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    console.log('[IndexedDBSync] 添加监听器:', key);

    // 返回取消监听的函数
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * 启动轮询检查数据变化
   */
  private startPolling(): void {
    const POLL_INTERVAL = 3000; // 增加到3秒，减少Chrome中的性能压力

    // 使用 setTimeout 代替 setInterval 以避免累积
    const poll = () => {
      if (!this.db || this.listeners.size === 0) {
        setTimeout(poll, POLL_INTERVAL);
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onerror = () => {
          console.warn('[IndexedDBSync] 轮询读取失败:', request.error);
        };

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value as SyncDataRecord;

            // 检查是否有监听器
            const listeners = this.listeners.get(record.key);
            if (listeners && listeners.size > 0) {
              // 通知所有监听器
              listeners.forEach(callback => {
                try {
                  callback(record.data);
                } catch (error) {
                  console.error('[IndexedDBSync] 监听器错误:', error);
                }
              });
            }

            cursor.continue();
          }
        };

        transaction.onerror = () => {
          console.warn('[IndexedDBSync] 事务失败');
        };
      } catch (error) {
        console.error('[IndexedDBSync] 轮询异常:', error);
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    setTimeout(poll, POLL_INTERVAL);
    console.log('[IndexedDBSync] 启动轮询检查');
  }

  /**
   * 清理过期数据（超过1小时的数据）
   */
  async cleanupOldData(): Promise<void> {
    if (!this.db) return;

    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();
    const cutoffTime = now - ONE_HOUR;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        console.log('[IndexedDBSync] 清理过期数据:', cursor.value.key);
        cursor.continue();
      }
    };
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[IndexedDBSync] 数据库已关闭');
    }
  }
}

export const indexedDBSyncService = new IndexedDBSyncService();
export default indexedDBSyncService;
