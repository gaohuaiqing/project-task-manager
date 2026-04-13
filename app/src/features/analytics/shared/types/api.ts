/**
 * 分析模块共享类型定义 - API 响应
 * 用于仪表板和报表分析的统一 API 响应类型
 *
 * @module analytics/shared/types/api
 * @see REQ_07_INDEX.md §4 API 汇总
 */

import type {
  BaseMetrics,
  CompletionRateMetric,
  DelayRateMetric,
  ActivityMetric,
  WorkloadMetric,
  UpcomingDelayAlert,
  MemberEfficiencyMetric,
  GroupEfficiencyMetric,
  AllocationSuggestion,
  DataScope,
  UserRole,
} from './metrics';

import type {
  TrendDataPoint,
  StatusDistributionItem,
  TaskTypeDistributionItem,
  DelayReasonItem,
  DelayTrendData,
  GroupComparisonItem,
  PieChartDataItem,
} from './charts';

// ============ 通用响应 ============

/** API 响应包装 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data: T;
  /** 错误信息 */
  error?: string;
  /** 元数据 */
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ============ 仪表板 API ============

/** 仪表板统计响应 */
export interface DashboardStatsResponse {
  /** 用户角色 */
  role: UserRole;
  /** 数据范围 */
  dataScope: DataScope;
  /** 基础统计 */
  stats: {
    /** 项目统计 */
    projects: {
      total: number;
      active: number;
      completed: number;
      delayed: number;
    };
    /** 任务统计 */
    tasks: BaseMetrics;
    /** 成员统计 */
    members: {
      total: number;
      active: number;
    };
  };
  /** 统计卡片数据 */
  cards: DashboardCard[];
}

/** 仪表板统计卡片 */
export interface DashboardCard {
  /** 卡片ID */
  id: string;
  /** 标题 */
  title: string;
  /** 主数值 */
  value: number;
  /** 格式化值 */
  displayValue: string;
  /** 趋势 */
  trend?: number;
  /** 趋势文本 */
  trendText?: string;
  /** 图标 */
  icon?: string;
  /** 颜色主题 */
  color?: 'default' | 'warning' | 'danger' | 'success';
}

/** 仪表板趋势响应 */
export interface DashboardTrendResponse {
  /** 趋势数据 */
  data: TrendDataPoint[];
  /** 汇总 */
  summary: {
    totalCompleted: number;
    totalCreated: number;
    avgDailyCompleted: number;
  };
}

/** 紧急任务响应 */
export interface UrgentTasksResponse {
  /** 紧急任务列表 */
  tasks: UpcomingDelayAlert[];
  /** 总数 */
  total: number;
}

// ============ 报表 API ============

/** 报表筛选参数 */
export interface ReportFilters {
  /** 项目ID */
  projectId?: string;
  /** 成员ID */
  memberId?: number;
  /** 负责人ID */
  assigneeId?: number;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 延期类型 */
  delayType?: 'delay_warning' | 'delayed' | 'overdue_completed';
  /** 任务类型 */
  taskType?: string;
  /** 部门ID */
  departmentId?: number;
  /** 技术组ID */
  techGroupId?: number;
}

/** 项目进度报表响应 */
export interface ProjectProgressReportResponse {
  /** 统计卡片 */
  stats: {
    totalProjects: number;
    totalTasks: number;
    completionRate: CompletionRateMetric;
    delayRate: DelayRateMetric;
  };
  /** 任务状态分布 */
  statusDistribution: StatusDistributionItem[];
  /** 里程碑完成情况 */
  milestoneStatus: {
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number;
  };
  /** 里程碑列表 */
  milestones: MilestoneItem[];
  /** 项目进度趋势 */
  progressTrend: TrendDataPoint[];
}

/** 里程碑项 */
export interface MilestoneItem {
  id: string;
  name: string;
  projectName: string;
  targetDate: string;
  completionPercentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  totalTasks: number;
  completedTasks: number;
}

/** 任务统计报表响应 */
export interface TaskStatisticsReportResponse {
  /** 统计卡片 */
  stats: {
    totalTasks: number;
    avgCompletionRate: number;
    delayRate: number;
    urgentCount: number;
  };
  /** 任务类型分布 */
  taskTypeDistribution: TaskTypeDistributionItem[];
  /** 负责人分布 */
  assigneeDistribution: AssigneeTaskDistribution[];
  /** 任务趋势 */
  taskTrend: {
    daily: TrendDataPoint[];
    weekly: TrendDataPoint[];
  };
  /** 任务列表 */
  taskList: TaskListItem[];
}

/** 负责人任务分布 */
export interface AssigneeTaskDistribution {
  assigneeId: number;
  assigneeName: string;
  teamName?: string;
  taskCount: number;
  completedCount: number;
  delayedCount: number;
  completionRate: number;
}

/** 任务列表项 */
export interface TaskListItem {
  id: string;
  wbsCode: string;
  description: string;
  projectName: string;
  status: string;
  progress: number;
  assigneeName: string;
  taskType: string;
  plannedEndDate: string | null;
  priority: string;
  riskLevel?: string;
}

