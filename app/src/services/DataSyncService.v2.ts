/**
 * 数据同步服务 - 重构版
 *
 * 设计原则变更：
 * 1. 移除所有localStorage存储逻辑（由MySqlDataService接管）
 * 2. 保留WebSocket实时同步功能
 * 3. 提供向后兼容的API接口
 */

import { wsService } from './WebSocketService';

// 数据类型定义
export interface SyncData {
  members: any[];
  projects: any[];
  wbsTasks: any[];
  lastUpdated: number;
  version: number;
}

// 变更记录
export interface ChangeRecord {
  key: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  version: number;
}

// 同步配置
export interface SyncConfig {
  syncInterval: number;
  conflictResolution: 'lastWriteWins' | 'manual';
  enableIncrementalSync: boolean;
}

// 默认配置
const DEFAULT_CONFIG: SyncConfig = {
  syncInterval: 5000,
  conflictResolution: 'lastWriteWins',
  enableIncrementalSync: true
};

/**
 * 数据同步服务（轻量级版本）
 *
 * 职责：
 * 1. WebSocket消息转发
 * 2. 向后兼容的API接口
 * 3. 不再处理数据存储（由MySqlDataService接管）
 */
export class DataSyncService {
  private config: SyncConfig;
  private syncListeners: Set<() => void> = new Set();
  private dataStore: Map<string, Map<string, { data: any; timestamp: number }>> = new Map();
  private syncHistory: Map<string, Array<{ dataType: string; timestamp: number }>> = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[DataSyncService] 初始化轻量级版本（无localStorage）');
  }

  // ==================== 向后兼容API ====================

  /**
   * 更新数据（已废弃，使用MySqlDataService代替）
   * @deprecated 请使用 mySqlDataService 替代
   */
  updateData(username: string, dataType: string, data: any, sourceSessionId?: string): void {
    console.warn('[DataSyncService] updateData已废弃，请使用MySqlDataService');

    // 仅用于内存缓存，不持久化
    if (!this.dataStore.has(username)) {
      this.dataStore.set(username, new Map());
    }

    const userData = this.dataStore.get(username)!;
    userData.set(dataType, {
      data,
      timestamp: Date.now()
    });

    this.addToSyncHistory(username, dataType, sourceSessionId);

    // 通知监听器
    this.notifyListeners();
  }

  /**
   * 获取数据（已废弃）
   * @deprecated 请使用 mySqlDataService 替代
   */
  getData(username: string, dataType: string): any | null {
    console.warn('[DataSyncService] getData已废弃，请使用MySqlDataService');

    const userData = this.dataStore.get(username);
    if (!userData) return null;

    const dataInfo = userData.get(dataType);
    return dataInfo ? dataInfo.data : null;
  }

  /**
   * 获取用户所有数据
   */
  getAllUserData(username: string): Record<string, any> {
    const userData = this.dataStore.get(username);
    if (!userData) return {};

    const result: Record<string, any> = {};
    userData.forEach((value, key) => {
      result[key] = value.data;
    });

    return result;
  }

  /**
   * 删除用户数据
   */
  deleteUserData(username: string, dataType?: string): void {
    if (dataType) {
      const userData = this.dataStore.get(username);
      if (userData) {
        userData.delete(dataType);
      }
    } else {
      this.dataStore.delete(username);
    }
  }

  /**
   * 强制同步所有数据（已废弃）
   * @deprecated 请使用 mySqlDataService.refreshAll() 替代
   */
  forceSyncAllData(username: string): void {
    console.warn('[DataSyncService] forceSyncAllData已废弃，请使用MySqlDataService.refreshAll()');
    this.notifyListeners();
  }

  // ==================== 同步控制 ====================

  /**
   * 开始同步（已废弃，保持向后兼容）
   * @deprecated WebSocket自动处理实时同步
   */
  startSync(): void {
    console.log('[DataSyncService] startSync已废弃，使用WebSocket实时推送');
    // 不再需要定时轮询
  }

  /**
   * 停止同步
   */
  stopSync(): void {
    // WebSocket自动处理，无需停止
    console.log('[DataSyncService] 停止同步监听器');
  }

  /**
   * 手动触发同步（已废弃）
   * @deprecated 请使用 mySqlDataService.refreshAll() 替代
   */
  async triggerSync(): Promise<void> {
    console.warn('[DataSyncService] triggerSync已废弃，请使用MySqlDataService.refreshAll()');
    this.notifyListeners();
  }

  // ==================== 监听器管理 ====================

  /**
   * 注册同步监听器
   */
  onSync(callback: () => void): void {
    this.syncListeners.add(callback);
  }

  /**
   * 移除同步监听器
   */
  offSync(callback: () => void): void {
    this.syncListeners.delete(callback);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    for (const callback of this.syncListeners) {
      try {
        callback();
      } catch (error) {
        console.error('[DataSyncService] 监听器回调错误:', error);
      }
    }
  }

  // ==================== 统计信息 ====================

  /**
   * 获取同步状态
   * @deprecated 返回空状态，请使用MySqlDataService
   */
  getSyncStatus(): {
    lastSync: number;
    pendingChanges: number;
    deviceId: string;
    version: number;
    syncData: SyncData | null;
  } {
    return {
      lastSync: Date.now(),
      pendingChanges: 0,
      deviceId: 'mysql-service',
      version: 1,
      syncData: null
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalUsers: number; totalDataTypes: number; totalSyncOperations: number } {
    let totalDataTypes = 0;

    this.dataStore.forEach(userData => {
      totalDataTypes += userData.size;
    });

    return {
      totalUsers: this.dataStore.size,
      totalDataTypes,
      totalSyncOperations: this.syncHistory.size
    };
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): Array<{ username: string; dataTypes: string[] }> {
    const status: Array<{ username: string; dataTypes: string[] }> = [];

    this.dataStore.forEach((userData, username) => {
      status.push({
        username,
        dataTypes: Array.from(userData.keys())
      });
    });

    return status;
  }

  /**
   * 清除所有数据
   */
  clearAllData(): void {
    this.dataStore.clear();
    this.syncHistory.clear();
    console.log('[DataSyncService] 所有内存数据已清除');
  }

  // ==================== 私有方法 ====================

  /**
   * 添加到同步历史
   */
  private addToSyncHistory(username: string, dataType: string, sourceSessionId?: string): void {
    if (!this.syncHistory.has(username)) {
      this.syncHistory.set(username, []);
    }

    const history = this.syncHistory.get(username)!;
    history.push({
      dataType,
      timestamp: Date.now()
    });

    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 获取同步历史
   */
  getSyncHistory(username: string, limit: number = 10): Array<{ dataType: string; timestamp: number }> {
    const history = this.syncHistory.get(username);
    if (!history) return [];

    return history.slice(-limit);
  }
}

// 导出单例
export const dataSyncService = new DataSyncService();
export default dataSyncService;
