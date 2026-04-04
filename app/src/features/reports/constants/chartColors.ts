/**
 * 报表图表统一颜色常量
 * 与 design tokens 保持一致，消除分散定义
 */

// ============ 状态颜色 ============

/** 任务状态颜色（与后端 TASK_STATUS_CONFIG 同步） */
export const TASK_STATUS_COLORS = {
  not_started: '#9ca3af',      // 灰色 - 未开始
  in_progress: '#3b82f6',      // 蓝色 - 进行中
  completed: '#22c55e',        // 绿色 - 已完成
  early_completed: '#10b981',  // 翠绿 - 提前完成
  on_time_completed: '#34d399', // 浅绿 - 按时完成
  delayed: '#ef4444',          // 红色 - 已延期
  delay_warning: '#f59e0b',    // 橙色 - 延期预警
  overdue_completed: '#f97316', // 深橙 - 超期完成
  pending_approval: '#8b5cf6', // 紫色 - 待审批
  rejected: '#dc2626',         // 深红 - 已驳回
} as const;

/** 任务状态标签 */
export const TASK_STATUS_LABELS = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  delayed: '已延期',
  delay_warning: '延期预警',
  overdue_completed: '超期完成',
  pending_approval: '待审批',
  rejected: '已驳回',
} as const;

// ============ 优先级颜色 ============

/** 优先级颜色 */
export const PRIORITY_COLORS = {
  urgent: '#ef4444',  // 红色 - 紧急
  high: '#f59e0b',    // 橙色 - 高
  medium: '#3b82f6',  // 蓝色 - 中
  low: '#9ca3af',     // 灰色 - 低
} as const;

/** 优先级标签 */
export const PRIORITY_LABELS = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
} as const;

// ============ 图表调色板 ============

/** 图表调色板（用于动态数据，如项目分布、负责人分布等） */
export const CHART_PALETTE = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#a855f7', // purple
] as const;

/** 获取图表颜色（带循环） */
export function getChartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

// ============ 状态颜色获取函数 ============

/** 获取任务状态颜色 */
export function getTaskStatusColor(status: string): string {
  return TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] || '#9ca3af';
}

/** 获取任务状态标签 */
export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] || status;
}

/** 获取优先级颜色 */
export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#9ca3af';
}

/** 获取优先级标签 */
export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || priority;
}

// ============ 趋势颜色 ============

/** 趋势方向颜色 */
export const TREND_COLORS = {
  positive: '#22c55e',  // 绿色 - 正向趋势（上升）
  negative: '#ef4444',  // 红色 - 负向趋势（下降）
  neutral: '#9ca3af',   // 灰色 - 无变化
} as const;

/** 获取趋势颜色 */
export function getTrendColor(
  value: number,
  invertColors: boolean = false
): string {
  if (value === 0) return TREND_COLORS.neutral;
  const isPositive = value > 0;
  const actualPositive = invertColors ? !isPositive : isPositive;
  return actualPositive ? TREND_COLORS.positive : TREND_COLORS.negative;
}
