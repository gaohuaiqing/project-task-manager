/**
 * 报表数据转换层
 * 将后端 API 数据转换为前端图表所需格式
 * @module analytics/reports/data/transformers
 */

import type {
  TaskStatisticsReport,
  DelayAnalysisReport,
  MemberAnalysisExtendedResponse,
  ResourceEfficiencyReport,
  ProjectProgressReport,
  ProjectProgressSummary,
} from '@/types/api/analytics';
import type {
  TaskStatisticsData,
  DelayAnalysisData,
  MemberAnalysisData,
  ResourceEfficiencyData,
  ProjectProgressData,
  ProjectProgressSummaryData,
  StatCard,
  PieChartData,
  BarChartData,
  LineChartData,
  ScatterChartData,
  TaskStatisticItem,
  DelayTaskItem,
  MemberTaskItem,
  MemberCapabilitySummary,
  AllocationSuggestion,
  MemberEfficiencyItem as FrontendMemberEfficiencyItem,
  EfficiencySuggestion,
  MilestoneItem,
  ProjectProgressCard,
} from '../types';
import {
  DEFAULT_CHART_COLORS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  DELAY_TYPE_LABELS,
  COMPLETION_THRESHOLDS,
  DELAY_RATE_THRESHOLDS,
  UTILIZATION_THRESHOLDS,
  ESTIMATION_THRESHOLDS,
  PRODUCTIVITY_THRESHOLDS,
  REWORK_RATE_THRESHOLDS,
  DELAY_DAYS_RISK,
  OVERLOADED_MEMBER_THRESHOLDS,
  DISPLAY_LIMITS,
} from '../../shared/constants';

// ==================== 颜色别名 ====================
// 集中引用共享颜色常量，避免重复定义

const C = {
  /** 主色序列 */
  primary: DEFAULT_CHART_COLORS,
  /** 语义色 */
  indigo: DEFAULT_CHART_COLORS[0],
  green: DEFAULT_CHART_COLORS[1],
  amber: DEFAULT_CHART_COLORS[2],
  red: DEFAULT_CHART_COLORS[3],
  violet: DEFAULT_CHART_COLORS[4],
  pink: DEFAULT_CHART_COLORS[5],
  cyan: DEFAULT_CHART_COLORS[6],
  lime: DEFAULT_CHART_COLORS[7],
  muted: '#64748B',
  lightGray: '#E2E8F0',
};

// ==================== 安全计算工具函数 ====================

/** 安全百分比计算，避免除零 */
function safePercentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ==================== 任务统计报表转换 ====================

