/**
 * 报表配置
 * 定义每个报表的统计指标、图表、表格列
 * @module analytics/reports/config/report-configs
 */

import type {
  ReportType,
  StatCard,
  TableColumn,
  MilestoneItem,
  TaskStatisticItem,
  DelayTaskItem,
  MemberDelayItem,
  MemberTaskItem,
  MemberEfficiencyItem,
  TimeRange,
} from '../types';
import { format, subDays, subMonths, subYears } from 'date-fns';

// ==================== 统计卡片配置 ====================

/** 项目进度报表统计卡片 */
export const PROJECT_PROGRESS_STATS: StatCard[] = [
  { key: 'totalProjects', label: '项目总数', value: 0, icon: 'FolderKanban' },
  { key: 'totalTasks', label: '任务总数', value: 0, icon: 'ListTodo' },
  { key: 'completionRate', label: '完成率', value: '0%', icon: 'CheckCircle' },
  { key: 'delayRate', label: '延期率', value: '0%', icon: 'AlertTriangle' },
];

/** 任务统计报表统计卡片 */
export const TASK_STATISTICS_STATS: StatCard[] = [
  { key: 'totalTasks', label: '任务总数', value: 0, icon: 'ListTodo' },
  { key: 'avgCompletionRate', label: '平均完成率', value: '0%', icon: 'CheckCircle' },
  { key: 'delayRate', label: '延期率', value: '0%', icon: 'AlertTriangle' },
  { key: 'upcomingDelayCount', label: '一周即将延期', value: 0, icon: 'Clock' },
];

/** 延期分析报表统计卡片 */
export const DELAY_ANALYSIS_STATS: StatCard[] = [
  { key: 'totalDelayed', label: '延期任务总数', value: 0, icon: 'AlertCircle' },
  { key: 'delayWarningCount', label: '延期预警', value: 0, icon: 'AlertTriangle' },
  { key: 'delayedCount', label: '已延期', value: 0, icon: 'XCircle' },
  { key: 'overdueCompletedCount', label: '超期完成', value: 0, icon: 'CheckCircle2' },
];

/** 成员任务分析统计卡片 */
export const MEMBER_ANALYSIS_STATS: StatCard[] = [
  { key: 'avgWorkload', label: '平均任务负载', value: 0, icon: 'Briefcase' },
  { key: 'avgFullTimeRatio', label: '平均全职比', value: '0%', icon: 'Percent' },
  { key: 'avgCompletionRate', label: '平均完成率', value: '0%', icon: 'CheckCircle' },
  { key: 'activityRate', label: '成员活跃度', value: '0%', icon: 'Activity' },
];

/** 资源效能分析统计卡片 */
export const RESOURCE_EFFICIENCY_STATS: StatCard[] = [
  { key: 'avgProductivity', label: '平均产能', value: 0, icon: 'TrendingUp' },
  { key: 'avgEstimationAccuracy', label: '预估准确性', value: '0%', icon: 'Target' },
  { key: 'avgReworkRate', label: '平均返工率', value: '0%', icon: 'RefreshCw' },
  { key: 'activityRate', label: '成员活跃度', value: '0%', icon: 'Activity' },
];

// ==================== 表格列配置 ====================

/** 里程碑列表列 */
export const MILESTONE_COLUMNS: TableColumn[] = [
  { key: 'name', label: '里程碑名称', width: 200, sortable: true },
  { key: 'projectName', label: '所属项目', width: 150, sortable: true },
  { key: 'targetDate', label: '目标日期', width: 120, sortable: true, type: 'date' },
  { key: 'completionPercentage', label: '完成百分比', width: 100, sortable: true, type: 'progress' },
  { key: 'status', label: '状态', width: 100, sortable: true, type: 'enum' },
  { key: 'daysToTarget', label: '距今天数', width: 80, sortable: true, type: 'number' },
];

/** 任务统计明细列 — 任务视角 */
export const TASK_STATISTIC_COLUMNS: TableColumn[] = [
  { key: 'rootTaskName', label: '根任务', width: 140, sortable: true },
  { key: 'taskName', label: '任务名称', width: 150, sortable: true },
  { key: 'wbsCode', label: 'WBS编码', width: 80, sortable: true },
  { key: 'projectName', label: '所属项目', width: 100, sortable: true },
  { key: 'taskType', label: '任务类型', width: 70, sortable: true },
  { key: 'priority', label: '优先级', width: 60, sortable: true, type: 'enum' },
  { key: 'status', label: '状态', width: 70, sortable: true, type: 'enum' },
  { key: 'progress', label: '完成率', width: 80, sortable: true, type: 'progress' },
  { key: 'assigneeName', label: '负责人', width: 70, sortable: true },
  { key: 'activityRate', label: '活跃度', width: 80, sortable: true, type: 'progress' },
  { key: 'plannedEndDate', label: '计划结束', width: 90, sortable: true, type: 'date' },
  { key: 'delayDays', label: '延期天数', width: 70, sortable: true, type: 'number' },
];

