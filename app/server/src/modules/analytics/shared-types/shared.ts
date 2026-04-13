/**
 * 分析模块后端类型定义 - 共享类型
 * 与前端共享的类型定义（内联副本，避免跨 rootDir 导入）
 *
 * @module analytics/types/shared
 * @see app/shared/types/analytics.ts - 前端共享类型源文件
 */

// ============ 角色与数据范围 ============

/** 用户角色类型 */
export type UserRole = 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';

/** 数据范围定义 */
export interface DataScope {
  projects: 'all' | 'dept_projects' | 'group_projects' | 'my_projects';
  users: 'all' | 'dept_members' | 'group_members' | 'self';
  departments: 'all' | 'own_dept' | 'own_group' | 'none';
}

// ============ 任务状态 ============

/** 任务状态枚举 */
export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'delay_warning'
  | 'delayed'
  | 'early_completed'
  | 'on_time_completed'
  | 'overdue_completed';

/** 任务状态分组 */
export type TaskStatusGroup = 'pending' | 'in_progress' | 'completed' | 'delayed';

/** 延期类型 */
export type DelayType = 'delay_warning' | 'delayed' | 'overdue_completed';

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

// ============ 核心指标类型 ============

/** 统计卡片数据 */
export interface StatsCardMetric {
  value: number;
  displayValue: string;
  label: string;
  description?: string;
  trend?: number;
  trendText?: string;
  vsLastPeriod?: number;
  unit?: 'count' | 'percent' | 'days';
}

/** 完成率指标 */
export interface CompletionRateMetric {
  rate: number;
  completed: number;
  total: number;
}

/** 延期率指标 */
export interface DelayRateMetric {
  rate: number;
  delayed: number;
  total: number;
}

/** 活跃度指标 */
export interface ActivityMetric {
  rate: number;
  activeTasks: number;
  totalTasks: number;
}

/** 负载率指标 */
export interface WorkloadMetric {
  totalFullTimeRatio: number;
  inProgressTasks: number;
  memberCount: number;
}

/** 预估准确性指标 */
export interface EstimationAccuracyMetric {
  accuracy: number;
  plannedDuration: number;
  actualDuration: number;
  deviationRate: number;
}

/** 产能指标 */
export interface ProductivityMetric {
  productivity: number;
  completedTasks: number;
  totalHours: number;
}

/** 返工率指标 */
export interface ReworkRateMetric {
  rate: number;
  reworkTasks: number;
  completedTasks: number;
}

// ============ 聚合指标 ============

/** 基础统计指标集 */
export interface BaseMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayWarningTasks: number;
  delayedTasks: number;
  completionRate: number;
  delayRate: number;
}

/** 成员效能指标 */
export interface MemberEfficiencyMetric {
  memberId: number;
  memberName: string;
  totalTasks: number;
  delayedTasks: number;
  delayRate: number;
  workload: number;
  activityRate: number;
  mainDelayType?: string;
  riskLevel: RiskLevel;
}

/** 组/部门效能指标 */
export interface GroupEfficiencyMetric {
  name: string;
  memberCount: number;
  avgDelayRate: number;
  avgWorkload: number;
  avgActivityRate: number;
}

// ============ 预警指标 ============

/** 一周即将延期预警 */
export interface UpcomingDelayAlert {
  taskId: string;
  taskName: string;
  assigneeId: number;
  assigneeName: string;
  projectName: string;
  plannedEndDate: string;
  progress: number;
  daysRemaining: number;
}

// ============ 任务分配建议 ============

/** 分配建议类型 */
export type AllocationSuggestionType =
  | 'overload_delayed'
  | 'inefficient_delayed'
  | 'inactive_delayed'
  | 'efficient_available'
  | 'high_delay_group'
  | 'low_delay_group';

/** 分配建议 */
export interface AllocationSuggestion {
  type: AllocationSuggestionType;
  target: string;
  suggestion: string;
  metrics: {
    workload?: number;
    delayRate?: number;
    activityRate?: number;
  };
}
