/**
 * 仪表板类型定义
 *
 * @module analytics/dashboard/types
 */

import type { StatsCardMetric, TrendDataPoint, PieChartDataItem } from '../shared/types';

/**
 * 预警类型
 */
export type AlertType = 'delay_warning' | 'overdue' | 'pending_approval' | 'high_risk' | 'today_due' | 'week_due';

/**
 * 预警数据
 */
export interface AlertData {
  type: AlertType;
  count: number;
  label: string;
  trend?: number;
  trendText?: string;
  color: 'danger' | 'warning' | 'info';
  actionLabel?: string;
  actionPath?: string;
}

/**
 * 仪表板统计数据
 */
export interface DashboardStats {
  /** 核心指标卡片 */
  metrics: StatsCardMetric[];
  /** 预警数据 */
  alerts: AlertData[];
  /** 趋势数据 */
  trends: TrendDataPoint[];
}

/**
 * 成员任务状态
 */
export interface MemberTaskStatus {
  id: number;
  name: string;
  avatar?: string;
  inProgress: number;
  completed: number;
  delayed: number;
  loadRate: number;
  activity: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk' | 'idle';
}

/**
 * 组效能数据
 */
export interface GroupEfficiency {
  id: number;
  name: string;
  completionRate: number;
  delayRate: number;
  loadRate: number;
  activity: number;
  memberCount: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk';
}

/**
 * 部门效能数据
 */
export interface DepartmentEfficiency {
  id: number;
  name: string;
  completionRate: number;
  delayRate: number;
  utilizationRate: number;
  activity: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk';
}

/**
 * 任务分配建议
 */
export interface AllocationSuggestion {
  type: 'overload' | 'idle' | 'low_activity';
  memberId: number;
  memberName: string;
  value: number;
  valueLabel: string;
  suggestion: string;
}

/**
 * 项目进度数据
 */
export interface ProjectProgress {
  id: string;
  name: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'delayed';
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  dueDate?: string;
}

/**
 * 待办任务数据
 */
export interface TodoTask {
  id: string;
  name: string;
  projectName: string;
  dueDate: string;
  progress: number;
  priority: 'high' | 'medium' | 'low';
  daysOverdue?: number;
  lastUpdated?: string;
}

/**
 * Admin 仪表板数据
 */
export interface AdminDashboardData extends DashboardStats {
  /** 部门效能对比 */
  departmentEfficiency: DepartmentEfficiency[];
  /** 任务类型分布 */
  taskTypeDistribution: PieChartDataItem[];
  /** 资源调配建议 */
  allocationSuggestions: AllocationSuggestion[];
  /** 部门延期率趋势数据 */
  departmentDelayTrends?: DepartmentDelayTrend[];
  /** 资源利用率趋势数据 */
  utilizationTrends?: UtilizationTrend[];
  /** 高风险项目 */
  highRiskProjects?: HighRiskProject[];
}

/**
 * 部门延期率趋势数据点
 */
export interface DepartmentDelayTrend {
  date: string;
  [deptName: string]: string | number; // 部门名称作为 key，值为延期率
}

/**
 * 资源利用率趋势数据点
 */
export interface UtilizationTrend {
  date: string;
  utilization: number;
  target?: number;
}

/**
 * 成员活跃度趋势数据点
 */
export interface MemberActivityTrend {
  date: string;
  [memberName: string]: string | number; // 成员名称作为 key，值为活跃度
}

/**
 * 高风险项目
 */
export interface HighRiskProject {
  id: string;
  name: string;
  riskFactors: string[];
  completionRate: number;
  delayedTasks: number;
  manager: string;
}

/**
 * 部门经理仪表板数据
 */
export interface DeptManagerDashboardData extends DashboardStats {
  /** 组效能对比 */
  groupEfficiency: GroupEfficiency[];
  /** 成员状态 */
  memberStatus: MemberTaskStatus[];
  /** 任务类型分布 */
  taskTypeDistribution: PieChartDataItem[];
  /** 人员调配建议 */
  allocationSuggestions: AllocationSuggestion[];
}

/**
 * 技术经理仪表板数据
 */
export interface TechManagerDashboardData extends DashboardStats {
  /** 当前查看的技术组ID */
  currentGroupId: number;
  /** 可切换的技术组列表 */
  availableGroups: Array<{ id: number; name: string }>;
  /** 成员任务状态 */
  memberStatus: MemberTaskStatus[];
  /** 任务类型分布 */
  taskTypeDistribution: PieChartDataItem[];
  /** 任务分配建议 */
  allocationSuggestions: AllocationSuggestion[];
  /** 成员活跃度趋势数据 */
  memberActivityTrends?: MemberActivityTrend[];
}

/**
 * 工程师仪表板数据
 */
export interface EngineerDashboardData {
  /** 紧急任务预警 */
  alerts: AlertData[];
  /** 待办任务 */
  todoTasks: TodoTask[];
  /** 需要更新的任务 */
  needUpdateTasks: TodoTask[];
  /** 核心指标 */
  metrics: StatsCardMetric[];
  /** 任务趋势 */
  trends: TrendDataPoint[];
  /** 任务状态分布 */
  taskStatusDistribution: PieChartDataItem[];
  /** 参与项目进度 */
  projectProgress: ProjectProgress[];
}