/** 延期任务列表列 */
export const DELAY_TASK_COLUMNS: TableColumn[] = [
  { key: 'rootTaskName', label: '根任务', width: 140, sortable: true },
  { key: 'taskName', label: '任务名称', width: 200, sortable: true },
  { key: 'wbsCode', label: 'WBS编码', width: 80, sortable: true },
  { key: 'assigneeName', label: '负责人', width: 100, sortable: true },
  { key: 'projectName', label: '所属项目', width: 120, sortable: true },
  { key: 'plannedEndDate', label: '计划结束', width: 110, sortable: true, type: 'date' },
  { key: 'delayDays', label: '延期天数', width: 80, sortable: true, type: 'number' },
  { key: 'delayType', label: '延期类型', width: 100, sortable: true, type: 'enum' },
  { key: 'delayReason', label: '延期原因', width: 150 },
  { key: 'riskLevel', label: '风险等级', width: 80, sortable: true, type: 'enum' },
];

/**
 * 延期明细下钻列（DelayTaskDetailDialog 用）—— 引用 WBS 表真实字段
 * 相比 DELAY_TASK_COLUMNS：去掉无数据源的 riskLevel（wbs_tasks 无 risk_level），加 状态/优先级/进度
 */
export const DELAY_DETAIL_COLUMNS: TableColumn[] = [
  { key: 'taskName', label: '任务名称', width: 200, sortable: true },
  { key: 'rootTaskName', label: '根任务', width: 140, sortable: true },
  { key: 'wbsCode', label: 'WBS编码', width: 80, sortable: true },
  { key: 'assigneeName', label: '负责人', width: 100, sortable: true },
  { key: 'projectName', label: '所属项目', width: 120, sortable: true },
  { key: 'plannedEndDate', label: '计划结束', width: 110, sortable: true, type: 'date' },
  { key: 'status', label: '状态', width: 90, sortable: true, type: 'enum' },
  { key: 'priority', label: '优先级', width: 80, sortable: true, type: 'enum' },
  { key: 'progress', label: '进度', width: 100, sortable: true, type: 'progress' },
  { key: 'delayDays', label: '延期天数', width: 80, sortable: true, type: 'number' },
  { key: 'delayType', label: '延期类型', width: 100, sortable: true, type: 'enum' },
  { key: 'delayReason', label: '延期原因', width: 150 },
];

/**
 * 成员延期统计列 — 服务于 MemberDelayItem（DelayAnalysisTab 旧版直接渲染成员维度）
 * 字段：memberName/teamName/totalTasks/delayedTasks/delayRate/workload/activityRate/riskLevel
 */
export const MEMBER_DELAY_COLUMNS: TableColumn[] = [
  { key: 'memberName', label: '成员姓名', width: 100, sortable: true },
  { key: 'teamName', label: '所属组', width: 100, sortable: true },
  { key: 'totalTasks', label: '总任务数', width: 80, sortable: true, type: 'number' },
  { key: 'delayedTasks', label: '延期数', width: 80, sortable: true, type: 'number' },
  { key: 'delayRate', label: '延期率', width: 80, sortable: true, type: 'progress' },
  { key: 'workload', label: '任务负荷', width: 80, sortable: true, type: 'number' },
  { key: 'activityRate', label: '活跃度', width: 80, sortable: true, type: 'progress' },
  { key: 'riskLevel', label: '风险等级', width: 80, sortable: true, type: 'enum' },
];

/**
 * 成员延期排行列 — 服务于 MemberRankingData（DelayDetailSection 成员统计 Tab）
 * 字段：assigneeName/delayedTaskCount/totalDelayCount/planChangeCount/avgDelayDays
 * 来源：transformDelayAnalysisReport → report.memberRanking
 */
export const MEMBER_RANKING_COLUMNS: TableColumn[] = [
  { key: 'assigneeName', label: '成员', width: 120, sortable: true },
  { key: 'delayedTaskCount', label: '当前延期', width: 90, sortable: true, type: 'number' },
  { key: 'totalDelayCount', label: '累计延期', width: 90, sortable: true, type: 'number' },
  { key: 'planChangeCount', label: '计划变更', width: 90, sortable: true, type: 'number' },
  { key: 'avgDelayDays', label: '平均天数', width: 90, sortable: true, type: 'number' },
];

/** 成员任务明细列 */
export const MEMBER_TASK_COLUMNS: TableColumn[] = [
  { key: 'memberName', label: '成员', width: 80, sortable: true },
  { key: 'taskName', label: '任务名称', width: 180, sortable: true },
  { key: 'projectName', label: '所属项目', width: 120, sortable: true },
  { key: 'taskStatus', label: '任务状态', width: 100, sortable: true, type: 'enum' },
  { key: 'progress', label: '进度', width: 80, sortable: true, type: 'progress' },
  { key: 'fullTimeRatio', label: '全职比', width: 80, sortable: true, type: 'progress' },
  { key: 'activityRate', label: '活跃度', width: 80, sortable: true, type: 'progress' },
  { key: 'plannedDuration', label: '计划工期', width: 80, sortable: true, type: 'number' },
  { key: 'actualDuration', label: '实际工期', width: 80, sortable: true, type: 'number' },
  { key: 'estimationAccuracy', label: '预估准确性', width: 100, sortable: true, type: 'progress' },
  { key: 'lastUpdated', label: '最后更新', width: 120, sortable: true, type: 'date' },
];

