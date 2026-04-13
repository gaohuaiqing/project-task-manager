/**
 * 仪表板数据获取Hook
 * 使用 React Query 实现缓存和自动刷新
 *
 * @module analytics/dashboard/hooks/useDashboardData
 * @see REQ_07a_dashboard.md
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/api/analytics.api';
import { queryKeys } from '@/lib/api/query-keys';
import { createDataProvider, DASHBOARD_CONFIG, shouldUseMockData } from '../data';
import type {
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
} from '../types';
import type { PieChartDataItem } from '../../shared/types';

// ============ 缓存配置 ============

/** 仪表板数据缓存时间：5 分钟 */
const DASHBOARD_STALE_TIME = 5 * 60 * 1000;

/** 后台刷新间隔：10 分钟 */
const DASHBOARD_REFETCH_INTERVAL = 10 * 60 * 1000;

// ============ 工具函数 ============

/**
 * 从 API 错误中提取可读的错误消息
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message) || '请求失败';
  }
  return '未知错误';
}

/**
 * 构建趋势辅助函数
 */
function buildTrendHelper(
  trendMap: Record<string, any>,
  key: string,
  invertColors?: boolean,
) {
  const t = trendMap[key]?.trend;
  if (!t || t.direction === 'flat') return undefined;
  const sign = t.direction === 'up' ? '↑' : '↓';
  const text = `${sign}${Math.abs(t.changePercent)}% vs 上周`;
  return { trend: invertColors ? -t.changePercent : t.changePercent, trendText: text };
}

/**
 * 将后端任务类型分布转换为 PieChartDataItem[]
 */
function mapTaskTypeDistribution(
  items: Array<{
    taskType: string;
    taskTypeName: string;
    count: number;
    completedCount: number;
    delayedCount: number;
    completionRate: number;
    delayRate: number;
    avgDuration: number;
  }> | undefined,
): PieChartDataItem[] {
  if (!items || items.length === 0) return [];
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return items.map((i) => ({
    name: i.taskTypeName,
    value: i.count,
    percentage: total > 0 ? Math.round((i.count / total) * 100) : 0,
  }));
}

/**
 * 将后端任务状态分布转换为 PieChartDataItem[]
 */
function mapStatusDistribution(
  items: Array<{ status: string; count: number }> | undefined,
): PieChartDataItem[] {
  if (!items || items.length === 0) return [];
  const statusNames: Record<string, string> = {
    not_started: '未开始',
    in_progress: '进行中',
    delay_warning: '延期预警',
    delayed: '已延期',
    early_completed: '提前完成',
    on_time_completed: '按时完成',
    overdue_completed: '逾期完成',
  };
  const total = items.reduce((sum, i) => sum + i.count, 0);
  return items.map((i) => ({
    name: statusNames[i.status] || i.status,
    value: i.count,
    percentage: total > 0 ? Math.round((i.count / total) * 100) : 0,
  }));
}

// ============ 数据转换函数 ============

/**
 * 转换 Admin 仪表板数据
 */
