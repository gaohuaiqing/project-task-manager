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
  | 'resource-efficiency'
  | 'activity-trend';

/** 用户角色 */
export type UserRole = 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';

/**
 * 时间范围选项
 * - current: 当前实时快照（startDate/endDate = null/null，后端按 DELAY_OR_OVERDUE 当前口径）
 * - 30d/3m/6m/1y: 时间段预设（end=今天，start=今天-N）
 * - custom: 自定义日期范围（搭配日历选择器）
 */
export type TimeRange = 'current' | '30d' | '3m' | '6m' | '1y' | 'custom';

/** 延期类型 */
export type DelayType = 'delay_warning' | 'delayed' | 'overdue_completed';

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 任务状态 — 与后端 TaskStatus 枚举完全一致 */
export type TaskStatus =
  | 'pending_approval'
  | 'not_started'
  | 'in_progress'
  | 'early_completed'
  | 'on_time_completed'
  | 'delay_warning'
  | 'delayed'
  | 'overdue_completed';

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
  /** 指标说明（点击信息图标显示） */
  description?: string;
  /** 副标题/补充说明 */
  subtitle?: string;
  /** 数值颜色主题 */
  valueColor?: 'default' | 'success' | 'warning' | 'danger';
  /** 是否反转趋势颜色（延期率等指标下降是好事） */
  invertTrendColors?: boolean;
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
  color?: string | string[];
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

/** 活跃度分析 Tab 数据（2 条折线：团队占比 / 个人占比） */
export interface ActivityTrendData {
  teamRatio: LineChartData;
  memberRatio: LineChartData;
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

/** 项目进度汇总报表数据 */
export interface ProjectProgressSummaryData {
  stats: StatCard[];
  projects: ProjectProgressCard[];
  statusChart: PieChartData;
  upcomingMilestones: MilestoneItem[];
}

/** 项目进度卡片数据 */
export interface ProjectProgressCard {
  projectId: string;
  projectName: string;
  status: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  deadline?: string | null;
  members?: Array<{
    id: number;
    name: string;
    avatar: string | null;
  }>;
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
  /** 根任务数（wbs_level=1） */
  totalRootTasks?: number;
  /** 全部任务数 */
  totalTasks: number;
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
  /** 图表①：当前已延期的责任人排行（当前延期任务数 + 历史延期次数） */
  delayedMemberChart: BarChartData;
  /** 图表②：延期预警责任人排行（预警任务数） */
  warningMemberChart: BarChartData;
  /** 部门间延期对比（多维：延期率/平均延期天数/计划变更次数等） */
  teamComparison: DepartmentDelayData[];
  /** 责任人延期排行（结合历史延期次数、计划变更次数等） */
  memberRanking: MemberRankingData[];
  /** 严重程度分布（轻度/中度/重度 + 平均延期天数） */
  severityDistribution: SeverityData;
  /** 项目维度延期统计 */
  projectDelayStats: ProjectDelayData[];
  /** 任务类型维度延期统计 */
  taskTypeDelayStats: TaskTypeDelayData[];
  /** 预估偏差分布 */
  estimationDeviation: EstimationDeviationData;
  /** 改善趋势（本期 vs 上期） */
  improvementTrend: ImprovementTrendData;
  /** 责任人延期趋势曲线（多人时间序列） */
  memberTrends: MemberTrendData[];
  /** 延期原因 × 责任人矩阵（单元格） */
  reasonMemberMatrix: ReasonMemberCellData[];
  /** 反复延期任务列表 */
  repeatDelayTasks: DelayTaskItem[];
  /** 频繁变更任务列表 */
  frequentChangeTasks: DelayTaskItem[];
  /** v2: 统计总览（3指标×当前/时间段×团队/个人） */
  statsOverview: StatsOverviewData;
  /** v2: 超长延期天数任务榜（K3） */
  longestDelayTasks: DelayTaskItem[];
}

/** 部门延期对比数据（team_comparison） */
export interface DepartmentDelayData {
  deptId: number;
  deptName: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
  avgDelayDays: number;
  totalDelayCount: number;
  planChangeCount: number;
  /** 计划变更率（次/任务） */
  planChangeRate: number;
  /** 累计延期率（次/任务） */
  avgDelayPerTask: number;
  /** v2: 本期vs上期延期数变化（含已完成） */
  improvementDelta: number;
  /** v2: 改善方向 */
  improvementDirection: 'improving' | 'worsening' | 'flat';
}

/** 责任人延期排行数据（member_ranking） */
export interface MemberRankingData {
  assigneeId: number;
  assigneeName: string;
  delayedTaskCount: number;
  totalDelayCount: number;
  planChangeCount: number;
  avgDelayDays: number;
  /** assignee 所属部门 id（未分配=0；dept_manager 选组下钻时按部门筛选成员） */
  deptId: number;
  /** v2: 改善之星排行（本期vs上期延期数变化，含已完成） */
  improvementDelta: number;
}

/** 项目维度延期统计（project_delay_stats） */
export interface ProjectDelayData {
  projectId: string;
  projectName: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
  /** v2: 本期vs上期延期数变化 */
  improvementDelta: number;
  /** v2: 改善方向 */
  improvementDirection: 'improving' | 'worsening' | 'flat';
}

/** v2: 统计总览（3指标×当前/时间段×团队/个人） */
export interface StatsOverviewData {
  team: {
    delayedTaskCount: { current: number; period: number };
    totalDelayCount: { current: number; period: number };
    planChangeCount: { current: number; period: number };
  };
  individual: {
    avgDelayCountPerMember: { current: number; period: number };
    worstMemberName: { current: string | null; period: string | null };
    worstMemberCount: { current: number; period: number };
  };
}

/** 任务类型维度延期统计（task_type_delay_stats） */
export interface TaskTypeDelayData {
  taskType: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
}

/** 严重程度分布（severity_distribution） */
export interface SeverityData {
  mild: number;
  moderate: number;
  severe: number;
  avgDelayDays: number;
}

/** 预估偏差分布（estimation_deviation） */
export interface EstimationDeviationData {
  avgDeviationDays: number;
  accurate: number;
  slight: number;
  obvious: number;
  serious: number;
  sampleCount: number;
}

/** 改善趋势（improvement_trend） */
export interface ImprovementTrendData {
  currentDelayed: number;
  previousDelayed: number;
  delta: number;
  direction: 'improving' | 'worsening' | 'flat';
}

/** 责任人延期趋势（member_trends） */
export interface MemberTrendData {
  assigneeId: number;
  assigneeName: string;
  points: { date: string; delayed: number }[];
}

/** 延期原因 × 责任人矩阵单元格（reason_member_matrix） */
export interface ReasonMemberCellData {
  reason: string;
  assigneeName: string;
  count: number;
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
  /** 预估准确性分布（柱状图，非时间序列） */
  estimationTrend: BarChartData;
  memberTasks: MemberTaskItem[];
  /** 成员能力概览（按成员汇总） */
  memberCapabilities?: MemberCapabilitySummary[];
  allocationSuggestions?: AllocationSuggestion[];
}

/** 成员能力汇总 */
export interface MemberCapabilitySummary {
  memberId: string;
  memberName: string;
  /** 负责的根任务数（wbs_level=1） */
  rootTasks: number;
  /** 参与的子任务数（wbs_level>1） */
  subTasks: number;
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
  { value: 'activity-trend', label: '活跃度分析', path: '/reports/activity-trend' },
];
