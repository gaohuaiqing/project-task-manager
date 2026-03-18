/**
 * Redis缓存服务 - 导出入口
 *
 * 使用示例：
 * ```typescript
 * import { redisService, cacheManager, cacheKeys } from './cache/index.js';
 *
 * // 基础Redis操作
 * await redisService.connect();
 * await redisService.set('key', { data: 'value' }, 300);
 * const data = await redisService.get('key');
 *
 * // 高级缓存操作
 * await cacheManager.setProject(1, projectData);
 * const project = await cacheManager.getProject(1);
 * await cacheManager.invalidateProject(1);
 *
 * // 生成缓存键
 * const key = cacheKeys.project(123);
 * ```
 */

// 导出Redis服务
export { RedisService, redisService } from './RedisService.js';

// 导出缓存管理器
export { CacheManager, cacheManager } from './CacheManager.js';

// 导出配置
export {
  CACHE_PREFIX,
  CACHE_TTL,
  DEFAULT_CACHE_CONFIG,
  LRU_CACHE_CONFIG,
  cacheKeys,
  CacheKeyGenerator
} from './config.js';
export type {
  CacheConfig,
  CacheResult,
  CacheStats
} from './config.js';

// 默认导出缓存管理器
export { default } from './CacheManager.js';
