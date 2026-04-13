/**
 * 缓存服务
 * 使用 node-cache 实现内存缓存，优化 CTE 递归查询等耗时操作
 *
 * @module services/CacheService
 */

import NodeCache from 'node-cache';

// 缓存实例配置
const CACHE_CONFIG = {
  // 默认 TTL: 5 分钟
  stdTTL: 300,
  // 检查过期周期: 60 秒
  checkperiod: 60,
  // 删除过期项时触发事件
  deleteOnExpire: true,
  // 使用克隆，避免引用污染
  useClones: true,
  // 最大键数量
  maxKeys: 1000,
};

// 创建缓存实例
const cache = new NodeCache(CACHE_CONFIG);

// 缓存键前缀
const KEY_PREFIXES = {
  CTE: 'cte:',
  STATS: 'stats:',
  TREND: 'trend:',
  DASHBOARD: 'dashboard:',
};

// TTL 配置（秒）
const TTL_CONFIG = {
  // CTE 递归查询：5 分钟
  CTE: 300,
  // 统计数据：5 分钟
  STATS: 300,
  // 趋势数据：10 分钟
  TREND: 600,
  // 仪表板数据：5 分钟
  DASHBOARD: 300,
};

/**
 * 缓存服务类
 */
export class CacheService {
  /**
   * 获取缓存值
   */
  static get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  }

  /**
   * 设置缓存值
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    return cache.set(key, value, ttl ?? CACHE_CONFIG.stdTTL);
  }

  /**
   * 删除缓存值
   */
  static del(key: string | string[]): number {
    return cache.del(key);
  }

  /**
   * 清空所有缓存
   */
  static flush(): void {
    cache.flushAll();
  }

  /**
   * 获取缓存统计
   */
  static getStats(): NodeCache.Stats {
    return cache.getStats();
  }

  /**
   * CTE 查询缓存键生成器
   */
  static cteKey(type: string, userId: number | string, params?: object): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${KEY_PREFIXES.CTE}${type}:${userId}:${paramStr}`;
  }

  /**
   * 统计数据缓存键生成器
   */
  static statsKey(type: string, userId: number | string): string {
    return `${KEY_PREFIXES.STATS}${type}:${userId}`;
  }

  /**
   * 趋势数据缓存键生成器
   */
  static trendKey(type: string, userId: number | string, days: number): string {
    return `${KEY_PREFIXES.TREND}${type}:${userId}:${days}`;
  }

  /**
   * 仪表板缓存键生成器
   */
  static dashboardKey(role: string, userId: number | string, projectId?: string): string {
    return `${KEY_PREFIXES.DASHBOARD}${role}:${userId}:${projectId || 'all'}`;
  }

  /**
   * 获取或设置缓存（常用模式）
   * 如果缓存不存在，执行 fetcher 获取数据并缓存
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    cache.set(key, value, ttl ?? CACHE_CONFIG.stdTTL);
    return value;
  }

  /**
   * 使特定模式的缓存失效
   */
  static invalidatePattern(pattern: string): void {
    const keys = cache.keys().filter(k => k.startsWith(pattern));
    if (keys.length > 0) {
      cache.del(keys);
    }
  }

  /**
   * 使特定用户的所有缓存失效
   */
  static invalidateUser(userId: number | string): void {
    const userStr = String(userId);
    const keys = cache.keys().filter(k => k.includes(`:${userStr}:`) || k.endsWith(`:${userStr}`));
    if (keys.length > 0) {
      cache.del(keys);
    }
  }

  /**
   * 使特定项目的缓存失效
   */
  static invalidateProject(projectId: string): void {
    const keys = cache.keys().filter(k => k.includes(projectId));
    if (keys.length > 0) {
      cache.del(keys);
    }
  }
}

// TTL 常量导出
export const CACHE_TTL = TTL_CONFIG;

// 默认导出
export default CacheService;
