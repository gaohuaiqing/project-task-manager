/**
 * 仪表板数据 Hook
 */
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { DashboardQueryParams } from '../types';

/**
 * 获取仪表板统计数据
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboardStats(),
    queryFn: analyticsApi.getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 分钟
    refetchOnWindowFocus: true,
  });
}

/**
 * 获取任务趋势数据
 */
export function useTaskTrend(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.taskTrend(params),
    queryFn: () => analyticsApi.getTaskTrend(params),
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
}

/**
 * 获取任务分布数据
 */
export function useTaskDistribution(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.taskStatistics(params),
    queryFn: () => analyticsApi.getTaskStatistics(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取项目进度数据
 */
export function useProjectProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.projectProgress(projectId!),
    queryFn: () => analyticsApi.getProjectProgress(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取延期分析数据
 */
export function useDelayAnalysis(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.delayAnalysis(params),
    queryFn: () => analyticsApi.getDelayAnalysis(params),
    staleTime: 10 * 60 * 1000,
  });
}
