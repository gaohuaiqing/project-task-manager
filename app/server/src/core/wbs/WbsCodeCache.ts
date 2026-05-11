/**
 * WBS 编码缓存服务
 *
 * 缓存策略：
 * - 缓存粒度：按项目缓存（WBS编码是项目级别的，不依赖用户）
 * - 缓存键：wbs_code_cache:project:{project_id}
 * - 失效条件：项目内任务增删改操作
 *
 * 性能优化：
 * - 使用项目级缓存，避免用户级缓存重复
 * - 支持延迟重建，减少计算开销
 */

import { RedisCache } from '../cache/redis';
import { MemoryCache } from '../cache/memory';
import type { WbsCodeResult } from './WbsCodeService';

/** 缓存键前缀 */
const CACHE_PREFIX = 'wbs_code_cache';
const PROJECT_PREFIX = 'project';

/** 缓存 TTL（秒） */
const CACHE_TTL = 3600; // 1 小时

/** 缓存条目 */
interface CacheEntry {
  codeMap: Record<string, string>;
  idMap: Record<string, string>;
  computedAt: number;
  version: number; // 版本号，用于检测缓存是否过期
}

/** 项目缓存状态 */
interface ProjectCacheStatus {
  valid: boolean;
  version: number;
  lastAccess: number;
}

export class WbsCodeCache {
  private cache: RedisCache | MemoryCache;
  private connected = false;
  // 内存中的项目缓存状态（用于快速判断缓存是否有效）
  private projectStatus = new Map<string, ProjectCacheStatus>();
  // 当前缓存版本（每次任务变更递增）
  private globalVersion = Date.now();

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
   * 生成项目缓存键
   */
  private getProjectCacheKey(projectId: string): string {
    return `${CACHE_PREFIX}:${PROJECT_PREFIX}:${projectId}`;
  }

  /**
   * 获取项目的WBS编码缓存
   */
  async getProjectCache(projectId: string): Promise<WbsCodeResult | null> {
    const key = this.getProjectCacheKey(projectId);
    const entry = await this.cache.get<CacheEntry>(key);

    if (!entry) {
      this.projectStatus.delete(projectId);
      return null;
    }

    // 检查版本是否匹配
    const status = this.projectStatus.get(projectId);
    if (status && status.version !== entry.version) {
      // 版本不匹配，缓存已失效
      await this.cache.delete(key);
      this.projectStatus.delete(projectId);
      return null;
    }

    // 更新访问时间
    this.projectStatus.set(projectId, {
      valid: true,
      version: entry.version,
      lastAccess: Date.now(),
    });

    return {
      codeMap: new Map(Object.entries(entry.codeMap)),
      idMap: new Map(Object.entries(entry.idMap)),
    };
  }

  /**
   * 设置项目缓存
   */
  async setProjectCache(projectId: string, result: WbsCodeResult): Promise<void> {
    const key = this.getProjectCacheKey(projectId);
    const version = this.globalVersion;

    const entry: CacheEntry = {
      codeMap: Object.fromEntries(result.codeMap),
      idMap: Object.fromEntries(result.idMap),
      computedAt: Date.now(),
      version,
    };

    await this.cache.set(key, entry, CACHE_TTL);

    // 更新内存状态
    this.projectStatus.set(projectId, {
      valid: true,
      version,
      lastAccess: Date.now(),
    });
  }

  /**
   * 使项目缓存失效（标记为需要重建）
   */
  async invalidateProject(projectId: string): Promise<void> {
    // 递增全局版本号
    this.globalVersion = Date.now();

    // 标记内存状态为无效
    this.projectStatus.set(projectId, {
      valid: false,
      version: this.globalVersion,
      lastAccess: Date.now(),
    });

    // 删除缓存
    const key = this.getProjectCacheKey(projectId);
    await this.cache.delete(key);
  }

  /**
   * 批量使多个项目缓存失效
   */
  async invalidateProjects(projectIds: string[]): Promise<void> {
    // 递增全局版本号
    this.globalVersion = Date.now();

    // 批量标记无效
    for (const projectId of projectIds) {
      this.projectStatus.set(projectId, {
        valid: false,
        version: this.globalVersion,
        lastAccess: Date.now(),
      });

      const key = this.getProjectCacheKey(projectId);
      await this.cache.delete(key);
    }
  }

  // ========== 兼容旧接口 ==========

  /**
   * 生成缓存键（兼容旧接口）
   * @deprecated 使用 getProjectCache 代替
   */
  private getCacheKey(userId: number, projectId: string): string {
    return `${CACHE_PREFIX}:${userId}:${projectId}`;
  }

  /**
   * 获取缓存的编码结果（兼容旧接口）
   * @deprecated 使用 getProjectCache 代替
   */
  async get(userId: number, projectId: string): Promise<WbsCodeResult | null> {
    // 如果是 'global'，返回 null 强制重新计算
    if (projectId === 'global') {
      return null;
    }
    return this.getProjectCache(projectId);
  }

  /**
   * 设置缓存（兼容旧接口）
   * @deprecated 使用 setProjectCache 代替
   */
  async set(userId: number, projectId: string, result: WbsCodeResult): Promise<void> {
    if (projectId !== 'global') {
      await this.setProjectCache(projectId, result);
    }
  }

  /**
   * 删除指定用户项目的缓存
   * @deprecated 使用 invalidateProject 代替
   */
  async delete(userId: number, projectId: string): Promise<void> {
    // 兼容旧接口：删除 'global' 时忽略
    if (projectId === 'global') {
      return;
    }
    await this.invalidateProject(projectId);
  }

  /**
   * 删除项目的所有用户缓存
   */
  async deleteProjectCache(projectId: string): Promise<void> {
    await this.invalidateProject(projectId);
  }

  /**
   * 删除用户的所有项目缓存
   * @deprecated 不再需要，保留兼容性
   */
  async deleteUserCache(userId: number): Promise<void> {
    // 不再需要，因为缓存不再按用户区分
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    const pattern = `${CACHE_PREFIX}:*`;
    await this.cache.deletePattern(pattern);
    this.projectStatus.clear();
    this.globalVersion = Date.now();
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { projectCount: number; globalVersion: number } {
    return {
      projectCount: this.projectStatus.size,
      globalVersion: this.globalVersion,
    };
  }
}

// 单例导出
export const wbsCodeCache = new WbsCodeCache();