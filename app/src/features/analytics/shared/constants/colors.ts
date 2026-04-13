/**
 * 分析模块共享颜色常量
 * 统一管理仪表板和报表分析的颜色配置
 *
 * @module analytics/shared/constants/colors
 */

// ============ 状态颜色 ============

/** 任务状态颜色映射 */
export const STATUS_COLORS: Record<string, string> = {
  not_started: '#94A3B8',       // 灰色
  in_progress: '#3B82F6',       // 蓝色
  delay_warning: '#F59E0B',     // 黄色
  delayed: '#EF4444',           // 红色
  early_completed: '#10B981',   // 绿色
  on_time_completed: '#10B981', // 绿色
  overdue_completed: '#6B7280', // 灰色
} as const;

/** 延期类型颜色映射 */
export const DELAY_TYPE_COLORS: Record<string, string> = {
  delay_warning: '#F59E0B',     // 黄色
  delayed: '#EF4444',           // 红色
  overdue_completed: '#6B7280', // 灰色
} as const;

/** 任务状态分组颜色映射 */
export const STATUS_GROUP_COLORS: Record<string, string> = {
  pending: '#94A3B8',     // 灰色
  in_progress: '#3B82F6', // 蓝色
  completed: '#10B981',   // 绿色
  delayed: '#EF4444',     // 红色
} as const;

// ============ 优先级颜色 ============

/** 任务优先级颜色映射 */
export const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444', // 红色
  high: '#F59E0B',   // 黄色
  medium: '#3B82F6', // 蓝色
  low: '#9CA3AF',    // 灰色
} as const;

// ============ 风险等级颜色 ============

/** 风险等级颜色映射 */
export const RISK_COLORS: Record<string, string> = {
  high: '#EF4444',   // 红色
  medium: '#F59E0B', // 黄色
  low: '#10B981',    // 绿色
} as const;

// ============ 活跃度颜色 ============

/** 活跃度颜色映射 */
export const ACTIVITY_COLORS: Record<string, string> = {
  high: '#10B981',   // 绿色
  medium: '#F59E0B', // 黄色
  low: '#EF4444',    // 红色
} as const;

// ============ 图表颜色 ============

/** 默认图表颜色序列 - 专业级配色，高对比度且和谐 */
export const DEFAULT_CHART_COLORS = [
  '#3B82F6', // 钴蓝（主色）
  '#10B981', // 翠绿
  '#F59E0B', // 琥珀
  '#EF4444', // 朱红
  '#8B5CF6', // 紫罗兰
  '#EC4899', // 玫红
  '#06B6D4', // 湖蓝
  '#84CC16', // 青绿
] as const;

/**
 * 渐变色对 - 用于柱状图/面积图的渐变填充
 * 每对色值：[起始色(饱和), 结束色(明亮)]
 */
export const CHART_GRADIENT_PAIRS: [string, string][] = [
  ['#3B82F6', '#93C5FD'], // 蓝
  ['#10B981', '#6EE7B7'], // 绿
  ['#F59E0B', '#FCD34D'], // 黄
  ['#EF4444', '#FCA5A5'], // 红
  ['#8B5CF6', '#C4B5FD'], // 紫
  ['#EC4899', '#F9A8D4'], // 粉
  ['#06B6D4', '#67E8F9'], // 青
  ['#84CC16', '#BEF264'], // 青绿
];

/** 渐变色配置 - 三段式渐变 */
export const GRADIENT_COLORS = {
  // 蓝色渐变（用于主要数据）
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  // 绿色渐变（用于正向数据）
  green: ['#10B981', '#34D399', '#6EE7B7'],
  // 红色渐变（用于负向数据）
  red: ['#EF4444', '#F87171', '#FCA5A5'],
  // 黄色渐变（用于警告数据）
  yellow: ['#F59E0B', '#FBBF24', '#FCD34D'],
} as const;

/** 柱状图悬停发光阴影颜色 */
export const BAR_GLOW_COLORS: Record<string, string> = {
  '#3B82F6': 'rgba(59,130,246,0.35)',
  '#10B981': 'rgba(16,185,129,0.35)',
  '#F59E0B': 'rgba(245,158,11,0.35)',
  '#EF4444': 'rgba(239,68,68,0.35)',
  '#8B5CF6': 'rgba(139,92,246,0.35)',
  '#EC4899': 'rgba(236,72,153,0.35)',
  '#06B6D4': 'rgba(6,182,212,0.35)',
  '#84CC16': 'rgba(132,204,22,0.35)',
} as const;