function transformAdminData(
  stats: any,
  trends: any[],
  trendsSummary: Record<string, any>,
  detail: any,
): AdminDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    {
      type: 'delay_warning' as const,
      count: stats.delayWarningTasks || 0,
      label: '延期预警',
      trend: trendMap.delay_warning?.trend?.changePercent,
      trendText: trendMap.delay_warning?.trend?.direction === 'flat' ? undefined
        : `${trendMap.delay_warning?.trend?.direction === 'up' ? '↑' : '↓'}${Math.abs(trendMap.delay_warning?.trend?.changePercent || 0)}% vs 上周`,
      color: 'warning' as const,
      actionLabel: '查看详情',
      actionPath: '/reports/delay-analysis',
    },
    {
      type: 'overdue' as const,
      count: stats.overdueTasks || 0,
      label: '已延期',
      trend: trendMap.overdue?.trend?.changePercent,
      trendText: trendMap.overdue?.trend?.direction === 'flat' ? undefined
        : `${trendMap.overdue?.trend?.direction === 'up' ? '↑' : '↓'}${Math.abs(trendMap.overdue?.trend?.changePercent || 0)}% vs 上周`,
      color: 'danger' as const,
      actionLabel: '查看详情',
      actionPath: '/reports/delay-analysis',
    },
  ].filter(a => a.count > 0);

  return {
    alerts,
    metrics: [
      { label: '项目总数', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), ...buildTrendHelper(trendMap, 'active_projects') },
      { label: '任务总数', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), ...buildTrendHelper(trendMap, 'total_tasks') },
      { label: '完成率', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%`, ...buildTrendHelper(trendMap, 'completed_tasks') },
      { label: '延期率', value: stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0}%`, ...buildTrendHelper(trendMap, 'delay_warning', true) },
      { label: '总人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0) },
      { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0) },
      { label: '已完成', value: stats.completedTasks || 0, displayValue: String(stats.completedTasks || 0), ...buildTrendHelper(trendMap, 'completed_tasks') },
      { label: '本周到期', value: stats.delayWarningTasks || 0, displayValue: String(stats.delayWarningTasks || 0), ...buildTrendHelper(trendMap, 'delay_warning', true) },
    ],
    departmentEfficiency: (detail?.departmentEfficiency || []).map((d: any) => ({
      id: d.id, name: d.name,
      completionRate: d.completionRate, delayRate: d.delayRate,
      utilizationRate: d.utilizationRate, activity: d.activity,
      trend: d.trend, status: d.status,
    })),
    trends: trends || [],
    taskTypeDistribution: mapTaskTypeDistribution(detail?.taskTypeDistribution),
    allocationSuggestions: (detail?.allocationSuggestions || []).map((s: any) => ({
      type: s.type as 'overload' | 'idle' | 'low_activity',
      memberId: 0,
      memberName: s.memberName,
      value: s.currentLoad,
      valueLabel: `${s.currentLoad}`,
      suggestion: s.suggestion,
    })),
    departmentDelayTrends: (detail?.departmentDelayTrends || []) as any[],
    utilizationTrends: (detail?.utilizationTrends || []) as any[],
    highRiskProjects: (detail?.highRiskProjects || []).map((p: any) => ({
      id: p.id, name: p.name, riskFactors: p.riskFactors,
      completionRate: p.completionRate, delayedTasks: p.delayedTasks, manager: p.manager,
    })),
  };
}

/**
 * 转换 DeptManager 仪表板数据
 */
function transformDeptManagerData(
  stats: any,
  trends: any[],
  trendsSummary: Record<string, any>,
  detail: any,
): DeptManagerDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '延期预警', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '已延期', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
  ].filter(a => a.count > 0);

  return {
    alerts,
    metrics: [
      { label: '部门项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), ...buildTrendHelper(trendMap, 'active_projects') },
      { label: '部门任务', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), ...buildTrendHelper(trendMap, 'total_tasks') },
      { label: '完成率', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%`, ...buildTrendHelper(trendMap, 'completed_tasks') },
      { label: '延期率', value: stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0}%`, ...buildTrendHelper(trendMap, 'delay_warning', true) },
      { label: '部门人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0) },
      { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0) },
      { label: '本周到期', value: stats.delayWarningTasks || 0, displayValue: String(stats.delayWarningTasks || 0), ...buildTrendHelper(trendMap, 'delay_warning', true) },
      { label: '活跃度', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%` },
    ],
    groupEfficiency: (detail?.groupEfficiency || []).map((g: any) => ({
      id: g.id, name: g.name,
      completionRate: g.completionRate, delayRate: g.delayRate,
      loadRate: g.loadRate, activity: g.activity,
      memberCount: g.memberCount, trend: g.trend, status: g.status,
    })),
    memberStatus: (detail?.memberStatus || []).map((m: any) => ({
      id: m.id, name: m.name, avatar: m.avatar || undefined,
      inProgress: m.inProgress, completed: m.completed, delayed: m.delayed,
      loadRate: m.loadRate, activity: m.activity, trend: m.trend, status: m.status,
    })),
    trends: trends || [],
    taskTypeDistribution: mapTaskTypeDistribution(detail?.taskTypeDistribution),
    allocationSuggestions: (detail?.allocationSuggestions || []).map((s: any) => ({
      type: s.type as 'overload' | 'idle' | 'low_activity',
      memberId: 0, memberName: s.memberName,
      value: s.currentLoad, valueLabel: `${s.currentLoad}`,
      suggestion: s.suggestion,
    })),
    groupActivityTrends: (detail?.groupActivityTrends || []) as any[],
  };
}

/**
 * 转换 TechManager 仪表板数据
 */
function transformTechManagerData(
  stats: any,
  trends: any[],
  trendsSummary: Record<string, any>,
  detail: any,
  groupId?: number,
): TechManagerDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '延期预警', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '已延期', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
  ].filter(a => a.count > 0);

  return {
    alerts,
    metrics: [
      { label: '组内项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), ...buildTrendHelper(trendMap, 'active_projects') },
      { label: '组内任务', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), ...buildTrendHelper(trendMap, 'total_tasks') },
      { label: '完成率', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%`, ...buildTrendHelper(trendMap, 'completed_tasks') },
      { label: '延期率', value: stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.delayWarningTasks && stats.totalTasks ? Math.round((stats.delayWarningTasks / stats.totalTasks) * 100) : 0}%`, ...buildTrendHelper(trendMap, 'delay_warning', true) },
      { label: '组内人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0) },
      { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0) },
      { label: '本周到期', value: stats.delayWarningTasks || 0, displayValue: String(stats.delayWarningTasks || 0), ...buildTrendHelper(trendMap, 'delay_warning', true) },
      { label: '活跃度', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%` },
    ],
    currentGroupId: groupId || (detail?.availableGroups?.[0]?.id) || 1,
    availableGroups: detail?.availableGroups || [],
    memberStatus: (detail?.memberStatus || []).map((m: any) => ({
      id: m.id, name: m.name, avatar: m.avatar || undefined,
      inProgress: m.inProgress, completed: m.completed, delayed: m.delayed,
      loadRate: m.loadRate, activity: m.activity, trend: m.trend, status: m.status,
    })),
    trends: trends || [],
    taskTypeDistribution: mapTaskTypeDistribution(detail?.taskTypeDistribution),
    allocationSuggestions: (detail?.allocationSuggestions || []).map((s: any) => ({
      type: s.type as 'overload' | 'idle' | 'low_activity',
      memberId: 0, memberName: s.memberName,
      value: s.currentLoad, valueLabel: `${s.currentLoad}`,
      suggestion: s.suggestion,
    })),
    memberActivityTrends: (detail?.memberActivityTrends || []) as any[],
  };
}

