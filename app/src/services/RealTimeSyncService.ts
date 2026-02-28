/**
 * 实时同步服务 - 多用户协作数据同步
 *
 * 职责：
 * 1. 监听 WebSocket 全局数据更新消息
 * 2. 自动更新本地状态
 * 3. 处理版本冲突
 * 4. 乐观式 UI 更新
 * 5. 自动重连和错误恢复
 */

import { WebSocketService } from './WebSocketService';

// ================================================================
// 类型定义
// ================================================================

export type GlobalDataType = 'organization_units' | 'projects' | 'wbs_tasks' | 'holidays';

export interface GlobalDataMessage {
  type: 'global_data_created' | 'global_data_updated' | 'global_data_deleted';
  dataType: GlobalDataType;
  dataId: string;
  data?: any;
  version: number;
  updatedBy: number;
  timestamp: number;
}

export interface DataConflictMessage {
  type: 'data_conflict';
  data: {
    dataType: GlobalDataType;
    dataId: string;
    message: string;
    serverData: any;
    serverVersion: number;
  };
}

export interface SyncDataOptions {
  // 数据类型
  dataType: GlobalDataType;
  // 数据ID（可选，不传则同步该类型的所有数据）
  dataId?: string;
  // 期望版本号（用于乐观锁）
  expectedVersion?: number;
  // 变更原因
  changeReason?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
  version?: number;
  conflict?: boolean;
}

// ================================================================
// 事件监听器类型
// ================================================================

export type DataUpdateListener = (message: GlobalDataMessage) => void;
export type ConflictListener = (conflict: DataConflictMessage) => void;
export type ConnectionListener = (connected: boolean) => void;

// ================================================================
// 实时同步服务类
// ================================================================

class RealTimeSyncService {
  private wsService: WebSocketService | null = null;
  private dataUpdateListeners: Map<GlobalDataType, Set<DataUpdateListener>> = new Map();
  private conflictListeners: Set<ConflictListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private pendingUpdates: Map<string, Promise<SyncResult>> = new Map();
  private sessionId: string | null = null;
  private username: string | null = null;

  // ================================================================
  // 初始化与连接管理
  // ================================================================

  /**
   * 初始化同步服务
   */
  async initialize(sessionId?: string, username?: string): Promise<void> {
    if (this.wsService) {
      console.warn('[RealTimeSync] 服务已初始化');
      return;
    }

    // 保存会话信息
    if (sessionId) this.sessionId = sessionId;
    if (username) this.username = username;

    try {
      this.wsService = WebSocketService.getInstance();

      // 如果提供了 sessionId 和 username，则连接
      if (sessionId && username) {
        await this.wsService.connect(sessionId, username);
      }

      // 注册消息处理器
      this.wsService.onMessage((message) => {
        this.handleMessage(message);
      });

      // 注册连接状态监听器
      this.wsService.onConnect(() => {
        this.notifyConnectionListeners(true);
        console.log('[RealTimeSync] 连接成功');
      });

      this.wsService.onDisconnect(() => {
        this.notifyConnectionListeners(false);
        console.warn('[RealTimeSync] 连接断开，由 WebSocketService 负责重连');
      });

      console.log('[RealTimeSync] 服务初始化成功');
    } catch (error) {
      console.error('[RealTimeSync] 初始化失败:', error);
      throw error;
    }
  }

  // ================================================================
  // 消息处理
  // ================================================================

