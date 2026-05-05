// app/server/src/modules/analytics/index.ts
export { default as analyticsRoutes } from './routes';
export { AnalyticsService } from './service';
export { AnalyticsRepository } from './repository';
export * from './types';

// 导出模块化服务
export { MetricsService, ScopeService, TrendService } from './services';
export type { TimeGranularity } from './services';

// 导出控制器
export { DashboardController } from './controllers/dashboard.controller';

// 导出缓存失效初始化
export { initCacheInvalidation } from './cache-invalidation';
