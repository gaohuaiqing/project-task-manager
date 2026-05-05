/**
 * 路由模块预加载映射
 *
 * 当用户鼠标悬停在侧边栏导航链接上时，提前加载对应的 JS chunk，
 * 消除点击后的模块加载延迟。
 *
 * @module shared/utils/route-preload
 */

/** 模块预加载函数映射表 */
const routeModuleMap: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/features/analytics/Dashboard'),
  '/projects': () => import('@/features/projects'),
  '/tasks': () => import('@/features/tasks'),
  '/assignment': () => import('@/features/assignment'),
  '/reports': () => import('@/features/analytics/reports/ReportsPage'),
  '/settings': () => import('@/features/settings'),
};

/** 已预加载的模块集合，避免重复加载 */
const preloadedModules = new Set<string>();

/**
 * 预加载指定路由的模块代码
 * 仅在首次悬停时加载，后续悬停直接跳过
 */
export function preloadRouteModule(path: string): void {
  // 提取基础路径（去除动态参数段）
  const basePath = '/' + path.split('/').filter(Boolean)[0];

  if (preloadedModules.has(basePath)) return;

  const loader = routeModuleMap[basePath];
  if (loader) {
    preloadedModules.add(basePath);
    loader().catch(() => {
      // 加载失败时移除标记，允许重试
      preloadedModules.delete(basePath);
    });
  }
}
