/**
 * 统一缓存管理器（带 LRU 淘汰策略）
 *
 * 职责：
 * 1. 统一管理所有 localStorage 缓存
 * 2. 支持 TTL（生存时间）自动过期
 * 3. 支持版本控制，避免读取过期数据
 * 4. 统一键命名规范 (cache:*)
 * 5. 提供缓存统计和清理功能
 * 6. 内存缓存使用 LRU 淘汰策略，防止内存泄漏
 *
 * 使用原则：
 * - localStorage 仅作为缓存层，不是唯一数据源
 * - 真实数据源在后端数据库
 * - 缓存用于提升性能
 */

// ================================================================
// 类型定义
// ================================================================

export interface CacheEntry<T> {
  /** 缓存的数据 */
  data: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 最后访问时间戳（用于 LRU） */
  lastAccessed: number;
  /** 访问次数（用于热度统计） */
  accessCount: number;
  /** 生存时间（毫秒），0 表示永不过期 */
  ttl: number;
  /** 数据版本号 */
  version: number;
  /** 数据指纹（用于快速检测变更） */
  hash?: string;
  /** 估算的内存大小（字节） */
  size: number;
}

export interface CacheStats {
  /** 缓存键数量 */
  count: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 过期缓存数量 */
  expiredCount: number;
  /** 各类型缓存统计 */
  byType: Record<string, number>;
  /** 内存缓存使用率 */
  memoryUsage: number;
  /** LRU 淘汰次数 */
  evictedCount: number;
}

export interface CacheOptions {
  /** 生存时间（毫秒），默认 1 小时 */
  ttl?: number;
  /** 数据版本号 */
  version?: number;
}

// ================================================================
// 常量定义
// ================================================================

/** 缓存键前缀 */
export const CACHE_PREFIX = 'cache:';

/** 默认 TTL（1小时） */
const DEFAULT_TTL = 60 * 60 * 1000;

/** 永不过期的特殊键（设备ID、UI配置等） */
const IMMORTAL_KEYS = new Set([
  'device_id',
  'ui:theme',
  'ui:language',
  'ui:sidebar_collapsed'
]);

/** 内存缓存最大条目数 */
const MAX_MEMORY_CACHE_ENTRIES = 100;

/** 内存缓存最大大小（约 10MB） */
const MAX_MEMORY_CACHE_SIZE = 10 * 1024 * 1024;

// ================================================================
// LRU Cache 实现
// ================================================================