/**
 * 转换 Engineer 仪表板数据
 */
function transformEngineerData(
  stats: any,
  trends: any[],
  projects: any[],
  trendsSummary: Record<string, any>,
  detail: any,
): EngineerDashboardData {
  const trendMap = trendsSummary || {};

  return {
    alerts: [
      { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '逾期任务', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/tasks' },
      { type: 'week_due' as const, count: stats.delayWarningTasks || 0, label: '本周到期', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/tasks' },
    ].filter(a => a.count > 0),
    metrics: [
      { label: '参与项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), ...buildTrendHelper(trendMap, 'active_projects') },
      { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0), ...buildTrendHelper(trendMap, 'total_tasks') },
      { label: '已完成', value: stats.completedTasks || 0, displayValue: String(stats.completedTasks || 0), ...buildTrendHelper(trendMap, 'completed_tasks') },
      { label: '待开始', value: stats.pendingTasks || 0, displayValue: String(stats.pendingTasks || 0) },
    ],
    todoTasks: (detail?.todoTasks || []).map((t: any) => ({
      id: t.id, name: t.name, projectName: t.projectName,
      dueDate: t.dueDate || '', progress: t.progress,
      priority: t.priority as 'high' | 'medium' | 'low',
      daysOverdue: t.daysOverdue, lastUpdated: t.lastUpdated,
    })),
    needUpdateTasks: (detail?.needUpdateTasks || []).map((t: any) => ({
      id: t.id, name: t.name, projectName: t.projectName,
      dueDate: t.dueDate || '', progress: t.progress,
      priority: t.priority as 'high' | 'medium' | 'low',
      daysOverdue: t.daysOverdue, lastUpdated: t.lastUpdated,
    })),
    trends: trends || [],
    taskStatusDistribution: mapStatusDistribution(detail?.taskStatusDistribution),
    projectProgress: (projects || []).map((p: any) => ({
      id: p.id || String(p.projectId),
      name: p.name || p.projectName || '',
      progress: p.progress || 0,
      status: p.status || 'on_track',
      totalTasks: p.totalTasks || 0,
      completedTasks: p.completedTasks || 0,
      delayedTasks: p.delayedTasks || 0,
      dueDate: p.dueDate || p.deadline,
    })),
  };
}

// ============ React Query Hooks ============

/**
 * Admin仪表板数据Hook
 */
export function useAdminDashboardData(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.adminDashboard(projectId),
    queryFn: async ({ signal }) => {
      const [stats, trends, projects, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(signal),
        analyticsApi.getTaskTrend({ days: 30 }, signal),
        analyticsApi.getAllProjectsProgress(signal),
        analyticsApi.getDashboardTrends(7, signal).catch(() => ({})),
        analyticsApi.getAdminDashboardDetail(signal).catch(() => null),
      ]);

      return transformAdminData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
  });
}

/**
 * DeptManager仪表板数据Hook
 */
export function useDeptManagerDashboardData(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.deptManagerDashboard(projectId),
    queryFn: async ({ signal }) => {
      const [stats, trends, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(signal),
        analyticsApi.getTaskTrend({ days: 30 }, signal),
        analyticsApi.getDashboardTrends(7, signal).catch(() => ({})),
        analyticsApi.getDeptManagerDashboardDetail(signal).catch(() => null),
      ]);

      return transformDeptManagerData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
  });
}

