/**
 * 报表分析 API
 * 符合需求文档 REQ_07_analytics.md 要求
 *
 * 注：axios 拦截器会自动转换：
 * - 请求参数：camelCase -> snake_case
 * - 响应数据：snake_case -> camelCase
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  ProjectProgressReportData,
  TaskStatisticsReportData,
  DelayAnalysisReportData,
  MemberAnalysisReportData,
  ResourceEfficiencyReportData,
  ReportFilters,
  StatsCardData,
  PieChartDataItem,
  BarChartDataItem,
  TrendData,
  MilestoneItem,
  TaskStatisticsItem,
  TaskAssigneeSummary,
  DelayedTaskItem,
  MemberDelayStatistic,
  AllocationSuggestion,
  MemberTaskItem,
  MemberSummaryItem,
  MemberEfficiencyItem,
  TaskTypeMixedDataItem,
} from '@/features/analytics/reports/types';
import type { UserRole } from '@/features/analytics/reports/types';

const BASE_PATH = '/analytics';

// ============ 通用工具 ============

/** 构建统计卡片数据 */
function stat(value: number, displayValue?: string, trend?: number): StatsCardData {
  const display = displayValue ?? String(value);
  return {
    value,
    displayValue: display,
    trend,
    trendDirection: trend && trend > 0 ? 'up' : trend && trend < 0 ? 'down' : 'stable',
  };
}

/** 状态中文映射 */
const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  delay_warning: '延期预警',
  delayed: '已延迟',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  overdue_completed: '超期完成',
  suspended: '暂停',
  cancelled: '取消',
};

/** 状态颜色映射 */
const STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  delay_warning: '#f59e0b',
  delayed: '#ef4444',
  early_completed: '#22c55e',
  on_time_completed: '#10b981',
  overdue_completed: '#f97316',
  suspended: '#8b5cf6',
  cancelled: '#6b7280',
};

/** 优先级中文映射 */
const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

/** 优先级排序权重 */
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** 延期类型中文 */
const DELAY_TYPE_LABELS: Record<string, string> = {
  delay_warning: '延期预警',
  delayed: '已延迟',
  overdue_completed: '超期完成',
};

/** 将趋势数据点转换为 TrendData 格式 */
function buildTrendData(
  points: Array<{ date?: string; period?: string; value?: number; created?: number; completed?: number; delayed?: number }>,
  datasetLabels: string[],
  extractFns: Array<(p: any) => number>,
  colors: string[],
): TrendData {
  if (!points || points.length === 0) {
    return { labels: [], datasets: datasetLabels.map((label, i) => ({ label, values: [], color: colors[i] })) };
  }
  const labels = points.map(p => {
    const raw = p.date ?? p.period ?? '';
    // "2026-W14" → "W14"
    const match = raw.match(/W(\d+)$/);
    return match ? `W${match[1]}` : raw.length > 10 ? raw.slice(5) : raw;
  });
  return {
    labels,
    datasets: datasetLabels.map((label, i) => ({
      label,
      values: points.map(p => extractFns[i](p)),
      color: colors[i],
    })),
  };
}

// ============ 项目进度报表 ============

