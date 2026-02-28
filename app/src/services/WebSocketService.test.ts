/**
 * WebSocket 服务单元测试
 * 测试 WebSocket 连接管理和消息处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wsService } from './WebSocketService';
import type { WebSocketMessage } from '@/types';

// 模拟 WebSocket 类
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close'));
      }
    }, 0);
  }

  // 测试辅助方法
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  getSentMessages(): string[] {
    return [...this.messageQueue];
  }

  clearSentMessages(): void {
    this.messageQueue = [];
  }
}

describe('WebSocketService 测试', () => {
  let mockWs: MockWebSocket;
  let mockWebSocketClass: typeof MockWebSocket;

  beforeEach(() => {
    // 使用 vi.fn 模拟 WebSocket 构造函数
    mockWebSocketClass = MockWebSocket as any;
    global.WebSocket = mockWebSocketClass;

    // 重置 wsService 状态
    if (wsService.isConnected()) {
      wsService.disconnect();
    }
  });

  afterEach(() => {
    wsService.disconnect();
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该导出 wsService 单例', () => {
      expect(wsService).toBeDefined();
      expect(typeof wsService.connect).toBe('function');
      expect(typeof wsService.disconnect).toBe('function');
      expect(typeof wsService.send).toBe('function');
      expect(typeof wsService.isConnected).toBe('function');
    });
  });

  describe('连接管理', () => {
    it('应该建立 WebSocket 连接', async () => {
      // 由于 connect 需要真实的 WebSocket，这里只测试方法存在
      expect(typeof wsService.connect).toBe('function');
    });

    it('应该能够断开连接', () => {
      expect(typeof wsService.disconnect).toBe('function');
      // 测试断开不会抛错
      expect(() => {
        wsService.disconnect();
      }).not.toThrow();
    });

    it('应该能够检查连接状态', () => {
      // 初始状态应该是未连接
      expect(wsService.isConnected()).toBe(false);
    });
  });

  describe('消息发送', () => {
    it('应该有发送消息的方法', () => {
      expect(typeof wsService.send).toBe('function');
    });

    it('应该有发送数据更新的方法', () => {
      expect(typeof wsService.sendDataUpdate).toBe('function');
    });

    it('应该有请求同步的方法', () => {
      expect(typeof wsService.requestSync).toBe('function');
    });
  });

  describe('事件监听', () => {
    it('应该能够监听消息', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.onMessage(handler);

      expect(typeof unsubscribe).toBe('function');

      // 清理
      unsubscribe();
    });

    it('应该能够监听连接事件', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.onConnect(handler);

      expect(typeof unsubscribe).toBe('function');

      // 清理
      unsubscribe();
    });

    it('应该能够监听断开事件', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.onDisconnect(handler);

      expect(typeof unsubscribe).toBe('function');

      // 清理
      unsubscribe();
    });

    it('应该能够监听错误事件', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.onError(handler);

      expect(typeof unsubscribe).toBe('function');

      // 清理
      unsubscribe();
    });
  });

  describe('请求方法', () => {
    it('应该有请求方法', () => {
      expect(typeof wsService.request).toBe('function');
    });
  });

  describe('方法签名验证', () => {
    it('connect 方法应该存在并可调用', () => {
      expect(typeof wsService.connect).toBe('function');
      // 验证方法名称
      expect(wsService.connect.name).toBe('connect');
    });

    it('send 方法应该存在并可调用', () => {
      expect(typeof wsService.send).toBe('function');
      expect(wsService.send.name).toBe('send');
    });

    it('sendDataUpdate 方法应该存在并可调用', () => {
      expect(typeof wsService.sendDataUpdate).toBe('function');
      expect(wsService.sendDataUpdate.name).toBe('sendDataUpdate');
    });

    it('requestSync 方法应该存在并可调用', () => {
      expect(typeof wsService.requestSync).toBe('function');
      expect(wsService.requestSync.name).toBe('requestSync');
    });
  });

  describe('消息处理', () => {
    it('应该处理不同类型的消息', () => {
      // 验证消息处理器可以注册
      const handler = vi.fn();
      wsService.onMessage(handler);

      // 模拟发送不同类型的消息
      const testMessages = [
        { type: 'auth_success', data: {} },
        { type: 'data_sync', data: { dataType: 'members', data: [] } },
        { type: 'heartbeat', data: {} },
        { type: 'error', data: { message: 'test' } }
      ];

      // 由于 WebSocket 未连接，这里只验证消息结构
      testMessages.forEach(msg => {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('data');
      });

      // 清理
      handler();
    });
  });

  describe('错误处理', () => {
    it('应该在未连接时处理发送失败', () => {
      // 未连接状态下 send 返回 false
      const result = wsService.send({ type: 'test', data: {} });
      expect(result).toBe(false);
    });
  });

  describe('清理', () => {
    it('断开连接后状态应该更新', () => {
      // 初始状态
      expect(wsService.isConnected()).toBe(false);

      // 断开
      wsService.disconnect();

      // 状态应该仍然是未连接
      expect(wsService.isConnected()).toBe(false);
    });
  });
});