/**
 * TechManager仪表板数据Hook
 */
export function useTechManagerDashboardData(projectId?: string, groupId?: number) {
  return useQuery({
    queryKey: queryKeys.analytics.techManagerDashboard(projectId, groupId),
    queryFn: async () => {
      const [stats, trends, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getTechManagerDashboardDetail(groupId).catch(() => null),
      ]);

      return transformTechManagerData(stats, trends, trendsSummary, detail, groupId);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
  });
}

/**
 * Engineer仪表板数据Hook
 */
export function useEngineerDashboardData(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.analytics.engineerDashboard(projectId),
    queryFn: async () => {
      const [stats, trends, projects, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getAllProjectsProgress(),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getEngineerDashboardDetail().catch(() => null),
      ]);

      return transformEngineerData(stats, trends, projects, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
  });
}

/**
 * 统一的仪表板数据Hook
 * 根据用户角色自动选择对应的数据获取逻辑
 * 优化：按需加载，避免调用不必要的API
 */
export function useDashboardData(projectId?: string) {
  const { user } = useAuth();
  const role = user?.role;

  // 根据角色只调用对应的 Hook，避免不必要的 API 请求
  // React Hook 条件调用模式：通过提前返回避免调用其他 Hook
  switch (role) {
    case 'admin':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useAdminDashboardData(projectId);
    case 'dept_manager':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useDeptManagerDashboardData(projectId);
    case 'tech_manager':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useTechManagerDashboardData(projectId);
    case 'engineer':
    default:
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useEngineerDashboardData(projectId);
  }
}

export default useDashboardData;

// ============ Mock 数据支持的 Hooks ============

/**
 * Admin 仪表板数据 Hook（支持 Mock 数据）
 */
export function useAdminDashboard(projectId?: string) {
  const useMock = shouldUseMockData('admin');

  return useQuery<AdminDashboardData>({
    queryKey: ['dashboard', 'admin', projectId, { mock: useMock }],
    queryFn: async () => {
      if (useMock) {
        const provider = createDataProvider('admin');
        return provider.getAdminDashboardData(projectId);
      }
      // 真实 API 调用
      const [stats, trends, projects, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getAllProjectsProgress(),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getAdminDashboardDetail().catch(() => null),
      ]);
      return transformAdminData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * 部门经理仪表板数据 Hook（支持 Mock 数据）
 */
export function useDeptManagerDashboard(projectId?: string) {
  const useMock = shouldUseMockData('dept_manager');

  return useQuery<DeptManagerDashboardData>({
    queryKey: ['dashboard', 'dept_manager', projectId, { mock: useMock }],
    queryFn: async () => {
      if (useMock) {
        const provider = createDataProvider('dept_manager');
        return provider.getDeptManagerDashboardData(projectId);
      }
      // 真实 API 调用
      const [stats, trends, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getDeptManagerDashboardDetail().catch(() => null),
      ]);
      return transformDeptManagerData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * 技术经理仪表板数据 Hook（支持 Mock 数据）
 */
export function useTechManagerDashboard(projectId?: string, groupId?: number) {
  const useMock = shouldUseMockData('tech_manager');

  return useQuery<TechManagerDashboardData>({
    queryKey: ['dashboard', 'tech_manager', projectId, groupId, { mock: useMock }],
    queryFn: async () => {
      if (useMock) {
        const provider = createDataProvider('tech_manager');
        return provider.getTechManagerDashboardData(projectId, groupId);
      }
      // 真实 API 调用
      const [stats, trends, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getTechManagerDashboardDetail(groupId).catch(() => null),
      ]);
      return transformTechManagerData(stats, trends, trendsSummary, detail, groupId);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/**
 * 工程师仪表板数据 Hook（支持 Mock 数据）
 */
export function useEngineerDashboard(projectId?: string) {
  const useMock = shouldUseMockData('engineer');

  return useQuery<EngineerDashboardData>({
    queryKey: ['dashboard', 'engineer', projectId, { mock: useMock }],
    queryFn: async () => {
      if (useMock) {
        const provider = createDataProvider('engineer');
        return provider.getEngineerDashboardData(projectId);
      }
      // 真实 API 调用
      const [stats, trends, projects, trendsSummary, detail] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getTaskTrend({ days: 30 }),
        analyticsApi.getAllProjectsProgress(),
        analyticsApi.getDashboardTrends(7).catch(() => ({})),
        analyticsApi.getEngineerDashboardDetail().catch(() => null),
      ]);
      return transformEngineerData(stats, trends, projects, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}