export async function getProjectProgressReport(projectId: string): Promise<ProjectProgressReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/project-progress`,
    { params: { projectId } }
  );
  const data = response.data;

  // 构建统计卡片
  const totalTasks = data.totalTasks ?? 0;
  const completedTasks = data.completedTasks ?? 0;
  const inProgressTasks = data.inProgressTasks ?? 0;
  const progress = data.progress ?? 0;

  // 统计里程碑状态
  const milestones = (data.milestones ?? []).map((m: any) => ({
    id: String(m.id ?? ''),
    name: m.name ?? '',
    projectName: data.projectName ?? '',
    targetDate: m.targetDate ?? '',
    completionPercentage: m.completionPercentage ?? 0,
    status: mapMilestoneStatus(m.status),
    totalTasks: 0,
    completedTasks: 0,
    daysToTarget: m.targetDate ? daysBetween(new Date(), new Date(m.targetDate)) : undefined,
  }));

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;
  const pendingMilestones = milestones.filter(m => m.status === 'pending').length;
  const overdueMilestones = milestones.filter(m => m.status === 'overdue').length;

  // 状态分布 → 饼图
  const statusDistribution: PieChartDataItem[] = (data.statusDistribution ?? []).map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count ?? 0,
    color: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  // 里程碑状态 → 柱状图
  const milestoneStatus: BarChartDataItem[] = [
    { name: '已完成', values: { value: completedMilestones } },
    { name: '进行中', values: { value: inProgressMilestones } },
    { name: '待处理', values: { value: pendingMilestones } },
    { name: '已延期', values: { value: overdueMilestones } },
  ];

  return {
    stats: {
      overallProgress: stat(progress, `${progress}%`),
      completedTasks: stat(completedTasks),
      inProgressTasks: stat(inProgressTasks),
      completedMilestones: stat(completedMilestones),
    },
    dataScope: { role: 'admin' },
    statusDistribution,
    milestoneStatus,
    milestones,
    progressTrend: { labels: [], datasets: [] },
  };
}

/** 里程碑状态映射 */
function mapMilestoneStatus(status: string): 'pending' | 'in_progress' | 'completed' | 'overdue' {
  const map: Record<string, 'pending' | 'in_progress' | 'completed' | 'overdue'> = {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    overdue: 'overdue',
    done: 'completed',
  };
  return map[status] ?? 'pending';
}

/** 计算两个日期之间的天数 */
function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

// ============ 任务统计报表 ============

export async function getTaskStatisticsReport(filters: ReportFilters = {}): Promise<TaskStatisticsReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/task-statistics`,
    {
      params: {
        projectId: filters.projectId,
        assigneeId: filters.assigneeId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }
  );
  const data = response.data;

  const totalTasks = data.totalTasks ?? 0;
  const avgCompletionRate = data.avgCompletionRate ?? 0;
  const delayRate = data.delayRate ?? 0;
  const urgentCount = data.urgentCount ?? 0;

  // 任务类型分布 → 混合图表数据
  const taskTypeDistribution: TaskTypeMixedDataItem[] = (data.taskTypeDistribution ?? []).map((item: any) => ({
    name: item.taskTypeName ?? item.name ?? '其它',
    count: item.count ?? 0,
    completionRate: item.completionRate ?? 0,
    delayRate: item.delayRate ?? 0,
  }));

  // 优先级分布 → 柱状图
  const priorityRaw: Record<string, number> = data.priorityDistribution ?? {};
  const priorityDistribution: BarChartDataItem[] = Object.entries(priorityRaw)
    .sort(([a], [b]) => (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99))
    .map(([key, count]) => ({
      name: PRIORITY_LABELS[key] ?? key,
      values: { count: count as number },
    }));

  // 负责人分布 → 柱状图
  const assigneeDistribution: BarChartDataItem[] = (data.assigneeDistribution ?? []).map((item: any) => ({
    name: item.assigneeName ?? '未分配',
    values: {
      taskCount: item.taskCount ?? 0,
      completedCount: item.completedCount ?? 0,
      delayedCount: item.delayedCount ?? 0,
    },
  }));

  // 负责人汇总 → 表格数据
  const assigneeSummary: TaskAssigneeSummary[] = (data.assigneeDistribution ?? []).map((item: any) => ({
    assigneeName: item.assigneeName ?? '未分配',
    projectName: '',
    totalTasks: item.taskCount ?? 0,
    completedTasks: item.completedCount ?? 0,
    delayedTasks: item.delayedCount ?? 0,
    completionRate: (item.taskCount ?? 0) > 0
      ? Math.round(((item.completedCount ?? 0) / (item.taskCount ?? 0)) * 100)
      : 0,
    mainTaskType: '',
  }));

  // 任务明细列表 → 表格数据
  const taskList: TaskStatisticsItem[] = (data.taskList ?? []).map((t: any) => ({
    id: String(t.id ?? ''),
    wbsCode: '',
    description: t.description ?? '',
    projectName: t.projectName ?? '未分配',
    assigneeName: t.assigneeName ?? '未分配',
    status: t.status ?? '',
    progress: t.progress ?? 0,
    taskType: t.taskType ?? 'other',
    priority: t.priority ?? 'medium',
    plannedEndDate: t.plannedEndDate ?? null,
    completedDate: null,
  }));

  return {
    stats: {
      totalTasks: stat(totalTasks),
      avgCompletionRate: stat(avgCompletionRate, `${avgCompletionRate}%`),
      delayRate: stat(delayRate, `${delayRate}%`),
      upcomingDelay: stat(urgentCount),
    },
    dataScope: { role: 'admin' },
    taskTypeDistribution,
    priorityDistribution,
    assigneeDistribution,
    taskTrend: { labels: [], datasets: [] },
    taskList,
    assigneeSummary,
  };
}