export function transformTaskStatisticsReport(
  report: TaskStatisticsReport,
  trendData?: { date: string; created: number; completed: number; delayed: number }[],
  priorityTrendData?: Array<{ period: string; priority: string; completionRate: number; totalTasks: number; completedTasks: number }>
): TaskStatisticsData {
  // 统计卡片
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const rootTasks = report.totalRootTasks ?? 0;
  const totalTasks = report.totalTasks ?? 0;

  const stats: StatCard[] = [
    {
      key: 'total_tasks',
      label: '任务总数',
      value: totalTasks,
      icon: 'ClipboardList',
      description: '根任务：项目主要工作包（管理视角） | 全部任务：包含所有子任务（执行视角）',
      subtitle: rootTasks > 0 ? `${rootTasks} 根任务 / ${totalTasks - rootTasks} 子任务` : undefined,
    },
    {
      key: 'avg_completion_rate',
      label: '平均完成率',
      value: `${report.avgCompletionRate.toFixed(1)}%`,
      icon: 'CheckCircle',
      description: '所有任务的平均进度完成百分比',
      valueColor: report.avgCompletionRate >= COMPLETION_THRESHOLDS.good ? 'success' : report.avgCompletionRate >= COMPLETION_THRESHOLDS.warning ? 'warning' : 'danger',
    },
    {
      key: 'delay_rate',
      label: '延期率',
      value: `${report.delayRate.toFixed(1)}%`,
      icon: 'AlertTriangle',
      description: '已延期和延期预警任务占总任务的百分比',
      invertTrendColors: true,
      valueColor: report.delayRate > DELAY_RATE_THRESHOLDS.warning ? 'danger' : report.delayRate > DELAY_RATE_THRESHOLDS.safe ? 'warning' : 'success',
      trend: report.delayRate > DELAY_RATE_THRESHOLDS.safe ? { value: report.delayRate, direction: 'up', isPositive: false } : undefined,
    },
    {
      key: 'urgent_count',
      label: '紧急任务',
      value: report.urgentCount,
      icon: 'Zap',
      description: '优先级为"紧急"的任务数量，需优先处理',
      valueColor: report.urgentCount > 0 ? 'danger' : 'default',
    },
  ];

  // 优先级分布（柱状图）
  const priorityLabels = Object.keys(report.priorityDistribution);
  const priorityChart: BarChartData = {
    labels: priorityLabels.map(l => PRIORITY_LABELS[l] || l),
    datasets: [{
      label: '任务数量',
      values: priorityLabels.map(l => report.priorityDistribution[l] || 0),
      color: priorityLabels.map(l => PRIORITY_COLORS[l] || C.indigo),
    }],
  };

  // 任务状态分布（饼图）- 从 assigneeDistribution 转换为状态分布
  // 注意: API 可能返回字符串类型的数值，需显式转换为 Number
  const statusMap: Record<string, number> = {};
  report.assigneeDistribution.forEach(a => {
    const taskCount = Number(a.taskCount);
    const completedCount = Number(a.completedCount);
    const delayedCount = Number(a.delayedCount);
    // 使用 Math.max 防止数据不一致导致负值
    const inProgressCount = Math.max(0, taskCount - completedCount - delayedCount);
    statusMap['进行中/待处理'] = (statusMap['进行中/待处理'] || 0) + inProgressCount;
    statusMap['已完成'] = (statusMap['已完成'] || 0) + completedCount;
    statusMap['已延期'] = (statusMap['已延期'] || 0) + delayedCount;
  });
  const statusTotal = Object.values(statusMap).reduce((sum, v) => sum + v, 0);
  const statusChart: PieChartData = {
    labels: Object.keys(statusMap),
    values: Object.values(statusMap),
    percentages: Object.values(statusMap).map(v => safePercentage(v, statusTotal)),
  };

  // 任务类型分布（横向柱状图）
  const taskTypeChart: BarChartData = {
    labels: report.taskTypeDistribution.map(t => t.taskTypeName),
    datasets: [{
      label: '任务数量',
      values: report.taskTypeDistribution.map(t => t.count),
    }],
  };

  // 任务趋势（折线图）- 优先使用后端直接返回的趋势数据
  const actualTrendData = report.taskTrend || trendData;
  const taskTrend: LineChartData = actualTrendData && actualTrendData.length > 0 ? {
    labels: actualTrendData.map(d => d.date),
    datasets: [
      { label: '新增', values: actualTrendData.map(d => d.created), color: C.indigo },
      { label: '完成', values: actualTrendData.map(d => d.completed), color: C.green },
      { label: '延期', values: actualTrendData.map(d => d.delayed), color: C.red },
    ],
  } : generateEmptyTrend();

  // 优先级完成率趋势 - 使用后端提供的真实数据
  const priorityTrend: LineChartData = priorityTrendData && priorityTrendData.length > 0
    ? transformPriorityTrendData(priorityTrendData)
    : generateEmptyTrend();

  // 任务类型对比（完成率 vs 延期率）
  const taskTypeComparison: BarChartData = {
    labels: report.taskTypeDistribution.map(t => t.taskTypeName),
    datasets: [
      { label: '完成率', values: report.taskTypeDistribution.map(t => t.completionRate), color: C.green },
      { label: '延期率', values: report.taskTypeDistribution.map(t => t.delayRate), color: C.red },
    ],
  };

  // 任务明细 - 使用后端提供的真实数据
  const taskDetails: TaskStatisticItem[] = report.taskList.map(task => ({
    id: task.id,
    taskName: task.description,
    wbsCode: task.wbsCode || task.id, // 优先使用 wbsCode，无则回退到 id
    projectName: task.projectName,
    taskType: mapTaskType(task.taskType), // 使用映射函数转换为中文
    priority: mapPriority(task.priority),
    status: mapTaskStatus(task.status),
    assigneeName: task.assigneeName,
    progress: task.progress,
    activityRate: task.activityRate, // 使用后端计算的活跃度
    plannedEndDate: task.plannedEndDate || '',
    delayDays: task.delayDays, // 使用后端计算的延期天数
  }));

  return {
    stats,
    totalRootTasks: rootTasks,
    totalTasks,
    priorityChart,
    statusChart,
    taskTypeChart,
    taskTrend,
    priorityTrend,
    taskTypeComparison,
    taskDetails,
  };
}

// ==================== 延期分析报表转换 ====================

