/**
 * Redis 缓存服务 - 高性能分布式缓存
 *
 * 功能：
 * 1. 全局数据缓存（<10ms 读取延迟）
 * 2. 会话状态缓存
 * 3. 在线用户列表缓存
 * 4. 缓存失效策略
 *
 * 环境变量：
 * - REDIS_HOST: Redis 主机（默认：localhost）
 * - REDIS_PORT: Redis 端口（默认：6379）
 * - REDIS_PASSWORD: Redis 密码（可选）
 * - REDIS_DB: Redis 数据库编号（默认：0）
 * - REDIS_ENABLED: 是否启用 Redis（默认：true，设为 false 将降级到内存缓存）
 * - REDIS_OPTIONAL: Redis 是否可选（默认：false，设为 true 时允许降级到内存缓存）
 *
 * 说明：
 * - 生产环境建议启用 Redis 以获得更好的性能
 * - 开发/测试环境可以设置 REDIS_ENABLED=false 降级到内存缓存
 */

import { createClient, RedisClientType } from 'redis';

// ================================================================
// 类型定义
// ================================================================

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  version?: number;
}

interface CacheStats {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  keyCount: number;
  memoryUsage: number;
}

// ================================================================
// Redis 缓存服务类
// ================================================================

class RedisCacheService {
  private client: RedisClientType | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isInitialized: boolean = false;
  private isOptional: boolean = false; // Redis 是否可选（降级模式）
  private memoryCache: Map<string, { data: any; expiry: number }>; // 内存缓存降级方案

  constructor() {
    // 检查 Redis 是否可选（允许降级到内存缓存）
    this.isOptional = process.env.REDIS_OPTIONAL === 'true' || process.env.REDIS_ENABLED === 'false';
    this.memoryCache = new Map();

    if (this.isOptional) {
      console.warn('[RedisCache] Redis 处于可选模式，将降级到内存缓存');
    }
  }

  // ================================================================
  // 连接管理
  // ================================================================

  /**
   * 初始化 Redis 连接
   * 如果 Redis 可选且连接失败，将降级到内存缓存模式
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[RedisCache] Redis 已经初始化，跳过重复初始化');
      return;
    }

    // 如果 Redis 被显式禁用，直接使用内存缓存
    if (process.env.REDIS_ENABLED === 'false') {
      console.log('[RedisCache] Redis 已禁用，使用内存缓存模式');
      this.isInitialized = true;
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          connectTimeout: 3000 // 3 秒连接超时
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB || '0')
      });

      this.client.on('error', (error) => {
        if (this.isInitialized && this.client?.isOpen) {
          console.error('[RedisCache] Redis 运行时错误:', error.message);
          if (this.isOptional) {
            console.warn('[RedisCache] Redis 可选模式，运行时错误将使用内存缓存');
          } else {
            this.handleReconnect();
          }
        }
      });

      this.client.on('connect', () => {
        console.log('[RedisCache] Redis 连接成功');
        this.reconnectAttempts = 0;
      });

      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('连接超时')), 3000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      await this.client.ping();

      this.isInitialized = true;
      console.log('[RedisCache] ✅ Redis 初始化成功');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);

      if (this.isOptional) {
        // Redis 可选模式：降级到内存缓存
        console.warn('[RedisCache] ⚠️ Redis 连接失败，降级到内存缓存模式');
        console.warn('[RedisCache] 错误详情:', errorMsg);
        this.client = null;
        this.isInitialized = true;
        return;
      }

      // Redis 必需模式：抛出错误阻止启动
      console.error('[RedisCache] ❌ Redis 连接失败！');
      console.error('[RedisCache] 错误详情:', errorMsg);
      console.error('[RedisCache] 系统要求必须启用 Redis 缓存服务，无法启动服务器');
      console.error('[RedisCache] 请检查:');
      console.error('  1. Redis 服务是否已启动');
      console.error('  2. Redis 地址配置是否正确 (REDIS_HOST, REDIS_PORT)');
      console.error('  3. Redis 密码是否正确 (REDIS_PASSWORD)');
      console.error('[RedisCache] 提示：设置 REDIS_OPTIONAL=true 可在 Redis 不可用时降级到内存缓存');
      throw new Error(`[RedisCache] Redis 连接失败，系统无法启动: ${errorMsg}`);
    }
  }

  /**
   * 处理重连（仅在运行时连接断开时使用）
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RedisCache] ⛔ 达到最大重连次数，Redis 服务不可用！系统将无法正常工作');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[RedisCache] ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    setTimeout(async () => {
      try {
        // 检查是否已经连接
        if (this.client && this.client.isOpen) {
          console.warn('[RedisCache] 客户端已连接，跳过重连');
          this.reconnectAttempts = 0;
          return;
        }

        if (this.client) {
          await this.client.connect();
          this.reconnectAttempts = 0; // 重置重连计数
          console.log('[RedisCache] ✅ 重连成功');
        }
      } catch (error: any) {
        // 只在不是 "Socket already opened" 错误时才继续重连
        if (error.message && !error.message.includes('Socket already opened')) {
          console.error('[RedisCache] 重连失败:', error.message);
          this.handleReconnect();
        }
      }
    }, delay);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.client = null;
      console.log('[RedisCache] Redis 连接已关闭');
    }
  }

  // ================================================================
  // 基础缓存操作
  // ================================================================

  /**
   * 设置缓存
   * 在内存缓存模式下，使用内存缓存
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    // 内存缓存模式
    if (!this.client?.isOpen) {
      if (this.isOptional) {
        const expiry = Date.now() + ttl * 1000;
        this.memoryCache.set(key, { data: value, expiry });
        return;
      }
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法设置缓存');
    }

    try {
      const item: CacheItem<T> = {
        data: value,
        timestamp: Date.now()
      };

      await this.client.setEx(key, ttl, JSON.stringify(item));
    } catch (error) {
      // 如果 Redis 可选且操作失败，降级到内存缓存
      if (this.isOptional) {
        console.warn('[RedisCache] Redis 设置失败，降级到内存缓存:', key);
        const expiry = Date.now() + ttl * 1000;
        this.memoryCache.set(key, { data: value, expiry });
        return;
      }
      console.error('[RedisCache] 设置缓存失败:', error);
      throw error;
    }
  }

  /**
   * 获取缓存
   * 在内存缓存模式下，从内存缓存读取
   */
  async get<T>(key: string): Promise<T | null> {
    // 内存缓存模式
    if (!this.client?.isOpen) {
      if (this.isOptional) {
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data as T;
        }
        // 过期或不存在，清理
        this.memoryCache.delete(key);
        return null;
      }
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法获取缓存');
    }

