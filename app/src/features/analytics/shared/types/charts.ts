/**
 * 分析模块共享类型定义 - 图表数据
 * 用于仪表板和报表分析的统一图表数据类型
 *
 * @module analytics/shared/types/charts
 * @see REQ_07_INDEX.md §6 共享组件清单
 */

// ============ 基础图表数据 ============

/** 趋势数据点 */
export interface TrendDataPoint {
  /** 日期或时间段 */
  date: string;
  /** 创建数量 */
  created?: number;
  /** 完成数量 */
  completed?: number;
  /** 延期数量 */
  delayed?: number;
  /** 其他数值（通用） */
  value?: number;
  /** 多系列数据 */
  [key: string]: string | number | undefined;
}

/** 饼图/环形图数据项 */
export interface PieChartDataItem {
  /** 名称 */
  name: string;
  /** 值 */
  value: number;
  /** 颜色（可选，不传则使用默认配色） */
  color?: string;
  /** 百分比 */
  percentage?: number;
}

/** 柱状图数据项 */
export interface BarChartDataItem {
  /** X轴标签 */
  name: string;
  /** 主数值 */
  value: number;
  /** 多系列数值 */
  [key: string]: string | number;
}

/** 散点图数据点 */
export interface ScatterDataPoint {
  /** X轴值 */
  x: number;
  /** Y轴值 */
  y: number;
  /** 点大小 */
  size?: number;
  /** 点颜色或分类 */
  category?: string;
  /** 标签 */
  label?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

// ============ 四象限图 ============

/** 四象限图配置 */
export interface QuadrantChartConfig {
  /** X轴阈值线 */
  xThreshold: number;
  /** Y轴阈值线 */
  yThreshold: number;
  /** X轴标签 */
  xLabel: string;
  /** Y轴标签 */
  yLabel: string;
  /** 四象限说明 */
  quadrants: {
    topRight: string;
    topLeft: string;
    bottomRight: string;
    bottomLeft: string;
  };
}

/** 延期×负荷四象限数据点 */
export interface DelayWorkloadPoint extends ScatterDataPoint {
  /** 成员ID */
  memberId: number;
  /** 成员姓名 */
  memberName: string;
  /** 任务负荷 */
  workload: number;
  /** 延期任务数 */
  delayedTasks: number;
  /** 总任务数 */
  totalTasks: number;
  /** 活跃度 */
  activityRate: number;
}

/** 活跃度×延期率四象限数据点 */
export interface ActivityDelayPoint extends ScatterDataPoint {
  /** 成员ID */
  memberId: number;
  /** 成员姓名 */
  memberName: string;
  /** 活跃度 */
  activityRate: number;
  /** 延期率 */
  delayRate: number;
  /** 总任务数 */
  totalTasks: number;
}

// ============ 分布图 ============

/** 状态分布项 */
export interface StatusDistributionItem {
  /** 状态 */
  status: string;
  /** 状态显示名称 */
  statusName: string;
  /** 数量 */
  count: number;
  /** 颜色 */
  color?: string;
}

/** 任务类型分布项 */
export interface TaskTypeDistributionItem {
  /** 任务类型代码 */
  taskType: string;
  /** 任务类型名称 */
  taskTypeName: string;
  /** 数量 */
  count: number;
  /** 完成数 */
  completedCount?: number;
  /** 延期数 */
  delayedCount?: number;
  /** 平均工期 */
  avgDuration?: number;
}

/** 延期原因分布项 */
export interface DelayReasonItem {
  /** 原因代码 */
  reason: string;
  /** 原因名称 */
  reasonName: string;
  /** 数量 */
  count: number;
}

// ============ 趋势图 ============

/** 延期趋势数据 */
export interface DelayTrendData {
  /** 时间点 */
  period: string;
  /** 新增延期 */
  newDelayed: number;
  /** 已解决延期 */
  resolvedDelayed: number;
  /** 累计延期 */
  totalDelayed?: number;
}

/** 多系列趋势数据 */
export interface MultiSeriesTrendData {
  /** 时间点 */
  date: string;
  /** 各系列数据 */
  series: Record<string, number>;
}

// ============ 对比图 ============

/** 组/部门对比数据项 */
export interface GroupComparisonItem {
  /** 组/部门名称 */
  name: string;
  /** 延期预警数 */
  delayWarning?: number;
  /** 已延迟数 */
  delayed?: number;
  /** 超期完成数 */
  overdueCompleted?: number;
  /** 总数 */
  total?: number;
}

/** 成员对比数据项 */
export interface MemberComparisonItem {
  /** 成员ID */
  memberId: number;
  /** 成员姓名 */
  memberName: string;
  /** 所属组 */
  teamName?: string;
  /** 延期预警数 */
  delayWarning?: number;
  /** 已延迟数 */
  delayed?: number;
  /** 超期完成数 */
  overdueCompleted?: number;
  /** 总任务数 */
  totalTasks?: number;
}

// ============ 图表配置 ============

/** 基础图表配置 */
export interface ChartConfig {
  /** 图表高度 */
  height?: number;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 是否显示网格 */
  showGrid?: boolean;
  /** 动画时长（毫秒） */
  animationDuration?: number;
  /** 颜色方案 */
  colorScheme?: 'default' | 'status' | 'priority' | string[];
}

/** 折线图配置 */
export interface LineChartConfig extends ChartConfig {
  /** 是否平滑曲线 */
  smooth?: boolean;
  /** 是否显示数据点 */
  showDots?: boolean;
  /** 是否填充区域 */
  fillArea?: boolean;
}

/** 柱状图配置 */
export interface BarChartConfig extends ChartConfig {
  /** 是否水平 */
  horizontal?: boolean;
  /** 是否堆叠 */
  stacked?: boolean;
  /** 柱子宽度比例 */
  barSize?: number;
}

/** 饼图配置 */
export interface PieChartConfig extends ChartConfig {
  /** 是否环形图 */
  donut?: boolean;
  /** 内半径比例 */
  innerRadius?: number;
  /** 外半径比例 */
  outerRadius?: number;
  /** 是否显示标签 */
  showLabels?: boolean;
}

// ============ 图表颜色常量 ============
// 注意：颜色常量已迁移到共享常量模块
// 请从 '../constants/colors.js' 导入
// 此处仅保留重导出以保持向后兼容

export {
  STATUS_COLORS,
  DELAY_TYPE_COLORS,
  STATUS_GROUP_COLORS,
  PRIORITY_COLORS,
  RISK_COLORS,
  ACTIVITY_COLORS,
  DEFAULT_CHART_COLORS,
  GRADIENT_COLORS,
} from '../constants/colors.js';
