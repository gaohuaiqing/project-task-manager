/**
 * WebSocket 客户端
 */

/**
 * WebSocket 消息处理器类型
 */
type MessageHandler = (data: unknown) => void;

/**
 * WebSocket 连接状态
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocket 客户端类
 */
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.status = 'connecting';
    this.notifyStatusChange();

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.status = 'error';
      this.notifyStatusChange();
      this.scheduleReconnect();
    }
  }

  /**
   * 设置 WebSocket 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.notifyStatusChange();
      console.log('WebSocket 已连接');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket 消息解析失败:', error);
      }
    };

    this.ws.onclose = () => {
      this.status = 'disconnected';
      this.notifyStatusChange();
      console.log('WebSocket 已断开');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      this.status = 'error';
      this.notifyStatusChange();
      console.error('WebSocket 错误:', error);
    };
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`WebSocket 将在 ${delay}ms 后重连 (第 ${this.reconnectAttempts} 次)`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('WebSocket 重连次数已达上限');
    }
  }

  /**
   * 订阅事件
   */
  subscribe(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: { type: string; data: unknown }): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('WebSocket 消息处理失败:', error);
        }
      });
    }
  }

  /**
   * 发送消息
   */
  send(type: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket 未连接，消息发送失败');
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 监听状态变化
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.notifyStatusChange();
  }
}

/**
 * WebSocket 客户端单例
 */
export const wsClient = new WebSocketClient();