// ============ 延期分析报表 ============

export async function getDelayAnalysisReport(filters: ReportFilters = {}): Promise<DelayAnalysisReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/delay-analysis`,
    {
      params: {
        projectId: filters.projectId,
        delayType: filters.delayType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }
  );
  const data = response.data;

  const totalDelayed = data.totalDelayed ?? 0;
  const warningCount = data.warningCount ?? 0;
  const delayedCount = data.delayedCount ?? 0;
  const overdueCompletedCount = data.overdueCompletedCount ?? 0;

  // 延期类型分布 → 饼图
  const delayTypeDistribution: PieChartDataItem[] = [
    { name: '延期预警', value: warningCount, color: '#f59e0b' },
    { name: '已延迟', value: delayedCount, color: '#ef4444' },
    { name: '超期完成', value: overdueCompletedCount, color: '#f97316' },
  ].filter(d => d.value > 0);

  // 延期原因分布 → 饼图
  const delayReasonDistribution: PieChartDataItem[] = (data.delayReasons ?? []).map((r: any, i: number) => ({
    name: r.reason || '未填写',
    value: r.count ?? 0,
    color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6],
  }));

  // 延期分布 → 柱状图（按负责人）
  const delayDistribution: BarChartDataItem[] = (data.delayedTasks ?? []).reduce((acc: BarChartDataItem[], t: any) => {
    const name = t.assigneeName ?? '未分配';
    const existing = acc.find(d => d.name === name);
    if (existing) {
      existing.values.count = (existing.values.count ?? 0) + 1;
    } else {
      acc.push({ name, values: { count: 1 } });
    }
    return acc;
  }, []);

  // 延期趋势 → TrendData
  const delayTrend = buildTrendData(
    data.delayTrend ?? [],
    ['延期数'],
    [(p: any) => p.delayed ?? p.value ?? 0],
    ['#ef4444'],
  );

  // 收敛趋势
  const convergenceTrend = buildTrendData(
    data.delayTrend ?? [],
    ['新增延期', '已解决'],
    [
      (p: any) => p.created ?? 0,
      (p: any) => p.completed ?? 0,
    ],
    ['#ef4444', '#22c55e'],
  );

  // 延期任务列表 → 表格数据
  const delayedTasks: DelayedTaskItem[] = (data.delayedTasks ?? []).map((t: any) => ({
    id: String(t.id ?? ''),
    wbsCode: '',
    description: t.description ?? '',
    assigneeName: t.assigneeName ?? '未分配',
    projectName: t.projectName ?? '未分配',
    taskType: '',
    plannedEndDate: '',
    delayDays: t.delayDays ?? 0,
    delayType: t.delayType ?? t.status ?? 'delayed',
    delayReason: t.reason ?? undefined,
    riskLevel: (t.delayDays ?? 0) > 14 ? 'high' : (t.delayDays ?? 0) > 7 ? 'medium' : 'low',
  }));

  // 成员延期统计
  const memberDelayStats: MemberDelayStatistic[] = buildMemberDelayStats(delayedTasks);

  // 分配建议
  const suggestions: AllocationSuggestion[] = [];

  return {
    stats: {
      totalDelayed: stat(totalDelayed),
      delayWarning: stat(warningCount),
      delayed: stat(delayedCount),
      overdueCompleted: stat(overdueCompletedCount),
      delayRate: stat(totalDelayed > 0 ? Math.round((delayedCount / totalDelayed) * 100) : 0, `${totalDelayed > 0 ? Math.round((delayedCount / totalDelayed) * 100) : 0}%`),
      upcomingDelay: stat(0),
    },
    dataScope: { role: 'admin' },
    delayTypeDistribution,
    delayReasonDistribution,
    delayDistribution,
    delayTrend,
    convergenceTrend,
    delayedTasks,
    memberDelayStats,
    suggestions,
  };
}

/** 从延期任务列表聚合成员延期统计 */
function buildMemberDelayStats(tasks: DelayedTaskItem[]): MemberDelayStatistic[] {
  const map = new Map<string, { name: string; total: number; high: number; medium: number }>();
  for (const t of tasks) {
    const key = t.assigneeName;
    const entry = map.get(key) ?? { name: key, total: 0, high: 0, medium: 0 };
    entry.total++;
    if (t.riskLevel === 'high') entry.high++;
    if (t.riskLevel === 'medium') entry.medium++;
    map.set(key, entry);
  }
  return Array.from(map.entries()).map(([name, e], i) => ({
    memberId: i,
    memberName: name,
    totalTasks: e.total,
    delayedTasks: e.total,
    delayRate: 100,
    workload: 0,
    activityRate: 0,
    riskLevel: e.high > 2 ? 'high' : e.medium > 1 ? 'medium' : 'low' as const,
  }));
}

// ============ 成员任务分析报表（扩展版：支持多成员对比） ============

export async function getMemberAnalysisReport(filters: ReportFilters = {}): Promise<MemberAnalysisReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/member-analysis`,
    {
      params: {
        memberId: filters.memberId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }
  );
  const data = response.data;

  return transformMemberAnalysisResponse(data);
}

