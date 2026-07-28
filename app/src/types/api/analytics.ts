/**
 * Analytics API 类型定义
 * 与后端 types.ts 保持同步
 * 注意：apiClient 拦截器已将后端 snake_case 转换为 camelCase
 * 因此前端类型定义使用 camelCase
 */

// ============ 趋势指标相关 ============

export interface TrendIndicator {
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  isPositive: boolean;
}

export interface StatsWithTrend {
  current: number;
  trend: TrendIndicator;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ============ 报表相关 ============

export interface ProjectProgressReport {
  projectId: string;
  projectName: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  statusDistribution: StatusDistributionItem[];
  milestones: MilestoneProgress[];
}

/** 项目进度汇总报表（多项目对比视图） */
export interface ProjectProgressSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgProgress: number;
  delayedProjects: number;
  projects: ProjectProgressItem[];
  statusDistribution: StatusDistributionItem[];
  upcomingMilestones: MilestoneProgress[];
  progressTrend?: TimeSeriesPoint[];
}

/** 项目进度项（用于汇总列表） */
export interface ProjectProgressItem {
  projectId: string;
  projectName: string;
  status: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  deadline: string | null;
  members: MemberInfo[];
}

export interface MemberInfo {
  id: number;
  name: string;
  avatar: string | null;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface MilestoneProgress {
  id: string;
  name: string;
  projectName?: string;
  targetDate: string;
  completionPercentage: number;
  status: string;
}

export interface TaskStatisticsReport {
  totalTasks: number;
  totalRootTasks: number;  // 根任务数（wbs_level=1）
  avgCompletionRate: number;
  delayRate: number;
  urgentCount: number;
  priorityDistribution: Record<string, number>;
  assigneeDistribution: AssigneeTaskCount[];
  statusDistribution: StatusDistributionItem[];  // 任务状态分布（互斥状态分类）
  taskTypeDistribution: TaskTypeDistributionItem[];
  taskList: TaskStatisticsItem[];
  taskTrend?: TrendDataPoint[];
}

export interface TaskStatisticsItem {
  id: string;
  description: string;
  wbsCode: string | null;
  projectName: string;
  assigneeName: string;
  status: string;
  progress: number;
  priority: string;
  plannedEndDate: string | null;
  taskType: string;
  delayDays: number;
  activityRate: number;
}

export interface AssigneeTaskCount {
  assigneeId: number;
  assigneeName: string;
  taskCount: number;
  completedCount: number;
  delayedCount: number;
}

export interface TaskTypeDistributionItem {
  taskType: string;
  taskTypeName: string;
  count: number;
  completedCount: number;
  delayedCount: number;
  completionRate: number;
  delayRate: number;
  avgDuration: number;
}

export interface DelayedMemberStat {
  assigneeId: number;
  assigneeName: string;
  /** 当前延期任务数 */
  delayedTaskCount: number;
  /** 历史延期次数（该责任人所有任务 delay_count 之和） */
  totalDelayCount: number;
}

export interface WarningMemberStat {
  assigneeId: number;
  assigneeName: string;
  /** 预警任务数 */
  warningTaskCount: number;
}

export interface DelayAnalysisReport {
  totalDelayed: number;
  warningCount: number;
  delayedCount: number;
  overdueCompletedCount: number;
  delayReasons: DelayReasonCount[];
  delayTrend: TrendDataPoint[];
  delayedTasks: DelayedTaskItem[];
  /** 图表①：当前已延期的责任人排行 */
  delayedMemberStats: DelayedMemberStat[];
  /** 图表②：延期预警责任人排行 */
  warningMemberStats: WarningMemberStat[];
  // —— 团队视角（T1~T8）——
  /** T1：各部门（技术组）延期对比 */
  teamComparison: DepartmentDelayStat[];
  /** T3：延期严重度分布 */
  severityDistribution: SeverityDistribution;
  /** T6：项目延期统计 */
  projectDelayStats: ProjectDelayStat[];
  /** T7：任务类型延期统计 */
  taskTypeDelayStats: TaskTypeDelayStat[];
  /** T8：预估偏差 */
  estimationDeviation: EstimationDeviation;
  /** T5：改善环比 */
  improvementTrend: ImprovementTrend;
  // —— 个人视角（P1~P5）——
  /** P1：成员延期排名（增强列） */
  memberRanking: MemberDelayStat[];
  /** P5：成员个人趋势 */
  memberTrends: MemberTrendPoint[];
  /** P2：原因×责任人交叉单元 */
  reasonMemberMatrix: ReasonMemberCell[];
  // —— 任务视角（K1~K2）——
  /** K1：反复延期任务 */
  repeatDelayTasks: DelayedTaskItem[];
  /** K2：频繁变更任务 */
  frequentChangeTasks: DelayedTaskItem[];
}

/** T1：各部门（技术组）延期对比（team_comparison） */
export interface DepartmentDelayStat {
  deptId: number;
  deptName: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
  avgDelayDays: number;
  totalDelayCount: number;
  planChangeCount: number;
}

/** P1：成员延期排名（member_ranking，增强列区别于 DelayedMemberStat） */
export interface MemberDelayStat {
  assigneeId: number;
  assigneeName: string;
  delayedTaskCount: number;
  totalDelayCount: number;
  planChangeCount: number;
  avgDelayDays: number;
  /** assignee 所属部门 id（未分配=0；dept_manager 选组下钻时用于前端筛选） */
  deptId: number;
}

/** T6：项目延期统计（project_delay_stats） */
export interface ProjectDelayStat {
  projectId: string;
  projectName: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
}

/** T7：任务类型延期统计（task_type_delay_stats） */
export interface TaskTypeDelayStat {
  taskType: string;
  totalTasks: number;
  delayedCount: number;
  delayRate: number;
}

/** T3：延期严重度分布（severity_distribution） */
export interface SeverityDistribution {
  /** <7天 */
  mild: number;
  /** 7-30天 */
  moderate: number;
  /** >30天 */
  severe: number;
  avgDelayDays: number;
}

/** T8：预估偏差（estimation_deviation） */
export interface EstimationDeviation {
  /** 实际-计划均值（完成延期任务） */
  avgDeviationDays: number;
  /** ±10% */
  accurate: number;
  /** 10-30% */
  slight: number;
  /** 30-50% */
  obvious: number;
  /** >50% */
  serious: number;
  /** 样本量（完成延期任务数） */
  sampleCount: number;
}

/** T5：改善环比（improvement_trend） */
export interface ImprovementTrend {
  /** 本期新增延期 */
  currentDelayed: number;
  /** 上期新增延期 */
  previousDelayed: number;
  /** current - previous */
  delta: number;
  direction: 'improving' | 'worsening' | 'flat';
}

/** P5：成员个人趋势（member_trends，单成员时间序列） */
export interface MemberTrendPoint {
  assigneeId: number;
  assigneeName: string;
  points: { date: string; delayed: number }[];
}

/** P2：原因×责任人交叉单元（reason_member_matrix） */
export interface ReasonMemberCell {
  reason: string;
  assigneeId: number;
  assigneeName: string;
  count: number;
}

export interface DelayedTaskItem {
  id: string;
  description: string;
  wbsCode: string | null;
  projectName: string;
  assigneeName: string;
  delayType: string;
  plannedEndDate: string | null;
  delayDays: number;
  reason: string;
  status: string;
}

export interface DelayReasonCount {
  reason: string;
  count: number;
}

export interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
  delayed: number;
}

