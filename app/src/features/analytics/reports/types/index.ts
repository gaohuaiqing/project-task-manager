/**
 * 报表分析模块类型定义
 * @module analytics/reports/types
 */

// ==================== 基础类型 ====================

/** 报表类型 */
export type ReportType =
  | 'project-progress'
  | 'task-statistics'
  | 'delay-analysis'
  | 'member-analysis'
  | 'resource-efficiency';

/** 用户角色 */
export type UserRole = 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';

/** 时间范围选项 */
export type TimeRange = '7d' | '30d' | 'quarter' | 'custom';

/** 延期类型 */
export type DelayType = 'delay_warning' | 'delayed' | 'overdue_completed';

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 任务状态 */
export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'pending_review'
  | 'review_rejected'
  | 'waiting'
  | 'suspended'
  | 'cancelled';

// ==================== 筛选条件 ====================

/** 报表筛选条件 */
export interface ReportFilters {
  /** 项目ID */
  projectId?: string;
  /** 负责人ID */
  assigneeId?: string;
  /** 时间范围 */
  timeRange?: TimeRange;
  /** 自定义开始日期 */
  startDate?: string;
  /** 自定义结束日期 */
  endDate?: string;
  /** 任务类型 */
  taskType?: string;
  /** 延期类型 */
  delayType?: DelayType;
  /** 部门ID */
  departmentId?: string;
  /** 技术组ID */
  techGroupId?: string;
  /** 预估准确性范围筛选 */
  estimationAccuracyRange?: '±20%' | '±50%' | '±100%';
}

// ==================== 统计卡片 ====================

/** 统计卡片数据 */
export interface StatCard {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    isPositive: boolean;
  };
  icon?: string;
}

// ==================== 图表数据 ====================

/** 饼图数据 */
export interface PieChartData {
  labels: string[];
  values: number[];
  percentages: number[];
  colors?: string[];
}

/** 柱状图数据 */
export interface BarChartData {
  labels: string[];
  datasets: BarDataset[];
}

export interface BarDataset {
  label: string;
  values: number[];
  color?: string;
}

/** 折线图数据 */
export interface LineChartData {
  labels: string[];
  datasets: LineDataset[];
}

export interface LineDataset {
  label: string;
  values: number[];
  color?: string;
}

/** 散点图数据 */
export interface ScatterChartData {
  points: ScatterPoint[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  quadrantLines?: {
    x: number;
    y: number;
  };
}

export interface ScatterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
}

export interface AxisConfig {
  label: string;
  min: number;
  max: number;
  unit?: string;
}

/** 堆叠柱状图数据 */
export interface StackedBarChartData {
  labels: string[];
  datasets: BarDataset[];
}

// ==================== 表格数据 ====================

/** 表格列定义 */
export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  sortable?: boolean;
  type?: 'string' | 'number' | 'date' | 'enum' | 'progress';
}

/** 分页信息 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// ==================== 报表数据结构 ====================

/** 项目进度报表数据 */
export interface ProjectProgressData {
  stats: StatCard[];
  taskStatusChart: PieChartData;
  milestoneChart: BarChartData;
  progressTrend: LineChartData;
  progressSpeedChart: LineChartData;
  milestones: MilestoneItem[];
}

export interface MilestoneItem {
  id: string;
  name: string;
  projectName: string;
  targetDate: string;
  completionPercentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  daysToTarget: number;
}

/** 任务统计报表数据 */
export interface TaskStatisticsData {
  stats: StatCard[];
  priorityChart: BarChartData;
  /** 任务状态分布（替代原负责人任务分布） */
  statusChart: PieChartData;
  taskTypeChart: BarChartData;
  taskTrend: LineChartData;
  /** 优先级完成率趋势（替代原负责人完成率变化） */
  priorityTrend: LineChartData;
  taskTypeComparison: BarChartData;
  /** 任务明细（任务视角，每行一个任务） */
  taskDetails: TaskStatisticItem[];
}

/** 任务统计明细项 — 任务视角 */
export interface TaskStatisticItem {
  id: string;
  taskName: string;
  wbsCode: string;
  projectName: string;
  taskType: string;
  priority: '紧急' | '高' | '中' | '低';
  status: TaskStatus;
  assigneeName: string;
  progress: number;
  activityRate: number;
  plannedEndDate: string;
  delayDays: number;
}

/** 延期分析报表数据 */
export interface DelayAnalysisData {
  stats: StatCard[];
  delayTypeChart: PieChartData;
  delayReasonChart: BarChartData;
  delayTrend: LineChartData;
  delayResolvedTrend: LineChartData;
  workloadVsDelay?: ScatterChartData;
  activityVsDelay?: ScatterChartData;
  delayTasks: DelayTaskItem[];
  memberDelayStats?: MemberDelayItem[];
}

