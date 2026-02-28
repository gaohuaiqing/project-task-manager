/**
 * 网络状态监听服务
 *
 * 职责：
 * 1. 监听在线/离线事件
 * 2. 提供网络状态查询 API
 * 3. 优化重连策略（离线时不重连，恢复后立即重连）
 * 4. 与 WebSocketService 集成，控制重连行为
 */

import { wsService } from './WebSocketService';

// ================================================================
// 类型定义
// ================================================================

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export type NetworkStatusListener = (status: NetworkStatus) => void;

export interface NetworkStatusInfo {
  status: NetworkStatus;
  since: number;
  wasOnline: boolean;
}

// ================================================================
// NetworkStatus 类
// ================================================================

class NetworkStatusService {
  private currentStatus: NetworkStatus = 'unknown';
  private statusSince: number = Date.now();
  private wasOnline: boolean = true;
  private listeners: Set<NetworkStatusListener> = new Set();
  private reconnectOnOnline: boolean = false;
  private sessionId: string | null = null;
  private username: string | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化网络状态监听
   */
  private initialize(): void {
    // 初始状态
    this.currentStatus = navigator.onLine ? 'online' : 'offline';
    this.statusSince = Date.now();
    this.wasOnline = navigator.onLine;

    console.log(`[NetworkStatus] 初始状态: ${this.currentStatus}`);

    // 监听在线事件
    window.addEventListener('online', this.handleOnline);

    // 监听离线事件
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * 处理在线事件
   */
  private handleOnline = (): void => {
    const previousStatus = this.currentStatus;
    this.currentStatus = 'online';
    this.statusSince = Date.now();
    this.wasOnline = true;

    console.log('[NetworkStatus] 网络已连接');

    // 通知监听器
    this.notifyListeners();

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('network-online', {
      detail: { timestamp: Date.now() }
    }));

    // 如果之前是离线且需要重连，立即重连
    if (previousStatus === 'offline' && this.reconnectOnOnline) {
      console.log('[NetworkStatus] 网络恢复，尝试重连 WebSocket');
      this.triggerReconnect();
    }
  };

  /**
   * 处理离线事件
   */
  private handleOffline = (): void => {
    this.currentStatus = 'offline';
    this.statusSince = Date.now();

    console.warn('[NetworkStatus] 网络已断开');

    // 通知监听器
    this.notifyListeners();

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('network-offline', {
      detail: { timestamp: Date.now() }
    }));
  };

  /**
   * 触发 WebSocket 重连
   */
  private triggerReconnect(): void {
    if (this.sessionId && this.username) {
      wsService.connect(this.sessionId, this.username).catch(error => {
        console.error('[NetworkStatus] 重连失败:', error);
      });
    }
    this.reconnectOnOnline = false;
  }

  /**
   * 设置会话信息（用于重连）
   */
  setSession(sessionId: string, username: string): void {
    this.sessionId = sessionId;
    this.username = username;
  }

  /**
   * 清除会话信息
   */
  clearSession(): void {
    this.sessionId = null;
    this.username = null;
  }

  /**
   * 获取当前状态
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * 获取状态信息
   */
  getStatusInfo(): NetworkStatusInfo {
    return {
      status: this.currentStatus,
      since: this.statusSince,
      wasOnline: this.wasOnline
    };
  }

  /**
   * 检查是否在线
   */
  isOnline(): boolean {
    return this.currentStatus === 'online';
  }

  /**
   * 检查是否离线
   */
  isOffline(): boolean {
    return this.currentStatus === 'offline';
  }

  /**
   * 注册状态监听器
   */
  onStatusChange(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);

    // 立即调用一次，提供当前状态
    try {
      listener(this.currentStatus);
    } catch (error) {
      console.error('[NetworkStatus] 监听器执行失败:', error);
    }

    // 返回取消订阅函数
    return () => this.listeners.delete(listener);
  }

  /**
   * 标记在线时需要重连
   */
  enableReconnectOnOnline(): void {
    this.reconnectOnOnline = true;
    console.log('[NetworkStatus] 已启用网络恢复时重连');
  }

  /**
   * 禁用在线时重连
   */
  disableReconnectOnOnline(): void {
    this.reconnectOnOnline = false;
    console.log('[NetworkStatus] 已禁用网络恢复时重连');
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('[NetworkStatus] 状态监听器执行失败:', error);
      }
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
    this.clearSession();
    console.log('[NetworkStatus] 服务已销毁');
  }
}

// ================================================================
// 导出单例
// ================================================================

export const networkStatus = new NetworkStatusService();

// 为了向后兼容，同时导出类
export { NetworkStatusService };