export function transformDelayAnalysisReport(
  report: DelayAnalysisReport
): DelayAnalysisData {
  // 统计卡片
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const stats: StatCard[] = [
    {
      key: 'total_delayed',
      label: '延期任务总数',
      value: report.totalDelayed,
      icon: 'AlertCircle',
      description: '包含延期预警、已延期和超期完成的所有任务',
      valueColor: report.totalDelayed > DISPLAY_LIMITS.delayReasons ? 'danger' : report.totalDelayed > 0 ? 'warning' : 'success',
    },
    {
      key: 'warning_count',
      label: '延期预警',
      value: report.warningCount,
      icon: 'AlertTriangle',
      description: '接近截止日期但尚未延期的任务，需关注',
      invertTrendColors: true,
      valueColor: report.warningCount > DISPLAY_LIMITS.efficiencySuggestions ? 'danger' : 'warning',
      trend: report.warningCount > DISPLAY_LIMITS.efficiencySuggestions ? { value: report.warningCount, direction: 'up', isPositive: false } : undefined,
    },
    {
      key: 'delayed_count',
      label: '已延期',
      value: report.delayedCount,
      icon: 'XCircle',
      description: '已超过计划截止日期仍未完成的任务',
      valueColor: report.delayedCount > 0 ? 'danger' : 'success',
    },
    {
      key: 'overdue_completed_count',
      label: '超期完成',
      value: report.overdueCompletedCount,
      icon: 'CheckCircle',
      description: '已超过截止日期但最终完成的任务数',
      valueColor: 'default',
    },
  ];

  // 延期类型分布（饼图）
  const delayTypeChart: PieChartData = {
    labels: [DELAY_TYPE_LABELS.delay_warning, DELAY_TYPE_LABELS.delayed, DELAY_TYPE_LABELS.overdue_completed],
    values: [report.warningCount, report.delayedCount, report.overdueCompletedCount],
    percentages: [
      safePercentage(report.warningCount, report.totalDelayed),
      safePercentage(report.delayedCount, report.totalDelayed),
      safePercentage(report.overdueCompletedCount, report.totalDelayed),
    ],
  };

  // 延期原因分类（横向柱状图）
  const delayReasonChart: BarChartData = {
    labels: report.delayReasons.map(r => r.reason),
    datasets: [{
      label: '任务数量',
      values: report.delayReasons.map(r => r.count),
    }],
  };

  // 延期趋势 - 使用后端提供的真实数据
  const delayTrend: LineChartData = report.delayTrend && report.delayTrend.length > 0 ? {
    labels: report.delayTrend.map(d => d.date),
    datasets: [
      { label: '新增延期', values: report.delayTrend.map(d => d.delayed), color: C.red },
      { label: '已解决', values: report.delayTrend.map(d => d.completed), color: C.green },
    ],
  } : generateEmptyTrend();

  // 延期收敛趋势 - 使用后端 delayTrend 数据
  const delayResolvedTrend: LineChartData = report.delayTrend && report.delayTrend.length > 0 ? {
    labels: report.delayTrend.map(d => d.date),
    datasets: [
      { label: '新增延期', values: report.delayTrend.map(d => d.created), color: C.red },
      { label: '已解决', values: report.delayTrend.map(d => d.completed), color: C.green },
    ],
  } : generateEmptyTrend();

  // 延期任务列表
  const delayTasks: DelayTaskItem[] = report.delayedTasks.map(task => ({
    id: task.id,
    taskName: task.description,
    wbsCode: task.wbsCode || task.id,
    assigneeName: task.assigneeName,
    projectName: task.projectName,
    plannedEndDate: task.plannedEndDate || '',
    delayDays: task.delayDays,
    delayType: mapDelayType(task.delayType),
    delayReason: task.reason,
    riskLevel: task.delayDays > DELAY_DAYS_RISK.high ? 'high' : task.delayDays > DELAY_DAYS_RISK.medium ? 'medium' : 'low',
  }));

  // 图表①：当前已延期的责任人排行（横条图，双指标：当前延期任务数 + 历史延期次数）
  const delayedMembers = [...(report.delayedMemberStats || [])]
    .sort((a, b) => b.delayedTaskCount - a.delayedTaskCount)
    .slice(0, DISPLAY_LIMITS.topDelayMembers);
  const delayedMemberChart: BarChartData = delayedMembers.length > 0
    ? {
        labels: delayedMembers.map(m => m.assigneeName),
        datasets: [
          { label: '当前延期任务数', values: delayedMembers.map(m => m.delayedTaskCount), color: C.red },
          { label: '历史延期次数', values: delayedMembers.map(m => m.totalDelayCount), color: C.amber },
        ],
      }
    : { labels: [], datasets: [] };

  // 图表②：延期预警责任人排行（横条图，单指标：预警任务数）
  const warningMembers = [...(report.warningMemberStats || [])]
    .sort((a, b) => b.warningTaskCount - a.warningTaskCount)
    .slice(0, DISPLAY_LIMITS.topDelayMembers);
  const warningMemberChart: BarChartData = warningMembers.length > 0
    ? {
        labels: warningMembers.map(m => m.assigneeName),
        datasets: [
          { label: '预警任务数', values: warningMembers.map(m => m.warningTaskCount), color: C.amber },
        ],
      }
    : { labels: [], datasets: [] };

  return {
    stats,
    delayTypeChart,
    delayReasonChart,
    delayTrend,
    delayResolvedTrend,
    delayTasks,
    delayedMemberChart,
    warningMemberChart,
  };
}

