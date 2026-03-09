/**
 * 查询缓存管理器 - 单层 LRU 内存缓存
 *
 * 缓存策略：
 * - Cache-Aside：先查缓存，未命中则查数据库
 * - Write-Through：写操作时同步更新缓存
 * - 缓存穿透保护：空值缓存
 * - LRU 淘汰：自动淘汰最少使用的条目
 *
 * @author AI Assistant
 * @since 2025-03-04
 * @updated 2026-03-10 - 简化架构，移除 Redis 层
 */

import { LRUCacheWithTTL, cacheCleanupManager } from '../utils/LRUCache.js';
import crypto from 'crypto';

// ================================================================
// 类型定义
// ================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: number;
  metadata?: {
    queryHash: string;
    hitCount: number;
    lastAccess: number;
  };
}

interface CacheConfig {
  memoryTTL: number;     // 内存缓存时间（毫秒）
  memorySize: number;    // 内存缓存最大条目数
  enableNullCache: boolean; // 是否缓存空值（防止穿透）
}

interface QueryStats {
  hits: number;
  misses: number;
  nullHits: number;
  hitRate: number;
  avgLatency: number;
}

// ================================================================
// 缓存配置
// ================================================================

const DEFAULT_CACHE_CONFIG: Record<string, CacheConfig> = {
  // 项目列表缓存
  projects_list: {
    memoryTTL: 60000,    // 1 分钟
    memorySize: 1000,
    enableNullCache: true
  },
  // 项目详情缓存
  projects_detail: {
    memoryTTL: 300000,   // 5 分钟
    memorySize: 500,
    enableNullCache: true
  },
  // 成员列表缓存
  members_list: {
    memoryTTL: 120000,   // 2 分钟
    memorySize: 500,
    enableNullCache: true
  },
  // 成员详情缓存
  members_detail: {
    memoryTTL: 600000,   // 10 分钟
    memorySize: 200,
    enableNullCache: true
  },
  // WBS 任务列表缓存
  wbs_tasks_list: {
    memoryTTL: 30000,    // 30 秒
    memorySize: 2000,
    enableNullCache: true
  },
  // WBS 任务详情缓存
  wbs_tasks_detail: {
    memoryTTL: 180000,   // 3 分钟
    memorySize: 1000,
    enableNullCache: true
  }
};

// ================================================================
// 查询缓存管理器
// ================================================================

class QueryCacheManager {
  // LRU 内存缓存（按缓存类型分组）
  private memoryCaches: Map<string, LRUCacheWithTTL<string, any>>;
  // 查询统计
  private stats: Map<string, QueryStats>;
  // 空值标记
  private NULL_MARKER = '__NULL__';

  constructor() {
    this.memoryCaches = new Map();
    this.stats = new Map();

    // 初始化内存缓存
    this.initializeMemoryCaches();

    // 注册定期清理任务
    this.registerCleanupTasks();

    console.log('[QueryCacheManager] 查询缓存管理器已初始化（单层 LRU 缓存）');
  }

  // ================================================================
  // 初始化
  // ================================================================

  /**
   * 初始化内存缓存
   */
  private initializeMemoryCaches(): void {
    for (const [cacheType, config] of Object.entries(DEFAULT_CACHE_CONFIG)) {
      this.memoryCaches.set(
        cacheType,
        new LRUCacheWithTTL<string, any>(config.memorySize, config.memoryTTL)
      );

      // 初始化统计
      this.stats.set(cacheType, {
        hits: 0,
        misses: 0,
        nullHits: 0,
        hitRate: 0,
        avgLatency: 0
      });
    }
  }

  /**
   * 注册定期清理任务
   */
  private registerCleanupTasks(): void {
    // 每 5 分钟清理一次过期条目
    setInterval(() => {
      for (const [cacheType, cache] of this.memoryCaches.entries()) {
        const cleaned = cache.cleanup();
        if (cleaned > 0) {
          console.log(`[QueryCacheManager] ${cacheType}: 清理了 ${cleaned} 个过期条目`);
        }
      }
    }, 300000);

    console.log('[QueryCacheManager] 已注册定期清理任务');
  }

