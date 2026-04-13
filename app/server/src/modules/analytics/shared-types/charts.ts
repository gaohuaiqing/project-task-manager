/**
 * 分析模块后端类型定义 - 图表数据类型
 *
 * @module analytics/types/charts
 */

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string;
  created?: number;
  completed?: number;
  delayed?: number;
  value?: number;
}

/** 延期趋势数据 */
export interface DelayTrendData {
  date: string;
  newDelayed: number;
  resolvedDelayed: number;
  totalDelayed: number;
}

/** 多系列趋势数据 */
export interface MultiSeriesTrendData {
  date: string;
  series: Record<string, number>;
}

/** 饼图数据项 */
export interface PieChartDataItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

/** 柱状图数据项 */
export interface BarChartDataItem {
  name: string;
  value: number;
  color?: string;
  category?: string;
}

/** 散点图数据点 */
export interface ScatterDataPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
  size?: number;
}
