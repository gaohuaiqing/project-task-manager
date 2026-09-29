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
  ActivityTrendPoint,
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
  DepartmentDelayData,
  MemberRankingData,
  ProjectDelayData,
  TaskTypeDelayData,
  SeverityData,
  EstimationDeviationData,
  ImprovementTrendData,
  MemberTrendData,
  ReasonMemberCellData,
  StatsOverviewData,
  OverdueStartOverviewData,
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

  // 任务状态分布（饼图）- 优先使用后端返回的互斥状态分布，数据更准确
  const statusChart: PieChartData = report.statusDistribution && report.statusDistribution.length > 0
    ? {
        labels: report.statusDistribution.map(s => mapStatusToLabel(s.status)),
        values: report.statusDistribution.map(s => s.count),
        percentages: report.statusDistribution.map(s => safePercentage(s.count, totalTasks)),
      }
    : (() => {
        // 降级：后端未返回 statusDistribution 时，从 assigneeDistribution 反推（兼容旧数据）
        const statusMap: Record<string, number> = {};
        report.assigneeDistribution.forEach(a => {
          const taskCount = Number(a.taskCount);
          const completedCount = Number(a.completedCount);
          const delayedCount = Number(a.delayedCount);
          const inProgressCount = Math.max(0, taskCount - completedCount - delayedCount);
          statusMap['进行中/待处理'] = (statusMap['进行中/待处理'] || 0) + inProgressCount;
          statusMap['已完成'] = (statusMap['已完成'] || 0) + completedCount;
          statusMap['已延期'] = (statusMap['已延期'] || 0) + delayedCount;
        });
        const fallbackTotal = Object.values(statusMap).reduce((sum, v) => sum + v, 0);
        return {
          labels: Object.keys(statusMap),
          values: Object.values(statusMap),
          percentages: Object.values(statusMap).map(v => safePercentage(v, fallbackTotal)),
        };
      })();

  // 任务类型分布（横向柱状图）
  const taskTypeChart: BarChartData = {
    labels: report.taskTypeDistribution.map(t => t.taskTypeName),
    datasets: [{
      label: '任务数量',
      values: report.taskTypeDistribution.map(t => t.count),
      color: report.taskTypeDistribution.map((_, i) => C.primary[i % C.primary.length]),
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
    rootTaskName: task.rootTaskName || null,
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
    {
      key: 'overdue_start_count',
      label: '当前逾期未开始',
      value: report.overdueStartOverview?.total ?? 0,
      icon: 'Clock',
      description: '已过计划开始日期仍未开始的任务数（tech_manager/engineer 本组总览卡取用）',
      valueColor: report.overdueStartOverview?.total > 0 ? 'warning' : 'success',
    },
    {
      key: 'avg_overdue_start_days',
      label: '平均逾期开始天数',
      value: report.overdueStartOverview?.avgOverdueDays ?? 0,
      icon: 'Timer',
      description: '逾期未开始任务的平均逾期天数（CURDATE - start_date）',
      valueColor: 'default',
    },
    // v3: 结论行细节指标（已延期平均超期 / 预警平均剩余）
    {
      key: 'delayed_avg_days',
      label: '平均超期天数',
      value: report.delayedAvgDays ?? 0,
      icon: 'Timer',
      description: '已延期任务的平均超期天数（CURDATE - end_date）',
      valueColor: 'default',
    },
    {
      key: 'warning_avg_days',
      label: '预警平均剩余天数',
      value: report.warningAvgDays ?? 0,
      icon: 'Timer',
      description: '延期预警任务的平均剩余天数（end_date - CURDATE）',
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
  // 注：created 是截止该日期【仍未解决】的延期任务存量（actual_end_date 为空，会随解决而下降）；
  //     completed 是截止该日期已解决的累计数（单调不减）。两者对比反映延期收敛/扩散态势
  const delayResolvedTrend: LineChartData = report.delayTrend && report.delayTrend.length > 0 ? {
    labels: report.delayTrend.map(d => d.date),
    datasets: [
      { label: '未解决延期', values: report.delayTrend.map(d => d.created), color: C.red },
      { label: '已解决', values: report.delayTrend.map(d => d.completed), color: C.green },
    ],
  } : generateEmptyTrend();

  // 延期任务列表（v3: 含已延期/延期预警/逾期未开始三态；deptId 供组下钻筛选）
  const delayTasks: DelayTaskItem[] = report.delayedTasks.map(task => ({
    id: task.id,
    taskName: task.description,
    wbsCode: task.wbsCode || task.id,
    rootTaskName: task.rootTaskName || null,
    assigneeName: task.assigneeName,
    projectName: task.projectName,
    plannedEndDate: task.plannedEndDate || '',
    delayDays: task.delayDays,
    delayType: mapDelayType(task.delayType),
    delayReason: task.reason,
    riskLevel: task.delayDays > DELAY_DAYS_RISK.high ? 'high' : task.delayDays > DELAY_DAYS_RISK.medium ? 'medium' : 'low',
    deptId: task.deptId ?? null,
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

  // 散点图①：成员延期×负荷分布（从延期任务和成员统计构造）
  const workloadVsDelay: ScatterChartData | undefined = delayedMembers.length > 0 ? {
    points: delayedMembers.map(m => ({
      id: String(m.assigneeId),
      label: m.assigneeName,
      x: m.totalDelayCount,       // X轴：历史延期次数
      y: m.delayedTaskCount,       // Y轴：当前延期任务数
      size: m.totalDelayCount + m.delayedTaskCount,
      color: m.delayedTaskCount > 5 ? C.red : m.delayedTaskCount > 2 ? C.amber : C.indigo,
    })),
    xAxis: {
      label: '历史延期次数',
      min: 0,
      max: Math.ceil(Math.max(...delayedMembers.map(m => m.totalDelayCount), 5) * 1.2),
    },
    yAxis: {
      label: '当前延期任务数',
      min: 0,
      max: Math.ceil(Math.max(...delayedMembers.map(m => m.delayedTaskCount), 3) * 1.3),
    },
    quadrantLines: {
      x: 3,
      y: 2,
    },
  } : undefined;

  // 散点图②：历史延期次数 × 当前预警任务数（展示成员是否"屡犯+预警并存"）
  // 合并延迟成员和预警成员数据，X=历史延期总次数，Y=当前预警任务数
  const allMembersForScatter = (() => {
    const map = new Map<string, { id: number; name: string; totalDelay: number; warningCount: number }>();
    delayedMembers.forEach(m => {
      map.set(String(m.assigneeId), { id: m.assigneeId, name: m.assigneeName, totalDelay: m.totalDelayCount, warningCount: 0 });
    });
    warningMembers.forEach(m => {
      const existing = map.get(String(m.assigneeId));
      if (existing) {
        existing.warningCount = m.warningTaskCount;
      } else {
        map.set(String(m.assigneeId), { id: m.assigneeId, name: m.assigneeName, totalDelay: 0, warningCount: m.warningTaskCount });
      }
    });
    return [...map.values()];
  })();

  const activityVsDelay: ScatterChartData | undefined = allMembersForScatter.length > 0 ? {
    points: allMembersForScatter.map(m => ({
      id: String(m.id),
      label: m.name,
      x: m.totalDelay,
      y: m.warningCount,
      size: m.totalDelay + m.warningCount,
      color: m.warningCount > 3 ? C.red : m.warningCount > 1 ? C.amber : C.indigo,
    })),
    xAxis: {
      label: '历史延期次数',
      min: 0,
      max: Math.ceil(Math.max(...allMembersForScatter.map(m => m.totalDelay), 3) * 1.3),
    },
    yAxis: {
      label: '当前预警任务数',
      min: 0,
      max: Math.ceil(Math.max(...allMembersForScatter.map(m => m.warningCount), 3) * 1.3),
    },
    quadrantLines: { x: 3, y: 2 },
  } : undefined;

  // 多维新字段映射（后端 snake_case 经 client.ts 已转 camelCase）
  const teamComparison: DepartmentDelayData[] = (report.teamComparison || []).map((d) => ({
    deptId: d.deptId,
    deptName: d.deptName,
    totalTasks: d.totalTasks,
    delayedCount: d.delayedCount,
    delayRate: d.delayRate,
    avgDelayDays: d.avgDelayDays,
    // 逾期未开始并列指标（admin/dept_manager 组对比 3 新列）
    overdueStartCount: d.overdueStartCount ?? 0,
    overdueStartRate: d.overdueStartRate ?? 0,
    avgOverdueStartDays: d.avgOverdueStartDays ?? 0,
    totalDelayCount: d.totalDelayCount,
    planChangeCount: d.planChangeCount,
    planChangeRate: d.planChangeRate,
    avgDelayPerTask: d.avgDelayPerTask,
    improvementDelta: d.improvementDelta,
    improvementDirection: d.improvementDirection,
  }));

  const memberRanking: MemberRankingData[] = (report.memberRanking || []).map((m) => ({
    assigneeId: m.assigneeId,
    assigneeName: m.assigneeName,
    delayedTaskCount: m.delayedTaskCount,
    totalDelayCount: m.totalDelayCount,
    planChangeCount: m.planChangeCount,
    avgDelayDays: m.avgDelayDays,
    deptId: m.deptId,
    improvementDelta: m.improvementDelta,
  }));

  const severityDistribution: SeverityData = {
    mild: report.severityDistribution?.mild ?? 0,
    moderate: report.severityDistribution?.moderate ?? 0,
    severe: report.severityDistribution?.severe ?? 0,
    avgDelayDays: report.severityDistribution?.avgDelayDays ?? 0,
  };

  const projectDelayStats: ProjectDelayData[] = (report.projectDelayStats || []).map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    totalTasks: p.totalTasks,
    delayedCount: p.delayedCount,
    delayRate: p.delayRate,
    improvementDelta: p.improvementDelta,
    improvementDirection: p.improvementDirection,
  }));

  const taskTypeDelayStats: TaskTypeDelayData[] = (report.taskTypeDelayStats || []).map((t) => ({
    taskType: t.taskType,
    totalTasks: t.totalTasks,
    delayedCount: t.delayedCount,
    delayRate: t.delayRate,
  }));

  const estimationDeviation: EstimationDeviationData = {
    avgDeviationDays: report.estimationDeviation?.avgDeviationDays ?? 0,
    accurate: report.estimationDeviation?.accurate ?? 0,
    slight: report.estimationDeviation?.slight ?? 0,
    obvious: report.estimationDeviation?.obvious ?? 0,
    serious: report.estimationDeviation?.serious ?? 0,
    sampleCount: report.estimationDeviation?.sampleCount ?? 0,
  };

  const improvementTrend: ImprovementTrendData = {
    currentDelayed: report.improvementTrend?.currentDelayed ?? 0,
    previousDelayed: report.improvementTrend?.previousDelayed ?? 0,
    delta: report.improvementTrend?.delta ?? 0,
    direction: report.improvementTrend?.direction ?? 'flat',
  };

  const memberTrends: MemberTrendData[] = (report.memberTrends || []).map((m) => ({
    assigneeId: m.assigneeId,
    assigneeName: m.assigneeName,
    points: (m.points || []).map((p) => ({ date: p.date, delayed: p.delayed })),
  }));

  const reasonMemberMatrix: ReasonMemberCellData[] = (report.reasonMemberMatrix || []).map((c) => ({
    reason: c.reason,
    assigneeName: c.assigneeName,
    count: c.count,
  }));

  // v2: 统计总览（3指标×当前/时间段×团队/个人）
  const so = report.statsOverview;
  const statsOverview: StatsOverviewData = so && so.team ? {
    team: {
      delayedTaskCount: { current: so.team.delayedTaskCount?.current ?? 0, period: so.team.delayedTaskCount?.period ?? 0 },
      totalDelayCount: { current: so.team.totalDelayCount?.current ?? 0, period: so.team.totalDelayCount?.period ?? 0 },
      planChangeCount: { current: so.team.planChangeCount?.current ?? 0, period: so.team.planChangeCount?.period ?? 0 },
    },
    individual: {
      avgDelayCountPerMember: { current: so.individual?.avgDelayCountPerMember?.current ?? 0, period: so.individual?.avgDelayCountPerMember?.period ?? 0 },
      worstMemberName: { current: so.individual?.worstMemberName?.current ?? null, period: so.individual?.worstMemberName?.period ?? null },
      worstMemberCount: { current: so.individual?.worstMemberCount?.current ?? 0, period: so.individual?.worstMemberCount?.period ?? 0 },
    },
  } : { team: { delayedTaskCount: { current: 0, period: 0 }, totalDelayCount: { current: 0, period: 0 }, planChangeCount: { current: 0, period: 0 } }, individual: { avgDelayCountPerMember: { current: 0, period: 0 }, worstMemberName: { current: null, period: null }, worstMemberCount: { current: 0, period: 0 } } };

  // v2: K3 超长延期天数任务榜（复用 repeatDelayTasks 映射模式）
  const longestDelayTasks: DelayTaskItem[] = (report.longestDelayTasks || []).map(task => ({
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

  // 逾期未开始总览（仅当前口径，实时状态；带兜底防旧后端/缓存缺字段）
  const oso = report.overdueStartOverview;
  const overdueStartOverview: OverdueStartOverviewData = {
    total: oso?.total ?? 0,
    avgOverdueDays: oso?.avgOverdueDays ?? 0,
    // 不截断聚合（统计总览结论行「涉及 X 人，最长 Y 天」用；旧后端/缓存缺字段兜底 0）
    assigneeCount: oso?.assigneeCount ?? 0,
    maxOverdueDays: oso?.maxOverdueDays ?? 0,
    memberRanking: (oso?.memberRanking || []).map((m) => ({
      name: m.name,
      // 责任人 ID（"未分配"聚合行为 null 不可下钻；旧缓存缺字段兜底 null）
      assigneeId: m.assigneeId ?? null,
      count: m.count,
      maxOverdueDays: m.maxOverdueDays,
    })),
  };

  return {
    stats,
    delayTypeChart,
    delayReasonChart,
    delayTrend,
    delayResolvedTrend,
    delayTasks,
    delayedMemberChart,
    warningMemberChart,
    workloadVsDelay,
    activityVsDelay,
    teamComparison,
    memberRanking,
    severityDistribution,
    projectDelayStats,
    taskTypeDelayStats,
    estimationDeviation,
    improvementTrend,
    memberTrends,
    reasonMemberMatrix,
    repeatDelayTasks: (report.repeatDelayTasks || []).map(task => ({
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
      delayCount: task.delayCount,
      planChangeCount: task.planChangeCount,
    })),
    frequentChangeTasks: (report.frequentChangeTasks || []).map(task => ({
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
      delayCount: task.delayCount,
      planChangeCount: task.planChangeCount,
    })),
    statsOverview,
    longestDelayTasks,
    overdueStartOverview,
    // v3: 统计总览（范围行 + 结论行 + 支撑行）所需数据（旧缓存缺字段兜底 0）
    delayedCount: report.delayedCount ?? 0,
    warningCount: report.warningCount ?? 0,
    delayedAvgDays: report.delayedAvgDays ?? 0,
    warningAvgDays: report.warningAvgDays ?? 0,
    scopeStats: {
      projectCount: report.scopeStats?.projectCount ?? 0,
      teamCount: report.scopeStats?.teamCount ?? 0,
      taskCount: report.scopeStats?.taskCount ?? 0,
    },
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

  // 负荷分布（柱状图）- 仅展示全职比（%），任务数通过tooltip展示
  // 注：全职比和任务数量级差异大，合并展示会导致任务数柱子不可见
  const workloadChart: BarChartData = {
    labels: report.workloadDistribution.map(d => d.memberName),
    datasets: [
      { label: '全职比 (%)', values: report.workloadDistribution.map(d => d.fullTimeRatio), color: C.indigo },
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

  // 负载趋势（任务数） - 使用后端 workloadTrend 数据
  // 注：taskCount 是"未完成任务数"（NOT_COMPLETED），不是"完成任务数"
  const completionTrend: LineChartData = report.workloadTrend && report.workloadTrend.length > 0 ? {
    labels: report.workloadTrend.map(d => d.period),
    datasets: [
      { label: '未完成任务数', values: report.workloadTrend.map(d => d.taskCount), color: C.green },
    ],
  } : generateEmptyTrend();

  // 预估准确性分布（柱状图）- 使用 estimationDistribution 数据（分类数据，非时间序列）
  const estimationTrend: BarChartData = report.estimationDistribution && report.estimationDistribution.length > 0 ? {
    labels: report.estimationDistribution.map(e => e.category),
    datasets: [
      { label: '数量', values: report.estimationDistribution.map(e => e.count), color: C.indigo },
    ],
  } : { labels: [], datasets: [] };

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
    lastUpdated: ('updatedAt' in task ? (task as Record<string, unknown>).updatedAt : null) as string | null || new Date().toISOString(),
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
      color: C.indigo,
    }],
  };

  // 成员效能分布（散点图：产能 × 预估准确性）
  const efficiencyChart: ScatterChartData | undefined = report.memberEfficiencyList.length > 0 ? {
    points: report.memberEfficiencyList.map(m => ({
      id: String(m.memberId),
      label: m.memberName,
      x: m.productivity,
      y: m.estimationAccuracy,
      size: m.completedTasks,
      color: m.productivity >= PRODUCTIVITY_THRESHOLDS.good ? C.green : m.productivity >= PRODUCTIVITY_THRESHOLDS.medium ? C.indigo : C.red,
    })),
    xAxis: {
      label: '产能',
      min: 0,
      max: Math.ceil(Math.max(...report.memberEfficiencyList.map(m => m.productivity), 1) * 1.2),
    },
    yAxis: {
      label: '预估准确性 (%)',
      min: 0,
      max: 110,
    },
    quadrantLines: {
      x: PRODUCTIVITY_THRESHOLDS.medium,
      y: ESTIMATION_THRESHOLDS.good,
    },
  } : undefined;

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
    activityRate: m.fulltimeUtilization, // 利用率（FTE）作为活跃度指标
    efficiencyLevel: m.productivity > PRODUCTIVITY_THRESHOLDS.good ? 'high' : m.productivity > PRODUCTIVITY_THRESHOLDS.medium ? 'medium' : 'low',
  }));

  // 效能建议 — 覆盖4种类型：产能低、预估偏差大、返工率高、高效能
  const efficiencySuggestions: EfficiencySuggestion[] = report.memberEfficiencyList
    .filter(m =>
      m.productivity < PRODUCTIVITY_THRESHOLDS.medium ||
      m.estimationAccuracy < ESTIMATION_THRESHOLDS.medium ||
      m.reworkRate > REWORK_RATE_THRESHOLDS.warning ||
      (m.productivity >= PRODUCTIVITY_THRESHOLDS.good && m.estimationAccuracy >= ESTIMATION_THRESHOLDS.good)
    )
    .slice(0, DISPLAY_LIMITS.efficiencySuggestions)
    .map(m => {
      if (m.productivity >= PRODUCTIVITY_THRESHOLDS.good && m.estimationAccuracy >= ESTIMATION_THRESHOLDS.good) {
        return {
          type: 'high_potential' as const,
          memberName: m.memberName,
          currentValue: m.productivity,
          threshold: PRODUCTIVITY_THRESHOLDS.good,
          suggestion: '高效能成员，可承担更多核心任务或担任导师角色',
        };
      }
      if (m.productivity < PRODUCTIVITY_THRESHOLDS.medium) {
        return {
          type: 'low_productivity' as const,
          memberName: m.memberName,
          currentValue: m.productivity,
          threshold: PRODUCTIVITY_THRESHOLDS.medium,
          suggestion: '产能偏低，建议优化工作方式或减少并行任务',
        };
      }
      if (m.estimationAccuracy < ESTIMATION_THRESHOLDS.medium) {
        return {
          type: 'low_accuracy' as const,
          memberName: m.memberName,
          currentValue: m.estimationAccuracy,
          threshold: ESTIMATION_THRESHOLDS.medium,
          suggestion: '预估偏差较大，建议加强需求理解或参考历史数据进行预估',
        };
      }
      return {
        type: 'high_rework' as const,
        memberName: m.memberName,
        currentValue: m.reworkRate,
        threshold: REWORK_RATE_THRESHOLDS.warning,
        suggestion: '返工率较高，建议关注代码质量或加强需求理解',
      };
    });

  return {
    stats,
    productivityChart,
    efficiencyChart,
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

  // 进度速度 - 使用里程碑间进度增量（差值），而非直接复用完成率
  const progressSpeedChart: LineChartData = report.milestones.length > 0 ? {
    labels: report.milestones.map(m => m.name),
    datasets: [
      {
        label: '进度增量',
        values: report.milestones.map((m, i) => {
          if (i === 0) return m.completionPercentage;
          return Math.max(0, m.completionPercentage - report.milestones[i - 1].completionPercentage);
        }),
        color: C.green,
      },
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
  // TaskStatus 已与后端枚举完全对齐（含 overdue_start 逾期未开始），直接透传
  const validStatuses: Set<string> = new Set([
    'pending_approval', 'not_started', 'overdue_start', 'in_progress',
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
    // v3: 逾期未开始（主报表明细列表扩三态后出现；漏映射会导致明细 Tab 按 delayType 过滤失效）
    overdue_start: 'overdue_start',
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

/**
 * 转换活跃度趋势（长表 → 多系列折线）
 * 后端返回扁平 [{period, entityName, value}]，透视成每实体一系列
 */
export function transformActivityTrend(
  points: ActivityTrendPoint[],
  entityNames?: string[]
): LineChartData {
  if (!points || points.length === 0) return generateEmptyTrend();

  // period 为周一起始日(YYYY-MM-DD)，按完整日期排序保证跨年正确
  const periods = [...new Set(points.map(p => p.period))].sort();

  // 横轴标签截取为 MM-DD（更直观），数据匹配仍用完整 period
  const labels = periods.map(p => p.slice(5));

  // 实体顺序：优先用传入的 entityNames（保持稳定），否则按 points 出现顺序
  const names = entityNames && entityNames.length > 0
    ? entityNames
    : [...new Set(points.map(p => p.entityName))];

  const palette = [C.indigo, C.green, C.amber, C.red, C.violet, C.pink, C.cyan, C.lime];

  const datasets = names.map((name, i) => {
    const entityData = points.filter(p => p.entityName === name);
    const valueMap = new Map(entityData.map(p => [p.period, p.value]));
    return {
      label: name,
      values: periods.map(period => valueMap.get(period) ?? 0),
      color: palette[i % palette.length],
    };
  });

  return { labels, datasets };
}

// ==================== 图表工具函数 ====================

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
