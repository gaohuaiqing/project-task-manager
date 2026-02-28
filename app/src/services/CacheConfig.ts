/**
 * 缓存策略统一配置
 *
 * 设计原则：
 * 1. 统一缓存 TTL 配置，避免不同服务使用不同过期时间
 * 2. 明确缓存键前缀，避免键冲突
 * 3. 区分内存缓存和持久化缓存的使用场景
 * 4. 提供缓存策略选择和配置工具
 *
 * @module services/CacheConfig
 */

// ==================== 缓存 TTL 配置 ====================

/**
 * 缓存过期时间配置（单位：毫秒）
 */
export const CACHE_TTL = {
  /** 短期缓存 - 30秒：高频变化的数据 */
  SHORT: 30 * 1000,

  /** 中期缓存 - 60秒：一般数据 */
  MEDIUM: 60 * 1000,

  /** 长期缓存 - 5分钟：相对稳定的数据 */
  LONG: 5 * 60 * 1000,

  /** 超长期缓存 - 30分钟：极少变化的数据 */
  VERY_LONG: 30 * 60 * 1000,
} as const;

/**
 * 默认缓存 TTL（用于没有特殊指定的情况）
 */
export const DEFAULT_CACHE_TTL = CACHE_TTL.MEDIUM;

// ==================== 缓存键前缀 ====================

/**
 * 缓存键前缀配置
 * 用于避免不同模块的缓存键冲突
 */
export const CACHE_KEY_PREFIX = {
  /** 项目数据 */
  PROJECT: 'proj',

  /** 项目成员 */
  PROJECT_MEMBER: 'proj_mem',

  /** 项目里程碑 */
  PROJECT_MILESTONE: 'proj_ms',

  /** WBS 任务 */
  WBS_TASK: 'wbs',

  /** 组织架构 */
  ORGANIZATION: 'org',

  /** 成员信息 */
  MEMBER: 'mem',

  /** 权限数据 */
  PERMISSION: 'perm',

  /** 会话数据 */
  SESSION: 'sess',

  /** 全局数据 */
  GLOBAL_DATA: 'global',

  /** 系统日志 */
  SYSTEM_LOG: 'log',

  /** 统计数据 */
  STATISTICS: 'stat',
} as const;

// ==================== 缓存策略类型 ====================

/**
 * 缓存存储类型
 */
export type CacheStorageType = 'memory' | 'localStorage' | 'sessionStorage' | 'hybrid';

/**
 * 缓存策略配置接口
 */
export interface CacheStrategy {
  /** 存储类型 */
  storage: CacheStorageType;
  /** 缓存 TTL */
  ttl: number;
  /** 是否启用缓存 */
  enabled: boolean;
  /** 是否启用自动刷新 */
  autoRefresh?: boolean;
  /** 自动刷新间隔（仅在 autoRefresh=true 时有效） */
  refreshInterval?: number;
}

// ==================== 数据类型缓存策略 ====================

/**
 * 各类数据的默认缓存策略
 */
export const DATA_CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  // 项目相关
  projects: {
    storage: 'memory',
    ttl: CACHE_TTL.MEDIUM,
    enabled: true,
    autoRefresh: true,
    refreshInterval: CACHE_TTL.MEDIUM,
  },

  project_members: {
    storage: 'memory',
    ttl: CACHE_TTL.MEDIUM,
    enabled: true,
  },

  project_milestones: {
    storage: 'memory',
    ttl: CACHE_TTL.MEDIUM,
    enabled: true,
  },

  // WBS 任务
  wbs_tasks: {
    storage: 'memory',
    ttl: CACHE_TTL.SHORT,
    enabled: true,
  },

  // 组织架构（相对稳定）
  organization: {
    storage: 'localStorage',
    ttl: CACHE_TTL.VERY_LONG,
    enabled: true,
  },

  // 成员信息（相对稳定）
  members: {
    storage: 'localStorage',
    ttl: CACHE_TTL.LONG,
    enabled: true,
  },

  // 权限数据（相对稳定）
  permissions: {
    storage: 'memory',
    ttl: CACHE_TTL.LONG,
    enabled: true,
  },

  // 系统日志
  system_logs: {
    storage: 'memory',
    ttl: CACHE_TTL.SHORT,
    enabled: true,
  },

  // 统计数据
  statistics: {
    storage: 'memory',
    ttl: CACHE_TTL.SHORT,
    enabled: true,
  },
} as const;

