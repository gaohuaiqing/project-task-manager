/**
 * 请求去重和合并工具
 *
 * 功能：
 * 1. 防止短时间内重复请求
 * 2. 合并相同的并发请求
 * 3. 请求失败时自动重试
 * 4. 请求缓存管理
 *
 * @module utils/RequestDeduplication
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  refCount: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class RequestDeduplication {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeout: number;
  private readonly requestTimeout: number;
  private readonly maxCacheSize: number;

  constructor(options: {
    cacheTimeout?: number;      // 缓存过期时间（毫秒）
    requestTimeout?: number;    // 请求超时时间（毫秒）
    maxCacheSize?: number;      // 最大缓存条目数
  } = {}) {
    this.cacheTimeout = options.cacheTimeout || 5000; // 默认 5 秒
    this.requestTimeout = options.requestTimeout || 30000; // 默认 30 秒
    this.maxCacheSize = options.maxCacheSize || 100;

    // 定期清理过期缓存
    setInterval(() => this.cleanExpiredCache(), 10000);
  }

  /**
   * 执行去重请求
   * 如果有相同的请求正在进行，返回相同的 Promise
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      cache?: boolean;         // 是否缓存结果
      retry?: number;          // 失败重试次数
      retryDelay?: number;     // 重试延迟
    } = {}
  ): Promise<T> {
    const { cache = true, retry = 0, retryDelay = 1000 } = options;

    // 检查缓存
    if (cache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`[RequestDeduplication] 🎯 缓存命中: ${key}`);
        return cached.data as T;
      }
    }

    // 检查是否有相同的请求正在进行
    const pending = this.pendingRequests.get(key);
    if (pending && Date.now() - pending.timestamp < this.requestTimeout) {
      console.log(`[RequestDeduplication] 🔄 请求合并: ${key}`);
      pending.refCount++;
      return pending.promise as Promise<T>;
    }

    // 执行新请求
    console.log(`[RequestDeduplication] 🚀 新请求: ${key}`);

    const promise = this.executeWithRetry(fetcher, retry, retryDelay)
      .then(data => {
        // 缓存成功结果
        if (cache && data) {
          this.setCache(key, data);
        }

        // 清理待处理请求
        const pending = this.pendingRequests.get(key);
        if (pending && pending.refCount <= 1) {
          this.pendingRequests.delete(key);
        } else if (pending) {
          pending.refCount--;
        }

        return data;
      })
      .catch(error => {
        // 清理失败的请求
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      refCount: 1
    });

    return promise;
  }

  /**
   * 带重试的请求执行
   */
  private async executeWithRetry<T>(
    fetcher: () => Promise<T>,
    retry: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retry; i++) {
      try {
        return await fetcher();
      } catch (error: any) {
        lastError = error;
        if (i < retry) {
          console.warn(`[RequestDeduplication] ⚠️ 请求失败，${retryDelay}ms 后重试 (${i + 1}/${retry})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 设置缓存
   */
  setCache(key: string, data: any): void {
    // 限制缓存大小，使用 LRU 策略
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
      return entry.data as T;
    }
    return null;
  }

  /**
   * 清除指定缓存
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedRequests: this.cache.size,
      maxCacheSize: this.maxCacheSize
    };
  }
}

// 创建全局单例
export const requestDedup = new RequestDeduplication({
  cacheTimeout: 5000,      // 5 秒缓存
  requestTimeout: 30000,   // 30 秒超时
  maxCacheSize: 100        // 最多 100 个缓存
});

/**
 * 防抖函数
 * 确保函数在指定时间内只执行一次
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * 确保函数在指定时间内最多执行一次
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
