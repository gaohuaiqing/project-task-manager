/**
 * Redis缓存配置
 *
 * 五层缓存架构：
 * L1: 浏览器内存 (<1ms) - React Query / LRU Cache
 * L2: 浏览器 localStorage - 降级备份
 * L3: Redis缓存 (<5ms) - 主缓存，本模块
 * L4: MySQL查询缓存 (<10ms) - 查询结果缓存
 * L5: MySQL磁盘 (<50ms) - 最终数据源
 */

/**
 * 缓存键前缀配置
 */
export const CACHE_PREFIX = {
  PROJECT: 'project',
  PROJECTS_LIST: 'projects:list',
  MEMBER: 'member',
  MEMBERS_LIST: 'members:list',
  TASK: 'task',
  TASKS_LIST: 'tasks:list',
  USER: 'user',
  SESSION: 'session',
  PERMISSION: 'permission',
  DATA: 'data'
} as const;

/**
 * 缓存TTL配置（单位：秒）
 */
export const CACHE_TTL = {
  // 项目相关
  PROJECT_DETAIL: 1800,        // 30分钟
  PROJECTS_LIST: 300,          // 5分钟

  // 成员相关
  MEMBER_DETAIL: 1800,         // 30分钟
  MEMBERS_LIST: 600,           // 10分钟

  // 任务相关
  TASK_DETAIL: 300,            // 5分钟
  TASKS_LIST: 180,             // 3分钟

  // 用户相关
  USER_INFO: 3600,             // 1小时
  USER_PERMISSIONS: 1800,      // 30分钟

  // 会话相关
  SESSION: 86400,              // 24小时

  // 权限相关
  PERMISSION_CONFIG: 1800,     // 30分钟

  // 默认
  DEFAULT: 300                 // 5分钟
} as const;

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  enableOffline: boolean;
  offlineMode: boolean;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  lazyConnect: boolean;
  keepAlive: number;
}

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'ptm:',
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
  enableOffline: process.env.CACHE_ENABLE_OFFLINE !== 'false',
  offlineMode: process.env.CACHE_OFFLINE_MODE === 'true',
  maxRetries: parseInt(process.env.CACHE_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.CACHE_RETRY_DELAY || '100', 10),
  connectTimeout: parseInt(process.env.CACHE_CONNECT_TIMEOUT || '10000', 10),
  lazyConnect: true,
  keepAlive: parseInt(process.env.CACHE_KEEP_ALIVE || '30000', 10)
};

/**
 * LRU内存缓存配置（降级用）
 */
export const LRU_CACHE_CONFIG = {
  max: parseInt(process.env.LRU_MAX_ITEMS || '1000', 10),
  maxSize: parseInt(process.env.LRU_MAX_SIZE || '10485760', 10), // 10MB
  ttl: parseInt(process.env.LRU_TTL || '300000', 10) // 5分钟
};

/**
 * 缓存统计接口
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  offlineHits: number;
}

/**
 * 缓存操作结果
 */
export interface CacheResult<T = any> {
  success: boolean;
  data?: T;
  fromCache: boolean;
  fromOffline: boolean;
  error?: string;
}

/**
 * Pipeline批量操作配置
 */
export const PIPELINE_CONFIG = {
  maxBatchSize: parseInt(process.env.PIPELINE_MAX_BATCH || '100', 10),
  maxWaitTime: parseInt(process.env.PIPELINE_MAX_WAIT || '10', 10)
};

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  private prefix: string;

  constructor(prefix: string = DEFAULT_CACHE_CONFIG.keyPrefix) {
    this.prefix = prefix;
  }

  /**
   * 生成项目缓存键
   */
  project(id: number | string): string {
    return `${this.prefix}${CACHE_PREFIX.PROJECT}:${id}`;
  }

  /**
   * 生成项目列表缓存键
   */
  projectsList(): string {
    return `${this.prefix}${CACHE_PREFIX.PROJECTS_LIST}`;
  }

  /**
   * 生成成员缓存键
   */
  member(id: number | string): string {
    return `${this.prefix}${CACHE_PREFIX.MEMBER}:${id}`;
  }

  /**
   * 生成成员列表缓存键
   */
  membersList(): string {
    return `${this.prefix}${CACHE_PREFIX.MEMBERS_LIST}`;
  }

  /**
   * 生成任务缓存键
   */
  task(id: number | string): string {
    return `${this.prefix}${CACHE_PREFIX.TASK}:${id}`;
  }

  /**
   * 生成任务列表缓存键
   */
  tasksList(projectId?: number): string {
    return projectId
      ? `${this.prefix}${CACHE_PREFIX.TASKS_LIST}:project:${projectId}`
      : `${this.prefix}${CACHE_PREFIX.TASKS_LIST}`;
  }

  /**
   * 生成用户缓存键
   */
  user(id: number | string): string {
    return `${this.prefix}${CACHE_PREFIX.USER}:${id}`;
  }

  /**
   * 生成会话缓存键
   */
  session(sessionId: string): string {
    return `${this.prefix}${CACHE_PREFIX.SESSION}:${sessionId}`;
  }

  /**
   * 生成权限缓存键
   */
  permission(userId: number): string {
    return `${this.prefix}${CACHE_PREFIX.PERMISSION}:user:${userId}`;
  }

  /**
   * 生成通用数据缓存键
   */
  data(type: string, id: string): string {
    return `${this.prefix}${CACHE_PREFIX.DATA}:${type}:${id}`;
  }

  /**
   * 自定义键
   */
  custom(...parts: string[]): string {
    return `${this.prefix}${parts.join(':')}`;
  }

  /**
   * 通配符键（用于批量删除）
   */
  pattern(pattern: string): string {
    return `${this.prefix}${pattern}`;
  }
}

/**
 * 全局缓存键生成器实例
 */
export const cacheKeys = new CacheKeyGenerator();