  // ================================================================
  // 核心缓存操作
  // ================================================================

  /**
   * 获取缓存数据
   * @param cacheType 缓存类型
   * @param key 缓存键
   * @returns 缓存数据，未命中返回 null
   */
  async get<T>(cacheType: string, key: string): Promise<T | null> {
    const startTime = Date.now();
    const stats = this.stats.get(cacheType);

    // 查询内存缓存
    const memoryCache = this.memoryCaches.get(cacheType);
    if (memoryCache) {
      const memoryData = memoryCache.get(key);

      if (memoryData !== undefined) {
        // 空值检测
        if (memoryData === this.NULL_MARKER) {
          if (stats) stats.nullHits++;
          return null;
        }

        if (stats) stats.hits++;
        this.updateHitRate(cacheType);
        return memoryData as T;
      }
    }

    // 缓存未命中
    if (stats) stats.misses++;
    this.updateHitRate(cacheType);

    const latency = Date.now() - startTime;
    this.updateAvgLatency(cacheType, latency);

    return null;
  }

  /**
   * 设置缓存数据
   * @param cacheType 缓存类型
   * @param key 缓存键
   * @param data 缓存数据
   * @param version 数据版本（可选）
   */
  async set<T>(cacheType: string, key: string, data: T | null, version?: number): Promise<void> {
    const config = DEFAULT_CACHE_CONFIG[cacheType];
    if (!config) {
      console.warn(`[QueryCacheManager] 未知的缓存类型: ${cacheType}`);
      return;
    }

    // 空值处理（防止缓存穿透）
    const valueToCache = data === null && config.enableNullCache
      ? this.NULL_MARKER
      : data;

    // 写入内存缓存
    const memoryCache = this.memoryCaches.get(cacheType);
    if (memoryCache && valueToCache !== undefined) {
      memoryCache.set(key, valueToCache);
    }
  }

  /**
   * 删除缓存数据
   * @param cacheType 缓存类型
   * @param key 缓存键
   */
  async delete(cacheType: string, key: string): Promise<void> {
    // 删除内存缓存
    const memoryCache = this.memoryCaches.get(cacheType);
    memoryCache?.delete(key);
  }

  /**
   * 使失效指定类型的所有缓存
   * @param cacheType 缓存类型
   */
  async invalidateType(cacheType: string): Promise<void> {
    // 清空内存缓存
    const memoryCache = this.memoryCaches.get(cacheType);
    memoryCache?.clear();
  }

  // ================================================================
  // 查询或执行模式
  // ================================================================

  /**
   * 查询缓存或执行数据库查询
   * @param cacheType 缓存类型
   * @param key 缓存键
   * @param queryFn 数据库查询函数
   * @param version 数据版本（可选）
   * @returns 查询结果
   */
  async queryOrExec<T>(
    cacheType: string,
    key: string,
    queryFn: () => Promise<T | null>,
    version?: number
  ): Promise<T | null> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(cacheType, key);
    if (cached !== null || this.isNullCached(cacheType, key)) {
      return cached;
    }

    // 2. 执行数据库查询
    const result = await queryFn();

    // 3. 写入缓存
    await this.set(cacheType, key, result, version);