export interface MemberAnalysisReport {
  memberId: number;
  memberName: string;
  currentTasks: number;
  totalFullTimeRatio: number;
  avgCompletionRate: number;
  capabilityMatch?: number;
  taskList: MemberTask[];
  capabilities?: CapabilityDisplay[];
  estimationAccuracy?: EstimationAccuracyStats;
}

export interface MemberTask {
  id: string;
  description: string;
  projectName: string;
  assigneeName: string;
  status: string;
  progress: number;
  fullTimeRatio: number;
  activityRate: number;  // 活跃度
  plannedDuration?: number;
  actualDuration?: number;
  estimationAccuracy?: number;
  updatedAt?: string | null;
}

export interface EstimationAccuracyStats {
  accurateCount: number;
  slightDeviationCount: number;
  obviousDeviationCount: number;
  seriousDeviationCount: number;
  avgAccuracy: number;
}

export interface CapabilityDisplay {
  modelName: string;
  dimensionScores: string;
  overallScore: number;
}

// ============ 成员分析扩展 ============

export interface MemberAnalysisExtendedResponse {
  totalMembers: number;
  avgLoad: number;
  avgEstimationAccuracy: number;
  overloadedMembers: number;
  departmentActivityRate: number;
  membersSummary: MemberSummaryItem[];
  workloadDistribution: WorkloadDistributionItem[];
  statusDistribution: StatusDistributionItem[];
  estimationDistribution: EstimationDistributionItem[];
  workloadTrend: WorkloadTrendPoint[];
  memberTasks: MemberTask[];
  suggestions: AllocationSuggestionItem[];
}

