/**
 * WebSocket 服务
 * 提供实时通信功能
 */

type MessageHandler = (data: unknown) => void;

class WebSocketServiceClass {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WebSocket] 连接成功');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message.type, message.data);
        } catch {
          // 忽略解析错误
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] 连接关闭');
        this.attemptReconnect(url);
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] 错误:', error);
      };
    } catch (error) {
      console.error('[WebSocket] 连接失败:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(url), 3000);
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: MessageHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: event, data }));
    }
  }

  private handleMessage(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketServiceClass();
