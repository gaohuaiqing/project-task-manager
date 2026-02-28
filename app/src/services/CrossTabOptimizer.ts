/**
 * 多标签页同步优化器
 *
 * 职责：
 * 1. 使用 BroadcastChannel 替代 storage 事件
 * 2. 减少同步延迟（即时传递消息）
 * 3. 支持双向通信（请求-响应模式）
 * 4. 提供同步状态监控
 */

import { getDeviceId } from '@/utils/deviceId';

// ================================================================
// 类型定义
// ================================================================

export type SyncMessageType =
  | 'data_update'
  | 'data_request'
  | 'data_response'
  | 'state_sync'
  | 'heartbeat';

export interface SyncMessage<T = any> {
  /** 消息类型 */
  type: SyncMessageType;
  /** 数据类型 */
  dataType?: string;
  /** 数据内容 */
  data?: T;
  /** 源设备ID */
  sourceDeviceId: string;
  /** 消息ID（用于请求-响应匹配） */
  messageId?: string;
  /** 响应的消息ID（用于响应请求） */
  replyTo?: string;
  /** 时间戳 */
  timestamp: number;
}

export type DataUpdateListener<T = any> = (data: T, dataType: string) => void;
export type SyncStateListener = (state: SyncState) => void;

export interface SyncState {
  /** 已连接的标签页数量 */
  connectedTabs: number;
  /** 最后同步时间 */
  lastSyncTime: number;
  /** 同步消息计数 */
  messageCount: number;
}

// ================================================================
// 常量定义
// ================================================================

const CHANNEL_NAME = 'task-manager-cross-tab';
const HEARTBEAT_INTERVAL = 30000; // 30秒心跳
const TAB_TIMEOUT = 60000; // 60秒无心跳认为标签页已关闭

// ================================================================
// CrossTabOptimizer 类
// ================================================================

class CrossTabOptimizer {
  private channel: BroadcastChannel | null = null;
  private deviceId: string;
  private messageHandlers: Map<SyncMessageType, Set<Function>> = new Map();
  private pendingRequests: Map<string, {
    resolve: (data: any) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private connectedTabs: Set<string> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private stateListeners: Set<SyncStateListener> = new Set();

  // 同步统计
  private stats = {
    lastSyncTime: Date.now(),
    messageCount: 0
  };

  constructor() {
    this.deviceId = getDeviceId();
  }

  /**
   * 初始化
   */
  init(): void {
    if (this.channel) return;

    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);

      this.channel.onmessage = (event) => {
        this.handleMessage(event.data as SyncMessage);
      };

      // 启动心跳
      this.startHeartbeat();

      // 发送初始状态
      this.broadcastState();

      console.log('[CrossTabOptimizer] 初始化成功');
    } catch (error) {
      console.error('[CrossTabOptimizer] 初始化失败:', error);
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: SyncMessage): void {
    // 忽略自己发送的消息
    if (message.sourceDeviceId === this.deviceId) {
      return;
    }

    console.log('[CrossTabOptimizer] 收到消息:', message.type, 'from', message.sourceDeviceId);

    // 更新连接的标签页
    this.connectedTabs.add(message.sourceDeviceId);

    // 处理不同类型的消息
    switch (message.type) {
      case 'data_update':
        this.handleDataUpdate(message);
        break;

      case 'data_request':
        this.handleDataRequest(message);
        break;

      case 'data_response':
        this.handleDataResponse(message);
        break;

      case 'state_sync':
        this.handleStateSync(message);
        break;

      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
    }

    // 更新统计
    this.stats.messageCount++;
    this.stats.lastSyncTime = Date.now();
    this.notifyStateListeners();
  }

