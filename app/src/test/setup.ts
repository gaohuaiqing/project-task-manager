import { expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// 模拟 localStorage
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => null,
  removeItem: (key: string) => null,
  clear: () => null,
  length: 0,
  key: (index: number) => null,
};

global.localStorage = localStorageMock as Storage;

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => null,
  removeItem: (key: string) => null,
  clear: () => null,
  length: 0,
  key: (index: number) => null,
};

global.sessionStorage = sessionStorageMock as Storage;

// 模拟 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// 模拟 WebSocket
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
  private sendTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
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

  getSentMessages(): string[] {
    return [...this.messageQueue];
  }

  clearSentMessages(): void {
    this.messageQueue = [];
  }
}

global.WebSocket = MockWebSocket as any;

// 模拟 BroadcastChannel
class MockBroadcastChannel {
  name: string;
  private listeners: Set<(message: unknown) => void> = new Set();
  private static channels: Map<string, MockBroadcastChannel> = new Map();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.channels.set(name, this);
  }

  postMessage(message: unknown): void {
    // 广播到所有同名频道的监听器
    MockBroadcastChannel.channels.forEach((channel) => {
      if (channel.name === this.name) {
        channel.listeners.forEach((listener) => {
          try {
            listener(message);
          } catch (error) {
            console.error('BroadcastChannel listener error:', error);
          }
        });
      }
    });
  }

  addEventListener(event: string, listener: (message: unknown) => void): void {
    if (event === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(event: string, listener: (message: unknown) => void): void {
    if (event === 'message') {
      this.listeners.delete(listener);
    }
  }

  close(): void {
    this.listeners.clear();
    MockBroadcastChannel.channels.delete(this.name);
  }

  static resetAll(): void {
    MockBroadcastChannel.channels.clear();
  }
}

global.BroadcastChannel = MockBroadcastChannel as any;

// 模拟 fetch
global.fetch = vi.fn();

// 模拟 IntersectionObserver
class MockIntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  callback: IntersectionObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    if (options) {
      this.root = options.root || null;
      this.rootMargin = options.rootMargin || '';
      this.thresholds = Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold ?? 0];
    }
  }

  observe(element: Element): void {
    this.elements.add(element);
    // 立即触发一次回调，模拟元素可见
    setTimeout(() => {
      this.callback(
        [
          {
            target: element,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: element.getBoundingClientRect(),
            intersectionRect: element.getBoundingClientRect(),
            rootBounds: this.root?.getBoundingClientRect() || null,
            time: Date.now(),
          },
        ],
        this
      );
    }, 0);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;

// 模拟 ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element): void {
    this.elements.add(element);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }
}

global.ResizeObserver = MockResizeObserver as any;

// 模拟 requestIdleCallback
global.requestIdleCallback = (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
};

global.cancelIdleCallback = (id: number) => {
  clearTimeout(id);
};

// 测试工具函数
export const createMockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    getAll: () => ({ ...store }),
  };
};

export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockConsole = () => {
  const originalConsole = { ...global.console };
  beforeEach(() => {
    global.console = {
      ...originalConsole,
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };
  });
  afterEach(() => {
    global.console = originalConsole;
  });
};

console.log('✅ 测试环境已初始化');
