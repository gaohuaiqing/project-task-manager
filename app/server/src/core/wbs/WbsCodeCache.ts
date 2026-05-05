/**
 * WBS 编码缓存服务
 *
 * 缓存策略：
 * - 缓存粒度：按用户+项目缓存
 * - 缓存键：wbs_code_cache:{user_id}:{project_id}
 * - 失效条件：任务增删改操作、权限变更事件
 */

import { RedisCache } from '../cache/redis';
import { MemoryCache } from '../cache/memory';
import type { WbsCodeResult } from './WbsCodeService';

/** 缓存键前缀 */
const CACHE_PREFIX = 'wbs_code_cache';

/** 缓存 TTL（秒） */
const CACHE_TTL = 3600; // 1 小时

/** 缓存条目 */
interface CacheEntry {
  codeMap: Record<string, string>;
  idMap: Record<string, string>;
  computedAt: number;
}

export class WbsCodeCache {
  private cache: RedisCache | MemoryCache;
  private connected = false;

  constructor() {
    // 默认使用内存缓存
    this.cache = new MemoryCache();
  }

  /**
   * 连接 Redis（如果可用）
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    const redisCache = new RedisCache();
    try {
      await redisCache.connect();
      this.cache = redisCache;
      this.connected = true;
      console.log('✅ WBS code cache connected to Redis');
    } catch {
      console.warn('⚠️ Redis unavailable, using memory cache for WBS codes');
    }
  }

  /**
   * 生成缓存键
   * @param userId 用户 ID
   * @param projectId 项目 ID
   * @returns 缓存键
   */
  private getCacheKey(userId: number, projectId: string): string {
    return `${CACHE_PREFIX}:${userId}:${projectId}`;
  }

  /**
   * 获取缓存的编码结果
   * @param userId 用户 ID
   * @param projectId 项目 ID
   * @returns 缓存结果或 null
   */
  async get(userId: number, projectId: string): Promise<WbsCodeResult | null> {
    const key = this.getCacheKey(userId, projectId);
    const entry = await this.cache.get<CacheEntry>(key);

    if (!entry) return null;

    return {
      codeMap: new Map(Object.entries(entry.codeMap)),
      idMap: new Map(Object.entries(entry.idMap)),
    };
  }

  /**
   * 设置缓存
   * @param userId 用户 ID
   * @param projectId 项目 ID
   * @param result 编码计算结果
   */
  async set(userId: number, projectId: string, result: WbsCodeResult): Promise<void> {
    const key = this.getCacheKey(userId, projectId);

    const entry: CacheEntry = {
      codeMap: Object.fromEntries(result.codeMap),
      idMap: Object.fromEntries(result.idMap),
      computedAt: Date.now(),
    };

    await this.cache.set(key, entry, CACHE_TTL);
  }

  /**
   * 删除指定用户项目的缓存
   * @param userId 用户 ID
   * @param projectId 项目 ID
   */
  async delete(userId: number, projectId: string): Promise<void> {
    const key = this.getCacheKey(userId, projectId);
    await this.cache.delete(key);
  }

  /**
   * 删除项目的所有用户缓存
   * @param projectId 项目 ID
   */
  async deleteProjectCache(projectId: string): Promise<void> {
    const pattern = `${CACHE_PREFIX}:*:${projectId}`;
    await this.cache.deletePattern(pattern);
  }

  /**
   * 删除用户的所有项目缓存
   * @param userId 用户 ID
   */
  async deleteUserCache(userId: number): Promise<void> {
    const pattern = `${CACHE_PREFIX}:${userId}:*`;
    await this.cache.deletePattern(pattern);
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const pattern = `${CACHE_PREFIX}:*`;
    await this.cache.deletePattern(pattern);
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// 单例导出
export const wbsCodeCache = new WbsCodeCache();