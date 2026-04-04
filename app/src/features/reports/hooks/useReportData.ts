/**
 * 报表分析模块数据 Hooks
 * 使用 React Query 封装数据获取逻辑
 */
import { useQuery } from '@tanstack/react-query';
import {
  getProjectProgressReport,
  getTaskStatisticsReport,
  getDelayAnalysisReport,
  getMemberAnalysisReport,
  getResourceEfficiencyReport,
} from '@/lib/api/reports.api';
import { getReportTrend } from '@/lib/api/analytics.api';
import { getMembers } from '@/lib/api/org.api';
import { getProjects } from '@/lib/api/project.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { ReportFilters } from '../types';

// ============ 项目进度报表 ============

export function useProjectProgressReport(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.projectProgressReport(projectId),
    queryFn: () => (projectId ? getProjectProgressReport(projectId) : null),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });
}

// ============ 任务统计报表 ============

export function useTaskStatisticsReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.taskStatisticsReport(filters),
    queryFn: () => getTaskStatisticsReport(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// ============ 延期分析报表 ============

export function useDelayAnalysisReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.delayAnalysisReport(filters),
    queryFn: () => getDelayAnalysisReport(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// ============ 成员任务分析报表 ============

export function useMemberAnalysisReport(memberId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.memberAnalysisReport(memberId),
    queryFn: () => (memberId ? getMemberAnalysisReport(memberId) : null),
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============ 资源效能分析报表（v1.2 新增） ============

export function useResourceEfficiencyReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: ['reports', 'resource-efficiency', filters],
    queryFn: () => getResourceEfficiencyReport(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// ============ 批量获取所有成员（用于成员选择器） ============

export function useMembersForReport() {
  return useQuery({
    queryKey: queryKeys.org.members(),
    queryFn: async () => {
      const result = await getMembers({ pageSize: 1000 });
      return result.items;
    },
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
}

// ============ 批量获取所有项目（用于项目选择器） ============

export function useProjectsForReport() {
  return useQuery({
    queryKey: queryKeys.projects.list({}),
    queryFn: async () => {
      const result = await getProjects({ pageSize: 1000 });
      return result.items;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============ 报表动态维度趋势 ============

export interface ReportTrendParams {
  metric: 'tasks_created' | 'tasks_completed' | 'tasks_delayed' | 'project_progress';
  startDate: string;
  endDate: string;
  granularity?: 'day' | 'week' | 'month';
  projectId?: string;
}

export function useReportTrend(params: ReportTrendParams) {
  return useQuery({
    queryKey: ['reports', 'trend', params],
    queryFn: () => getReportTrend({
      metric: params.metric,
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity || 'week',
      projectId: params.projectId,
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !!(params.startDate && params.endDate),
  });
}