// ==================== 缓存键生成工具 ====================

/**
 * 生成完整的缓存键
 * @param prefix 缓存键前缀
 * @param identifier 标识符
 * @param suffix 后缀（可选）
 * @returns 完整的缓存键
 *
 * @example
 * generateCacheKey(CACHE_KEY_PREFIX.PROJECT, '123') // 'proj:123'
 * generateCacheKey(CACHE_KEY_PREFIX.PROJECT_MEMBER, '123', 'list') // 'proj_mem:123:list'
 */
export function generateCacheKey(
  prefix: string,
  identifier: string | number,
  suffix?: string
): string {
  const key = `${prefix}:${identifier}`;
  return suffix ? `${key}:${suffix}` : key;
}

/**
 * 解析缓存键，提取各部分
 * @param key 完整的缓存键
 * @returns 解析结果
 *
 * @example
 * parseCacheKey('proj:123') // { prefix: 'proj', identifier: '123', suffix: undefined }
 * parseCacheKey('proj_mem:123:list') // { prefix: 'proj_mem', identifier: '123', suffix: 'list' }
 */
export function parseCacheKey(key: string): {
  prefix: string;
  identifier: string;
  suffix?: string;
} {
  const parts = key.split(':');
  if (parts.length < 2) {
    throw new Error(`Invalid cache key format: ${key}`);
  }

  return {
    prefix: parts[0],
    identifier: parts[1],
    suffix: parts[2],
  };
}

// ==================== 缓存状态管理 ====================

/**
 * 缓存条目接口
 */
export interface CacheEntry<T = any> {
  /** 缓存的数据 */
  data: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 过期时间戳 */
  expireTime: number;
  /** 数据版本（用于乐观锁） */
  version: number;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessTime: number;
}

/**
 * 检查缓存条目是否有效
 * @param entry 缓存条目
 * @returns 是否有效
 */
export function isCacheEntryValid(entry: CacheEntry): boolean {
  const now = Date.now();
  return now < entry.expireTime;
}

/**
 * 检查缓存条目是否即将过期（剩余时间 < TTL 的 20%）
 * @param entry 缓存条目
 * @returns 是否即将过期
 */
export function isCacheEntryExpiringSoon(entry: CacheEntry): boolean {
  const now = Date.now();
  const remainingTime = entry.expireTime - now;
  const totalTTL = entry.expireTime - entry.timestamp;
  return remainingTime < totalTTL * 0.2;
}

/**
 * 获取缓存条目剩余 TTL（毫秒）
 * @param entry 缓存条目
 * @returns 剩余 TTL，已过期返回 0
 */
export function getCacheEntryRemainingTTL(entry: CacheEntry): number {
  const now = Date.now();
  const remaining = entry.expireTime - now;
  return Math.max(0, remaining);
}

// ==================== 缓存工具函数 ====================

/**
 * 创建缓存条目
 * @param data 缓存数据
 * @param ttl 过期时间（毫秒）
 * @param version 版本号
 * @returns 缓存条目
 */
export function createCacheEntry<T>(
  data: T,
  ttl: number = DEFAULT_CACHE_TTL,
  version: number = 1
): CacheEntry<T> {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expireTime: now + ttl,
    version,
    accessCount: 0,
    lastAccessTime: now,
  };
}

/**
 * 更新缓存条目访问信息
 * @param entry 缓存条目
 * @returns 更新后的缓存条目
 */