  /**
   * 处理数据更新
   */
  private handleDataUpdate(message: SyncMessage): void {
    const handlers = this.messageHandlers.get('data_update');
    if (handlers && message.dataType && message.data) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message.dataType);
        } catch (error) {
          console.error('[CrossTabOptimizer] 数据更新处理器失败:', error);
        }
      });
    }
  }

  /**
   * 处理数据请求
   */
  private handleDataRequest(message: SyncMessage): void {
    if (!message.messageId) return;

    // 查找处理器
    const handlers = this.messageHandlers.get('data_request');
    if (handlers && message.dataType) {
      handlers.forEach(handler => {
        try {
          const data = handler(message.dataType);

          // 发送响应
          this.send({
            type: 'data_response',
            dataType: message.dataType,
            data,
            replyTo: message.messageId
          });
        } catch (error) {
          console.error('[CrossTabOptimizer] 数据请求处理器失败:', error);
        }
      });
    }
  }

  /**
   * 处理数据响应
   */
  private handleDataResponse(message: SyncMessage): void {
    if (!message.replyTo) return;

    const pending = this.pendingRequests.get(message.replyTo);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(message.data);
      this.pendingRequests.delete(message.replyTo);
    }
  }

  /**
   * 处理状态同步
   */
  private handleStateSync(message: SyncMessage): void {
    // 更新连接状态
    if (message.data && typeof message.data === 'object') {
      const state = message.data as SyncState;
      console.log('[CrossTabOptimizer] 标签页状态:', state);
    }
  }

  /**
   * 处理心跳
   */
  private handleHeartbeat(message: SyncMessage): void {
    this.connectedTabs.add(message.sourceDeviceId);
  }

  /**
   * 发送消息
   */
  private send(message: Omit<SyncMessage, 'sourceDeviceId' | 'timestamp'>): void {
    if (!this.channel) {
      console.warn('[CrossTabOptimizer] 频道未初始化');
      return;
    }

    const syncMessage: SyncMessage = {
      ...message,
      sourceDeviceId: this.deviceId,
      timestamp: Date.now()
    };

    try {
      this.channel.postMessage(syncMessage);
    } catch (error) {
      console.error('[CrossTabOptimizer] 发送消息失败:', error);
    }
  }

  /**
   * 广播数据更新
   */
  broadcastDataUpdate<T>(dataType: string, data: T): void {
    this.send({
      type: 'data_update',
      dataType,
      data
    });

    console.log('[CrossTabOptimizer] 广播数据更新:', dataType);
  }

  /**
   * 请求数据（带响应等待）
   */
  async requestData<T>(dataType: string, timeout: number = 5000): Promise<T | null> {
    const messageId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        resolve(null);
      }, timeout);

      // 注册待处理请求
      this.pendingRequests.set(messageId, { resolve, timeout: timeoutId });

      // 发送请求
      this.send({
        type: 'data_request',
        dataType,
        messageId
      });
    });
  }

  /**
   * 广播状态
   */
  private broadcastState(): void {
    const state: SyncState = {
      connectedTabs: this.connectedTabs.size,
      lastSyncTime: this.stats.lastSyncTime,
      messageCount: this.stats.messageCount
    };

    this.send({
      type: 'state_sync',
      data: state
    });
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });

      // 清理超时的标签页
      const now = Date.now();
      for (const tabId of this.connectedTabs) {
        // 简化处理：假设每个标签页都会发送心跳
        // 实际应该记录每个标签页的最后心跳时间
      }

      // 广播当前状态
      this.broadcastState();
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 注册数据更新监听器
   */
  onDataUpdate<T>(handler: DataUpdateListener<T>): () => void {
    if (!this.messageHandlers.has('data_update')) {
      this.messageHandlers.set('data_update', new Set());
    }

    this.messageHandlers.get('data_update')!.add(handler);

    // 返回取消订阅函数
    return () => {
      const handlers = this.messageHandlers.get('data_update');
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * 注册数据请求监听器
   */
  onDataRequest(handler: (dataType: string) => any): () => void {
    if (!this.messageHandlers.has('data_request')) {
      this.messageHandlers.set('data_request', new Set());
    }

    this.messageHandlers.get('data_request')!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get('data_request');
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * 注册状态监听器
   */
  onStateChange(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * 通知状态监听器
   */
  private notifyStateListeners(): void {
    const state: SyncState = {
      connectedTabs: this.connectedTabs.size,
      lastSyncTime: this.stats.lastSyncTime,
      messageCount: this.stats.messageCount
    };

    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('[CrossTabOptimizer] 状态监听器失败:', error);
      }
    }
  }

  /**
   * 获取当前状态
   */
  getState(): SyncState {
    return {
      connectedTabs: this.connectedTabs.size,
      lastSyncTime: this.stats.lastSyncTime,
      messageCount: this.stats.messageCount
    };
  }

  /**
   * 关闭
   */
  close(): void {
    this.stopHeartbeat();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.messageHandlers.clear();
    this.pendingRequests.clear();
    this.connectedTabs.clear();
    this.stateListeners.clear();

    console.log('[CrossTabOptimizer] 已关闭');
  }
}

// ================================================================
// 导出单例
// ================================================================

export const crossTabOptimizer = new CrossTabOptimizer();

// 为了向后兼容，同时导出类
export { CrossTabOptimizer };
