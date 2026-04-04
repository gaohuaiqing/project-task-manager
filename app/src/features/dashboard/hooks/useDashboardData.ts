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
 * 获取仪表板统计卡片趋势（对比当前周期 vs 上期）
 */
export function useDashboardTrends(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', 'dashboard-trends', days],
    queryFn: () => analyticsApi.getDashboardTrends(days),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取任务趋势数据
 */
export function useTaskTrend(days: number = 30) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return useQuery({
    queryKey: queryKeys.analytics.taskTrend({ days, startDate, endDate }),
    queryFn: () => analyticsApi.getTaskTrend({ startDate, endDate }),
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
}

/**
 * 获取所有项目进度
 */
export function useProjectProgress() {
  return useQuery({
    queryKey: queryKeys.analytics.projectProgress('all'),
    queryFn: analyticsApi.getAllProjectsProgress,
    staleTime: 5 * 60 * 1000,
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
 * 获取延期分析数据
 */
export function useDelayAnalysis(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.delayAnalysis(params),
    queryFn: () => analyticsApi.getDelayAnalysis(params),
    staleTime: 10 * 60 * 1000,
  });
}
