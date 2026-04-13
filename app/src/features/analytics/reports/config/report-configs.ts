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
} from '../types';

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
  { key: 'delayedCount', label: '已延迟', value: 0, icon: 'XCircle' },
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

/** 成员延期统计列 */
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
  { key: 'activityRate', label: '活跃度', width: 80, sortable: true, type: 'progress' },
  { key: 'efficiencyLevel', label: '效能等级', width: 80, sortable: true, type: 'enum' },
];

// ==================== 图表配置 ====================

/** 图表颜色 */
export const CHART_COLORS = {
  primary: '#0EA5E9',
  success: '#22C55E',
  warning: '#F97316',
  danger: '#EF4444',
  info: '#3B82F6',
  muted: '#64748B',
  // 任务状态颜色
  status: {
    not_started: '#94A3B8',
    in_progress: '#3B82F6',
    completed: '#22C55E',
    delayed: '#EF4444',
    pending_review: '#F97316',
    review_rejected: '#EF4444',
    waiting: '#94A3B8',
    suspended: '#64748B',
    cancelled: '#64748B',
  },
  // 延期类型颜色
  delayType: {
    delay_warning: '#F97316',
    delayed: '#EF4444',
    overdue_completed: '#64748B',
  },
  // 风险等级颜色
  riskLevel: {
    high: '#EF4444',
    medium: '#F97316',
    low: '#22C55E',
  },
};

// ==================== 筛选器配置 ====================

/** 时间范围选项 */
export const TIME_RANGE_OPTIONS = [
  { value: '7d', label: '过去7天' },
  { value: '30d', label: '过去30天' },
  { value: 'quarter', label: '本季度' },
  { value: 'custom', label: '自定义' },
];

/** 延期类型选项 */
export const DELAY_TYPE_OPTIONS = [
  { value: 'delay_warning', label: '延期预警' },
  { value: 'delayed', label: '已延迟' },
  { value: 'overdue_completed', label: '超期完成' },
];

/** 任务类型选项 */
export const TASK_TYPE_OPTIONS = [
  '固件', '板卡', '驱动', '结构', '测试', '认证',
  '项目管理', '配置管理', '采购', '综合', '质量', '其他',
];