export interface DelayTaskItem {
  id: string;
  taskName: string;
  wbsCode: string;
  assigneeName: string;
  teamName?: string;
  projectName: string;
  plannedEndDate: string;
  delayDays: number;
  delayType: DelayType;
  delayReason: string;
  riskLevel: RiskLevel;
}

export interface MemberDelayItem {
  memberName: string;
  teamName?: string;
  supervisorName?: string;
  totalTasks: number;
  delayedTasks: number;
  delayRate: number;
  workload: number;
  activityRate: number;
  riskLevel: RiskLevel;
}

/** 成员任务分析数据 */
export interface MemberAnalysisData {
  stats: StatCard[];
  workloadChart: BarChartData;
  taskStatusChart: PieChartData;
  estimationChart: BarChartData;
  workloadTrend: LineChartData;
  /** 任务完成趋势 */
  completionTrend: LineChartData;
  /** 预估准确性变化趋势 */
  estimationTrend: LineChartData;
  memberTasks: MemberTaskItem[];
  /** 成员能力概览（按成员汇总） */
  memberCapabilities?: MemberCapabilitySummary[];
  allocationSuggestions?: AllocationSuggestion[];
}

/** 成员能力汇总 */
export interface MemberCapabilitySummary {
  memberId: string;
  memberName: string;
  totalTasks: number;
  completedTasks: number;
  avgProgress: number;
  avgEstimationAccuracy: number;
  activityRate: number;
  capability: MemberCapability;
}

export interface MemberTaskItem {
  /** 成员姓名 */
  memberName: string;
  /** 成员ID */
  memberId?: string;
  taskName: string;
  projectName: string;
  taskStatus: TaskStatus;
  progress: number;
  fullTimeRatio: number;
  /** 活跃度 */
  activityRate: number;
  plannedDuration: number;
  actualDuration: number;
  estimationAccuracy: number;
  lastUpdated: string;
  /** 能力展示 */
  capability?: MemberCapability;
}

/** 成员能力展示 */
export interface MemberCapability {
  /** 能力模型名称 */
  modelName: string;
  /** 各维度分数 */
  dimensions: CapabilityDimension[];
}

/** 能力维度 */
export interface CapabilityDimension {
  name: string;
  score: number;
  maxScore?: number;
}

export interface AllocationSuggestion {
  type: 'overload' | 'idle' | 'low_activity' | 'can_take_more';
  memberName: string;
  currentValue: number;
  threshold: number;
  suggestion: string;
}

/** 资源效能分析数据 */
export interface ResourceEfficiencyData {
  stats: StatCard[];
  productivityChart: BarChartData;
  efficiencyChart?: ScatterChartData;
  productivityTrend: LineChartData;
  teamComparison?: LineChartData;
  memberEfficiency: MemberEfficiencyItem[];
  /** 效能改进建议 — 聚焦产能/质量改进，区别于成员分析的任务分配建议 */
  efficiencySuggestions?: EfficiencySuggestion[];
}

/** 效能改进建议类型 */
export type EfficiencySuggestionType =
  | 'low_productivity'     // 产能低，需要改进工作方式
  | 'low_accuracy'         // 预估准确性低，需要提升评估能力
  | 'high_rework'          // 返工率高，需要关注质量
  | 'high_potential';      // 高效能，可担任导师

/** 效能改进建议 — Tab5 专属，聚焦效能改进 */
export interface EfficiencySuggestion {
  type: EfficiencySuggestionType;
  memberName: string;
  currentValue: number;
  threshold: number;
  suggestion: string;
}

export interface MemberEfficiencyItem {
  memberName: string;
  department?: string;
  team?: string;
  completedTasks: number;
  productivity: number;
  estimationAccuracy: number;
  reworkRate: number;
  activityRate: number;
  efficiencyLevel: 'high' | 'medium' | 'low';
}

// ==================== Tab配置 ====================

export interface ReportTab {
  value: ReportType;
  label: string;
  path: string;
}

export const REPORT_TABS: ReportTab[] = [
  { value: 'project-progress', label: '项目进度报表', path: '/reports/project-progress' },
  { value: 'task-statistics', label: '任务统计报表', path: '/reports/task-statistics' },
  { value: 'delay-analysis', label: '延期分析报表', path: '/reports/delay-analysis' },
  { value: 'member-analysis', label: '成员任务分析', path: '/reports/member-analysis' },
  { value: 'resource-efficiency', label: '资源效能分析', path: '/reports/resource-efficiency' },
];
