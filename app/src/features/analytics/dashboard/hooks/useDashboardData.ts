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
import { DEFAULT_CHART_COLORS } from '../../shared/constants/colors';

// ============ 动态 Series 工具函数 ============

/**
 * 从宽表趋势数据中动态提取 series 配置
 * 后端返回的趋势数据为宽表格式（如 { date, "部门A": 15, "部门B": 8 }），
 * 此函数自动排除日期列，为每个实体名分配颜色
 *
 * @param data - 后端返回的宽表趋势数据
 * @param excludeKeys - 需要排除的非数据 key（默认排除 date/period）
 */
export function buildDynamicSeries(
  data: Record<string, unknown>[],
  excludeKeys: string[] = ['date', 'period'],
): Array<{ dataKey: string; name: string; color: string }> {
  if (!data || data.length === 0) return [];

  const firstRow = data[0];
  const keys = Object.keys(firstRow).filter(
    (k) => !excludeKeys.includes(k) && typeof firstRow[k] === 'number',
  );

  return keys.map((key, i) => ({
    dataKey: key,
    name: key,
    color: DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length],
  }));
}

// ============ 趋势 API 错误处理 ============

/**
 * 趋势数据获取失败的统一处理
 * 返回 null 表示加载失败，前端可区分"无数据"和"加载失败"
 */
function handleTrendError(context: string): (err: unknown) => null {
  return (err: unknown) => {
    if (err instanceof Error && err.name !== 'AbortError') {
      console.warn(`[Dashboard] 趋势数据获取失败 (${context}):`, err.message);
    }
    return null;
  };
}

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
 * trendMap 为 null 时表示加载失败，返回 undefined
 */
