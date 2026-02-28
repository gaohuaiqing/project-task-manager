import type { DataUpdateMessage, SyncData } from '../types/index.js';
import { LRUCache, cacheCleanupManager } from '../utils/LRUCache.js';

interface DataItem {
  data: any;
  timestamp: number;
}

export class DataSyncService {
  private dataStore: LRUCache<string, Map<string, DataItem>>;
  private syncHistory: LRUCache<string, Array<{ dataType: string; timestamp: number; sourceSessionId?: string }>>;
  private broadcastCallback: ((username: string, message: any) => void) | null = null;

  constructor() {
    // 数据存储：最多1000个用户
    this.dataStore = new LRUCache<string, Map<string, DataItem>>(1000);

    // 同步历史：每个用户最多保留100条历史记录
    this.syncHistory = new LRUCache(1000);
  }

  // 设置广播回调
  setBroadcastCallback(callback: (username: string, message: any) => void): void {
    this.broadcastCallback = callback;
  }

  // 更新数据并广播变更
  updateData(username: string, dataType: string, data: any, sourceSessionId?: string): void {
    let userData = this.dataStore.get(username);

    if (!userData) {
      userData = new Map();
      this.dataStore.set(username, userData);
    }

    userData.set(dataType, {
      data,
      timestamp: Date.now()
    });

    this.addToSyncHistory(username, dataType, sourceSessionId);

    // 广播数据变更通知
    this.broadcastDataChange(username, dataType, data, sourceSessionId);

    console.log(`[DataSyncService] 数据更新: 用户=${username}, 类型=${dataType}, 时间戳=${Date.now()}`);
  }

  // 广播数据变更
  private broadcastDataChange(username: string, dataType: string, data: any, sourceSessionId?: string): void {
    if (this.broadcastCallback) {
      const syncData: SyncData = {
        dataType,
        data,
        timestamp: Date.now(),
        sourceSessionId
      };
      
      this.broadcastCallback(username, {
        type: 'data_sync',
        data: syncData
      });
    }
  }

  // 获取数据
  getData(username: string, dataType: string): any | null {
    const userData = this.dataStore.get(username);
    if (!userData) return null;
    
    const dataInfo = userData.get(dataType);
    return dataInfo ? dataInfo.data : null;
  }

  // 获取用户所有数据
  getAllUserData(username: string): Record<string, any> {
    const userData = this.dataStore.get(username);
    if (!userData) return {};
    
    const result: Record<string, any> = {};
    userData.forEach((value, key) => {
      result[key] = value.data;
    });
    
    return result;
  }

  // 删除用户数据
  deleteUserData(username: string, dataType?: string): void {
    if (dataType) {
      const userData = this.dataStore.get(username);
      if (userData) {
        userData.delete(dataType);
        // 广播删除通知
        if (this.broadcastCallback) {
          this.broadcastCallback(username, {
            type: 'data_deleted',
            data: {
              dataType,
              timestamp: Date.now()
            }
          });
        }
      }
    } else {
      this.dataStore.delete(username);
    }
  }

  // 强制同步所有数据
  forceSyncAllData(username: string): void {
    const userData = this.dataStore.get(username);
    if (!userData || !this.broadcastCallback) return;

    const callback = this.broadcastCallback;
    userData.forEach((value, dataType) => {
      const syncData: SyncData = {
        dataType,
        data: value.data,
        timestamp: value.timestamp
      };

      callback(username, {
        type: 'data_sync',
        data: syncData
      });
    });

    console.log(`[DataSyncService] 强制同步所有数据: 用户=${username}, 数据类型数=${userData.size}`);
  }

  // 从数据库加载数据（模拟）
  loadDataFromDatabase(username: string, dataType: string): Promise<any> {
    // 这里应该是从实际数据库加载数据的逻辑
    // 现在返回模拟数据
    return Promise.resolve([]);
  }

  // 批量更新数据
  batchUpdateData(username: string, updates: Array<{ dataType: string; data: any }>): void {
    updates.forEach(update => {
      this.updateData(username, update.dataType, update.data);
    });
    
    console.log(`[DataSyncService] 批量更新数据: 用户=${username}, 更新数=${updates.length}`);
  }

  // 添加到同步历史
  private addToSyncHistory(username: string, dataType: string, sourceSessionId?: string): void {
    if (!this.syncHistory.has(username)) {
      this.syncHistory.set(username, []);
    }
    
    const history = this.syncHistory.get(username)!;
    history.push({
      dataType,
      timestamp: Date.now(),
      sourceSessionId
    });
    
    if (history.length > 100) {
      history.shift();
    }
  }

  // 获取同步历史
  getSyncHistory(username: string, limit: number = 10): Array<{ dataType: string; timestamp: number; sourceSessionId?: string }> {
    const history = this.syncHistory.get(username);
    if (!history) return [];
    
    return history.slice(-limit);
  }

  // 获取最后同步时间
  getLastSyncTime(username: string, dataType: string): number | null {
    const history = this.syncHistory.get(username);
    if (!history) return null;
    
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].dataType === dataType) {
        return history[i].timestamp;
      }
    }
    
    return null;
  }

  // 获取数据时间戳
  getDataTimestamp(username: string, dataType: string): number | null {
    const userData = this.dataStore.get(username);
    if (!userData) return null;
    
    const dataInfo = userData.get(dataType);
    return dataInfo ? dataInfo.timestamp : null;
  }

  // 检查是否有数据
  hasData(username: string, dataType: string): boolean {
    const userData = this.dataStore.get(username);
    if (!userData) return false;
    
    return userData.has(dataType);
  }

  // 获取数据大小
  getDataSize(username: string): number {
    const userData = this.dataStore.get(username);
    return userData ? userData.size : 0;
  }

  // 清除所有数据
  clearAllData(): void {
    this.dataStore.clear();
    this.syncHistory.clear();
    console.log('[DataSyncService] 所有数据已清除');
  }

  // 获取统计信息
  getStats(): { totalUsers: number; totalDataTypes: number; totalSyncOperations: number } {
    let totalDataTypes = 0;
    let totalSyncOperations = 0;

    for (const userData of this.dataStore.values()) {
      totalDataTypes += userData.size;
    }

    for (const history of this.syncHistory.values()) {
      totalSyncOperations += history.length;
    }

    return {
      totalUsers: this.dataStore.size,
      totalDataTypes,
      totalSyncOperations
    };
  }

  // 获取缓存状态
  getCacheStatus(): Array<{ username: string; dataTypes: string[] }> {
    const status: Array<{ username: string; dataTypes: string[] }> = [];

    for (const [username, userData] of this.dataStore.entries()) {
      status.push({
        username,
        dataTypes: Array.from(userData.keys())
      });
    }

    return status;
  }
}