// ==================== 成员分析报表转换 ====================

export function transformMemberAnalysisReport(
  report: MemberAnalysisExtendedResponse
): MemberAnalysisData {
  // 统计卡片
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const stats: StatCard[] = [
    {
      key: 'total_members',
      label: '分析成员数',
      value: report.totalMembers,
      icon: 'Users',
      description: '当前筛选条件下参与任务分配的成员总数',
    },
    {
      key: 'avg_load',
      label: '平均负荷',
      value: `${report.avgLoad.toFixed(1)}%`,
      icon: 'Activity',
      description: '全体成员的全职占比(FTE)平均值，100%表示满负荷',
      valueColor: report.avgLoad > UTILIZATION_THRESHOLDS.overloaded ? 'danger' : report.avgLoad > UTILIZATION_THRESHOLDS.idealMin ? 'warning' : 'default',
    },
    {
      key: 'avg_estimation_accuracy',
      label: '平均预估准确性',
      value: `${report.avgEstimationAccuracy.toFixed(1)}%`,
      icon: 'Target',
      description: '任务实际耗时与预估耗时的吻合程度，越高越好',
      valueColor: report.avgEstimationAccuracy >= ESTIMATION_THRESHOLDS.good ? 'success' : report.avgEstimationAccuracy >= ESTIMATION_THRESHOLDS.medium ? 'warning' : 'danger',
    },
    {
      key: 'overloaded_members',
      label: '超负荷成员',
      value: report.overloadedMembers,
      icon: 'AlertTriangle',
      description: '当前任务负荷超过100%全职比的成员数量',
      invertTrendColors: true,
      valueColor: report.overloadedMembers > OVERLOADED_MEMBER_THRESHOLDS.danger ? 'danger' : report.overloadedMembers > 0 ? 'warning' : 'success',
      trend: report.overloadedMembers > OVERLOADED_MEMBER_THRESHOLDS.danger ? { value: report.overloadedMembers, direction: 'up', isPositive: false } : undefined,
    },
  ];

  // 负荷分布（柱状图）
  const workloadChart: BarChartData = {
    labels: report.workloadDistribution.map(d => d.memberName),
    datasets: [
      { label: '任务数', values: report.workloadDistribution.map(d => d.taskCount), color: C.indigo },
      { label: '全职比', values: report.workloadDistribution.map(d => d.fullTimeRatio), color: C.green },
    ],
  };

  // 任务状态分布（饼图）
  const statusChart: PieChartData = {
    labels: report.statusDistribution.map(s => mapStatusToLabel(s.status)),
    values: report.statusDistribution.map(s => s.count),
    percentages: report.statusDistribution.map(s => Math.round((s.count / report.statusDistribution.reduce((sum, item) => sum + item.count, 0)) * 100)),
  };

  // 预估准确性分布（柱状图）
  const estimationChart: BarChartData = {
    labels: report.estimationDistribution.map(e => e.category),
    datasets: [{
      label: '数量',
      values: report.estimationDistribution.map(e => e.count),
    }],
  };

  // 负荷趋势
  const workloadTrend: LineChartData = report.workloadTrend && report.workloadTrend.length > 0 ? {
    labels: report.workloadTrend.map(d => d.period),
    datasets: [
      { label: '平均全职比', values: report.workloadTrend.map(d => d.avgFullTimeRatio), color: C.indigo },
      { label: '任务数', values: report.workloadTrend.map(d => d.taskCount), color: C.green },
    ],
  } : generateEmptyTrend();

  // 完成趋势 - 使用后端 workloadTrend 数据
  const completionTrend: LineChartData = report.workloadTrend && report.workloadTrend.length > 0 ? {
    labels: report.workloadTrend.map(d => d.period),
    datasets: [
      { label: '任务数', values: report.workloadTrend.map(d => d.taskCount), color: C.green },
    ],
  } : generateEmptyTrend();

  // 预估准确性趋势 - 使用后端 estimationDistribution 数据
  const estimationTrend: LineChartData = report.estimationDistribution && report.estimationDistribution.length > 0 ? {
    labels: report.estimationDistribution.map(e => e.category),
    datasets: [
      { label: '数量', values: report.estimationDistribution.map(e => e.count), color: C.indigo },
    ],
  } : generateEmptyTrend();

  // 成员任务列表 - 使用后端提供的真实数据
  const memberTasks: MemberTaskItem[] = report.memberTasks.map(task => ({
    memberName: task.assigneeName || '未分配',
    taskName: task.description,
    projectName: task.projectName,
    taskStatus: mapTaskStatus(task.status),
    progress: task.progress,
    fullTimeRatio: task.fullTimeRatio,
    activityRate: task.activityRate ?? task.progress,
    plannedDuration: task.plannedDuration ?? 0,
    actualDuration: task.actualDuration ?? 0,
    estimationAccuracy: task.estimationAccuracy ?? 0,
    lastUpdated: (task as any).updatedAt || new Date().toISOString(),
  }));

  // 成员能力汇总 - 使用后端提供的真实数据
  const memberCapabilities: MemberCapabilitySummary[] = report.membersSummary.map(member => ({
    memberId: String(member.memberId),
    memberName: member.memberName,
    rootTasks: member.rootTasks ?? 0,
    subTasks: member.subTasks ?? 0,
    totalTasks: (member.rootTasks ?? 0) + (member.subTasks ?? 0),
    completedTasks: member.completedTasks ?? 0,
    avgProgress: member.avgCompletionRate,
    avgEstimationAccuracy: member.estimationAccuracy,
    activityRate: member.activityRate ?? 0,
    capability: {
      modelName: '默认能力模型',
      dimensions: [
        { name: '预估准确性', score: Math.round(member.estimationAccuracy) },
        { name: '活跃度', score: Math.round(member.activityRate ?? 0) },
        { name: '完成率', score: Math.round(member.avgCompletionRate) },
      ],
    },
  }));

  // 分配建议
  const allocationSuggestions: AllocationSuggestion[] = report.suggestions.map(s => ({
    type: mapSuggestionType(s.type),
    memberName: s.memberName,
    currentValue: s.currentLoad,
    threshold: 100, // 默认阈值
    suggestion: s.suggestion,
  }));

  return {
    stats,
    workloadChart,
    taskStatusChart: statusChart,
    estimationChart,
    workloadTrend,
    completionTrend,
    estimationTrend,
    memberTasks,
    memberCapabilities,
    allocationSuggestions,
  };
}

