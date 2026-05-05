/**
 * 分析模块缓存失效监听器
 * 监听任务事件，主动失效仪表板和报表缓存
 *
 * @module analytics/cache-invalidation
 */

import { taskEvents, TaskEventType } from '../../core/events';
import { logger } from '../../core/logger';
import CacheService from '../../services/CacheService';

// 仪表板使用的 Redis/Memory 缓存实例（与 dashboard.controller.ts 共享同一模式）
import { RedisCache } from '../../core/cache/redis';
import { MemoryCache } from '../../core/cache/memory';

let dashboardCache: RedisCache | MemoryCache;
try {
  dashboardCache = new RedisCache();
} catch {
  dashboardCache = new MemoryCache();
}

/** 是否已初始化 */
let initialized = false;

/**
 * 失效所有分析相关缓存
 * 在任务创建/更新/删除时调用
 */
async function invalidateAllAnalyticsCache(): Promise<void> {
  try {
    // 1. 失效 CacheService（node-cache）中的仪表板/报表/范围缓存
    CacheService.invalidatePattern('dashboard:');
    CacheService.invalidatePattern('stats:');
    CacheService.invalidatePattern('trend:');
    CacheService.invalidatePattern('scope:');
    CacheService.invalidatePattern('report:');
    CacheService.invalidatePattern('cte:');

    // 2. 失效 dashboardCache（Redis/Memory）中的仪表板数据
    await dashboardCache.deletePattern('dashboard:*');

    logger.debug('[CacheInvalidation] Analytics cache invalidated');
  } catch (error) {
    logger.warn('[CacheInvalidation] Failed to invalidate cache: %s', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 初始化缓存失效监听器
 * 注册一次，进程生命周期内有效
 */
export function initCacheInvalidation(): void {
  if (initialized) return;
  initialized = true;

  taskEvents.on(TaskEventType.TASK_CREATED, () => {
    invalidateAllAnalyticsCache();
  });

  taskEvents.on(TaskEventType.TASK_UPDATED, () => {
    invalidateAllAnalyticsCache();
  });

  taskEvents.on(TaskEventType.TASK_DELETED, () => {
    invalidateAllAnalyticsCache();
  });

  taskEvents.on(TaskEventType.PLAN_CHANGE_APPROVED, () => {
    invalidateAllAnalyticsCache();
  });

  logger.info('[CacheInvalidation] Analytics cache invalidation listeners initialized');
}