/** 延期分析报表响应 */
export interface DelayAnalysisReportResponse {
  /** 统计卡片 */
  stats: {
    totalDelayed: number;
    delayRate: DelayRateMetric;
    warningCount: number;
    overdueCompletedCount: number;
  };
  /** 组/成员延期分布 */
  delayDistribution: GroupComparisonItem[];
  /** 延期原因分布 */
  delayReasons: DelayReasonItem[];
  /** 成员延期×负荷分布 */
  memberWorkloadDistribution: MemberEfficiencyMetric[];
  /** 成员活跃度×延期率分布 */
  memberActivityDistribution: MemberEfficiencyMetric[];
  /** 延期趋势 */
  delayTrend: {
    /** 各组趋势对比 */
    byGroup: TrendDataPoint[];
    /** 收敛/扩散趋势 */
    convergence: DelayTrendData[];
  };
  /** 延期任务列表 */
  delayedTasks: DelayedTaskItem[];
  /** 成员延期统计 */
  memberDelayStats: MemberDelayStatistic[];
  /** 分配建议 */
  suggestions: AllocationSuggestion[];
}

/** 延期任务项 */
export interface DelayedTaskItem {
  id: string;
  wbsCode: string;
  description: string;
  assigneeName: string;
  teamName?: string;
  projectName: string;
  taskType: string;
  plannedEndDate: string;
  delayDays: number;
  delayType: string;
  delayReason?: string;
  riskLevel: string;
}

/** 成员延期统计 */
export interface MemberDelayStatistic {
  memberId: number;
  memberName: string;
  teamName?: string;
  supervisorName?: string;
  totalTasks: number;
  delayedTasks: number;
  delayRate: number;
  workload: number;
  activityRate: number;
  mainDelayType?: string;
  riskLevel: string;
}

/** 成员任务分析响应 */
export interface MemberAnalysisReportResponse {
  /** 统计卡片 */
  stats: {
    avgWorkload: WorkloadMetric;
    avgFullTimeRatio: number;
    avgCompletionRate: number;
    capabilityMatch: number;
  };
  /** 成员负载分布 */
  workloadDistribution: PieChartDataItem[];
  /** 成员任务状态分布 */
  statusDistribution: StatusDistributionItem[];
  /** 成员负载趋势 */
  workloadTrend: TrendDataPoint[];
  /** 成员任务列表 */
  memberTasks: MemberTaskItem[];
  /** 分配建议 */
  suggestions: AllocationSuggestion[];
}

/** 成员任务项 */
export interface MemberTaskItem {
  id: string;
  wbsCode: string;
  description: string;
  projectName: string;
  status: string;
  progress: number;
  fullTimeRatio: number;
  taskType: string;
  plannedEndDate: string;
  plannedDuration?: number;
  actualDuration?: number;
  estimationAccuracy?: number;
}

/** 资源效能分析响应 */
export interface ResourceEfficiencyReportResponse {
  /** 统计卡片 */
  stats: {
    avgProductivity: number;
    avgEstimationAccuracy: number;
    avgReworkRate: number;
    avgFulltimeUtilization: number;
  };
  /** 组产能排名 */
  productivityRanking: GroupEfficiencyMetric[];
  /** 组效能对比 */
  efficiencyComparison: GroupEfficiencyMetric[];
  /** 成员效能列表 */
  memberEfficiency: MemberEfficiencyDetail[];
  /** 效能趋势 */
  efficiencyTrend: TrendDataPoint[];
}

/** 成员效能详情 */
export interface MemberEfficiencyDetail {
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
  activityRate?: number;
}

// ============ 系统配置 API ============

/** 项目类型配置 */
export interface ProjectTypeConfig {
  id: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
}

/** 任务类型配置 */
export interface TaskTypeConfig {
  code: string;
  name: string;
  description?: string;
  category?: string;
  sortOrder: number;
}

/** 节假日配置 */
export interface HolidayConfig {
  date: string;
  name: string;
  type: 'holiday' | 'workday';
}

/** 组织架构节点 */
export interface OrganizationNode {
  id: number;
  name: string;
  type: 'department' | 'tech_group';
  parentId: number | null;
  managerId?: number;
  managerName?: string;
  memberCount: number;
  children?: OrganizationNode[];
}

// ============ 导入导出 API ============

/** 导出参数 */
export interface ExportParams {
  /** 报表类型 */
  type: 'project-progress' | 'task-statistics' | 'delay-analysis' | 'member-analysis' | 'resource-efficiency';
  /** 筛选条件 */
  filters?: ReportFilters;
  /** 格式 */
  format?: 'xlsx' | 'csv';
}

/** 导入结果 */
export interface ImportResult {
  success: boolean;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/** 导入模板类型 */
export type ImportTemplateType = 'projects' | 'tasks' | 'members' | 'config';

// ============ 仪表板 API 简化类型 ============

/** 仪表板统计数据（简化版） */
export interface DashboardStats {
  totalProjects?: number;
  totalTasks?: number;
  totalMembers?: number;
  completionRate?: number;
  delayRate?: number;
  utilizationRate?: number;
  milestoneCompletion?: number;
  dueThisWeek?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  avgLoad?: number;
  activityRate?: number;
}

/** 项目进度项 */
export interface ProjectProgressItem {
  id: string;
  name: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'delayed';
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  dueDate?: string;
}

/** 任务分布 */
export interface TaskDistribution {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byAssignee: Array<{ id: number; name: string; count: number }>;
}

/** 仪表板查询参数 */
export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  days?: number;
}