// ==================== 资源效能报表转换 ====================

export function transformResourceEfficiencyReport(
  report: ResourceEfficiencyReport
): ResourceEfficiencyData {
  // 统计卡片
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const stats: StatCard[] = [
    {
      key: 'avg_productivity',
      label: '平均产能',
      value: report.avgProductivity.toFixed(1),
      icon: 'TrendingUp',
      description: '团队平均每周完成的任务数量，衡量整体产出效率',
      valueColor: report.avgProductivity >= PRODUCTIVITY_THRESHOLDS.good ? 'success' : report.avgProductivity >= PRODUCTIVITY_THRESHOLDS.medium ? 'warning' : 'danger',
    },
    {
      key: 'avg_estimation_accuracy',
      label: '平均预估准确性',
      value: `${report.avgEstimationAccuracy.toFixed(1)}%`,
      icon: 'Target',
      description: '任务实际耗时与预估耗时的吻合度，越高代表规划越准确',
      valueColor: report.avgEstimationAccuracy >= ESTIMATION_THRESHOLDS.good ? 'success' : report.avgEstimationAccuracy >= ESTIMATION_THRESHOLDS.medium ? 'warning' : 'danger',
    },
    {
      key: 'avg_rework_rate',
      label: '平均返工率',
      value: `${report.avgReworkRate.toFixed(1)}%`,
      icon: 'RefreshCw',
      description: '审核驳回或需要返工的任务占比，越低越好',
      invertTrendColors: true,
      valueColor: report.avgReworkRate > REWORK_RATE_THRESHOLDS.warning ? 'danger' : report.avgReworkRate > REWORK_RATE_THRESHOLDS.normal ? 'warning' : 'success',
      trend: report.avgReworkRate > (REWORK_RATE_THRESHOLDS.normal + REWORK_RATE_THRESHOLDS.warning) / 2 ? { value: report.avgReworkRate, direction: 'up', isPositive: false } : undefined,
    },
    {
      key: 'avg_fulltime_utilization',
      label: '全职比利用率',
      value: `${report.avgFulltimeUtilization.toFixed(1)}%`,
      icon: 'Percent',
      description: '成员全职比(FTE)的利用程度，80%-100%为理想范围',
      valueColor: report.avgFulltimeUtilization > UTILIZATION_THRESHOLDS.overloaded ? 'danger' : report.avgFulltimeUtilization >= UTILIZATION_THRESHOLDS.idealMin ? 'success' : 'warning',
    },
  ];

  // 产能分布（柱状图）
  const productivityChart: BarChartData = {
    labels: report.memberEfficiencyList.slice(0, DISPLAY_LIMITS.memberEfficiency).map(m => m.memberName),
    datasets: [{
      label: '产能',
      values: report.memberEfficiencyList.slice(0, DISPLAY_LIMITS.memberEfficiency).map(m => m.productivity),
    }],
  };

  // 产能趋势
  const productivityTrend: LineChartData = report.productivityTrend && report.productivityTrend.length > 0 ? {
    labels: report.productivityTrend.map(d => d.period),
    datasets: [
      { label: '产能', values: report.productivityTrend.map(d => d.productivity), color: C.indigo },
      { label: '完成任务数', values: report.productivityTrend.map(d => d.taskCount), color: C.green },
    ],
  } : generateEmptyTrend();

  // 团队对比
  const teamComparison: LineChartData | undefined = report.teamEfficiencyComparison && report.teamEfficiencyComparison.length > 0 ? {
    labels: report.teamEfficiencyComparison.map(t => t.teamName),
    datasets: [
      { label: '平均产能', values: report.teamEfficiencyComparison.map(t => t.avgProductivity), color: C.indigo },
      { label: '预估准确性', values: report.teamEfficiencyComparison.map(t => t.avgEstimationAccuracy), color: C.green },
    ],
  } : undefined;

  // 成员效能列表
  const memberEfficiency: FrontendMemberEfficiencyItem[] = report.memberEfficiencyList.map(m => ({
    memberName: m.memberName,
    department: m.department,
    team: m.techGroup,
    completedTasks: m.completedTasks,
    productivity: m.productivity,
    estimationAccuracy: m.estimationAccuracy,
    reworkRate: m.reworkRate,
    activityRate: m.fulltimeUtilization, // 用利用率替代活跃度
    efficiencyLevel: m.productivity > PRODUCTIVITY_THRESHOLDS.good ? 'high' : m.productivity > PRODUCTIVITY_THRESHOLDS.medium ? 'medium' : 'low',
  }));

  // 效能建议
  const efficiencySuggestions: EfficiencySuggestion[] = report.memberEfficiencyList
    .filter(m => m.productivity < PRODUCTIVITY_THRESHOLDS.medium || m.reworkRate > REWORK_RATE_THRESHOLDS.warning)
    .slice(0, DISPLAY_LIMITS.efficiencySuggestions)
    .map(m => ({
      type: m.productivity < PRODUCTIVITY_THRESHOLDS.medium ? 'low_productivity' as const : 'high_rework' as const,
      memberName: m.memberName,
      currentValue: m.productivity < PRODUCTIVITY_THRESHOLDS.medium ? m.productivity : m.reworkRate,
      threshold: m.productivity < PRODUCTIVITY_THRESHOLDS.medium ? PRODUCTIVITY_THRESHOLDS.medium : REWORK_RATE_THRESHOLDS.warning,
      suggestion: m.productivity < PRODUCTIVITY_THRESHOLDS.medium
        ? '产能偏低，建议优化工作方式或减少并行任务'
        : '返工率较高，建议关注代码质量或加强需求理解',
    }));

  return {
    stats,
    productivityChart,
    productivityTrend,
    teamComparison,
    memberEfficiency,
    efficiencySuggestions,
  };
}

