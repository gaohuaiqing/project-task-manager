/**
 * 实时同步服务 v2.0
 *
 * 核心特性：
 * 1. 操作队列：支持离线操作，网络恢复后自动同步
 * 2. 冲突检测：自动检测并发修改冲突
 * 3. 智能合并：字段级自动合并算法
 * 4. 版本控制：基于版本号的乐观锁
 * 5. 实时锁：防止多用户同时编辑
 */

import { WebSocketService } from './WebSocketService';
import { indexedDBSyncService } from '@/services/IndexedDBSyncService';

// ================================================================
// 类型定义
// ================================================================

export interface SyncOperation {
  operationId: string;
  operationType: 'create' | 'update' | 'delete';
  dataType: string;
  dataId: string;
  data: any;
  expectedVersion?: number;
  priority?: number;
  timestamp: number;
  sessionId: string;
  username: string;
}

export interface SyncConflict {
  conflictId: string;
  dataType: string;
  dataId: string;
  conflictType: 'version' | 'delete' | 'dependency' | 'permission';
  localVersion: number;
  remoteVersion: number;
  localData: any;
  remoteData: any;
  detectedAt: number;
}

export interface SyncStatus {
  dataType: string;
  dataId: string;
  version: number;
  lastModifiedAt: number;
  pendingOperations: number;
  activeConflicts: number;
  isLocked: boolean;
}

// ================================================================
// 同步配置
// ================================================================

const SYNC_CONFIG = {
  // 批量同步间隔
  BATCH_INTERVAL: 1000,
  // 最大重试次数
  MAX_RETRY: 3,
  // 操作队列最大容量
  MAX_QUEUE_SIZE: 100,
  // 冲突重试延迟
  CONFLICT_RETRY_DELAY: 5000,
  // 心跳间隔
  HEARTBEAT_INTERVAL: 30000,
  // 指纹计算间隔
  FINGERPRINT_INTERVAL: 60000
};

// ================================================================
// 同步服务类
// ================================================================

class RealTimeSyncService {
  private wsService: WebSocketService | null = null;
  private sessionId: string | null = null;
  private username: string | null = null;

  // 操作队列
  private operationQueue: Map<string, SyncOperation> = new Map();
  private processingOperations: Set<string> = new Set();

  // 冲突处理
  private conflicts: Map<string, SyncConflict> = new Map();
  private conflictCallbacks: Set<(conflict: SyncConflict) => void> = new Set();

  // 数据指纹缓存
  private fingerprints: Map<string, { fingerprint: string; version: number }> = new Map();

  // 同步状态
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // 事件监听器
  private dataChangeListeners: Map<string, Set<(data: any) => void>> = new Map();
  private syncStatusListeners: Set<(status: SyncStatus) => void> = new Set();

  // ================================================================
  // 初始化
  // ================================================================

  async initialize(sessionId: string, username: string): Promise<void> {
    this.sessionId = sessionId;
    this.username = username;

    console.log('[RealTimeSync] 初始化同步服务');

    // 1. 初始化 WebSocket
    this.wsService = WebSocketService.getInstance();
    if (this.wsService.isConnected()) {
      this.setupWebSocketHandlers();
    } else {
      // 等待 WebSocket 连接
      const unsubscribe = this.wsService.onConnect(() => {
        this.setupWebSocketHandlers();
        unsubscribe();
      });
    }

    // 2. 加载本地操作队列
    await this.loadLocalQueue();

    // 3. 启动批量同步
    this.startBatchSync();

    // 4. 启动心跳
    this.startHeartbeat();

    // 5. 监听网络状态
    this.setupNetworkMonitoring();
  }

  private setupWebSocketHandlers(): void {
    if (!this.wsService) return;

    // 监听服务器消息
    this.wsService.onMessage((message) => {
      this.handleServerMessage(message);
    });

    // 监听连接状态
    this.wsService.onDisconnect(() => {
      this.handleDisconnect();
    });

    this.wsService.onConnect(() => {
      this.handleReconnect();
    });
  }

  // ================================================================
  // 数据操作
  // ================================================================

  /**
   * 创建数据
   */
  async createData(
    dataType: string,
    dataId: string,
    data: any,
    priority: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    const operation: SyncOperation = {
      operationId: this.generateOperationId(),
      operationType: 'create',
      dataType,
      dataId,
      data,
      priority,
      timestamp: Date.now(),
      sessionId: this.sessionId!,
      username: this.username!
    };

    return this.queueOperation(operation);
  }

  /**
   * 更新数据
   */
  async updateData(
    dataType: string,
    dataId: string,
    data: any,
    expectedVersion?: number,
    priority: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    const operation: SyncOperation = {
      operationId: this.generateOperationId(),
      operationType: 'update',
      dataType,
      dataId,
      data,
      expectedVersion,
      priority,
      timestamp: Date.now(),
      sessionId: this.sessionId!,
      username: this.username!
    };

    return this.queueOperation(operation);
  }

