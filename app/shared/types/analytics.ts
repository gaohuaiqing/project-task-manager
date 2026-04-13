/**
 * 分析模块共享类型定义 - 核心指标
 * 用于仪表板和报表分析的统一指标类型
 *
 * @module shared/types/analytics
 * @see REQ_07_INDEX.md §3 核心指标清单
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
  /** 指标值 */
  value: number;
  /** 格式化后的显示值 */
  displayValue: string;
  /** 标签 */
  label: string;
  /** 指标说明 */
  description?: string;
  /** 趋势：正数表示上升，负数表示下降 */
  trend?: number;
  /** 趋势显示文本 */
  trendText?: string;
  /** 与上期对比 */
  vsLastPeriod?: number;
  /** 单位 */
  unit?: 'count' | 'percent' | 'days';
}

/** 完成率指标 */
export interface CompletionRateMetric {
  /** 完成率（百分比） */
  rate: number;
  /** 已完成数量 */
  completed: number;
  /** 总数量 */
  total: number;
}

/** 延期率指标 */
export interface DelayRateMetric {
  /** 延期率（百分比） */
  rate: number;
  /** 延期数量 */
  delayed: number;
  /** 总数量 */
  total: number;
}

/** 活跃度指标 */
export interface ActivityMetric {
  /** 活跃度（百分比） */
  rate: number;
  /** 7日内有进展的任务数 */
  activeTasks: number;
  /** 总任务数 */
  totalTasks: number;
}

/** 负载率指标 */
export interface WorkloadMetric {
  /** 负载率（全职比总和） */
  totalFullTimeRatio: number;
  /** 进行中任务数 */
  inProgressTasks: number;
  /** 成员数 */
  memberCount: number;
}

/** 预估准确性指标 */
export interface EstimationAccuracyMetric {
  /** 准确性（百分比） */
  accuracy: number;
  /** 计划工期 */
  plannedDuration: number;
  /** 实际工期 */
  actualDuration: number;
  /** 偏差率 */
  deviationRate: number;
}

/** 产能指标 */
export interface ProductivityMetric {
  /** 产能（已完成任务数/总工时） */
  productivity: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 总工时 */
  totalHours: number;
}

/** 返工率指标 */
export interface ReworkRateMetric {
  /** 返工率（百分比） */
  rate: number;
  /** 返工任务数 */
  reworkTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
}

// ============ 聚合指标 ============

/** 基础统计指标集 */
export interface BaseMetrics {
  /** 总任务数 */
  totalTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 进行中任务数 */
  inProgressTasks: number;
  /** 延期预警数 */
  delayWarningTasks: number;
  /** 已延迟数 */
  delayedTasks: number;
  /** 完成率 */
  completionRate: number;
  /** 延期率 */
  delayRate: number;
}

/** 成员效能指标 */
export interface MemberEfficiencyMetric {
  /** 成员ID */
  memberId: number;
  /** 成员姓名 */
  memberName: string;
  /** 总任务数 */
  totalTasks: number;
  /** 延期任务数 */
  delayedTasks: number;
  /** 延期率 */
  delayRate: number;
  /** 任务负荷（全职比总和） */
  workload: number;
  /** 活跃度 */
  activityRate: number;
  /** 主要延期类型 */
  mainDelayType?: string;
  /** 风险等级 */
  riskLevel: RiskLevel;
}

/** 组/部门效能指标 */
export interface GroupEfficiencyMetric {
  /** 组/部门名称 */
  name: string;
  /** 成员数 */
  memberCount: number;
  /** 平均延期率 */
  avgDelayRate: number;
  /** 平均负载 */
  avgWorkload: number;
  /** 平均活跃度 */
  avgActivityRate: number;
}

// ============ 预警指标 ============

/** 一周即将延期预警 */
export interface UpcomingDelayAlert {
  /** 任务ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 负责人ID */
  assigneeId: number;
  /** 负责人姓名 */
  assigneeName: string;
  /** 项目名称 */
  projectName: string;
  /** 计划结束日期 */
  plannedEndDate: string;
  /** 当前进度 */
  progress: number;
  /** 剩余天数 */
  daysRemaining: number;
}

// ============ 任务分配建议 ============

/** 分配建议类型 */
export type AllocationSuggestionType =
  | 'overload_delayed'    // 过载延期
  | 'inefficient_delayed' // 低效延期
  | 'inactive_delayed'    // 低活跃延期
  | 'efficient_available' // 高效可承担
  | 'high_delay_group'    // 高延期组
  | 'low_delay_group';    // 低延期组

/** 分配建议 */
export interface AllocationSuggestion {
  /** 建议类型 */
  type: AllocationSuggestionType;
  /** 目标对象（成员或组） */
  target: string;
  /** 建议内容 */
  suggestion: string;
  /** 相关指标 */
  metrics: {
    workload?: number;
    delayRate?: number;
    activityRate?: number;
  };
}