// ==================== 项目进度报表转换 ====================

export function transformProjectProgressReport(
  report: ProjectProgressReport
): ProjectProgressData {
  // 统计卡片
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const stats: StatCard[] = [
    {
      key: 'progress',
      label: '项目进度',
      value: `${report.progress.toFixed(1)}%`,
      icon: 'TrendingUp',
      description: '项目整体完成进度，基于所有任务的状态和进度加权计算',
      valueColor: report.progress >= COMPLETION_THRESHOLDS.good ? 'success' : report.progress >= COMPLETION_THRESHOLDS.warning ? 'warning' : 'danger',
    },
    {
      key: 'total_tasks',
      label: '任务总数',
      value: report.totalTasks,
      icon: 'ClipboardList',
      description: '项目下所有任务的总数量',
    },
    {
      key: 'completed_tasks',
      label: '已完成任务',
      value: report.completedTasks,
      icon: 'CheckCircle',
      description: '状态为已完成的任务数量',
      valueColor: 'success',
    },
    {
      key: 'in_progress_tasks',
      label: '进行中任务',
      value: report.inProgressTasks,
      icon: 'Clock',
      description: '当前正在执行中的任务数量',
    },
  ];

  // 任务状态分布（饼图）
  const taskStatusChart: PieChartData = {
    labels: report.statusDistribution.map(s => mapStatusToLabel(s.status)),
    values: report.statusDistribution.map(s => s.count),
    percentages: report.statusDistribution.map(s => safePercentage(s.count, report.totalTasks)),
  };

  // 里程碑进度（柱状图）
  const milestoneChart: BarChartData = {
    labels: report.milestones.map(m => m.name),
    datasets: [{
      label: '完成率',
      values: report.milestones.map(m => m.completionPercentage),
    }],
  };

  // 进度趋势 - 使用里程碑数据生成
  const progressTrend: LineChartData = report.milestones.length > 0 ? {
    labels: report.milestones.map(m => m.name),
    datasets: [
      { label: '完成率', values: report.milestones.map(m => m.completionPercentage), color: C.indigo },
    ],
  } : generateEmptyTrend();

  // 进度速度 - 使用里程碑数据计算
  const progressSpeedChart: LineChartData = report.milestones.length > 0 ? {
    labels: report.milestones.map(m => m.name),
    datasets: [
      { label: '完成百分比', values: report.milestones.map(m => m.completionPercentage), color: C.green },
    ],
  } : generateEmptyTrend();

  // 里程碑列表
  const milestones: MilestoneItem[] = report.milestones.map(m => ({
    id: m.id,
    name: m.name,
    projectName: report.projectName,
    targetDate: m.targetDate,
    completionPercentage: m.completionPercentage,
    status: mapMilestoneStatus(m.status),
    daysToTarget: calculateDaysToTarget(m.targetDate),
  }));

  return {
    stats,
    taskStatusChart,
    milestoneChart,
    progressTrend,
    progressSpeedChart,
    milestones,
  };
}