    try {
      const data = await this.client.get(key);

      if (data) {
        const item: CacheItem<T> = JSON.parse(data);
        return item.data;
      }

      return null;
    } catch (error) {
      // 如果 Redis 可选且操作失败，尝试从内存缓存读取
      if (this.isOptional) {
        console.warn('[RedisCache] Redis 获取失败，尝试从内存缓存读取:', key);
        const cached = this.memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.data as T;
        }
        return null;
      }
      console.error('[RedisCache] 获取缓存失败:', error);
      throw error;
    }
  }

  /**
   * 删除缓存
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async del(key: string): Promise<void> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法删除缓存');
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[RedisCache] 删除缓存失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除缓存（支持模式匹配）
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法批量删除缓存');
    }

    try {
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('[RedisCache] 批量删除缓存失败:', error);
      throw error;
    }
  }

  /**
   * 检查键是否存在
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法检查键');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[RedisCache] 检查键存在失败:', error);
      throw error;
    }
  }

  // ================================================================
  // 全局数据缓存操作
  // ================================================================

  /**
   * 缓存全局数据
   */
  async setGlobalData(dataType: string, dataId: string, data: any, version?: number): Promise<void> {
    const key = this.getGlobalDataKey(dataType, dataId);
    const ttl = 3600; // 1 小时

    await this.set(key, { data, version }, ttl);
  }

  /**
   * 获取全局数据缓存
   */
  async getGlobalData(dataType: string, dataId: string): Promise<{ data: any; version?: number } | null> {
    const key = this.getGlobalDataKey(dataType, dataId);
    return await this.get(key);
  }

  /**
   * 失效全局数据缓存
   */
  async invalidateGlobalData(dataType: string, dataId?: string): Promise<void> {
    if (dataId) {
      // 失效特定数据
      const key = this.getGlobalDataKey(dataType, dataId);
      await this.del(key);
    } else {
      // 失效该类型的所有数据
      const pattern = `global:${dataType}:*`;
      await this.delPattern(pattern);
    }
  }

  /**
   * 获取全局数据类型列表缓存
   */
  async getGlobalDataList(dataType: string): Promise<any[] | null> {
    const key = `global_list:${dataType}`;
    return await this.get(key);
  }

  /**
   * 设置全局数据类型列表缓存
   */
  async setGlobalDataList(dataType: string, data: any[]): Promise<void> {
    const key = `global_list:${dataType}`;
    const ttl = 1800; // 30 分钟
    await this.set(key, data, ttl);
  }

  // ================================================================
  // 会话缓存操作
  // ================================================================

  /**
   * 缓存会话
   */
  async setSession(sessionId: string, sessionData: any): Promise<void> {
    const key = `session:${sessionId}`;
    const ttl = 86400; // 24 小时
    await this.set(key, sessionData, ttl);
  }

  /**
   * 获取会话缓存
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  /**
   * 删除会话缓存
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  // ================================================================
  // 在线用户缓存操作
  // ================================================================

  /**
   * 添加在线用户
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async addOnlineUser(userId: number, username: string, sessionId: string, deviceInfo?: string, ipAddress?: string): Promise<void> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法添加在线用户');
    }

    const key = `online_users`;
    const ttl = 300; // 5 分钟

    try {
      await this.client.hSet(key, userId.toString(), JSON.stringify({
        userId,
        username,
        sessionId,
        deviceInfo,
        ipAddress,
        lastSeen: Date.now()
      }));

      await this.client.expire(key, ttl);
    } catch (error) {
      console.error('[RedisCache] 添加在线用户失败:', error);
      throw error;
    }
  }

  /**
   * 移除在线用户
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async removeOnlineUser(userId: number): Promise<void> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法移除在线用户');
    }

    const key = `online_users`;

    try {
      await this.client.hDel(key, userId.toString());
    } catch (error) {
      console.error('[RedisCache] 移除在线用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取在线用户列表
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async getOnlineUsers(): Promise<Array<{ userId: number; username: string; sessionId: string; lastSeen: number }>> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法获取在线用户');
    }

    const key = `online_users`;

    try {
      const data = await this.client.hGetAll(key);

      return Object.values(data).map((item) => {
        const user = JSON.parse(item);
        // 过滤 5 分钟内活跃的用户
        if (Date.now() - user.lastSeen < 300000) {
          return user;
        }
        return null;
      }).filter(Boolean) as any[];
    } catch (error) {
      console.error('[RedisCache] 获取在线用户失败:', error);
      throw error;
    }
  }

  // ================================================================
  // 统计与监控
  // ================================================================

  /**
   * 获取缓存统计信息
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async getStats(): Promise<CacheStats> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法获取统计信息');
    }

    try {
      const info = await this.client.info('stats');
      const keyCount = await this.client.dbSize();

      // 解析 Redis INFO 命令的输出
      const lines = info.split('\r\n');
      let totalHits = 0;
      let totalMisses = 0;

      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) {
          totalHits = parseInt(line.split(':')[1]) || 0;
        } else if (line.startsWith('keyspace_misses:')) {
          totalMisses = parseInt(line.split(':')[1]) || 0;
        }
      }

      const total = totalHits + totalMisses;
      const hitRate = total > 0 ? (totalHits / total) * 100 : 0;

      return {
        hitRate: Math.round(hitRate * 100) / 100,
        totalHits,
        totalMisses,
        keyCount,
        memoryUsage: 0 // Redis 内存使用需要额外查询
      };
    } catch (error) {
      console.error('[RedisCache] 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有缓存
   * @throws Error 当 Redis 未初始化或操作失败时抛出错误
   */
  async flushAll(): Promise<void> {
    if (!this.isInitialized || !this.client?.isOpen) {
      throw new Error('[RedisCache] Redis 未初始化或连接已断开，无法清空缓存');
    }

    try {
      await this.client.flushDb();
      console.log('[RedisCache] 缓存已清空');
    } catch (error) {
      console.error('[RedisCache] 清空缓存失败:', error);
      throw error;
    }
  }

  // ================================================================
  // 工具函数
  // ================================================================

  /**
   * 生成全局数据缓存键
   */
  private getGlobalDataKey(dataType: string, dataId: string): string {
    return `global:${dataType}:${dataId}`;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.isInitialized && this.client?.isOpen === true;
  }
}

// ================================================================
// 导出单例
// ================================================================

export const redisCacheService = new RedisCacheService();

// 为了向后兼容，同时导出类
export { RedisCacheService };
