/**
 * 报表分析模块类型定义
 * 符合需求文档 REQ_07_analytics.md 要求
 */

// ============ 筛选参数 ============

export interface ReportFilters {
  projectId?: string;
  memberId?: number;
  assigneeId?: number;
  startDate?: string;
  endDate?: string;
  delayType?: 'delay_warning' | 'delayed' | 'overdue_completed';
  taskType?: string;  // v1.2 新增
}

// ============ 项目进度报表 ============

export interface MilestoneData {
  id: string;
  name: string;
  targetDate: string;
  completionPercentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface ProjectProgressReportData {
  projectId: string;
  projectName: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;  // 进行中任务数（需求文档要求）
  statusDistribution: StatusDistributionItem[];  // 任务状态分布（需求文档要求）
  milestones: MilestoneData[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

// ============ 任务统计报表 ============
// 注：API 响应拦截器会自动将 snake_case 转换为 camelCase

export interface TaskStatisticsReportData {
  totalTasks: number;
  avgCompletionRate: number;
  delayRate: number;
  urgentCount: number;
  priorityDistribution: Record<string, number>;
  assigneeDistribution: AssigneeTaskCount[];
  taskTypeDistribution: TaskTypeDistributionItem[];  // v1.2 新增
  taskList: TaskStatisticsItem[];
}

export interface AssigneeTaskCount {
  assigneeId: number;
  assigneeName: string;
  taskCount: number;
  completedCount: number;
  delayedCount: number;
}

// ============ 任务类型分布（v1.2 新增） ============

export interface TaskTypeDistributionItem {
  taskType: string;
  taskTypeName: string;
  count: number;
  completedCount: number;
  delayedCount: number;
  avgDuration: number;
}

export interface TaskStatisticsItem {
  id: string;
  description: string;
  projectName: string;
  status: string;
  progress: number;
  assigneeName: string;
  priority: string;
  plannedEndDate: string | null;
  taskType?: string;  // v1.2 新增
}

// ============ 延期分析报表 ============

export interface DelayAnalysisReportData {
  totalDelayed: number;
  warningCount: number;
  delayedCount: number;
  overdueCompletedCount: number;
  delayReasons: DelayReasonCount[];
  delayTrend: DelayTrendItem[];
  delayedTasks: DelayedTaskItem[];
}

export interface DelayReasonCount {
  reason: string;
  count: number;
}

export interface DelayTrendItem {
  date: string;
  value: number;
}

export interface DelayedTaskItem {
  id: string;
  description: string;
  projectName: string;
  assigneeName: string;
  delayType: string;
  delayDays: number;
  reason: string;
  status: string;
}

// ============ 成员任务分析报表 ============

export interface MemberAnalysisReportData {
  memberId: number;
  memberName: string;
  currentTasks: number;
  totalFullTimeRatio: number;
  avgCompletionRate: number;
  capabilityMatch?: number;
  taskList: MemberTaskItem[];
  capabilities?: CapabilityData[];
  estimationAccuracy?: EstimationAccuracyStats;  // v1.2 新增
}

export interface MemberTaskItem {
  id: string;
  description: string;
  projectName: string;
  status: string;
  progress: number;
  fullTimeRatio: number;
  priority: string;
  plannedEndDate: string;
  taskType?: string;  // v1.2 新增
  plannedDuration?: number;  // 计划工期（v1.2 新增）
  actualDuration?: number;  // 实际工期（v1.2 新增）
  estimationAccuracy?: number;  // 预估准确性（v1.2 新增）
}

// 预估准确性统计（v1.2 新增）
export interface EstimationAccuracyStats {
  accurateCount: number;      // 精准数量（±10%）
  slightDeviationCount: number;  // 轻微偏差数量（±10-30%）
  obviousDeviationCount: number;  // 明显偏差数量（±30-50%）
  seriousDeviationCount: number;  // 严重偏差数量（>±50%）
  avgAccuracy: number;  // 平均预估准确性
}

export interface CapabilityData {
  modelName: string;
  dimensionScores: string;
  overallScore: number;
}

// ============ Tab 类型 ============

export type ReportTab = 'project-progress' | 'task-statistics' | 'delay-analysis' | 'member-analysis' | 'resource-efficiency';

export const REPORT_TABS: { value: ReportTab; label: string }[] = [
  { value: 'project-progress', label: '项目进度报表' },
  { value: 'task-statistics', label: '任务统计报表' },
  { value: 'delay-analysis', label: '延期分析报表' },
  { value: 'member-analysis', label: '成员任务分析' },
  { value: 'resource-efficiency', label: '资源效能分析' },
];

// ============ 资源效能分析报表（v1.2 新增） ============

export interface ResourceEfficiencyReportData {
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