class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;
  private maxSizeBytes: number;
  private currentSize: number = 0;
  private evictedCount: number = 0;

  constructor(maxEntries: number, maxSizeBytes: number) {
    this.maxSize = maxEntries;
    this.maxSizeBytes = maxSizeBytes;
  }

  /**
   * 设置缓存
   */
  set(key: K, value: V, size: number = 0): boolean {
    // 如果键已存在，先删除旧的
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      if (existing && typeof existing === 'object' && 'size' in existing) {
        this.currentSize -= (existing as any).size || 0;
      }
      this.cache.delete(key);
    }

    // 检查是否超过大小限制
    if (this.cache.size >= this.maxSize || this.currentSize + size > this.maxSizeBytes) {
      this.evictLRU(size);
    }

    this.cache.set(key, value);
    this.currentSize += size;
    return true;
  }

  /**
   * 获取缓存
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // LRU: 重新插入到末尾
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 删除缓存
   */
  delete(key: K): boolean {
    const value = this.cache.get(key);
    if (value !== undefined) {
      if (typeof value === 'object' && 'size' in value) {
        this.currentSize -= (value as any).size || 0;
      }
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * LRU 淘汰策略
   */
  private evictLRU(requiredSpace: number = 0): void {
    let freedSpace = 0;
    const targetEntries = Math.max(1, Math.floor(this.maxSize * 0.2)); // 淘汰 20% 的条目

    for (const [key] of this.cache.entries()) {
      if (freedSpace >= requiredSpace && this.cache.size <= this.maxSize - targetEntries) {
        break;
      }

      const value = this.cache.get(key);
      if (value) {
        if (typeof value === 'object' && 'size' in value) {
          freedSpace += (value as any).size || 0;
          this.currentSize -= (value as any).size || 0;
        }
        this.cache.delete(key);
        this.evictedCount++;
      }
    }

    if (this.evictedCount % 10 === 0) { // 每10次淘汰记录一次日志
      console.log(`[LRUCache] 累计淘汰了 ${this.evictedCount} 个条目`);
    }
  }

  /**
   * 获取淘汰次数
   */
  getEvictedCount(): number {
    return this.evictedCount;
  }

  /**
   * 获取当前内存使用量
   */
  getCurrentSize(): number {
    return this.currentSize;
  }
}

// ================================================================
// CacheManager 类
// ================================================================

class CacheManagerClass {
  private memoryCache = new LRUCache<string, CacheEntry<unknown>>(
    MAX_MEMORY_CACHE_ENTRIES,
    MAX_MEMORY_CACHE_SIZE
  );

  // 生命周期管理属性
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed: boolean = false;
  private isInitialized: boolean = false;

  /**
   * 估算数据大小（字节）
   */
  private estimateSize(data: unknown): number {
    if (data === null || data === undefined) {
      return 0;
    }
    const str = JSON.stringify(data);
    return str.length * 2; // 每个字符约 2 字节（UTF-16）
  }

  /**
   * 生成标准化的缓存键
   */
  private normalizeKey(key: string): string {
    if (key.startsWith(CACHE_PREFIX)) {
      return key;
    }
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.ttl === 0) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 生成数据指纹（简单哈希）
   */
  private generateHash(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): boolean {
    try {
      const normalizedKey = this.normalizeKey(key);
      const ttl = options.ttl ?? DEFAULT_TTL;
      const version = options.version ?? 1;
      const hash = this.generateHash(data);
      const size = this.estimateSize(data);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        ttl,
        version,
        hash,
        size
      };

      // 存储到内存缓存（带 LRU）
      this.memoryCache.set(normalizedKey, entry, size);

      // 存储到 localStorage
      localStorage.setItem(normalizedKey, JSON.stringify(entry));

      return true;
    } catch (error) {
      console.error(`[CacheManager] 设置缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    try {
      const normalizedKey = this.normalizeKey(key);

      // 先从内存缓存获取
      const memEntry = this.memoryCache.get(normalizedKey) as CacheEntry<T> | undefined;
      if (memEntry) {
        if (this.isExpired(memEntry)) {
          this.delete(key);
          return null;
        }
        // 更新访问信息
        memEntry.lastAccessed = Date.now();
        memEntry.accessCount++;
        return memEntry.data as T;
      }

      // 从 localStorage 获取
      const stored = localStorage.getItem(normalizedKey);
      if (!stored) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);

      // 检查是否过期
      if (this.isExpired(entry)) {
        this.delete(key);
        return null;
      }

      // 加载到内存缓存
      entry.lastAccessed = Date.now();
      entry.accessCount = 1;
      this.memoryCache.set(normalizedKey, entry, entry.size);

      return entry.data;
    } catch (error) {
      console.error(`[CacheManager] 获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    try {
      const normalizedKey = this.normalizeKey(key);
      this.memoryCache.delete(normalizedKey);
      localStorage.removeItem(normalizedKey);
      return true;
    } catch (error) {
      console.error(`[CacheManager] 删除缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  clear(options?: { skipImmortal?: boolean }): boolean {
    try {
      const keysToDelete: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const shortKey = key.substring(CACHE_PREFIX.length);
          if (options?.skipImmortal && IMMORTAL_KEYS.has(shortKey)) {
            continue;
          }
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        localStorage.removeItem(key);
      });

      this.memoryCache.clear();

      console.log(`[CacheManager] 清空了 ${keysToDelete.length} 个缓存`);
      return true;
    } catch (error) {
      console.error('[CacheManager] 清空缓存失败', error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);

    const memEntry = this.memoryCache.get(normalizedKey);
    if (memEntry) {
      return !this.isExpired(memEntry);
    }

    const stored = localStorage.getItem(normalizedKey);
    if (!stored) {
      return false;
    }

    try {
      const entry: CacheEntry<unknown> = JSON.parse(stored);
      return !this.isExpired(entry);
    } catch {
      return false;
    }
  }

  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, options);
    return data;
  }

  /**
   * 清理过期缓存
   */
  cleanExpired(): number {
    let cleaned = 0;

    // 清理内存缓存
    const memKeys = this.memoryCache.keys();
    for (const key of memKeys) {
      const entry = this.memoryCache.get(key) as CacheEntry<unknown> | undefined;
      if (entry && this.isExpired(entry)) {
        this.delete(key.substring(CACHE_PREFIX.length));
        cleaned++;
      }
    }

    // 清理 localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      try {
        const entry: CacheEntry<unknown> = JSON.parse(localStorage.getItem(key)!);
        if (this.isExpired(entry)) {
          this.delete(key.substring(CACHE_PREFIX.length));
          cleaned++;
        }
      } catch {
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CacheManager] 清理了 ${cleaned} 个过期缓存`);
    }

    return cleaned;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    let count = 0;
    let totalSize = 0;
    let expiredCount = 0;
    const byType: Record<string, number> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      count++;
      const value = localStorage.getItem(key)!;
      totalSize += key.length + value.length;

      const type = key.split(':')[1] || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      try {
        const entry: CacheEntry<unknown> = JSON.parse(value);
        if (this.isExpired(entry)) {
          expiredCount++;
        }
      } catch {
        // 无效数据
      }
    }

    return {
      count,
      totalSize,
      expiredCount,
      byType,
      memoryUsage: this.memoryCache.getCurrentSize(),
      evictedCount: this.memoryCache.getEvictedCount()
    };
  }

  /**
   * 导出所有缓存（用于调试）
   */
  export(): Record<string, CacheEntry<unknown>> {
    const result: Record<string, CacheEntry<unknown>> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CACHE_PREFIX)) continue;

      try {
        result[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        // 跳过无效数据
      }
    }

    return result;
  }

  /**
   * 预热缓存（批量设置）
   */
  warm<T extends Record<string, unknown>>(
    data: T,
    defaultOptions?: CacheOptions
  ): void {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value, defaultOptions);
    });
  }

  /**
   * 获取缓存大小（字节）
   */
  getSize(key: string): number {
    const normalizedKey = this.normalizeKey(key);
    const value = localStorage.getItem(normalizedKey);
    if (!value) return 0;

    return normalizedKey.length + value.length;
  }

  /**
   * 检查是否接近 localStorage 配额限制
   */
  isNearQuota(limit: number = 0.9): boolean {
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const value = localStorage.getItem(key)!;
      totalSize += key.length + value.length;
    }

    const estimatedQuota = 5 * 1024 * 1024; // 5MB
    return totalSize > estimatedQuota * limit;
  }
}

