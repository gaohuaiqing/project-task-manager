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

export interface DelayAnalysisReport {
  totalDelayed: number;
  warningCount: number;
  delayedCount: number;
  overdueCompletedCount: number;
  delayReasons: DelayReasonCount[];
  delayTrend: TrendDataPoint[];
  delayedTasks: DelayedTaskItem[];
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