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
  in_progress: '#2563EB',       // 蓝色
  delay_warning: '#D97706',     // 黄色
  delayed: '#DC2626',           // 红色
  early_completed: '#059669',   // 绿色
  on_time_completed: '#059669', // 绿色
  overdue_completed: '#6B7280', // 灰色
} as const;

/** 延期类型颜色映射 */
export const DELAY_TYPE_COLORS: Record<string, string> = {
  delay_warning: '#D97706',     // 黄色
  delayed: '#DC2626',           // 红色
  overdue_completed: '#6B7280', // 灰色
} as const;

/** 任务状态分组颜色映射 */
export const STATUS_GROUP_COLORS: Record<string, string> = {
  pending: '#94A3B8',     // 灰色
  in_progress: '#2563EB', // 蓝色
  completed: '#059669',   // 绿色
  delayed: '#DC2626',     // 红色
} as const;

// ============ 优先级颜色 ============

/** 任务优先级颜色映射 */
export const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#DC2626', // 红色
  high: '#D97706',   // 黄色
  medium: '#2563EB', // 蓝色
  low: '#9CA3AF',    // 灰色
} as const;

// ============ 风险等级颜色 ============

/** 风险等级颜色映射 */
export const RISK_COLORS: Record<string, string> = {
  high: '#DC2626',   // 红色
  medium: '#D97706', // 黄色
  low: '#059669',    // 绿色
} as const;

// ============ 活跃度颜色 ============

/** 活跃度颜色映射 */
export const ACTIVITY_COLORS: Record<string, string> = {
  high: '#059669',   // 绿色
  medium: '#D97706', // 黄色
  low: '#DC2626',    // 红色
} as const;

// ============ 图表颜色 ============

/** 默认图表颜色序列 - *-600 色阶，WCAG AA 对比度 > 4.5:1 */
export const DEFAULT_CHART_COLORS = [
  '#4F46E5', // 靛青（主色）
  '#059669', // 翠绿
  '#D97706', // 琥珀
  '#DC2626', // 朱红
  '#7C3AED', // 紫罗兰
  '#DB2777', // 玫红
  '#0891B2', // 湖蓝
  '#65A30D', // 青绿
] as const;

/**
 * 渐变色对 - 用于柱状图/面积图的渐变填充
 * 每对色值：[起始色(-600 饱和), 结束色(-300 明亮)]
 */
export const CHART_GRADIENT_PAIRS: [string, string][] = [
  ['#4F46E5', '#A5B4FC'], // 靛青
  ['#059669', '#6EE7B7'], // 绿
  ['#D97706', '#FCD34D'], // 黄
  ['#DC2626', '#FCA5A5'], // 红
  ['#7C3AED', '#C4B5FD'], // 紫
  ['#DB2777', '#F9A8D4'], // 粉
  ['#0891B2', '#67E8F9'], // 青
  ['#65A30D', '#BEF264'], // 青绿
];

/** 渐变色配置 - 三段式渐变 */
export const GRADIENT_COLORS = {
  // 靛青渐变（用于主要数据）
  indigo: ['#4F46E5', '#818CF8', '#A5B4FC'],
  // 绿色渐变（用于正向数据）
  green: ['#059669', '#34D399', '#6EE7B7'],
  // 红色渐变（用于负向数据）
  red: ['#DC2626', '#F87171', '#FCA5A5'],
  // 黄色渐变（用于警告数据）
  yellow: ['#D97706', '#FBBF24', '#FCD34D'],
} as const;

/** 柱状图悬停发光阴影颜色 */
export const BAR_GLOW_COLORS: Record<string, string> = {
  '#4F46E5': 'rgba(79,70,229,0.35)',
  '#059669': 'rgba(5,150,105,0.35)',
  '#D97706': 'rgba(217,119,6,0.35)',
  '#DC2626': 'rgba(220,38,38,0.35)',
  '#7C3AED': 'rgba(124,58,237,0.35)',
  '#DB2777': 'rgba(219,39,119,0.35)',
  '#0891B2': 'rgba(8,145,178,0.35)',
  '#65A30D': 'rgba(101,163,13,0.35)',
} as const;

// ============ 延期分析语义颜色 ============

/** 延期原因语义颜色 */
export const DELAY_REASON_COLORS: Record<string, string> = {
  '需求变更': '#D97706',   // 琥珀 - 流程变更类
  '技术难度': '#2563EB',   // 蓝色 - 技术挑战类
  '资源不足': '#DC2626',   // 红色 - 资源短缺类
  '依赖阻塞': '#7C3AED',   // 紫色 - 外部依赖类
  '其他': '#6B7280',       // 灰色 - 其他
} as const;

/**
 * 优先级名称到颜色的映射（中文标签 → 颜色）
 * 用于柱状图/饼图中根据名称自动匹配语义颜色
 */
export const PRIORITY_LABEL_COLORS: Record<string, string> = {
  '紧急': '#DC2626',   // 深红
  '高': '#D97706',     // 琥珀
  '中': '#2563EB',     // 钴蓝
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
  '高':   ['#D97706', '#FDE68A'],  // 琥珀 → 浅黄
  '中':   ['#2563EB', '#93C5FD'],  // 蓝 → 浅蓝
  '低':   ['#94A3B8', '#CBD5E1'],  // 灰蓝 → 浅灰
} as const;

/** 严重程度渐变色（按数值比例映射） */
export const SEVERITY_COLORS = {
  low: '#059669',      // 绿色 - 低严重度
  moderate: '#D97706', // 琥珀 - 中等
  high: '#DC2626',     // 红色 - 高严重度
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
  hardware: '#2563EB', // 蓝色 - 硬件开发
  material: '#059669', // 绿色 - 物料管理
  design: '#D97706',   // 黄色 - 设计管理
  general: '#7C3AED',  // 紫色 - 综合职能
} as const;

/**
 * 按分组色系生成12种任务类型颜色
 * 同组内用同色系的不同深浅区分（保留渐变梯度，不升级色阶）
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
  contact: '#7C3AED',
  func_task: '#A78BFA',
  other: '#C4B5FD',
} as const;
