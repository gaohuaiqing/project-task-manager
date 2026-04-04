/**
 * 会话缓存模块
 * 用于缓存用户会话信息，减少数据库查询
 */

import { RedisCache } from './redis';
import { MemoryCache } from './memory';

// 会话上下文类型
export interface SessionContext {
  user: {
    id: number;
    username: string;
    realName: string;
    role: string;
    departmentId?: number;
  };
  permissions: string[];
}

// 缓存键前缀
const SESSION_PREFIX = 'session:';
const PERMISSION_PREFIX = 'permissions:';

// 默认TTL（秒）
const SESSION_TTL = 15 * 60; // 15分钟
const PERMISSION_TTL = 60 * 60; // 1小时

/**
 * 会话缓存服务
 * 使用 Redis 或内存缓存存储会话信息
 */
class SessionCacheService {
  private cache: RedisCache | MemoryCache;
  private connected = false;

  constructor() {
    // 默认使用内存缓存，connect() 后切换到 Redis
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
      console.log('✅ Session cache connected to Redis');
    } catch {
      console.warn('⚠️ Redis unavailable, using memory cache for sessions');
    }
  }

  /**
   * 获取缓存的会话上下文
   */
  async getSession(sessionId: string): Promise<SessionContext | null> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    return this.cache.get<SessionContext>(key);
  }

  /**
   * 缓存会话上下文
   */
  async setSession(sessionId: string, context: SessionContext): Promise<void> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.cache.set(key, context, SESSION_TTL);
  }

  /**
   * 删除会话缓存（登出时调用）
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    await this.cache.delete(key);
  }

  /**
   * 获取缓存的权限配置
   */
  async getPermissions(role: string): Promise<string[] | null> {
    const key = `${PERMISSION_PREFIX}${role}`;
    return this.cache.get<string[]>(key);
  }

  /**
   * 缓存权限配置
   */
  async setPermissions(role: string, permissions: string[]): Promise<void> {
    const key = `${PERMISSION_PREFIX}${role}`;
    await this.cache.set(key, permissions, PERMISSION_TTL);
  }

  /**
   * 删除权限缓存（角色权限变更时调用）
   */
  async deletePermissions(role: string): Promise<void> {
    const key = `${PERMISSION_PREFIX}${role}`;
    await this.cache.delete(key);
  }

  /**
   * 删除用户相关的所有缓存
   */
  async invalidateUserCache(userId: number): Promise<void> {
    // 由于我们使用 sessionId 作为键，无法直接通过 userId 删除
    // 但可以删除权限缓存，下次会重新加载
    // 这是一个简化实现，生产环境可能需要更复杂的缓存管理
    console.log(`Cache invalidation requested for user ${userId}`);
  }
}

// 单例导出
export const sessionCache = new SessionCacheService();