function buildTrendHelper(
  trendMap: Record<string, any> | null,
  key: string,
  invertColors?: boolean,
) {
  if (!trendMap) return undefined; // 加载失败
  const t = trendMap[key]?.trend;
  if (!t) return undefined;
  // 持平趋势显示为中性状态，而非隐藏
  if (t.direction === 'flat') {
    return { trend: 0, trendText: '– 持平' };
  }
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
    pending_approval: '待审批',
    not_started: '未开始',
    in_progress: '进行中',
    early_completed: '提前完成',
    on_time_completed: '按时完成',
    delay_warning: '延期预警',
    delayed: '已延期',
    overdue_completed: '超期完成',
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
  trendsSummary: Record<string, any> | null,
  detail: any,
): AdminDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    {
      type: 'delay_warning' as const,
      count: stats.delayWarningTasks || 0,
      label: '延期预警',
      trend: trendMap.delayWarning?.trend?.changePercent,
      trendText: trendMap.delayWarning?.trend?.direction === 'flat' ? undefined
        : `${trendMap.delayWarning?.trend?.direction === 'up' ? '↑' : '↓'}${Math.abs(trendMap.delayWarning?.trend?.changePercent || 0)}% vs 上周`,
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
    {
      type: 'pending_approval' as const,
      count: stats.pendingApprovalTasks || 0,
      label: '待审批',
      color: 'info' as const,
      actionLabel: '立即审批',
      actionPath: '/settings/approvals',
    },
  ];

  return {
    alerts,
    metrics: [
      { label: '项目总数', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), description: '当前系统中所有项目的总数量', ...buildTrendHelper(trendMap, 'activeProjects') },
      { label: '任务总数', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), description: '所有项目中的任务总数量', ...buildTrendHelper(trendMap, 'totalTasks') },
      { label: '完成率', value: stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%`, description: '已完成任务占总任务的百分比', ...buildTrendHelper(trendMap, 'completedTasks') },
      { label: '延期率', value: stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0}%`, description: '延期任务占总任务的百分比', ...buildTrendHelper(trendMap, 'overdue', true) },
      { label: '总人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0), description: '系统中注册的用户总数' },
      { label: '资源利用率', value: stats.utilizationRate || 0, displayValue: `${stats.utilizationRate || 0}%`, description: '成员平均工作负荷比率', ...buildTrendHelper(trendMap, 'utilizationRate') },
      { label: '里程碑达成', value: stats.avgProgress || 0, displayValue: `${stats.avgProgress || 0}%`, description: '项目平均进度（里程碑达成率）' },
      { label: '本周到期', value: stats.weekDueTasks || 0, displayValue: String(stats.weekDueTasks || 0), description: '本周内需要完成的任务数量', ...buildTrendHelper(trendMap, 'weekDueTasks') },
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
  trendsSummary: Record<string, any> | null,
  detail: any,
): DeptManagerDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '延期预警', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '已延期', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'pending_approval' as const, count: stats.pendingApprovalTasks || 0, label: '待我审批', color: 'info' as const, actionLabel: '立即审批', actionPath: '/settings/approvals' },
  ];

  return {
    alerts,
    metrics: [
      { label: '部门项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), description: '本部门负责的项目总数', ...buildTrendHelper(trendMap, 'activeProjects') },
      { label: '部门任务', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), description: '本部门所有项目中的任务总数', ...buildTrendHelper(trendMap, 'totalTasks') },
      { label: '完成率', value: stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%`, description: '本部门已完成任务占比', ...buildTrendHelper(trendMap, 'completedTasks') },
      { label: '延期率', value: stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0}%`, description: '本部门延期任务占比', ...buildTrendHelper(trendMap, 'overdue', true) },
      { label: '部门人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0), description: '本部门当前的成员总数' },
      { label: '资源利用率', value: stats.utilizationRate || 0, displayValue: `${stats.utilizationRate || 0}%`, description: '本部门成员平均工作负荷', ...buildTrendHelper(trendMap, 'utilizationRate') },
      { label: '本周到期', value: stats.weekDueTasks || 0, displayValue: String(stats.weekDueTasks || 0), description: '本周内需要完成的任务数量', ...buildTrendHelper(trendMap, 'weekDueTasks') },
      { label: '活跃度', value: stats.activityRate || 0, displayValue: `${stats.activityRate || 0}%`, description: '7日内有进展更新的任务占比' },
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
 * 从成员状态数据计算组平均负载率
 */
function computeGroupAvgLoad(members?: Array<{ loadRate: number }>): number {
  if (!members || members.length === 0) return 0;
  const total = members.reduce((sum, m) => sum + (m.loadRate || 0), 0);
  return Math.round(total / members.length);
}

/**
 * 转换 TechManager 仪表板数据
 */
function transformTechManagerData(
  stats: any,
  trends: any[],
  trendsSummary: Record<string, any> | null,
  detail: any,
  groupId?: number,
): TechManagerDashboardData {
  const trendMap = trendsSummary || {};

  const alerts = [
    { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '延期预警', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '已延期', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/reports/delay-analysis' },
    { type: 'pending_approval' as const, count: stats.pendingApprovalTasks || 0, label: '待我审批', color: 'info' as const, actionLabel: '立即审批', actionPath: '/settings/approvals' },
  ];

  return {
    alerts,
    metrics: [
      { label: '组内项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), description: '当前技术组参与的项目数量', ...buildTrendHelper(trendMap, 'activeProjects') },
      { label: '组内任务', value: stats.totalTasks || 0, displayValue: String(stats.totalTasks || 0), description: '组内所有成员的任务总数', ...buildTrendHelper(trendMap, 'totalTasks') },
      { label: '完成率', value: stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%`, description: '组内已完成任务占比', ...buildTrendHelper(trendMap, 'completedTasks') },
      { label: '延期率', value: stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0, displayValue: `${stats.totalTasks ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0}%`, description: '超过计划截止日期的任务占比', ...buildTrendHelper(trendMap, 'overdue', true) },
      { label: '组内人数', value: stats.totalMembers || 0, displayValue: String(stats.totalMembers || 0), description: '当前技术组的成员总数' },
      { label: '平均负载', value: computeGroupAvgLoad(detail?.memberStatus), displayValue: `${computeGroupAvgLoad(detail?.memberStatus)}%`, description: '组内成员的平均任务负载率' },
      { label: '本周到期', value: stats.weekDueTasks || 0, displayValue: String(stats.weekDueTasks || 0), description: '本周内需要完成的任务数量', ...buildTrendHelper(trendMap, 'weekDueTasks') },
      { label: '活跃度', value: stats.activityRate || 0, displayValue: `${stats.activityRate || 0}%`, description: '7日内有进展更新的任务占比' },
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
  trendsSummary: Record<string, any> | null,
  detail: any,
): EngineerDashboardData {
  const trendMap = trendsSummary || {};

  return {
    alerts: [
      { type: 'overdue' as const, count: stats.overdueTasks || 0, label: '逾期任务', color: 'danger' as const, actionLabel: '查看详情', actionPath: '/tasks' },
      { type: 'delay_warning' as const, count: stats.delayWarningTasks || 0, label: '即将到期', color: 'warning' as const, actionLabel: '查看详情', actionPath: '/tasks' },
      { type: 'week_due' as const, count: stats.weekDueTasks || 0, label: '本周到期', color: 'info' as const, actionLabel: '查看详情', actionPath: '/tasks' },
    ],
    todoTasks: (detail?.todoTasks || []).map((t: any) => ({
      id: t.id, name: t.name, projectName: t.projectName,
      dueDate: t.dueDate || '', progress: t.progress,
      priority: t.priority as 'high' | 'medium' | 'low',
      daysOverdue: t.daysOverdue, lastUpdated: t.lastUpdated,
    })),
    metrics: [
      { label: '参与项目', value: stats.totalProjects || 0, displayValue: String(stats.totalProjects || 0), description: '当前参与的项目数量', ...buildTrendHelper(trendMap, 'activeProjects') },
      { label: '进行中', value: stats.inProgressTasks || 0, displayValue: String(stats.inProgressTasks || 0), description: '当前正在进行中的任务数量', ...buildTrendHelper(trendMap, 'totalTasks') },
      { label: '已完成', value: stats.completedTasks || 0, displayValue: String(stats.completedTasks || 0), description: '已完成并关闭的任务数量', ...buildTrendHelper(trendMap, 'completedTasks') },
      { label: '待开始', value: stats.pendingTasks || 0, displayValue: String(stats.pendingTasks || 0), description: '已分配但尚未开始的任务数量' },
    ],
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
        analyticsApi.getTaskTrend({ days: 30, projectId }),
        analyticsApi.getAllProjectsProgress(),
        analyticsApi.getDashboardTrends(7).catch(handleTrendError('admin')),
        analyticsApi.getAdminDashboardDetail(projectId).catch(() => null),
      ]);
      return transformAdminData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: false, // 性能优化：关闭窗口焦点刷新，已有10分钟定时刷新
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
        analyticsApi.getTaskTrend({ days: 30, projectId }),
        analyticsApi.getDashboardTrends(7).catch(handleTrendError('dept_manager')),
        analyticsApi.getDeptManagerDashboardDetail(projectId).catch(() => null),
      ]);
      return transformDeptManagerData(stats, trends, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: false, // 性能优化：关闭窗口焦点刷新，已有10分钟定时刷新
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
        analyticsApi.getTaskTrend({ days: 30, projectId }),
        analyticsApi.getDashboardTrends(7).catch(handleTrendError('tech_manager')),
        analyticsApi.getTechManagerDashboardDetail(groupId, projectId).catch(() => null),
      ]);
      return transformTechManagerData(stats, trends, trendsSummary, detail, groupId);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: false, // 性能优化：关闭窗口焦点刷新，已有10分钟定时刷新
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
        analyticsApi.getTaskTrend({ days: 30, projectId }),
        analyticsApi.getAllProjectsProgress(),
        analyticsApi.getDashboardTrends(7).catch(handleTrendError('engineer')),
        analyticsApi.getEngineerDashboardDetail(projectId).catch(() => null),
      ]);
      return transformEngineerData(stats, trends, projects, trendsSummary, detail);
    },
    staleTime: DASHBOARD_STALE_TIME,
    refetchInterval: DASHBOARD_REFETCH_INTERVAL,
    refetchOnWindowFocus: false, // 性能优化：关闭窗口焦点刷新，已有10分钟定时刷新
  });
}
