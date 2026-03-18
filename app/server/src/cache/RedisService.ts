/**
 * Redis缓存服务
 *
 * 核心功能：
 * - 连接管理：自动重连、健康检查
 * - Pipeline批量操作：减少RTT
 * - 降级处理：LRU内存缓存
 * - 统计监控：命中率、使用量
 *
 * 性能优化：
 * - Pipeline批量操作（一次RTT执行多个命令）
 * - 连接池复用
 * - 二进制数据处理
 */

import { createClient, RedisClientType } from 'redis';
import LRUCache from 'lru-cache';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import {
  DEFAULT_CACHE_CONFIG,
  LRU_CACHE_CONFIG,
  cacheKeys,
  type CacheConfig,
  type CacheResult,
  type CacheStats
} from './config.js';

/**
 * Redis服务类
 */
export class RedisService {
  private client: RedisClientType | null = null;
  private offlineCache: LRUCache<string, string>;
  private config: CacheConfig;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    offlineHits: 0
  };
  private reconnectTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };

    // 创建LRU降级缓存
    this.offlineCache = new LRUCache({
      max: LRU_CACHE_CONFIG.max,
      maxSize: LRU_CACHE_CONFIG.maxSize,
      ttl: LRU_CACHE_CONFIG.ttl,
      sizeCalculation: (value) => {
        return Buffer.byteLength(value, 'utf8');
      }
    });
  }

  /**
   * ============================================
   * 连接管理
   * ============================================
   */

  /**
   * 连接Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info(LOG_CATEGORIES.CACHE, '正在连接Redis...', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      this.client = createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          connectTimeout: this.config.connectTimeout,
          keepAlive: this.config.keepAlive,
          reconnectStrategy: (retries) => {
            if (retries > this.config.maxRetries) {
              logger.error(LOG_CATEGORIES.CACHE, 'Redis重连超过最大次数，进入离线模式');
              this.enterOfflineMode();
              return false;
            }
            return Math.min(retries * 100, this.config.retryDelay);
          }
        },
        password: this.config.password,
        database: this.config.db
      });

      // 错误处理
      this.client.on('error', (error) => {
        logger.error(LOG_CATEGORIES.CACHE, 'Redis连接错误', { error: error.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info(LOG_CATEGORIES.CACHE, 'Redis已连接');
        this.isConnected = true;
        this.isConnecting = false;
        this.exitOfflineMode();
      });

      this.client.on('disconnect', () => {
        logger.warn(LOG_CATEGORIES.CACHE, 'Redis已断开');
        this.isConnected = false;
      });

      // 连接
      await this.client.connect();

      // 启动健康检查
      this.startHealthCheck();

      logger.info(LOG_CATEGORIES.CACHE, 'Redis连接成功');
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, 'Redis连接失败', { error: error.message });
      this.isConnecting = false;

      if (this.config.enableOffline) {
        this.enterOfflineMode();
      } else {
        throw error;
      }
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    // 停止定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    this.isConnected = false;
    logger.info(LOG_CATEGORIES.CACHE, 'Redis已断开');
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (this.isConnected && this.client) {
        try {
          await this.client.ping();
        } catch (error) {
          logger.warn(LOG_CATEGORIES.CACHE, 'Redis健康检查失败', { error });
          this.isConnected = false;
        }
      }
    }, 30000); // 30秒检查一次

    // 不阻止进程退出
    if (this.healthCheckTimer.unref) {
      this.healthCheckTimer.unref();
    }
  }

  /**
   * 进入离线模式
   */
  private enterOfflineMode(): void {
    this.config.offlineMode = true;
    logger.warn(LOG_CATEGORIES.CACHE, '进入离线模式，使用LRU缓存');

    // 定期尝试重连
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.tryReconnect();
    }, 5000); // 5秒后尝试重连
  }

  /**
   * 退出离线模式
   */
  private exitOfflineMode(): void {
    if (this.config.offlineMode) {
      this.config.offlineMode = false;
      logger.info(LOG_CATEGORIES.CACHE, '退出离线模式，恢复Redis连接');
    }
  }

  /**
   * 尝试重连
   */
  private async tryReconnect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.connect();
    } catch (error) {
      // 继续使用离线模式
      this.reconnectTimer = setTimeout(() => {
        this.tryReconnect();
      }, 10000); // 10秒后再次尝试
    }
  }

  /**
   * 确保已连接
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected && !this.config.offlineMode) {
      await this.connect();
    }
  }

  /**
   * ============================================
   * 基础操作
   * ============================================
   */

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<CacheResult<T>> {
    const startTime = Date.now();

    try {
      await this.ensureConnected();

      // 离线模式：从LRU获取
      if (this.config.offlineMode || !this.isConnected) {
        const offlineData = this.offlineCache.get(key);
        if (offlineData !== undefined) {
          this.stats.offlineHits++;
          return {
            success: true,
            data: JSON.parse(offlineData),
            fromCache: true,
            fromOffline: true
          };
        }
        this.stats.misses++;
        return { success: false, fromCache: false, fromOffline: false };
      }

      // Redis模式
      const data = await this.client!.get(key);

      if (data !== null) {
        this.stats.hits++;
        logger.debug(LOG_CATEGORIES.CACHE_HIT, `缓存命中: ${key}`, {
          duration: Date.now() - startTime
        });

        // 同时写入LRU（双写）
        this.offlineCache.set(key, data);

        return {
          success: true,
          data: JSON.parse(data),
          fromCache: true,
          fromOffline: false
        };
      }

      this.stats.misses++;
      return { success: false, fromCache: false, fromOffline: false };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '获取缓存失败', {
        key,
        error: error.message
      });

      // 降级：尝试从LRU获取
      const offlineData = this.offlineCache.get(key);
      if (offlineData !== undefined) {
        return {
          success: true,
          data: JSON.parse(offlineData),
          fromCache: true,
          fromOffline: true
        };
      }

      return { success: false, fromCache: false, fromOffline: false, error: error.message };
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    const ttlSeconds = ttl ?? this.config.defaultTTL;

    try {
      await this.ensureConnected();

      const data = JSON.stringify(value);

      // 离线模式：只写入LRU
      if (this.config.offlineMode || !this.isConnected) {
        this.offlineCache.set(key, data);
        return true;
      }

      // Redis模式：同时写入Redis和LRU
      await this.client!.setEx(key, ttlSeconds, data);
      this.offlineCache.set(key, data);

      logger.debug(LOG_CATEGORIES.CACHE, `设置缓存: ${key}`, {
        ttl: ttlSeconds,
        duration: Date.now() - startTime
      });

      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '设置缓存失败', {
        key,
        error: error.message
      });

      // 降级：只写入LRU
      this.offlineCache.set(key, JSON.stringify(value));
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();

      // 同时删除Redis和LRU
      if (!this.config.offlineMode && this.isConnected && this.client) {
        await this.client.del(key);
      }

      this.offlineCache.delete(key);

      logger.debug(LOG_CATEGORIES.CACHE, `删除缓存: ${key}`);
      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '删除缓存失败', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 批量删除（通配符）
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnected();

      if (this.config.offlineMode || !this.isConnected || !this.client) {
        // 离线模式：清空LRU中匹配的键
        let count = 0;
        for (const key of this.offlineCache.keys()) {
          if (this.matchPattern(key, pattern)) {
            this.offlineCache.delete(key);
            count++;
          }
        }
        return count;
      }

      // Redis模式：使用SCAN + DEL
      let cursor = 0;
      let count = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });

        cursor = result.cursor;

        if (result.keys.length > 0) {
          await this.client.del(result.keys);
          count += result.keys.length;

          // 同时从LRU删除
          result.keys.forEach(key => this.offlineCache.delete(key));
        }
      } while (cursor !== 0);

      logger.debug(LOG_CATEGORIES.CACHE, `批量删除: ${pattern}`, { count });
      return count;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '批量删除失败', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();

      if (this.config.offlineMode || !this.isConnected || !this.client) {
        return this.offlineCache.has(key);
      }

      return (await this.client.exists(key)) === 1;
    } catch (error) {
      // 降级：检查LRU
      return this.offlineCache.has(key);
    }
  }

  /**
   * ============================================
   * Pipeline批量操作
   * ============================================
   */

  /**
   * 批量获取
   */
  async multiGet(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) {
      return [];
    }

    try {
      await this.ensureConnected();

      if (this.config.offlineMode || !this.isConnected || !this.client) {
        // 离线模式：从LRU获取
        return keys.map(key => this.offlineCache.get(key) ?? null);
      }

      // 使用Pipeline批量获取
      const pipeline = this.client.multi();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      return results?.map(r => r as string | null) ?? [];
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '批量获取失败', {
        count: keys.length,
        error: error.message
      });

      // 降级：从LRU获取
      return keys.map(key => this.offlineCache.get(key) ?? null);
    }
  }

  /**
   * 批量设置
   */
  async multiSet(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (items.length === 0) {
      return true;
    }

    try {
      await this.ensureConnected();

      const defaultTtl = this.config.defaultTTL;

      if (this.config.offlineMode || !this.isConnected || !this.client) {
        // 离线模式：写入LRU
        items.forEach(({ key, value }) => {
          this.offlineCache.set(key, JSON.stringify(value));
        });
        return true;
      }

      // 使用Pipeline批量设置
      const pipeline = this.client.multi();
      items.forEach(({ key, value, ttl }) => {
        const data = JSON.stringify(value);
        pipeline.setEx(key, ttl ?? defaultTtl, data);
        this.offlineCache.set(key, data);
      });

      await pipeline.exec();

      logger.debug(LOG_CATEGORIES.CACHE, '批量设置缓存', { count: items.length });
      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '批量设置失败', {
        count: items.length,
        error: error.message
      });

      // 降级：写入LRU
      items.forEach(({ key, value }) => {
        this.offlineCache.set(key, JSON.stringify(value));
      });

      return false;
    }
  }

  /**
   * ============================================
   * 辅助方法
   * ============================================
   */

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.size = this.offlineCache.size;
  }

  /**
   * 模式匹配
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(key);
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    this.updateHitRate();
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.offlineCache.size,
      offlineHits: 0
    };
  }

  /**
   * 清空所有缓存
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.ensureConnected();

      if (!this.config.offlineMode && this.isConnected && this.client) {
        await this.client.flushDb();
      }

      this.offlineCache.clear();

      logger.info(LOG_CATEGORIES.CACHE, '已清空所有缓存');
      return true;
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '清空缓存失败', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();

      if (this.config.offlineMode || !this.isConnected || !this.client) {
        return {
          healthy: false,
          error: '离线模式或未连接'
        };
      }

      await this.client.ping();

      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

/**
 * 全局Redis服务实例
 */
export const redisService = new RedisService();

/**
 * 默认导出
 */
export default redisService;

/**
 * 导出缓存键生成器
 */
export { cacheKeys };