/**
 * 将后端响应转换为前端 MemberAnalysisReportData 格式
 */
function transformMemberAnalysisResponse(data: any): MemberAnalysisReportData {
  const membersSummary = data.membersSummary ?? [];

  // 聚合指标
  const totalCurrentTasks = membersSummary.reduce((sum: number, m: any) => sum + (Number(m.currentTasks) || 0), 0);
  const totalFullTimeRatio = membersSummary.reduce((sum: number, m: any) => sum + (Number(m.totalFullTimeRatio) || 0), 0);
  const avgCompletionRate = membersSummary.length > 0
    ? Math.round(membersSummary.reduce((sum: number, m: any) => sum + (Number(m.avgCompletionRate) || 0), 0) / membersSummary.length)
    : 0;

  // 构建统计卡片（兼容所有角色 key）
  const stats: Record<string, StatsCardData> = {
    currentTasks: stat(totalCurrentTasks),
    totalFulltimeRatio: stat(totalFullTimeRatio, `${totalFullTimeRatio}`),
    avgCompletionRate: stat(avgCompletionRate, `${avgCompletionRate}%`),
    memberActivity: stat(data.departmentActivityRate ?? 0, `${data.departmentActivityRate ?? 0}%`),
    totalMembers: stat(data.totalMembers ?? membersSummary.length),
    avgLoad: stat(data.avgLoad ?? 0, `${data.avgLoad ?? 0}%`),
    avgEstimationAccuracy: stat(data.avgEstimationAccuracy ?? 0, `${data.avgEstimationAccuracy ?? 0}%`),
    overloadedMembers: stat(data.overloadedMembers ?? 0),
    departmentActivityRate: stat(data.departmentActivityRate ?? 0, `${data.departmentActivityRate ?? 0}%`),
    deptMembers: stat(data.totalMembers ?? membersSummary.length),
    deptAvgLoad: stat(data.avgLoad ?? 0, `${data.avgLoad ?? 0}%`),
    deptAvgAccuracy: stat(data.avgEstimationAccuracy ?? 0, `${data.avgEstimationAccuracy ?? 0}%`),
    deptOverloaded: stat(data.overloadedMembers ?? 0),
    groupMembers: stat(data.totalMembers ?? membersSummary.length),
    groupAvgLoad: stat(data.avgLoad ?? 0, `${data.avgLoad ?? 0}%`),
    groupAvgAccuracy: stat(data.avgEstimationAccuracy ?? 0, `${data.avgEstimationAccuracy ?? 0}%`),
    groupOverloaded: stat(data.overloadedMembers ?? 0),
  };

  // 成员汇总 → 表格数据
  const memberSummary: MemberSummaryItem[] = membersSummary.map((m: any) => ({
    memberId: m.memberId,
    memberName: m.memberName ?? '未知',
    teamName: m.department ?? '-',
    totalTasks: Number(m.currentTasks) || 0,
    totalWorkload: (Number(m.totalFullTimeRatio) || 0) / 100,
    completedTasks: Math.round((Number(m.currentTasks) || 0) * (Number(m.avgCompletionRate) || 0) / 100),
    delayedTasks: 0,
    completionRate: Number(m.avgCompletionRate) || 0,
    activityRate: Number(m.activityRate) || 0,
  }));

  // 工作量分布 → 柱状图
  const workloadDistribution: BarChartDataItem[] = (data.workloadDistribution ?? []).map((item: any) => ({
    name: item.memberName ?? '未知',
    values: { taskCount: item.taskCount ?? 0, fullTimeRatio: item.fullTimeRatio ?? 0 },
  }));

  // 状态分布 → 饼图
  const statusDistribution: PieChartDataItem[] = (data.statusDistribution ?? []).map((item: any) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count ?? 0,
    color: STATUS_COLORS[item.status] ?? '#94a3b8',
  }));

  // 预估准确性分布 → 柱状图
  const estimationAccuracyDistribution: BarChartDataItem[] = (data.estimationDistribution ?? []).map((item: any) => ({
    name: item.category ?? '未知',
    values: { count: item.count ?? 0 },
  }));

  // 负载趋势 → TrendData
  const workloadTrend = buildTrendData(
    data.workloadTrend ?? [],
    ['平均负载'],
    [(p: any) => p.avgFullTimeRatio ?? 0],
    ['#0ea5e9'],
  );

  // 任务明细
  const memberTasks: MemberTaskItem[] = (data.memberTasks ?? []).map((t: any) => ({
    id: String(t.id ?? ''),
    wbsCode: '',
    description: t.description ?? '',
    projectName: t.projectName ?? '未分配',
    status: t.status ?? 'not_started',
    progress: t.progress ?? 0,
    fullTimeRatio: t.fullTimeRatio ?? 0,
    taskType: t.taskType ?? 'other',
    plannedEndDate: '',
    plannedDuration: t.plannedDuration,
    actualDuration: t.actualDuration,
    estimationAccuracy: t.estimationAccuracy,
    lastUpdated: t.lastUpdated,
  }));

  // 分配建议
  const suggestions: AllocationSuggestion[] = (data.suggestions ?? []).map((s: any) => ({
    type: s.type === 'overloaded' ? 'overload' as const : s.type === 'idle' ? 'idle' as const : 'low_activity' as const,
    targetId: 0,
    targetName: s.memberName ?? '',
    currentValue: s.currentLoad ?? 0,
    thresholdValue: 1.5,
    suggestion: s.suggestion ?? '',
    priority: s.type === 'overloaded' ? 'high' as const : 'medium' as const,
  }));

  return {
    stats,
    dataScope: { role: 'admin' },
    workloadDistribution,
    statusDistribution,
    estimationAccuracyDistribution,
    workloadTrend,
    completionTrend: { labels: [], datasets: [] },
    accuracyTrend: { labels: [], datasets: [] },
    memberTasks,
    memberSummary,
    suggestions,
  };
}