// ============ 延期分析语义颜色 ============

/** 延期原因语义颜色 */
export const DELAY_REASON_COLORS: Record<string, string> = {
  '需求变更': '#F59E0B',   // 琥珀 - 流程变更类
  '技术难度': '#3B82F6',   // 蓝色 - 技术挑战类
  '资源不足': '#EF4444',   // 红色 - 资源短缺类
  '依赖阻塞': '#8B5CF6',   // 紫色 - 外部依赖类
  '其他': '#6B7280',       // 灰色 - 其他
} as const;

/**
 * 优先级名称到颜色的映射（中文标签 → 颜色）
 * 用于柱状图/饼图中根据名称自动匹配语义颜色
 */
export const PRIORITY_LABEL_COLORS: Record<string, string> = {
  '紧急': '#DC2626',   // 深红
  '高': '#F59E0B',     // 琥珀
  '中': '#3B82F6',     // 钴蓝
  '低': '#94A3B8',     // 灰蓝
} as const;

/**
 * 根据优先级名称获取对应颜色
 * 支持中文标签和英文 key
 */
export function getPriorityColor(label: string): string | undefined {
  // 先匹配中文标签
  if (PRIORITY_LABEL_COLORS[label]) return PRIORITY_LABEL_COLORS[label];
  // 再匹配英文 key
  const normalizedKey = label.toLowerCase().replace(/[\s-_]/g, '');
  return PRIORITY_COLORS[normalizedKey];
}

/** 优先级渐变色对（用于柱状图渐变） */
export const PRIORITY_GRADIENT_PAIRS: Record<string, [string, string]> = {
  '紧急': ['#DC2626', '#FCA5A5'],  // 红 → 浅红
  '高':   ['#F59E0B', '#FDE68A'],  // 琥珀 → 浅黄
  '中':   ['#3B82F6', '#93C5FD'],  // 蓝 → 浅蓝
  '低':   ['#94A3B8', '#CBD5E1'],  // 灰蓝 → 浅灰
} as const;

/** 严重程度渐变色（按数值比例映射） */
export const SEVERITY_COLORS = {
  low: '#10B981',      // 绿色 - 低严重度
  moderate: '#F59E0B', // 琥珀 - 中等
  high: '#EF4444',     // 红色 - 高严重度
} as const;

/**
 * 根据数值在范围中的位置计算严重程度颜色
 * 低值→绿色，中值→琥珀，高值→红色
 */
export function getSeverityColor(value: number, min: number, max: number): string {
  if (max === min) return SEVERITY_COLORS.moderate;
  const ratio = (value - min) / (max - min);
  if (ratio < 0.35) return SEVERITY_COLORS.low;
  if (ratio < 0.65) return SEVERITY_COLORS.moderate;
  return SEVERITY_COLORS.high;
}

// ============ 任务类型分组颜色 ============

/** 任务类型分组主色（用于图例） */
export const TASK_TYPE_GROUP_COLORS: Record<string, string> = {
  hardware: '#3B82F6', // 蓝色 - 硬件开发
  material: '#10B981', // 绿色 - 物料管理
  design: '#F59E0B',   // 黄色 - 设计管理
  general: '#8B5CF6',  // 紫色 - 综合职能
} as const;

/**
 * 按分组色系生成12种任务类型颜色
 * 同组内用同色系的不同深浅区分
 */
export const TASK_TYPE_COLORS: Record<string, string> = {
  // 硬件开发组 - 蓝色系
  firmware: '#2563EB',
  board: '#3B82F6',
  driver: '#60A5FA',
  interface: '#93C5FD',
  hw_recovery: '#BFDBFE',
  // 物料管理组 - 绿色系
  material_import: '#059669',
  material_sub: '#34D399',
  // 设计管理组 - 橙色系
  sys_design: '#EA580C',
  core_risk: '#FB923C',
  // 综合职能组 - 紫色系
  coordinator: '#7C3AED',
  functional: '#A78BFA',
  other: '#C4B5FD',
} as const;