// ==================== 辅助函数 ====================

function mapPriority(priority: string): '紧急' | '高' | '中' | '低' {
  return (PRIORITY_LABELS[priority] || PRIORITY_LABELS.medium) as '紧急' | '高' | '中' | '低';
}

/**
 * 任务类型映射（英文 → 中文）
 * 用于明细表显示
 */
function mapTaskType(taskType: string): string {
  return TASK_TYPE_LABELS[taskType] || taskType || TASK_TYPE_LABELS.other;
}

function mapTaskStatus(status: string): import('../types').TaskStatus {
  // TaskStatus 已与后端枚举完全对齐，直接透传
  const validStatuses: Set<string> = new Set([
    'pending_approval', 'not_started', 'in_progress',
    'early_completed', 'on_time_completed', 'delay_warning',
    'delayed', 'overdue_completed',
  ]);
  return validStatuses.has(status) ? (status as import('../types').TaskStatus) : 'not_started';
}

function mapDelayType(type: string): import('../types').DelayType {
  const map: Record<string, import('../types').DelayType> = {
    delay_warning: 'delay_warning',
    delayed: 'delayed',
    overdue_completed: 'overdue_completed',
  };
  return map[type] || 'delayed';
}

function mapSuggestionType(type: string): AllocationSuggestion['type'] {
  const map: Record<string, AllocationSuggestion['type']> = {
    overloaded: 'overload',
    idle: 'idle',
    rebalance: 'low_activity',
  };
  return map[type] || 'overload';
}

