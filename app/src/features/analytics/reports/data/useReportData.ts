/**
 * 报表数据Hook
 * 使用 React Query 实现缓存和自动刷新
 * @module analytics/reports/data/useReportData
 */

import { useQuery } from '@tanstack/react-query';
import type {
  ReportFilters,
  ProjectProgressData,
  ProjectProgressSummaryData,
  TaskStatisticsData,
  DelayAnalysisData,
  MemberAnalysisData,
  ResourceEfficiencyData,
} from '../types';

// ==================== API 导入 ====================

import {
  getTaskStatisticsReport,
  getDelayAnalysisReport,
  getMemberAnalysisReport,
  getResourceEfficiencyReport,
  getProjectProgressReport,
  getProjectsSimple,
  getMembersSimple,
} from '../api';

import {
  transformTaskStatisticsReport,
  transformDelayAnalysisReport,
  transformMemberAnalysisReport,
  transformResourceEfficiencyReport,
  transformProjectProgressReport,
  transformProjectProgressSummary,
} from './transformers';

import { analyticsApi } from '@/lib/api/analytics.api';
import { CACHE_TIMES, TIME_PERIODS } from '../../shared/constants';

// ==================== 类型定义 ====================

/** Hook 返回结果类型 */
export interface UseReportDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ==================== 缓存配置 ====================

/** 报表数据缓存时间：5分钟内不重新请求 */
const REPORT_STALE_TIME = CACHE_TIMES.staleTime;

/** 缓存保留时间：10分钟后清理 */
const REPORT_GC_TIME = CACHE_TIMES.staleTime * 2;

/** 筛选器数据缓存时间：30分钟内不重新请求 */
const FILTER_STALE_TIME = 30 * 60 * 1000;

// ==================== 辅助函数 ====================

function filtersToQueryOptions(filters: ReportFilters) {
  return {
    project_id: filters.projectId,
    assignee_id: filters.assigneeId ? parseInt(filters.assigneeId) : undefined,
    start_date: filters.startDate,
    end_date: filters.endDate,
    task_type: filters.taskType,
    delay_type: filters.delayType,
    department_id: filters.departmentId ? parseInt(filters.departmentId) : undefined,
    tech_group_id: filters.techGroupId ? parseInt(filters.techGroupId) : undefined,
  };
}

function getStartDate(filters: ReportFilters): string {
  return filters.startDate || new Date(Date.now() - TIME_PERIODS.month * CACHE_TIMES.dayMs).toISOString().split('T')[0];
}

function getEndDate(filters: ReportFilters): string {
  return filters.endDate || new Date().toISOString().split('T')[0];
}

// ==================== 通用报表 Hook ====================

/**
 * 通用报表数据获取 Hook
 * @param queryKey React Query 缓存键
 * @param filters 筛选条件
 * @param fetcher 数据获取函数
 */
export function useReportData<T>(
  queryKey: string,
  filters: ReportFilters,
  fetcher: (filters: ReportFilters) => Promise<T>
): UseReportDataResult<T> {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [queryKey, filters],
    queryFn: () => fetcher(filters),
    staleTime: REPORT_STALE_TIME,
    gcTime: REPORT_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}

// ==================== 具体报表 Hook ====================

/**
 * 任务统计报表
 */
export function useTaskStatisticsData(filters: ReportFilters): UseReportDataResult<TaskStatisticsData> {
  return useReportData('task-statistics', filters, async (f) => {
    const options = filtersToQueryOptions(f);
    const startDate = getStartDate(f);
    const endDate = getEndDate(f);

    // 并行获取所有数据，避免串行等待
    const [reportResult, trendResult, priorityTrendResult] = await Promise.allSettled([
      getTaskStatisticsReport(options),
      analyticsApi.getTaskTrend({ startDate, endDate }),
      analyticsApi.getPriorityCompletionTrend({ startDate, endDate }),
    ]);

    if (reportResult.status === 'rejected') {
      throw reportResult.reason;
    }
    const report = reportResult.value;

    const trendData = trendResult.status === 'fulfilled' ? (trendResult.value || []) : [];
    if (trendResult.status === 'rejected') {
      if (import.meta.env.DEV) console.warn('Failed to fetch task trend:', trendResult.reason);
    }

    const priorityTrendData = priorityTrendResult.status === 'fulfilled' ? (priorityTrendResult.value || []) : [];
    if (priorityTrendResult.status === 'rejected') {
      if (import.meta.env.DEV) console.warn('Failed to fetch priority trend:', priorityTrendResult.reason);
    }

    return transformTaskStatisticsReport(report, trendData, priorityTrendData);
  });
}

/**
 * 延期分析报表
 */
export function useDelayAnalysisData(filters: ReportFilters): UseReportDataResult<DelayAnalysisData> {
  return useReportData('delay-analysis', filters, async (f) => {
    const options = filtersToQueryOptions(f);
    const report = await getDelayAnalysisReport(options);
    return transformDelayAnalysisReport(report);
  });
}

/**
 * 成员分析报表
 */
export function useMemberAnalysisData(filters: ReportFilters): UseReportDataResult<MemberAnalysisData> {
  return useReportData('member-analysis', filters, async (f) => {
    const options = filtersToQueryOptions(f);
    // 映射 assignee_id → member_id（成员分析 API 使用 member_id）
    const report = await getMemberAnalysisReport({
      member_id: options.assignee_id,
      start_date: options.start_date,
      end_date: options.end_date,
    });
    return transformMemberAnalysisReport(report);
  });
}

/**
 * 资源效能报表
 */
export function useResourceEfficiencyData(filters: ReportFilters): UseReportDataResult<ResourceEfficiencyData> {
  return useReportData('resource-efficiency', filters, async (f) => {
    const options = filtersToQueryOptions(f);
    const report = await getResourceEfficiencyReport(options);
    return transformResourceEfficiencyReport(report);
  });
}

/**
 * 项目进度报表
 * @param projectId 项目ID，可选。不传则返回汇总数据
 */
export function useProjectProgressData(projectId?: string): {
  data: ProjectProgressData | ProjectProgressSummaryData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isSummary: boolean;
} {
  const queryKey = projectId ? ['project-progress', projectId] : ['project-progress-summary'];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const report = await getProjectProgressReport(projectId);
      if (!report) return null;

      // 根据 report 内容判断是汇总还是单项目
      if ('projects' in report) {
        return transformProjectProgressSummary(report as any);
      } else {
        return transformProjectProgressReport(report as any);
      }
    },
    staleTime: REPORT_STALE_TIME,
    gcTime: REPORT_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // 基于实际数据形态判断视图类型
  const isSummary = data ? 'projects' in data : !projectId;

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
    isSummary,
  };
}

// ==================== 筛选器数据 Hook ====================

/**
 * 获取项目列表（用于筛选器）
 * 使用全局缓存，30分钟内不重新请求
 */
export function useProjectsForReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report-projects'],
    queryFn: async () => {
      const projects = await getProjectsSimple();
      return projects ?? [];
    },
    staleTime: FILTER_STALE_TIME,
    gcTime: FILTER_STALE_TIME * 2,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}

/**
 * 获取成员列表（用于筛选器）
 * 使用全局缓存，30分钟内不重新请求
 */
export function useMembersForReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report-members'],
    queryFn: async () => {
      const members = await getMembersSimple();
      return members ?? [];
    },
    staleTime: FILTER_STALE_TIME,
    gcTime: FILTER_STALE_TIME * 2,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? [],
    isLoading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}