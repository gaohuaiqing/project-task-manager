// app/server/src/modules/analytics/constants.ts
/**
 * Analytics 模块常量配置
 * 集中管理查询限制、时间区间、阈值等参数
 */

// ============ 查询限制 ============

export const QUERY_LIMITS = {
  /** 紧急任务显示数 */
  URGENT_TASKS: 10,
  /** 项目列表显示数 */
  PROJECTS: 50,
  /** 里程碑显示数 */
  MILESTONES: 10,
  /** 延期原因 Top N */
  DELAY_REASONS: 10,
  /** 延期任务列表 */
  DELAY_TASKS: 50,
  /** 任务统计列表 */
  TASK_STATISTICS: 100,
  /** 成员任务列表 */
  MEMBER_TASKS: 20,
  /** 趋势周数 */
  TREND_WEEKS: 12,
  /** 高风险项目 */
  HIGH_RISK_PROJECTS: 5,
  /** 活跃成员 */
  TOP_MEMBERS: 6,
  /** 活跃成员待办任务 */
  TODO_TASKS: 20,
  /** 待更新任务 */
  STALE_TASKS: 10,
  /** 默认分页大小 */
  DEFAULT_PAGE_SIZE: 50,
  /** 最新延期原因 */
  LATEST_REASON: 1,
  /** 分配建议最大数 */
  ALLOCATION_SUGGESTIONS: 5,
  /** 成员任务明细上限 */
  MEMBER_TASKS_DETAIL: 100,
  /** 延期/预警责任人排行 Top N */
  DELAY_MEMBERS: 10,
} as const;

// ============ 时间区间（天/周） ============

export const TIME_INTERVALS = {
  /** 近7天 */
  WEEK_DAYS: 7,
  /** 近14天 */
  FORTNIGHT_DAYS: 14,
  /** 近30天 */
  MONTH_DAYS: 30,
  /** 近12周（季度） */
  QUARTER_WEEKS: 12,
  /** 毫秒/天 */
  MS_PER_DAY: 86400000,
  /** 活跃度判断天数梯度 */
  ACTIVITY_TIERS: {
    /** 7天内更新 = 100%活跃 */
    HIGH: 7,
    /** 14天内更新 = 80%活跃 */
    MEDIUM: 14,
    /** 30天内更新 = 50%活跃 */
    LOW: 30,
    /** 超出30天 = 20% */
    DEFAULT: 20,
  },
} as const;

// ============ 活跃度百分比映射 ============

export const ACTIVITY_PERCENTAGES = {
  /** 高活跃度 (7天内更新) */
  HIGH: 100,
  /** 中活跃度 (14天内更新) */
  MEDIUM: 80,
  /** 低活跃度 (30天内更新) */
  LOW: 50,
  /** 默认活跃度 (超出30天) */
  DEFAULT: 20,
} as const;

// ============ 状态判定阈值 ============

export const STATUS_THRESHOLDS = {
  /** 部门/组风险：延期率高阈值（%） */
  DELAY_RATE_RISK: 30,
  /** 部门/组风险：完成率低阈值（%） */
  COMPLETION_RATE_RISK: 40,
  /** 部门/组警告：延期率阈值（%） */
  DELAY_RATE_WARNING: 15,
  /** 部门/组警告：完成率阈值（%） */
  COMPLETION_RATE_WARNING: 60,
  /** 成员超载：全职比倍率 */
  MEMBER_OVERLOAD: 1.5,
  /** 成员警告：全职比倍率 */
  MEMBER_WARNING: 1.2,
  /** 项目风险：进度低阈值（%） */
  PROJECT_LOW_PROGRESS: 50,
  /** 项目风险：进度严重滞后阈值（%） */
  PROJECT_SEVERE_PROGRESS: 30,
  /** 项目风险：延期任务数 */
  PROJECT_MANY_DELAYED: 3,
  /** 超额分配建议阈值 */
  ALLOCATION_OVERLOAD: 1.5,
  /** 成员风险：延期任务数阈值 */
  MEMBER_DELAYED_RISK: 3,
  /** 成员警告：延期任务数阈值 */
  MEMBER_DELAYED_WARNING: 1,
} as const;

// ============ 预估准确性阈值 ============

export const ESTIMATION_THRESHOLDS = {
  /** 精准（偏差 <= 10%） */
  ACCURATE: 0.1,
  /** 轻微偏差（偏差 <= 30%） */
  SLIGHT: 0.3,
  /** 明显偏差（偏差 <= 50%） */
  OBVIOUS: 0.5,
} as const;

// ============ WBS 复杂度因子 ============

export const WBS_COMPLEXITY: Record<number, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 2.0,
};

// ============ 全职比格式说明 ============
/**
 * full_time_ratio 存储格式说明
 *
 * - 数据库存储: 百分比形式（100 = 100%全职，50 = 50%兼职）
 * - API返回: 小数形式（1.0 = 100%全职，0.5 = 50%兼职）
 * - 前端显示: 百分比形式（100%，50%）
 *
 * 转换公式:
 * - API返回值 = 存储值 / 100
 * - 前端显示 = 存储值（直接显示百分比）
 *
 * 例如: 存储值50 → API返回0.5 → 前端显示"50%"
 */
export const FULLTIME_RATIO = {
  /** 存储格式: 百分比（100=100%） */
  STORAGE_FORMAT: 'percentage' as const,
  /** 转换因子: 存储值/100 = API返回值 */
  CONVERSION_FACTOR: 100,
  /** 标准全职比: 1.0（对应存储值100） */
  STANDARD_FULLTIME: 1.0,
} as const;

// ============ 风险判定阈值 ============

