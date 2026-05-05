/**
 * 分析模块共享阈值常量
 * 统一管理仪表板和报表分析的阈值、限制、区间参数
 *
 * @module analytics/shared/constants/thresholds
 */

// ============ 百分比阈值 ============

/** 完成率/进度阈值（百分比） */
export const COMPLETION_THRESHOLDS = {
  /** 良好 — >= 此值为绿色 */
  good: 80,
  /** 警告 — >= 此值为琥珀色 */
  warning: 60,
  // < warning 为红色
} as const;

/** 延期率阈值（百分比） */
export const DELAY_RATE_THRESHOLDS = {
  /** 安全 — <= 此值为绿色 */
  safe: 10,
  /** 警告 — <= 此值为琥珀色 */
  warning: 20,
  // > warning 为红色
} as const;

/** 利用率/负载阈值（百分比） */
export const UTILIZATION_THRESHOLDS = {
  /** 理想下限 */
  idealMin: 80,
  /** 正常上限 */
  normalMax: 100,
  /** 超负荷 */
  overloaded: 100,
  /** 空闲 */
  idle: 70,
  /** 目标利用率 */
  target: 80,
} as const;

/** 活跃度阈值（百分比） */
export const ACTIVITY_THRESHOLDS = {
  /** 高活跃 */
  good: 80,
  /** 中活跃 */
  medium: 60,
  // < medium 为低活跃
} as const;

/** 预估准确性阈值（百分比） */
export const ESTIMATION_THRESHOLDS = {
  /** 精准 */
  good: 80,
  /** 正常 */
  medium: 60,
  // < medium 为偏差大
} as const;

/** 产能阈值（任务数/周） */
export const PRODUCTIVITY_THRESHOLDS = {
  /** 高产能 */
  good: 8,
  /** 正常 */
  medium: 5,
  // < medium 为低产能
} as const;

/** 返工率阈值（百分比） */
export const REWORK_RATE_THRESHOLDS = {
  /** 正常 */
  normal: 10,
  /** 警告 */
  warning: 20,
} as const;

// ============ 风险评估阈值 ============

/** 延期天数风险等级阈值（天） */
export const DELAY_DAYS_RISK = {
  /** 高风险阈值 */
  high: 14,
  /** 中风险阈值 */
  medium: 7,
} as const;

/** 超负荷成员数阈值 */
export const OVERLOADED_MEMBER_THRESHOLDS = {
  /** 危险 */
  danger: 3,
} as const;

// ============ 时间区间 ============

/** 日期区间常量（天） */
export const TIME_PERIODS = {
  /** 近7天 */
  week: 7,
  /** 近14天 */
  fortnight: 14,
  /** 近30天 */
  month: 30,
  /** 近12周 */
  quarterWeeks: 12,
} as const;

// ============ 数据限制 ============

/** 列表显示限制 */
export const DISPLAY_LIMITS = {
  /** 紧急任务显示数 */
  urgentTasks: 10,
  /** 项目列表显示数 */
  projects: 10,
  /** 里程碑显示数 */
  milestones: 10,
  /** 延期原因Top N */
  delayReasons: 10,
  /** 延期任务列表 */
  delayTasks: 50,
  /** 成员效能显示数 */
  memberEfficiency: 10,
  /** 效能建议数 */
  efficiencySuggestions: 5,
  /** 成员任务列表 */
  memberTasks: 20,
  /** 趋势周数 */
  trendWeeks: 12,
  /** 高风险项目 */
  highRiskProjects: 5,
  /** 活跃成员 */
  topMembers: 6,
  /** 任务统计列表 */
  taskStatistics: 100,
  /** 默认分页大小 */
  defaultPageSize: 50,
} as const;

// ============ 状态判定阈值 ============

/** 部门/组效能状态判定阈值 */
export const ENTITY_STATUS_THRESHOLDS = {
  /** 完成率低（风险） */
  completionRateRisk: 40,
  /** 完成率低（警告） */
  completionRateWarning: 60,
  /** 延期率高（风险） */
  delayRateRisk: 30,
  /** 延期率高（警告） */
  delayRateWarning: 15,
} as const;

/** 成员负载状态判定阈值（全职比倍率） */
export const MEMBER_LOAD_THRESHOLDS = {
  /** 超载 */
  overloaded: 1.5,
  /** 警告 */
  warning: 1.2,
} as const;

/** 项目风险阈值 */
export const PROJECT_RISK_THRESHOLDS = {
  /** 进度低 */
  lowProgress: 50,
  /** 延期任务多 */
  manyDelayed: 3,
} as const;

// ============ 缓存时间 ============

/** React Query 缓存时间配置 */
export const CACHE_TIMES = {
  /** 数据过期时间（ms） */
  staleTime: 5 * 60 * 1000,
  /** 自动刷新间隔（ms） */
  refetchInterval: 10 * 60 * 1000,
  /** 一天的毫秒数 */
  dayMs: 86400000,
} as const;

// ============ 预估准确性分类 ============

/** 预估准确性分类阈值 */
export const ESTIMATION_ACCURACY_CATEGORIES = {
  /** 精准：>= 90% */
  accurate: 90,
  /** 轻微偏差：>= 70% */
  slight: 70,
  /** 明显偏差：>= 50% */
  obvious: 50,
  // < obvious = 严重偏差
} as const;

// ============ WBS 复杂度因子 ============

/** WBS 层级对应的复杂度因子 */
export const WBS_COMPLEXITY_FACTORS: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
} as const;