// ============ 资源效能分析报表（v1.2 新增） ============

export async function getResourceEfficiencyReport(filters: ReportFilters = {}): Promise<ResourceEfficiencyReportData> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/resource-efficiency`,
    {
      params: {
        projectId: filters.projectId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    }
  );
  const data = response.data;

  const avgProductivity = data.avgProductivity ?? 0;
  const avgEstimationAccuracy = data.avgEstimationAccuracy ?? 0;
  const avgReworkRate = data.avgReworkRate ?? 0;
  const avgFulltimeUtilization = data.avgFulltimeUtilization ?? 0;

  // 成员效能明细
  const memberEfficiency: MemberEfficiencyItem[] = (data.memberEfficiencyList ?? []).map((m: any) => ({
    memberId: m.memberId,
    memberName: m.memberName,
    department: m.department,
    techGroup: m.techGroup,
    completedTasks: m.completedTasks ?? 0,
    productivity: m.productivity ?? 0,
    estimationAccuracy: m.estimationAccuracy ?? 0,
    reworkRate: m.reworkRate ?? 0,
    fulltimeUtilization: m.fulltimeUtilization ?? 0,
    activityRate: 0,
    efficiencyLevel: (m.productivity ?? 0) >= 1.2 ? 'high' as const : (m.productivity ?? 0) >= 0.8 ? 'medium' as const : 'low' as const,
  }));

  // 产能分布 → 柱状图
  const productivityDistribution: BarChartDataItem[] = memberEfficiency.slice(0, 10).map(m => ({
    name: m.memberName,
    values: { productivity: m.productivity },
  }));

  // 预估准确性分布 → 饼图（从成员数据聚合）
  const accuracyDistribution: PieChartDataItem[] = buildAccuracyDistribution(memberEfficiency);

  // 效能趋势
  const efficiencyTrend = buildTrendData(
    data.productivityTrend ?? [],
    ['产能'],
    [(p: any) => p.productivity ?? 0],
    ['#3b82f6'],
  );

  // 团队效能对比 → 柱状图
  const efficiencyComparison: BarChartDataItem[] = (data.teamEfficiencyComparison ?? []).map((t: any) => ({
    name: t.teamName,
    values: { avgProductivity: t.avgProductivity ?? 0 },
  }));

  // 分配建议（暂时为空）
  const suggestions: AllocationSuggestion[] = [];

  return {
    stats: {
      avgProductivity: stat(avgProductivity, `${avgProductivity}`),
      avgEstimationAccuracy: stat(avgEstimationAccuracy, `${avgEstimationAccuracy}%`),
      avgReworkRate: stat(avgReworkRate, `${avgReworkRate}%`),
      memberActivity: stat(avgFulltimeUtilization, `${avgFulltimeUtilization}%`),
    },
    dataScope: { role: 'admin' },
    productivityDistribution,
    accuracyDistribution,
    efficiencyTrend,
    memberEfficiency,
    efficiencyComparison,
    suggestions,
  };
}

/** 从成员效能数据构建预估准确性分布饼图 */
function buildAccuracyDistribution(members: MemberEfficiencyItem[]): PieChartDataItem[] {
  let accurate = 0;
  let slight = 0;
  let obvious = 0;
  let severe = 0;

  for (const m of members) {
    const acc = m.estimationAccuracy;
    if (acc >= 0.9) accurate++;
    else if (acc >= 0.7) slight++;
    else if (acc >= 0.5) obvious++;
    else severe++;
  }

  return [
    { name: '精准', value: accurate, color: '#22c55e' },
    { name: '良好', value: slight, color: '#f59e0b' },
    { name: '偏差', value: obvious, color: '#f97316' },
    { name: '严重偏差', value: severe, color: '#ef4444' },
  ].filter(d => d.value > 0);
}

// ============ 导出 ============

export const reportsApi = {
  getProjectProgressReport,
  getTaskStatisticsReport,
  getDelayAnalysisReport,
  getMemberAnalysisReport,
  getResourceEfficiencyReport,
};