  /**
   * 处理 WebSocket 消息
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'global_data_created':
      case 'global_data_updated':
      case 'global_data_deleted':
        this.handleGlobalDataUpdate(message);
        break;

      case 'data_conflict':
        this.handleDataConflict(message);
        break;

      default:
        // 忽略其他消息类型
        break;
    }
  }

  /**
   * 处理全局数据更新
   */
  private handleGlobalDataUpdate(message: GlobalDataMessage): void {
    const { dataType } = message;

    // 通知该数据类型的所有监听器
    const listeners = this.dataUpdateListeners.get(dataType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(message);
        } catch (error) {
          console.error(`[RealTimeSync] 监听器执行失败:`, error);
        }
      });
    }

    console.log(`[RealTimeSync] 数据更新: ${dataType}/${message.dataId}, 版本: ${message.version}`);
  }

  /**
   * 处理数据冲突
   */
  private handleDataConflict(message: DataConflictMessage): void {
    this.conflictListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('[RealTimeSync] 冲突监听器执行失败:', error);
      }
    });

    console.warn(`[RealTimeSync] 数据冲突: ${message.data.dataType}/${message.data.dataId}`);
  }

  // ================================================================
  // 数据同步操作
  // ================================================================

  /**
   * 更新全局数据（带乐观锁）
   */
  async updateGlobalData(
    data: any,
    options: SyncDataOptions
  ): Promise<SyncResult> {
    const { dataType, dataId = 'default', expectedVersion, changeReason } = options;

    // 防止重复提交
    const updateKey = `${dataType}:${dataId}`;
    const pendingUpdate = this.pendingUpdates.get(updateKey);
    if (pendingUpdate) {
      return pendingUpdate;
    }

    const updatePromise = this.performUpdate(data, {
      dataType,
      dataId,
      expectedVersion,
      changeReason
    });

    this.pendingUpdates.set(updateKey, updatePromise);

    try {
      const result = await updatePromise;
      return result;
    } finally {
      this.pendingUpdates.delete(updateKey);
    }
  }

  /**
   * 执行数据更新
   */
  private async performUpdate(
    data: any,
    options: SyncDataOptions
  ): Promise<SyncResult> {
    if (!this.wsService || !this.wsService.isConnected()) {
      return {
        success: false,
        message: 'WebSocket 未连接，请检查网络连接'
      };
    }

    try {
      // 通过 WebSocket 发送更新请求并等待响应
      const response = await this.wsService.request({
        type: 'data_update',
        data: {
          dataType: options.dataType,
          dataId: options.dataId || 'default',
          data,
          expectedVersion: options.expectedVersion,
          changeReason: options.changeReason
        }
      });

      // request() 方法已经处理了响应匹配，直接返回结果
      // response 可能是：
      // 1. { success: true, version: number, message: string }
      // 2. { success: false, conflict: true, message: string, data: any, version: number }
      // 3. Error 对象（被 reject 捕获）

      return {
        success: response.success || false,
        message: response.message || '更新完成',
        data: response.data,
        version: response.version,
        conflict: response.conflict || false
      };
    } catch (error) {
      console.error('[RealTimeSync] 更新失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '更新失败'
      };
    }
  }

  /**
   * 获取全局数据（从服务器）
   */
  async fetchGlobalData(dataType: GlobalDataType, dataId?: string): Promise<any> {
    try {
      const response = await fetch('/api/global-data/get', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dataType, dataId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || '获取数据失败');
      }
    } catch (error) {
      console.error('[RealTimeSync] 获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除全局数据
   */
  async deleteGlobalData(
    dataType: GlobalDataType,
    dataId: string,
    changeReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/global-data/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dataType, dataId, changeReason })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`[RealTimeSync] 数据删除成功: ${dataType}/${dataId}`);
      }

      return result;
    } catch (error) {
      console.error('[RealTimeSync] 删除数据失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '删除失败'
      };
    }
  }

  // ================================================================
  // 事件监听器管理
  // ================================================================

  /**
   * 注册数据更新监听器
   */
  onDataUpdate(dataType: GlobalDataType, listener: DataUpdateListener): () => void {
    if (!this.dataUpdateListeners.has(dataType)) {
      this.dataUpdateListeners.set(dataType, new Set());
    }

    this.dataUpdateListeners.get(dataType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this.dataUpdateListeners.get(dataType)?.delete(listener);
    };
  }

  /**
   * 注册冲突监听器
   */
  onConflict(listener: ConflictListener): () => void {
    this.conflictListeners.add(listener);

    // 返回取消订阅函数
    return () => {
      this.conflictListeners.delete(listener);
    };
  }

  /**
   * 注册连接状态监听器
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);

    // 返回取消订阅函数
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * 通知连接状态监听器
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error('[RealTimeSync] 连接监听器执行失败:', error);
      }
    });
  }

  // ================================================================
  // 状态查询
  // ================================================================

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.wsService?.isConnected() ?? false;
  }

  /**
   * 获取同步统计信息
   */
  async getStats(): Promise<any> {
    try {
      const response = await fetch('/api/global-data/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.stats;
      } else {
        throw new Error(result.message || '获取统计信息失败');
      }
    } catch (error) {
      console.error('[RealTimeSync] 获取统计信息失败:', error);
      throw error;
    }
  }

  // ================================================================
  // 清理与销毁
  // ================================================================

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
    }

    // 清理所有监听器
    this.dataUpdateListeners.clear();
    this.conflictListeners.clear();
    this.connectionListeners.clear();
    this.pendingUpdates.clear();

    console.log('[RealTimeSync] 服务已断开');
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.initialize();
  }
}

// ================================================================
// 导出单例
// ================================================================

export const realTimeSyncService = new RealTimeSyncService();

// 为了向后兼容，同时导出类
export { RealTimeSyncService };