/** 成员效能明细列 */
export const MEMBER_EFFICIENCY_COLUMNS: TableColumn[] = [
  { key: 'memberName', label: '成员姓名', width: 100, sortable: true },
  { key: 'department', label: '所属部门', width: 100, sortable: true },
  { key: 'team', label: '所属组', width: 100, sortable: true },
  { key: 'completedTasks', label: '完成任务数', width: 80, sortable: true, type: 'number' },
  { key: 'productivity', label: '产能', width: 100, sortable: true, type: 'number' },
  { key: 'estimationAccuracy', label: '预估准确性', width: 100, sortable: true, type: 'progress' },
  { key: 'reworkRate', label: '返工率', width: 80, sortable: true, type: 'progress' },
  { key: 'activityRate', label: '利用率', width: 80, sortable: true, type: 'progress' },
  { key: 'efficiencyLevel', label: '效能等级', width: 80, sortable: true, type: 'enum' },
];

// ==================== 图表配置 ====================

/** 图表颜色 — 统一引用共享常量，确保全局配色一致 */
export const CHART_COLORS = {
  primary: '#2563EB',   // 钴蓝 (blue-600) — 与 Tailwind chart.blue 一致
  success: '#059669',   // 翠绿 (green-600) — 与 Tailwind chart.green 一致
  warning: '#D97706',   // 琥珀 (amber-600) — 与 Tailwind chart.amber 一致
  danger: '#DC2626',    // 朱红 (red-600) — 与 Tailwind chart.red 一致
  info: '#2563EB',      // 钴蓝 (blue-600)
  muted: '#64748B',     // 石板灰 (slate-500)
  // 任务状态颜色 — 与 shared/constants/colors.ts STATUS_COLORS 一致
  status: {
    not_started: '#94A3B8',
    in_progress: '#2563EB',
    completed: '#059669',
    delayed: '#DC2626',
    delay_warning: '#D97706',
    pending_review: '#7C3AED',
    review_rejected: '#DB2777',
    waiting: '#94A3B8',
    suspended: '#64748B',
    cancelled: '#64748B',
  },
  // 延期类型颜色
  delayType: {
    delay_warning: '#D97706',
    delayed: '#DC2626',
    overdue_completed: '#6B7280',
  },
  // 风险等级颜色
  riskLevel: {
    high: '#DC2626',
    medium: '#D97706',
    low: '#059669',
  },
};

// ==================== 筛选器配置 ====================

/**
 * 时间范围选项 — 5 预设 + 自定义
 * 预设选中后由 FilterBar 自动计算 startDate/endDate 并同步到 filters
 * - current: 实时快照（startDate/endDate 留空）
 * - 30d/3m/6m/1y: end=今天，start=今天-N（30 天/3 个月/6 个月/1 年）
 * - custom: 自定义日期范围（搭配日历选择器）
 */
export const TIME_RANGE_OPTIONS = [
  { value: 'current', label: '当前' },
  { value: '30d', label: '近30天' },
  { value: '3m', label: '近3个月' },
  { value: '6m', label: '近半年' },
  { value: '1y', label: '近一年' },
  { value: 'custom', label: '自定义' },
];

/**
 * 计算时间段预设对应的日期范围（单一源头：FilterBar 切换 + ReportsPage 初始共用）
 * - current: 返回 { startDate: undefined, endDate: undefined }（实时快照，后端按当前状态查）
 * - 30d/3m/6m/1y: end=今天，start=今天-N（29天/3个月/6个月/1年）
 * - custom: 返回空对象（保留现有 startDate/endDate，由日历选择器覆盖）
 */
export function getPresetDateRange(value: TimeRange): { startDate?: string; endDate?: string } {
  if (value === 'custom') {
    return {};
  }
  if (value === 'current') {
    return { startDate: undefined, endDate: undefined };
  }

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  switch (value) {
    case '30d':
      return { startDate: format(subDays(today, 29), 'yyyy-MM-dd'), endDate: todayStr };
    case '3m':
      return { startDate: format(subMonths(today, 3), 'yyyy-MM-dd'), endDate: todayStr };
    case '6m':
      return { startDate: format(subMonths(today, 6), 'yyyy-MM-dd'), endDate: todayStr };
    case '1y':
      return { startDate: format(subYears(today, 1), 'yyyy-MM-dd'), endDate: todayStr };
    default:
      return {};
  }
}

/** 延期类型选项 */
export const DELAY_TYPE_OPTIONS = [
  { value: 'delay_warning', label: '延期预警' },
  { value: 'delayed', label: '已延期' },
  // 注意：超期完成的任务已从延期任务列表中移除
  // { value: 'overdue_completed', label: '超期完成' },
];

/** 任务类型选项 */
export const TASK_TYPE_OPTIONS = [
  '固件', '板卡', '驱动', '接口类', '硬件恢复包',
  '物料导入', '物料改代', '系统设计', '核心风险',
  '接口人', '职能任务', '其它',
];