// ================================================================
// 导出单例
// ================================================================

export const CacheManager = new CacheManagerClass();

// ================================================================
// 便捷函数
// ================================================================

export function setCache<T>(key: string, data: T, options?: CacheOptions): boolean {
  return CacheManager.set(key, data, options);
}

export function getCache<T>(key: string): T | null {
  return CacheManager.get<T>(key);
}

export function deleteCache(key: string): boolean {
  return CacheManager.delete(key);
}

export function clearCache(options?: { skipImmortal?: boolean }): boolean {
  return CacheManager.clear(options);
}

export function getOrSetCache<T>(
  key: string,
  factory: () => Promise<T> | T,
  options?: CacheOptions
): Promise<T> {
  return CacheManager.getOrSet(key, factory, options);
}

export function hasCache(key: string): boolean {
  return CacheManager.has(key);
}

export function cleanExpiredCache(): number {
  return CacheManager.cleanExpired();
}

export function getCacheStats(): CacheStats {
  return CacheManager.getStats();
}

// ================================================================
// CacheManager 类扩展（初始化和销毁方法）
// ================================================================

declare module './CacheManager' {
  interface CacheManagerClass {
    init(): void;
    destroy(): Promise<void>;
    isServiceDestroyed(): boolean;
  }
}

CacheManagerClass.prototype.init = function(): void {
  if (this.isDestroyed || this.isInitialized) {
    return;
  }

  this.isInitialized = true;

  // 延迟清理过期缓存
  this.initTimeout = setTimeout(() => {
    if (!this.isDestroyed) {
      const cleaned = this.cleanExpired();
      if (cleaned > 0) {
        console.log(`[CacheManager] 页面加载时清理了 ${cleaned} 个过期缓存`);
      }
    }
  }, 1000);

  // 定期清理过期缓存（每5分钟）
  this.cleanupInterval = setInterval(() => {
    if (!this.isDestroyed) {
      this.cleanExpired();
    }
  }, 5 * 60 * 1000);

  console.log('[CacheManager] 缓存管理器已初始化');
};

CacheManagerClass.prototype.destroy = async function(): Promise<void> {
  if (this.isDestroyed) {
    return;
  }

  this.isDestroyed = true;
  this.isInitialized = false;

  // 清理定时器
  if (this.initTimeout) {
    clearTimeout(this.initTimeout);
    this.initTimeout = null;
  }

  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }

  // 清空内存缓存
  this.memoryCache.clear();

  console.log('[CacheManager] 缓存管理器已销毁');
};

CacheManagerClass.prototype.isServiceDestroyed = function(): boolean {
  return this.isDestroyed;
};

// ================================================================
// 初始化时自动清理过期缓存
// ================================================================

// ❌ 删除自动初始化代码
// 现在由 ServiceManager 统一管理初始化
// if (typeof window !== 'undefined') {
//   CacheManager.init();
// }
