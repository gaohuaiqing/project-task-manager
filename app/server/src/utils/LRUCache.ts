/**
 * LRU (Least Recently Used) Cache 实现
 * 用于防止内存泄漏，自动淘汰最久未使用的数据
 *
 * @template K 键类型
 * @template V 值类型
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  /**
   * @param maxSize 最大缓存条目数，默认1000
   */
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * 获取操作会将该条目移到最近使用位置
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // 删除并重新插入，将该条目移到Map末尾（最近使用）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * 设置缓存值
   * 如果超过最大容量，删除最久未使用的条目
   */
  set(key: K, value: V): void {
    // 如果键已存在，先删除（稍后重新插入到末尾）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果超过最大容量，删除最久未使用的条目（Map第一个条目）
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * 检查键是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除指定键
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * 获取所有条目
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * 检查缓存是否已满
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  /**
   * 获取缓存使用率
   */
  getUsageRate(): number {
    return this.cache.size / this.maxSize;
  }

  /**
   * 批量删除符合条件的条目
   */
  deleteIf(predicate: (key: K, value: V) => boolean): number {
    let count = 0;
    for (const [key, value] of this.cache.entries()) {
      if (predicate(key, value)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 清理过期的条目（需要配合时间戳使用）
   */
  cleanupExpired(getExpiry: (value: V) => number): number {
    const now = Date.now();
    return this.deleteIf((_, value) => {
      const expiry = getExpiry(value);
      return expiry < now;
    });
  }
}

/**
 * 带TTL的LRU Cache
 * 条目有过期时间，过期后自动失效
 */
export class LRUCacheWithTTL<K, V> {
  private cache: LRUCache<K, { value: V; expiry: number }>;
  private defaultTTL: number;

  /**
   * @param maxSize 最大缓存条目数
   * @param defaultTTL 默认过期时间（毫秒）
   */
  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    this.cache = new LRUCache(maxSize);
    this.defaultTTL = defaultTTL;
  }

  /**
   * 获取缓存值（自动检查过期）
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    // 检查是否过期
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * 设置缓存值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（毫秒），不传则使用默认TTL
   */
  set(key: K, value: V, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * 检查键是否存在（自动检查过期）
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除指定键
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小（包含已过期但未清理的条目）
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 清理所有过期条目
   */
  cleanup(): number {
    return this.cache.cleanupExpired(item => item.expiry);
  }

  /**
   * 获取实际有效条目数
   */
  getActiveSize(): number {
    let count = 0;
    for (const [key] of this.cache.entries()) {
      if (this.has(key)) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取缓存使用率（基于有效条目）
   */
  getUsageRate(): number {
    return this.getActiveSize() / (this.cache as any).maxSize;
  }

  /**
   * 获取所有键
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值
   */
  values(): IterableIterator<V> {
    const values: V[] = [];
    for (const [key] of this.cache.entries()) {
      const value = this.get(key);
      if (value !== undefined) {
        values.push(value);
      }
    }
    return values[Symbol.iterator]() as IterableIterator<V>;
  }
}

/**
 * 定期清理过期条目的定时器管理器
 */
export class CacheCleanupManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 注册定期清理任务
   * @param name 任务名称（唯一标识）
   * @param cache 要清理的缓存
   * @param interval 清理间隔（毫秒）
   */
  registerCleanup(
    name: string,
    cache: LRUCacheWithTTL<any, any>,
    interval: number = 60000
  ): void {
    // 如果已存在，先清除
    this.unregisterCleanup(name);

    const timer = setInterval(() => {
      const cleaned = cache.cleanup();
      if (cleaned > 0) {
        console.log(`[CacheCleanup] ${name}: 清理了 ${cleaned} 个过期条目`);
      }
    }, interval);

    this.timers.set(name, timer);
    console.log(`[CacheCleanup] ${name}: 已注册定期清理任务，间隔 ${interval}ms`);
  }

  /**
   * 取消清理任务
   */
  unregisterCleanup(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
      console.log(`[CacheCleanup] ${name}: 已取消清理任务`);
    }
  }

  /**
   * 清除所有清理任务
   */
  clearAll(): void {
    for (const [name, timer] of this.timers.entries()) {
      clearInterval(timer);
      console.log(`[CacheCleanup] ${name}: 已取消清理任务`);
    }
    this.timers.clear();
  }
}

// 导出全局清理管理器实例
export const cacheCleanupManager = new CacheCleanupManager();