    return result;
  }

  /**
   * 批量查询或执行
   * @param cacheType 缓存类型
   * @param keys 缓存键数组
   * @param queryFn 批量查询函数（接收未命中的键）
   * @returns 查询结果 Map
   */
  async batchQueryOrExec<T>(
    cacheType: string,
    keys: string[],
    queryFn: (missedKeys: string[]) => Promise<Map<string, T>>
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missedKeys: string[] = [];

    // 1. 批量查询缓存
    for (const key of keys) {
      const cached = await this.get<T>(cacheType, key);
      if (cached !== null) {
        results.set(key, cached);
      } else {
        missedKeys.push(key);
      }
    }

    // 2. 查询未命中的数据
    if (missedKeys.length > 0) {
      const queryResults = await queryFn(missedKeys);

      // 3. 写入缓存
      for (const [key, value] of queryResults.entries()) {
        await this.set(cacheType, key, value);
        results.set(key, value);
      }
    }

    return results;
  }

  // ================================================================
  // 缓存预热
  // ================================================================

  /**
   * 预热缓存（系统启动时调用）
   * @param warmupFn 预热函数
   */
  async warmup(warmupFn: () => Promise<void>): Promise<void> {
    console.log('[QueryCacheManager] 开始缓存预热...');
    const startTime = Date.now();

    try {
      await warmupFn();
      const duration = Date.now() - startTime;
      console.log(`[QueryCacheManager] ✅ 缓存预热完成，耗时 ${duration}ms`);
    } catch (error) {
      console.error('[QueryCacheManager] ❌ 缓存预热失败:', error);
    }
  }

  // ================================================================
  // 工具函数
  // ================================================================

  /**
   * 生成查询哈希键
   * @param params 查询参数
   * @returns 哈希键
   */
  buildKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');

    return this.hashQuery(sorted);
  }

  /**
   * 哈希查询字符串
   * @param query 查询字符串
   * @returns 哈希值
   */
  private hashQuery(query: string): string {
    return crypto.createHash('md5').update(query).digest('hex');
  }

  /**
   * 检查是否为空值缓存
   */
  private isNullCached(cacheType: string, key: string): boolean {
    const memoryCache = this.memoryCaches.get(cacheType);
    const value = memoryCache?.get(key);
    return value === this.NULL_MARKER;
  }

  /**
   * 更新命中率
   */
  private updateHitRate(cacheType: string): void {
    const stats = this.stats.get(cacheType);
    if (!stats) return;

    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  }

  /**
   * 更新平均延迟
   */
  private updateAvgLatency(cacheType: string, latency: number): void {
    const stats = this.stats.get(cacheType);
    if (!stats) return;

    // 简单的移动平均
    stats.avgLatency = (stats.avgLatency * 0.9) + (latency * 0.1);
  }

  // ================================================================
  // 统计与监控
  // ================================================================

  /**
   * 获取缓存统计信息
   * @param cacheType 缓存类型（不传则返回所有）
   * @returns 统计信息
   */
  getStats(cacheType?: string): Map<string, QueryStats> | QueryStats {
    if (cacheType) {
      return this.stats.get(cacheType)!;
    }
    return this.stats;
  }

  /**
   * 获取内存缓存大小
   * @param cacheType 缓存类型
   * @returns 缓存大小
   */
  getCacheSize(cacheType: string): number {
    return this.memoryCaches.get(cacheType)?.getActiveSize() || 0;
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    // 清空内存缓存
    for (const cache of this.memoryCaches.values()) {
      cache.clear();
    }

    // 重置统计
    for (const stats of this.stats.values()) {
      stats.hits = 0;
      stats.misses = 0;
      stats.nullHits = 0;
      stats.hitRate = 0;
      stats.avgLatency = 0;
    }

    console.log('[QueryCacheManager] 已清空所有缓存');
  }

  /**
   * 打印缓存统计报告
   */
  printStatsReport(): void {
    console.log('\n==================== 查询缓存统计 ====================');

    for (const [cacheType, stats] of this.stats.entries()) {
      const memorySize = this.getCacheSize(cacheType);
      console.log(`\n[${cacheType}]`);
      console.log(`  命中率: ${stats.hitRate.toFixed(2)}%`);
      console.log(`  命中/未命中: ${stats.hits}/${stats.misses}`);
      console.log(`  空值命中: ${stats.nullHits}`);
      console.log(`  平均延迟: ${stats.avgLatency.toFixed(2)}ms`);
      console.log(`  内存缓存: ${memorySize} 条`);
    }

    console.log('\n====================================================\n');
  }
}

// ================================================================
// 导出单例
// ================================================================

export const queryCacheManager = new QueryCacheManager();

// 导出类型和配置
export type { CacheConfig, CacheEntry, QueryStats };
export { DEFAULT_CACHE_CONFIG };