export const RISK_THRESHOLDS = {
  /** 延期率高风险（%） */
  DELAY_HIGH: 30,
  /** 低活跃+高延期（%） */
  DELAY_WITH_LOW_ACTIVITY: 20,
  /** 活跃度低（%） */
  LOW_ACTIVITY: 60,
  /** 延期率中风险（%） */
  DELAY_MEDIUM: 10,
} as const;

// ============ 默认值 ============

export const DEFAULTS = {
  /** 默认趋势天数 */
  TREND_DAYS: 30,
  /** 目标利用率（%） */
  TARGET_UTILIZATION: 80,
} as const;

// ============ 基于日期的实时状态条件 ============
// 与 task.service.ts calculateStatus 逻辑一致
// 数据库 status 字段只在任务编辑时更新，不依赖它做实时判断

export const STATUS_CONDITIONS = {
  /** 已完成 = 有实际结束日期 */
  completed: 't.actual_end_date IS NOT NULL',
  /** 未完成 = 无实际结束日期 */
  notCompleted: 't.actual_end_date IS NULL',
  /** 延期预警 = 无实际结束 + 有截止日期 + 距截止日 <= warning_days（默认3天） */
  delayWarning:
    't.actual_end_date IS NULL AND t.end_date IS NOT NULL ' +
    'AND t.end_date >= CURDATE() AND DATEDIFF(t.end_date, CURDATE()) <= COALESCE(t.warning_days, 3)',
  /** 已延期 = 无实际结束 + 已过截止日期 */
  delayed:
    't.actual_end_date IS NULL AND t.end_date IS NOT NULL AND t.end_date < CURDATE()',
  /** 延期或预警（合并，用于统计） */
  delayedOrWarning:
    't.actual_end_date IS NULL AND t.end_date IS NOT NULL ' +
    'AND t.end_date < DATE_ADD(CURDATE(), INTERVAL COALESCE(t.warning_days, 3) DAY)',
  /** 进行中 = 有实际开始 + 无实际结束 + 未过期且不在预警范围 */
  inProgress:
    't.actual_start_date IS NOT NULL AND t.actual_end_date IS NULL ' +
    'AND (t.end_date IS NULL OR (t.end_date >= CURDATE() AND DATEDIFF(t.end_date, CURDATE()) > COALESCE(t.warning_days, 3)))',
  /** 未开始（基于日期实时判定）= 无实际开始 + 未完成 + 不在延期/预警范围 */
  notStarted:
    't.actual_start_date IS NULL AND t.actual_end_date IS NULL ' +
    'AND (t.end_date IS NULL OR t.end_date >= DATE_ADD(CURDATE(), INTERVAL COALESCE(t.warning_days, 3) DAY))',
} as const;

/**
 * 互斥状态条件集（用于仪表板统计，各状态互不重叠，之和=总任务数）
 *
 * ⚠️ 重要：与 task.service.ts calculateStatus() 逻辑保持一致
 *
 * 优先级排序（匹配顺序）：
 * 1. pending_approval - 有 pending_changes 且 pending_change_type = 'plan_change'
 * 2. completed        - 有 actual_end_date（已完成）
 * 3. delayed          - 未完成 + 已过期（最紧急的延期）
 * 4. delayWarning     - 未完成 + 即将到期（预警）
 * 5. inProgress       - 已开始 + 未完成 + 未预警
 * 6. notStarted       - 未开始 + 未到期（兜底）
 *
 * 注意：每个条件都必须排除更高优先级的状态，确保互斥性
 */
export const MUTEX_STATUS_CONDITIONS = {
  /** 待审批（最高优先级，检查 pending_changes 字段，与 calculateStatus 一致） */
  pendingApproval: "COALESCE(JSON_LENGTH(t.pending_changes), 0) > 0 AND t.pending_change_type = 'plan_change'",
  /** 已完成 = 非审批状态 + 有实际结束日期 */
  completed: "(COALESCE(JSON_LENGTH(t.pending_changes), 0) = 0 OR t.pending_change_type != 'plan_change') AND t.actual_end_date IS NOT NULL",
  /** 已延期 = 非审批状态 + 未完成 + 已过截止日期 */
  delayed: "(COALESCE(JSON_LENGTH(t.pending_changes), 0) = 0 OR t.pending_change_type != 'plan_change') AND t.actual_end_date IS NULL AND t.end_date IS NOT NULL AND t.end_date < CURDATE()",
  /** 延期预警 = 非审批状态 + 未完成 + 即将到期（不含已过期，warning_days 默认3天） */
  delayWarning:
    "(COALESCE(JSON_LENGTH(t.pending_changes), 0) = 0 OR t.pending_change_type != 'plan_change') AND t.actual_end_date IS NULL AND t.end_date IS NOT NULL " +
    "AND t.end_date >= CURDATE() AND DATEDIFF(t.end_date, CURDATE()) <= COALESCE(t.warning_days, 3)",
  /** 进行中 = 非审批状态 + 已开始 + 未完成 + 未预警 */
  inProgress:
    "(COALESCE(JSON_LENGTH(t.pending_changes), 0) = 0 OR t.pending_change_type != 'plan_change') AND t.actual_start_date IS NOT NULL AND t.actual_end_date IS NULL " +
    "AND (t.end_date IS NULL OR (t.end_date >= CURDATE() AND DATEDIFF(t.end_date, CURDATE()) > COALESCE(t.warning_days, 3)))",
  /** 未开始 = 非审批状态 + 未开始 + 未到期 */
  notStarted:
    "(COALESCE(JSON_LENGTH(t.pending_changes), 0) = 0 OR t.pending_change_type != 'plan_change') AND t.actual_start_date IS NULL AND t.actual_end_date IS NULL " +
    "AND (t.end_date IS NULL OR t.end_date >= DATE_ADD(CURDATE(), INTERVAL COALESCE(t.warning_days, 3) DAY))",
} as const;
