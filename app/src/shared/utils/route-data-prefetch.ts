/**
 * 路由数据预取工具
 *
 * 在用户悬停导航链接时，通过 React Query 的 prefetchQuery
 * 预取目标页面的核心数据，使点击后数据已就绪。
 *
 * @module shared/utils/route-data-prefetch
 */

import { queryClient } from '@/shared/utils/query-client';
import { queryKeys } from '@/lib/api/query-keys';
import { getDashboardStats, getTaskTrend, getAllProjectsProgress, getDashboardTrends } from '@/lib/api/analytics.api';
import { getProjects } from '@/lib/api/project.api';
import { getMembers } from '@/lib/api/org.api';
import { getTasks } from '@/lib/api/task.api';

/** 已预取的数据路径集合，避免重复请求 */
const prefetchedRoutes = new Set<string>();

const STALE_TIME = 5 * 60 * 1000;

/**
 * 预取仪表板核心数据（覆盖所有通用 API 调用）
 * 角色特定的 detail API 由各仪表板组件自己的 useQuery 触发
 */
async function prefetchDashboardData(): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.dashboardStats(),
      queryFn: () => getDashboardStats(),
      staleTime: STALE_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.taskTrend({ days: 30 }),
      queryFn: () => getTaskTrend({ days: 30 }),
      staleTime: STALE_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.dashboard(),
      queryFn: () => getDashboardTrends(7),
      staleTime: STALE_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: ['analytics', 'projects-progress'],
      queryFn: () => getAllProjectsProgress(),
      staleTime: STALE_TIME,
    }),
  ]);
}

/**
 * 预取指定路由的核心数据
 * 仅在首次悬停时触发，后续悬停跳过（React Query 内部会判断 stale）
 */
export async function prefetchRouteData(path: string): Promise<void> {
  const basePath = '/' + path.split('/').filter(Boolean)[0];

  if (prefetchedRoutes.has(basePath)) return;
  prefetchedRoutes.add(basePath);

  switch (basePath) {
    case '/dashboard':
      await prefetchDashboardData();
      break;

    case '/projects':
      await queryClient.prefetchQuery({
        queryKey: queryKeys.projects.list({ pageSize: 100 }),
        queryFn: () => getProjects({ pageSize: 100 }),
        staleTime: STALE_TIME,
      });
      break;

    case '/tasks':
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: queryKeys.tasks.list({ pageSize: 100 }),
          queryFn: () => getTasks({ pageSize: 100 }),
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.projects.list({ pageSize: 100 }),
          queryFn: () => getProjects({ pageSize: 100 }),
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.org.members({ pageSize: 100, status: 'active' }),
          queryFn: () => getMembers({ pageSize: 100, status: 'active' }),
          staleTime: STALE_TIME,
        }),
      ]);
      break;

    case '/assignment':
      await queryClient.prefetchQuery({
        queryKey: queryKeys.org.members({ pageSize: 100, status: 'active' }),
        queryFn: () => getMembers({ pageSize: 100, status: 'active' }),
        staleTime: STALE_TIME,
      });
      break;

    case '/reports':
      await queryClient.prefetchQuery({
        queryKey: queryKeys.analytics.dashboardStats(),
        queryFn: () => getDashboardStats(),
        staleTime: STALE_TIME,
      });
      break;
  }
}
