import type { ServerMessage, DataUpdateMessage, SessionTerminatedData } from '../../server/src/types/index';
import { networkStatus } from './NetworkStatus';

type MessageHandler = (message: ServerMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  // 重连后自动同步的数据类型列表
  autoSyncDataTypes: string[];
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: 'ws://localhost:3001',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 15000,  // 从30秒缩短到15秒
  autoSyncDataTypes: ['projects', 'wbs_tasks', 'organization_units', 'members']  // 重连后自动同步的数据类型
};

const MAX_PENDING_MESSAGES = 100;  // 最大待发送消息数量

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatMonitorTimeout: ReturnType<typeof setTimeout> | null = null;  // 新增：心跳超时检测
  private lastHeartbeatTime: number = Date.now();  // 新增：最后心跳时间
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private sessionId: string | null = null;
  private username: string | null = null;
  private isConnecting = false;
  private isReconnecting = false;  // 标记是否为重连
  private pendingMessages: ServerMessage[] = [];

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置自动同步的数据类型
   */
  setAutoSyncDataTypes(dataTypes: string[]): void {
    this.config.autoSyncDataTypes = dataTypes;
  }

  connect(sessionId: string, username: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      if (this.isConnecting) {
        reject(new Error('正在连接中'));
        return;
      }

      this.sessionId = sessionId;
      this.username = username;
      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[WebSocketService] 连接成功' + (this.isReconnecting ? ' (重连)' : ''));
          this.isConnecting = false;
          const wasReconnecting = this.isReconnecting;
          this.reconnectAttempts = 0;

          this.send({
            type: 'auth',
            data: { sessionId, username }
          });

          this.startHeartbeat();
          this.connectionHandlers.forEach(handler => handler());

          // 如果是重连成功，触发数据同步
          if (wasReconnecting) {
            console.log('[WebSocketService] 重连成功，开始同步数据...');
            this.triggerSyncAfterReconnect();
            // 触发自定义事件，通知组件重连成功
            window.dispatchEvent(new CustomEvent('websocket-reconnected', {
              detail: { timestamp: Date.now() }
            }));
          }

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocketService] 解析消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocketService] 连接关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.isReconnecting = true;  // 标记为重连状态
          this.stopHeartbeat();
          this.stopHeartbeatMonitor();  // 新增：停止心跳监控
          this.disconnectHandlers.forEach(handler => handler());

          if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketService] 连接错误:', error);
          this.isConnecting = false;
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopHeartbeatMonitor();  // 新增：停止心跳监控
    this.clearReconnectTimeout();
    
    if (this.ws) {
      this.ws.close(1000, '用户主动断开');
      this.ws = null;
    }
    
    this.sessionId = null;
    this.username = null;
    this.pendingMessages = [];
  }

  send(message: any): boolean {
    // 限制待发送消息队列大小
    if (this.pendingMessages.length >= MAX_PENDING_MESSAGES) {
      console.warn('[WebSocketService] 消息队列已满，丢弃最旧消息');
      this.pendingMessages.shift();
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * 发送请求并等待响应
   * 支持操作队列模式和普通请求模式
   *
   * 响应类型映射：
   * - data_operation → data_operation_response | data_conflict
   * - request_sync → sync_response
   * - data_update → data_update_ack | data_conflict
   */
  async request(message: any, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket未连接'));
        return;
      }

      // 如果消息已经包含 operationId，使用它；否则生成新的
      const requestId = message.data?.operationId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 根据消息类型决定可能的响应类型
      const possibleResponseTypes: Record<string, string[]> = {
        'data_operation': ['data_operation_response', 'data_conflict'],
        'data_update': ['data_update_ack', 'data_conflict'],
        'request_sync': ['sync_response']
      };

      const expectedTypes = possibleResponseTypes[message.type];

      // 创建一次性监听器
      const unsubscribe = this.onMessage((responseMessage) => {
        // 如果指定了期望的响应类型，检查是否匹配
        if (expectedTypes && !expectedTypes.includes(responseMessage.type)) {
          return;
        }

        // 检查操作ID是否匹配（如果有）
        if (responseMessage.data?.operationId && responseMessage.data.operationId !== requestId) {
          return;
        }

        // 检查是否为错误响应
        if (responseMessage.type === 'error') {
          unsubscribe();
          reject(new Error(responseMessage.data?.message || '服务器错误'));
          return;
        }

        // 匹配成功，解除监听并返回结果
        unsubscribe();

        // 处理冲突响应
        if (responseMessage.type === 'data_conflict') {
          resolve({
            success: false,
            conflict: true,
            message: responseMessage.data?.message || '数据冲突',
            data: responseMessage.data?.serverData,
            version: responseMessage.data?.serverVersion
          });
          return;
        }

        // 处理成功响应
        resolve(responseMessage.data);
      });

      // 发送请求（确保 operationId 正确设置）
      this.send({
        ...message,
        data: {
          ...message.data,
          operationId: requestId
        }
      });

      // 设置超时
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error('请求超时'));
      }, timeout);
    });
  }

  sendDataUpdate(dataType: DataUpdateMessage['dataType'], data: any): void {
    this.send({
      type: 'data_update',
      data: { dataType, data }
    });
  }

  requestSync(dataType: string): void {
    this.send({
      type: 'request_sync',
      data: { dataType }
    });
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'auth_success':
        console.log('[WebSocketService] 认证成功:', message.data);
        break;

      case 'session_terminated':
        const terminatedData = message.data as SessionTerminatedData;
        console.log('[WebSocketService] 会话被终止:', terminatedData.message);
        this.handleSessionTerminated(terminatedData);
        break;

      case 'data_sync':
        console.log('[WebSocketService] 收到数据同步:', message.data.dataType);
        break;

      case 'global_data_updated':
        // 处理全局数据更新（后端广播的数据变更）
        console.log('[WebSocketService] 收到全局数据更新:', message.data?.dataType, '版本:', message.data?.version);
        // 存储到 localStorage 以便其他组件读取
        if (message.data?.dataType && message.data?.data) {
          try {
            localStorage.setItem(`sync_${message.data.dataType}`, JSON.stringify(message.data.data));
            console.log('[WebSocketService] 已将更新数据保存到 localStorage:', message.data.dataType);

            // 触发自定义事件，通知所有监听器重新加载数据
            window.dispatchEvent(new CustomEvent('data-changed', {
              detail: {
                type: message.data.dataType,
                source: 'websocket',
                version: message.data?.version,
                timestamp: message.data?.timestamp
              }
            }));
            console.log('[WebSocketService] 已触发 data-changed 事件:', message.data.dataType);
          } catch (error) {
            console.error('[WebSocketService] 保存到 localStorage 失败:', error);
          }
        }
        break;

      case 'data_operation_response':
        console.log('[WebSocketService] 收到操作响应:', message.data.operationId, '成功:', message.data.success);
        break;

      case 'wbs_node_changed':
        console.log('[WebSocketService] 收到 WBS 节点变更:', message.data?.change?.type);
        // 触发 WBS 节点变更事件
        window.dispatchEvent(new CustomEvent('wbs-node-changed', {
          detail: message.data
        }));
        break;

      case 'heartbeat_ack':
        // 更新最后心跳时间（服务端响应客户端心跳）
        this.lastHeartbeatTime = Date.now();
        break;

      case 'error':
        console.error('[WebSocketService] 服务器错误:', message.data.message);
        break;
    }

    this.messageHandlers.forEach(handler => handler(message));
  }

  private handleSessionTerminated(data: SessionTerminatedData): void {
    this.disconnect();
    window.location.href = '/';
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeatTime = Date.now();
    this.heartbeatTimeout = setInterval(() => {
      this.send({ type: 'heartbeat', data: { timestamp: Date.now() } });
    }, this.config.heartbeatInterval);

    // 新增：启动心跳监控
    this.startHeartbeatMonitor();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * 新增：启动心跳超时监控
   * 如果30秒内没有收到服务器的心跳响应，则认为连接已断开
   */
  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    const heartbeatTimeout = 30000; // 30秒无响应则重连

    this.heartbeatMonitorTimeout = setInterval(() => {
      const now = Date.now();
      if (now - this.lastHeartbeatTime > heartbeatTimeout) {
        console.warn('[WebSocketService] 心跳超时，尝试重连');
        this.disconnect();
        if (this.sessionId && this.username) {
          this.connect(this.sessionId, this.username).catch(error => {
            console.error('[WebSocketService] 重连失败:', error);
          });
        }
      }
    }, heartbeatTimeout / 2); // 每半超时时间检查一次
  }

  /**
   * 新增：停止心跳监控
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatMonitorTimeout) {
      clearInterval(this.heartbeatMonitorTimeout);
      this.heartbeatMonitorTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimeout();
    this.reconnectAttempts++;

    // 检查网络状态，如果离线则不重连
    if (networkStatus.isOffline()) {
      console.log('[WebSocketService] 网络离线，暂停重连，等待网络恢复');
      // 启用网络恢复时重连
      networkStatus.enableReconnectOnOnline();
      // 设置会话信息用于重连
      if (this.sessionId && this.username) {
        networkStatus.setSession(this.sessionId, this.username);
      }
      return;
    }

    console.log(`[WebSocketService] 尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.sessionId && this.username) {
        this.connect(this.sessionId, this.username).catch(error => {
          console.error('[WebSocketService] 重连失败:', error);
        });
      }
    }, this.config.reconnectInterval);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * 重连后自动同步关键数据
   */
  private triggerSyncAfterReconnect(): void {
    console.log('[WebSocketService] 开始同步关键数据:', this.config.autoSyncDataTypes);

    // 异步发送同步请求
    setImmediate(() => {
      this.config.autoSyncDataTypes.forEach(dataType => {
        if (this.isConnected()) {
          console.log(`[WebSocketService] 请求同步数据: ${dataType}`);
          this.requestSync(dataType);
        }
      });
    });

    // 触发自定义事件，通知应用层刷新数据
    setImmediate(() => {
      window.dispatchEvent(new CustomEvent('websocket-sync-required', {
        detail: {
          dataTypes: this.config.autoSyncDataTypes,
          timestamp: Date.now()
        }
      }));
    });
  }

  // 静态方法获取单例实例
  static getInstance(): WebSocketService {
    if (!(globalThis as any).__wsServiceInstance) {
      (globalThis as any).__wsServiceInstance = new WebSocketService();
    }
    return (globalThis as any).__wsServiceInstance;
  }
}

// 导出类和默认实例
export { WebSocketService };
export const wsService = WebSocketService.getInstance();
export type { WebSocketConfig, MessageHandler, ConnectionHandler, ErrorHandler };