export interface MemberSummaryItem {
  memberId: number;
  memberName: string;
  department: string | null;
  rootTasks: number;           // 负责的根任务数（wbs_level=1）
  subTasks: number;            // 参与的子任务数（wbs_level>1）
  currentTasks: number;
  completedTasks: number;
  totalFullTimeRatio: number;
  avgCompletionRate: number;
  estimationAccuracy: number;
  activityRate: number;
}

export interface WorkloadDistributionItem {
  memberName: string;
  taskCount: number;
  fullTimeRatio: number;
}

export interface EstimationDistributionItem {
  category: string;
  count: number;
}

export interface WorkloadTrendPoint {
  period: string;
  avgFullTimeRatio: number;
  taskCount: number;
}

export interface AllocationSuggestionItem {
  type: 'overloaded' | 'idle' | 'rebalance';
  memberName: string;
  currentLoad: number;
  suggestion: string;
}

// ============ 资源效能分析 ============

export interface ResourceEfficiencyReport {
  avgProductivity: number;
  avgEstimationAccuracy: number;
  avgReworkRate: number;
  avgFulltimeUtilization: number;
  memberEfficiencyList: MemberEfficiencyItem[];
  productivityTrend: ProductivityTrendItem[];
  teamEfficiencyComparison: TeamEfficiencyItem[];
}

export interface MemberEfficiencyItem {
  memberId: number;
  memberName: string;
  department?: string;
  techGroup?: string;
  completedTasks: number;
  productivity: number;
  estimationAccuracy: number;
  reworkRate: number;
  fulltimeUtilization: number;
  avgTaskComplexity: number;
}

export interface ProductivityTrendItem {
  period: string;
  productivity: number;
  taskCount: number;
}

export interface TeamEfficiencyItem {
  teamName: string;
  teamType: 'department' | 'tech_group';
  memberCount: number;
  avgProductivity: number;
  avgEstimationAccuracy: number;
  avgReworkRate: number;
}

// ============ 查询选项 ============

export interface ReportQueryOptions {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  assigneeId?: number;
  memberId?: number;
  delayType?: 'delay_warning' | 'delayed' | 'overdue_completed';
  taskType?: string;
}

export interface MemberAnalysisQueryOptions {
  memberId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ResourceEfficiencyQueryOptions extends ReportQueryOptions {
  departmentId?: number;
  techGroupId?: number;
  productivityThreshold?: number;
}

// ============ 活跃度趋势报表（团队/个人 维护活动时间曲线） ============

export type ActivityTrendDimension = 'team' | 'assignee';
export type ActivityTrendMetric = 'active_task_ratio' | 'progress_record_count';

export interface ActivityTrendQueryOptions {
  dimension: ActivityTrendDimension;
  metric: ActivityTrendMetric;
  startDate?: string;
  endDate?: string;
  projectId?: string;
  departmentId?: number;
  assigneeId?: number;
  topN?: number;
}

export interface ActivityTrendPoint {
  period: string;
  entityName: string;
  value: number;
}

export interface ActivityTrendEntity {
  id: number | null;
  name: string;
}

export interface ActivityTrendResponse {
  dimension: ActivityTrendDimension;
  metric: ActivityTrendMetric;
  series: ActivityTrendPoint[];
  entities: ActivityTrendEntity[];
}