/**
 * 简化的实时数据同步服务
 * 使用 WebSocket + 内存状态，移除 BroadcastChannel 和 IndexedDB 复杂性
 */

import { apiService } from './ApiService';

// ================================================================
// 类型定义
// ================================================================

export type DataType =
  | 'projects'
  | 'wbs_tasks'
  | 'milestones'
  | 'holidays'
  | 'organization_units'
  | 'permission_configs';

interface SyncMessage {
  type: 'data_update' | 'data_conflict' | 'sync_request';
  dataType: DataType;
  dataId?: string;
  data?: any;
  version?: number;
  operationId?: string;
}

type SyncCallback = (message: SyncMessage) => void;

// ================================================================
// 同步服务类
// ================================================================

class SimpleDataSyncService {
  private ws: WebSocket | null = null;
  private messageQueue: SyncMessage[] = [];
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_DELAY = 30000; // 30秒
  private reconnectDelay = 1000;
  private callbacks: Map<DataType, Set<SyncCallback>> = new Map();
  private globalCallbacks: Set<SyncCallback> = new Set();

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // 获取当前会话ID
        const sessionId = this.getSessionId();
        const wsUrl = `ws://localhost:3001?sessionId=${sessionId}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[SimpleDataSync] WebSocket 连接成功');
          this.isConnecting = false;
          this.reconnectDelay = 1000;

          // 发送排队的消息
          this.flushMessageQueue();

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[SimpleDataSync] 解析消息失败:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[SimpleDataSync] WebSocket 连接关闭');
          this.isConnecting = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[SimpleDataSync] WebSocket 错误:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.messageQueue = [];
  }

  /**
   * 订阅数据类型更新
   */
  subscribe(dataType: DataType, callback: SyncCallback): () => void {
    if (!this.callbacks.has(dataType)) {
      this.callbacks.set(dataType, new Set());
    }
    this.callbacks.get(dataType)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.callbacks.get(dataType)?.delete(callback);
    };
  }

  /**
   * 订阅所有数据更新
   */
  subscribeAll(callback: SyncCallback): () => void {
    this.globalCallbacks.add(callback);

    return () => {
      this.globalCallbacks.delete(callback);
    };
  }

  /**
   * 发送数据更新请求
   */
  async requestDataUpdate(
    dataType: DataType,
    dataId: string,
    data: any,
    options?: {
      expectedVersion?: number;
      changeReason?: string;
    }
  ): Promise<{ success: boolean; version?: number; conflict?: boolean; serverData?: any }> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message: SyncMessage = {
      type: 'data_update',
      dataType,
      dataId,
      data,
      version: options?.expectedVersion,
      operationId
    };

    return new Promise((resolve) => {
      // 临时订阅响应
      const unsubscribe = this.subscribeAll((response) => {
        if (response.operationId === operationId) {
          unsubscribe();
          if (response.type === 'data_conflict') {
            resolve({
              success: false,
              conflict: true,
              serverData: response.data
            });
          } else {
            resolve({
              success: true,
              version: response.version
            });
          }
        }
      });

      this.sendMessage(message);
    });
  }

  /**
   * 发送消息
   */
  private sendMessage(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // 连接未就绪，加入队列
      this.messageQueue.push(message);
      // 尝试重新连接
      this.connect().catch(console.error);
    }
  }

  /**
   * 发送排队的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: any): void {
    if (!message.type) return;

    const syncMessage: SyncMessage = {
      type: message.type,
      dataType: message.dataType,
      dataId: message.dataId,
      data: message.data,
      version: message.version,
      operationId: message.operationId
    };

    // 通知全局订阅者
    this.globalCallbacks.forEach(callback => {
      try {
        callback(syncMessage);
      } catch (error) {
        console.error('[SimpleDataSync] 回调执行失败:', error);
      }
    });

    // 通知特定数据类型订阅者
    const typeCallbacks = this.callbacks.get(syncMessage.dataType);
    if (typeCallbacks) {
      typeCallbacks.forEach(callback => {
        try {
          callback(syncMessage);
        } catch (error) {
          console.error('[SimpleDataSync] 回调执行失败:', error);
        }
      });
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`[SimpleDataSync] 尝试重新连接 (延迟: ${this.reconnectDelay}ms)`);
      this.connect().catch(() => {
        // 重连失败，增加延迟
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
        this.scheduleReconnect();
      });
    }, this.reconnectDelay);
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string {
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return '';

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return '';
      const session = JSON.parse(sessionData);
      return session.sessionId || '';
    } catch {
      return '';
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取数据（通过 REST API）
   */
  async fetchData(dataType: DataType): Promise<any> {
    // 根据数据类型从相应的 API 获取
    switch (dataType) {
      case 'organization_units':
        const response = await apiService.getOrganizationStructure();
        return response.data;
      case 'permission_configs':
        const permResponse = await apiService.getPermissionConfig();
        return permResponse.data;
      default:
        // 其他类型通过 data API
        const username = this.getCurrentUsername();
        if (!username) return null;
        const dataResponse = await apiService.getData(username, dataType);
        return dataResponse.data;
    }
  }

  /**
   * 获取当前用户名
   */
  private getCurrentUsername(): string | null {
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return null;

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);
      return session.username || null;
    } catch {
      return null;
    }
  }
}

// 导出单例
export const simpleDataSyncService = new SimpleDataSyncService();