function mapMilestoneStatus(status: string): MilestoneItem['status'] {
  // 数据库 ENUM: 'pending' | 'achieved' | 'overdue'
  const map: Record<string, MilestoneItem['status']> = {
    pending: 'pending',
    achieved: 'completed',
    overdue: 'overdue',
  };
  return map[status] || 'pending';
}

function calculateDaysToTarget(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * 转换优先级完成率趋势数据
 * 将后端返回的数据转换为折线图格式
 */
function transformPriorityTrendData(
  data: Array<{ period: string; priority: string; completionRate: number; totalTasks: number; completedTasks: number }>
): LineChartData {
  // 获取所有唯一的周期（按时间排序）
  const periods = [...new Set(data.map(d => d.period))].sort();

  // 获取所有优先级
  const priorities = ['urgent', 'high', 'medium', 'low'];
  const priorityLabels: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  };
  const priorityColors: Record<string, string> = {
    urgent: C.red,
    high: C.amber,
    medium: C.indigo,
    low: C.green,
  };

  // 为每个优先级构建数据集
  const datasets = priorities.map(priority => {
    const priorityData = data.filter(d => d.priority === priority);
    const valueMap = new Map(priorityData.map(d => [d.period, d.completionRate]));

    return {
      label: priorityLabels[priority],
      values: periods.map(period => valueMap.get(period) ?? 0),
      color: priorityColors[priority],
    };
  });

  return {
    labels: periods,
    datasets,
  };
}

// ==================== 辅助函数 ====================

function generateEmptyTrend(): LineChartData {
  return {
    labels: [],
    datasets: [],
  };
}

// ==================== 项目进度汇总报表转换 ====================

export function transformProjectProgressSummary(
  report: ProjectProgressSummary
): ProjectProgressSummaryData {
  // 统计卡片
  const stats: StatCard[] = [
    {
      key: 'total_projects',
      label: '项目总数',
      value: report.totalProjects,
      icon: 'FolderKanban',
      description: '系统中所有项目的总数量',
    },
    {
      key: 'active_projects',
      label: '进行中项目',
      value: report.activeProjects,
      icon: 'Activity',
      description: '当前状态为进行中的项目数量',
    },
    {
      key: 'avg_progress',
      label: '平均进度',
      value: `${report.avgProgress}%`,
      icon: 'TrendingUp',
      description: '所有项目的平均完成进度百分比',
      valueColor: report.avgProgress >= COMPLETION_THRESHOLDS.good ? 'success' : report.avgProgress >= COMPLETION_THRESHOLDS.warning ? 'warning' : 'danger',
    },
    {
      key: 'delayed_projects',
      label: '延期项目',
      value: report.delayedProjects,
      icon: 'AlertTriangle',
      description: '存在已延期或延期预警任务的项目数量',
      invertTrendColors: true,
      valueColor: report.delayedProjects > 0 ? 'danger' : 'success',
      trend: report.delayedProjects > 0 ? { value: report.delayedProjects, direction: 'up', isPositive: false } : undefined,
    },
  ];

  // 项目卡片列表
  // 注意：apiClient 拦截器已将 snake_case 转为 camelCase，需使用 camelCase 访问
  const projects: ProjectProgressCard[] = (report.projects || []).map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    status: p.status,
    progress: p.progress,
    totalTasks: p.totalTasks,
    completedTasks: p.completedTasks,
    deadline: p.deadline,
    members: p.members || [],
  }));

  // 整体任务状态分布（饼图）
  const statusDistribution = report.statusDistribution || [];
  const totalTasks = statusDistribution.reduce((sum, s) => sum + s.count, 0);
  const statusChart: PieChartData = {
    labels: statusDistribution.map(s => mapStatusToLabel(s.status)),
    values: statusDistribution.map(s => s.count),
    percentages: statusDistribution.map(s => totalTasks > 0 ? Math.round((s.count / totalTasks) * 100) : 0),
  };

  // 近期里程碑 - apiClient 拦截器已将 snake_case 转为 camelCase
  const upcomingMilestones = report.upcomingMilestones || [];
  const milestoneItems: MilestoneItem[] = upcomingMilestones.map(m => ({
    id: m.id,
    name: m.name,
    projectName: m.projectName || '',
    targetDate: m.targetDate,
    completionPercentage: m.completionPercentage,
    status: mapMilestoneStatus(m.status),
    daysToTarget: calculateDaysToTarget(m.targetDate),
  }));

  return {
    stats,
    projects,
    statusChart,
    upcomingMilestones: milestoneItems,
  };
}

/**
 * 状态码转换为中文标签
 */
function mapStatusToLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}
