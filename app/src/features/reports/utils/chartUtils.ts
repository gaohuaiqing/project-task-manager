/**
 * 图表工具函数
 * 用于数据聚合、格式化等通用操作
 */

import { CHART_PALETTE, getChartColor } from '../constants/chartColors';

// ============ 数据类型定义 ============

/** 图表数据项 */
export interface ChartDataItem {
  /** 显示标签 */
  label: string;
  /** 数值 */
  value: number;
  /** 数量（可选） */
  count?: number;
  /** 颜色（可选） */
  color?: string;
  /** 原始状态（可选） */
  status?: string;
}

/** 聚合后的图表数据 */
export interface AggregatedChartData {
  /** 主要显示项 */
  items: ChartDataItem[];
  /** 是否包含"其他"分类 */
  hasOther: boolean;
  /** "其他"分类的数量 */
  otherCount: number;
  /** "其他"分类的数值 */
  otherValue: number;
}

// ============ 数据聚合函数 ============

/**
 * 聚合图表数据
 * 当分类数量超过阈值时，将较小的分类合并为"其他"
 *
 * @param data 原始数据
 * @param maxItems 最大显示项数（默认6）
 * @returns 聚合后的数据
 *
 * @example
 * const data = [
 *   { label: '张三', value: 10 },
 *   { label: '李四', value: 8 },
 *   // ... 共10项
 * ];
 * const result = aggregateChartData(data, 6);
 * // result.items: 前5项
 * // result.hasOther: true
 * // result.otherCount: 5 (后5项的数量)
 */
export function aggregateChartData(
  data: ChartDataItem[],
  maxItems: number = 6
): AggregatedChartData {
  // 数据量在阈值内，不需要聚合
  if (data.length <= maxItems) {
    return {
      items: data,
      hasOther: false,
      otherCount: 0,
      otherValue: 0,
    };
  }

  // 按值排序（降序）
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // 取前 maxItems-1 项作为主要显示
  const topItems = sorted.slice(0, maxItems - 1);

  // 剩余项合并为"其他"
  const otherItems = sorted.slice(maxItems - 1);

  const otherValue = otherItems.reduce((sum, item) => sum + item.value, 0);
  const otherCount = otherItems.reduce((sum, item) => sum + (item.count || 0), 0);

  return {
    items: topItems,
    hasOther: true,
    otherCount,
    otherValue,
  };
}

/**
 * 为图表数据添加颜色
 *
 * @param data 图表数据
 * @param startIndex 颜色起始索引（默认0）
 * @returns 带颜色的数据
 */
export function addChartColors<T extends ChartDataItem>(
  data: T[],
  startIndex: number = 0
): (T & { color: string })[] {
  return data.map((item, index) => ({
    ...item,
    color: item.color || getChartColor(startIndex + index),
  }));
}

/**
 * 构建饼图数据
 * 包含聚合和颜色处理
 *
 * @param data 原始数据
 * @param maxItems 最大显示项数
 * @param otherLabel "其他"分类的标签
 * @returns 处理后的饼图数据
 */
export function buildPieChartData(
  data: ChartDataItem[],
  maxItems: number = 6,
  otherLabel: string = '其他'
): ChartDataItem[] {
  const { items, hasOther, otherCount, otherValue } = aggregateChartData(data, maxItems);

  // 添加颜色
  const coloredItems = addChartColors(items);

  // 添加"其他"分类
  if (hasOther && otherCount > 0) {
    coloredItems.push({
      label: `${otherLabel} (${otherCount}项)`,
      value: otherValue,
      count: otherCount,
      color: '#9ca3af', // 灰色
      status: 'other',
    });
  }

  return coloredItems;
}

// ============ 格式化函数 ============

/**
 * 格式化百分比
 * @param value 数值（0-100）
 * @param decimals 小数位数
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化大数字
 * @param value 数值
 */
export function formatLargeNumber(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

/**
 * 饼图标签格式化
 * 只显示占比超过阈值的标签，避免重叠
 *
 * @param label 标签
 * @param percent 百分比（0-1）
 * @param threshold 阈值（默认5%）
 */
export function formatPieLabel(
  label: string,
  percent: number,
  threshold: number = 0.05
): string | null {
  if (percent < threshold) {
    return null; // 小于阈值不显示标签
  }
  return `${label} (${(percent * 100).toFixed(0)}%)`;
}

// ============ 趋势计算函数 ============

/**
 * 计算环比变化
 *
 * @param current 当前值
 * @param previous 上一周期值
 * @returns 变化百分比
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // 从0增长视为100%
  }
  return ((current - previous) / previous) * 100;
}

/**
 * 计算周环比趋势
 *
 * @param data 时间序列数据（按天）
 * @param valueKey 值字段名
 * @returns 趋势数据
 */
export function calculateWeeklyTrend<T extends Record<string, unknown>>(
  data: T[],
  valueKey: keyof T
): { value: number; period: string } | null {
  if (data.length < 14) {
    return null; // 数据不足
  }

  const recentWeek = data.slice(-7);
  const previousWeek = data.slice(-14, -7);

  const recentSum = recentWeek.reduce((sum, d) => sum + (d[valueKey] as number), 0);
  const previousSum = previousWeek.reduce((sum, d) => sum + (d[valueKey] as number), 0);

  if (previousSum === 0) {
    return null;
  }

  const changePercent = ((recentSum - previousSum) / previousSum) * 100;

  return {
    value: changePercent,
    period: 'vs 上周',
  };
}