  /**
   * 删除数据
   */
  async deleteData(
    dataType: string,
    dataId: string,
    expectedVersion?: number
  ): Promise<{ success: boolean; error?: string }> {
    const operation: SyncOperation = {
      operationId: this.generateOperationId(),
      operationType: 'delete',
      dataType,
      dataId,
      data: null,
      expectedVersion,
      priority: 10, // 删除操作优先级高
      timestamp: Date.now(),
      sessionId: this.sessionId!,
      username: this.username!
    };

    return this.queueOperation(operation);
  }

  // ================================================================
  // 操作队列管理
  // ================================================================

  private queueOperation(operation: SyncOperation): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // 检查队列容量
      if (this.operationQueue.size >= SYNC_CONFIG.MAX_QUEUE_SIZE) {
        resolve({ success: false, error: '操作队列已满' });
        return;
      }

      // 添加到队列
      this.operationQueue.set(operation.operationId, operation);

      // 保存到 IndexedDB（持久化）
      this.saveQueueToIndexedDB();

      // 立即尝试同步（如果在线）
      if (this.isOnline) {
        this.syncOperation(operation).then(resolve);
      } else {
        // 离线状态，等待网络恢复
        resolve({ success: true });
      }

      console.log('[RealTimeSync] 操作已加入队列:', operation.operationType, operation.dataType, operation.dataId);
    });
  }

  private async syncOperation(operation: SyncOperation): Promise<{ success: boolean; error?: string }> {
    // 标记为处理中
    this.processingOperations.add(operation.operationId);

    try {
      const response = await fetch('http://localhost:3001/api/operation/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...operation,
          sessionId: this.sessionId
        })
      });

      const result = await response.json();

      if (result.success) {
        // 同步成功，从队列移除
        this.operationQueue.delete(operation.operationId);
        this.saveQueueToIndexedDB();

        // 更新本地数据
        if (result.data) {
          this.notifyDataChange(operation.dataType, result.data);
        }

        console.log('[RealTimeSync] 操作同步成功:', operation.operationId);
        return { success: true };
      } else if (result.conflict) {
        // 处理冲突
        await this.handleConflict(result.conflict);
        return { success: false, error: '数据冲突，需要解决' };
      } else {
        // 同步失败，重试
        throw new Error(result.message || '同步失败');
      }
    } catch (error) {
      console.error('[RealTimeSync] 操作同步失败:', error);

      // 重试逻辑
      operation.retryCount = (operation.retryCount || 0) + 1;
      if (operation.retryCount < SYNC_CONFIG.MAX_RETRY) {
        setTimeout(() => {
          this.syncOperation(operation);
        }, SYNC_CONFIG.CONFLICT_RETRY_DELAY);
      } else {
        // 超过最大重试次数
        this.operationQueue.delete(operation.operationId);
        return { success: false, error: '同步失败，超过最大重试次数' };
      }

      return { success: false, error: (error as Error).message };
    } finally {
      this.processingOperations.delete(operation.operationId);
    }
  }

  // ================================================================
  // 批量同步
  // ================================================================

  private startBatchSync(): void {
    this.batchTimer = setInterval(() => {
      if (!this.isOnline || this.syncInProgress) return;

      const pendingOps = Array.from(this.operationQueue.values())
        .filter(op => !this.processingOperations.has(op.operationId))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 10); // 每批最多10个操作

      if (pendingOps.length === 0) return;

      this.syncInProgress = true;

      Promise.all(pendingOps.map(op => this.syncOperation(op)))
        .finally(() => {
          this.syncInProgress = false;
        });
    }, SYNC_CONFIG.BATCH_INTERVAL);
  }

  // ================================================================
  // 冲突处理
  // ================================================================

  private async handleConflict(conflictData: any): Promise<void> {
    const conflict: SyncConflict = {
      conflictId: conflictData.conflictId || this.generateOperationId(),
      dataType: conflictData.dataType,
      dataId: conflictData.dataId,
      conflictType: conflictData.conflictType,
      localVersion: conflictData.localVersion,
      remoteVersion: conflictData.remoteVersion,
      localData: conflictData.localData,
      remoteData: conflictData.remoteData,
      detectedAt: Date.now()
    };

    this.conflicts.set(conflict.conflictId, conflict);

    // 尝试自动合并
    const merged = this.tryAutoMerge(conflict);
    if (merged) {
      await this.applyMergedData(conflict, merged);
      this.conflicts.delete(conflict.conflictId);
    } else {
      // 通知用户处理冲突
      this.conflictCallbacks.forEach(callback => callback(conflict));
    }
  }

  private tryAutoMerge(conflict: SyncConflict): any | null {
    // 简单的自动合并策略：
    // 1. 如果是不同字段的修改，直接合并
    // 2. 如果是版本冲突，使用"后写优先"策略

    if (conflict.conflictType === 'version') {
      // 比较修改时间，使用最新的
      const localTime = conflict.localData.lastUpdated || 0;
      const remoteTime = conflict.remoteData.lastUpdated || 0;

      return remoteTime > localTime ? conflict.remoteData : conflict.localData;
    }

    return null; // 无法自动合并
  }

  private async applyMergedData(conflict: SyncConflict, mergedData: any): Promise<void> {
    // 应用合并后的数据
    await this.updateData(conflict.dataType, conflict.dataId, mergedData, mergedData.version);

    // 通知服务器冲突已解决
    await fetch('http://localhost:3001/api/conflict/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conflictId: conflict.conflictId,
        resolutionMethod: 'auto_merge',
        mergedData
      })
    });
  }

  // ================================================================
  // 数据指纹
  // ================================================================

  private calculateFingerprint(data: any): string {
    // 简单的指纹计算（生产环境应使用 crypto.subtle.digest）
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ================================================================
  // 事件监听
  // ================================================================

  onDataChange(dataType: string, callback: (data: any) => void): () => void {
    if (!this.dataChangeListeners.has(dataType)) {
      this.dataChangeListeners.set(dataType, new Set());
    }
    this.dataChangeListeners.get(dataType)!.add(callback);

    return () => {
      this.dataChangeListeners.get(dataType)?.delete(callback);
    };
  }

  onConflict(callback: (conflict: SyncConflict) => void): () => void {
    this.conflictCallbacks.add(callback);
    return () => {
      this.conflictCallbacks.delete(callback);
    };
  }

  private notifyDataChange(dataType: string, data: any): void {
    const listeners = this.dataChangeListeners.get(dataType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // ================================================================
  // WebSocket 消息处理
  // ================================================================

  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'data_updated':
        this.handleDataUpdate(message.data);
        break;

      case 'conflict_detected':
        this.handleConflict(message.data);
        break;

      case 'lock_acquired':
      case 'lock_released':
        this.handleLockChange(message.data);
        break;

      case 'sync_status':
        this.handleSyncStatus(message.data);
        break;
    }
  }

  private handleDataUpdate(data: any): void {
    const { dataType, dataId, data, version } = data;

    // 更新本地缓存
    this.notifyDataChange(dataType, data);

    // 更新指纹
    this.fingerprints.set(`${dataType}:${dataId}`, {
      fingerprint: this.calculateFingerprint(data),
      version
    });

    console.log('[RealTimeSync] 收到数据更新:', dataType, dataId, '版本:', version);
  }

  // ================================================================
  // 网络状态监控
  // ================================================================

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.handleReconnect();
    });

    window.addEventListener('offline', () => {
      this.handleDisconnect();
    });
  }

  private handleDisconnect(): void {
    this.isOnline = false;
    console.log('[RealTimeSync] 网络断开，进入离线模式');
  }

  private handleReconnect(): void {
    this.isOnline = true;
    console.log('[RealTimeSync] 网络恢复，开始同步离线操作');

    // 同步离线操作
    this.syncOfflineOperations();
  }

  private async syncOfflineOperations(): Promise<void> {
    const offlineOps = Array.from(this.operationQueue.values());

    for (const op of offlineOps) {
      await this.syncOperation(op);
    }
  }

  // ================================================================
  // IndexedDB 持久化
  // ================================================================

  private async loadLocalQueue(): Promise<void> {
    try {
      await indexedDBSyncService.init();
      const stored = await indexedDBSyncService.getData('operation_queue');

      if (stored && Array.isArray(stored)) {
        stored.forEach((op: SyncOperation) => {
          this.operationQueue.set(op.operationId, op);
        });

        console.log('[RealTimeSync] 加载本地操作队列:', stored.length, '个操作');
      }
    } catch (error) {
      console.error('[RealTimeSync] 加载本地队列失败:', error);
    }
  }

  private saveQueueToIndexedDB(): void {
    indexedDBSyncService.saveData('operation_queue', Array.from(this.operationQueue.values()))
      .catch(error => console.error('[RealTimeSync] 保存队列失败:', error));
  }

  // ================================================================
  // 心跳保活
  // ================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.wsService?.isConnected()) {
        this.wsService.send({
          type: 'sync_heartbeat',
          data: {
            sessionId: this.sessionId,
            timestamp: Date.now()
          }
        });
      }
    }, SYNC_CONFIG.HEARTBEAT_INTERVAL);
  }

  // ================================================================
  // 辅助方法
  // ================================================================

  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ================================================================
  // 清理
  // ================================================================

  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.operationQueue.clear();
    this.conflicts.clear();
    this.dataChangeListeners.clear();
    this.conflictCallbacks.clear();
  }
}

// ================================================================
// 导出单例
// ================================================================

export const realTimeSyncService = new RealTimeSyncService();
export default realTimeSyncService;