export function updateCacheEntryAccess<T>(entry: CacheEntry<T>): CacheEntry<T> {
  return {
    ...entry,
    accessCount: entry.accessCount + 1,
    lastAccessTime: Date.now(),
  };
}

/**
 * 刷新缓存条目（延长过期时间）
 * @param entry 缓存条目
 * @param ttl 新的 TTL（可选，默认使用原 TTL）
 * @returns 刷新后的缓存条目
 */
export function refreshCacheEntry<T>(
  entry: CacheEntry<T>,
  ttl?: number
): CacheEntry<T> {
  const now = Date.now();
  const actualTTL = ttl || (entry.expireTime - entry.timestamp);
  return {
    ...entry,
    timestamp: now,
    expireTime: now + actualTTL,
  };
}

// ==================== 缓存统计 ====================

/**
 * 缓存统计信息
 */
export interface CacheStatistics {
  /** 总条目数 */
  totalEntries: number;
  /** 有效条目数 */
  validEntries: number;
  /** 过期条目数 */
  expiredEntries: number;
  /** 总内存大小（字节，近似值） */
  totalMemorySize: number;
  /** 命中率 */
  hitRate: number;
  /** 总命中次数 */
  hitCount: number;
  /** 总未命中次数 */
  missCount: number;
}

/**
 * 创建初始缓存统计
 */
export function createInitialCacheStatistics(): CacheStatistics {
  return {
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    totalMemorySize: 0,
    hitRate: 0,
    hitCount: 0,
    missCount: 0,
  };
}

// ==================== 缓存配置验证 ====================

/**
 * 验证缓存策略配置
 * @param strategy 缓存策略
 * @returns 是否有效
 */
export function validateCacheStrategy(strategy: CacheStrategy): boolean {
  if (!strategy || typeof strategy !== 'object') {
    return false;
  }

  const validStorageTypes: CacheStorageType[] = ['memory', 'localStorage', 'sessionStorage', 'hybrid'];
  if (!validStorageTypes.includes(strategy.storage)) {
    return false;
  }

  if (typeof strategy.ttl !== 'number' || strategy.ttl <= 0) {
    return false;
  }

  if (typeof strategy.enabled !== 'boolean') {
    return false;
  }

  if (strategy.autoRefresh && typeof strategy.autoRefresh !== 'boolean') {
    return false;
  }

  if (strategy.autoRefresh && strategy.refreshInterval !== undefined) {
    if (typeof strategy.refreshInterval !== 'number' || strategy.refreshInterval <= 0) {
      return false;
    }
  }

  return true;
}

// ==================== 导出默认配置 ====================

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG = {
  /** 默认 TTL */
  ttl: DEFAULT_CACHE_TTL,
  /** 默认存储类型 */
  storage: 'memory' as CacheStorageType,
  /** 是否启用缓存 */
  enabled: true,
  /** 是否启用自动刷新 */
  autoRefresh: false,
} as const;

/**
 * 获取数据类型的缓存策略
 * @param dataType 数据类型
 * @returns 缓存策略
 */
export function getCacheStrategy(dataType: string): CacheStrategy {
  return DATA_CACHE_STRATEGIES[dataType] || {
    storage: 'memory',
    ttl: DEFAULT_CACHE_TTL,
    enabled: true,
  };
}

/**
 * 设置数据类型的缓存策略
 * @param dataType 数据类型
 * @param strategy 新的缓存策略
 */
export function setCacheStrategy(dataType: string, strategy: Partial<CacheStrategy>): void {
  if (!DATA_CACHE_STRATEGIES[dataType]) {
    DATA_CACHE_STRATEGIES[dataType] = {
      storage: 'memory',
      ttl: DEFAULT_CACHE_TTL,
      enabled: true,
    };
  }

  Object.assign(DATA_CACHE_STRATEGIES[dataType], strategy);
}
