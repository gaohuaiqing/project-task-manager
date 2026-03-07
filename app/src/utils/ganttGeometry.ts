/**
 * 甘特图几何计算工具
 *
 * 提供日期与像素之间的转换、位置计算等核心几何功能
 *
 * @module utils/ganttGeometry
 */

import { parseISO, differenceInDays, addDays, format } from 'date-fns';

/**
 * 时间范围
 */
export interface TimeRange {
  /** 开始日期 (YYYY-MM-DD) */
  startDate: string;
  /** 结束日期 (YYYY-MM-DD) */
  endDate: string;
  /** 总天数 */
  totalDays: number;
}

/**
 * 缩放配置
 */
export interface ZoomConfig {
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 缩放级别 (0-100) */
  zoomLevel: number;
}

/**
 * 日期范围配置
 */
export interface DateRangeConfig {
  /** 项目开始日期 */
  projectStart: string;
  /** 项目结束日期 */
  projectEnd: string;
  /** 缓冲天数（前后各加） */
  bufferDays?: number;
}

/**
 * 将日期转换为X坐标
 * @param date - 目标日期 (YYYY-MM-DD)
 * @param startDate - 时间轴开始日期 (YYYY-MM-DD)
 * @param dayWidth - 每天的像素宽度
 * @returns X坐标（像素）
 */
export function dateToX(date: string, startDate: string, dayWidth: number): number {
  const target = parseISO(date);
  const start = parseISO(startDate);
  const daysDiff = differenceInDays(target, start);
  return daysDiff * dayWidth;
}

/**
 * 将X坐标转换为日期
 * @param x - X坐标（像素）
 * @param startDate - 时间轴开始日期 (YYYY-MM-DD)
 * @param dayWidth - 每天的像素宽度
 * @returns 日期字符串 (YYYY-MM-DD)
 */
export function xToDate(x: number, startDate: string, dayWidth: number): string {
  const daysDiff = Math.round(x / dayWidth);
  const start = parseISO(startDate);
  const targetDate = addDays(start, daysDiff);
  return format(targetDate, 'yyyy-MM-dd');
}

/**
 * 计算显示时间范围
 * @param config - 日期范围配置
 * @returns 时间范围对象
 */
export function calculateTimeRange(config: DateRangeConfig): TimeRange {
  const { projectStart, projectEnd, bufferDays = 7 } = config;

  const startDate = addDays(parseISO(projectStart), -bufferDays);
  const endDate = addDays(parseISO(projectEnd), bufferDays);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    totalDays,
  };
}

/**
 * 计算任务条的位置和尺寸
 * @param taskStartDate - 任务开始日期
 * @param taskEndDate - 任务结束日期
 * @param timelineStart - 时间轴开始日期
 * @param dayWidth - 每天的像素宽度
 * @returns 位置和尺寸信息
 */
export function calculateTaskRect(
  taskStartDate: string,
  taskEndDate: string,
  timelineStart: string,
  dayWidth: number
): { x: number; width: number; duration: number } {
  const x = dateToX(taskStartDate, timelineStart, dayWidth);
  const endX = dateToX(taskEndDate, timelineStart, dayWidth);
  const width = endX - x + dayWidth; // 包含结束日期当天
  const duration = differenceInDays(parseISO(taskEndDate), parseISO(taskStartDate)) + 1;

  return { x, width, duration };
}

/**
 * 计算时间轴的总宽度
 * @param timeRange - 时间范围
 * @param dayWidth - 每天的像素宽度
 * @returns 总宽度（像素）
 */
export function calculateTimelineWidth(timeRange: TimeRange, dayWidth: number): number {
  return timeRange.totalDays * dayWidth;
}

/**
 * 计算刻度间隔（根据缩放级别）
 * @param dayWidth - 每天的像素宽度
 * @returns 刻度间隔（天数）
 */
export function calculateTickInterval(dayWidth: number): number {
  if (dayWidth >= 50) return 1;      // 日视图：每天一个刻度
  if (dayWidth >= 20) return 7;      // 周视图：每周一个刻度
  if (dayWidth >= 10) return 14;     // 双周视图
  return 30;                         // 月视图：每月一个刻度
}

/**
 * 获取刻度格式（根据缩放级别）
 * @param dayWidth - 每天的像素宽度
 * @returns 日期格式字符串
 */
export function getTickFormat(dayWidth: number): string {
  if (dayWidth >= 50) return 'M月d日';
  if (dayWidth >= 20) return 'M月d日';
  if (dayWidth >= 10) return 'M月d日';
  return 'yyyy年M月';
}

/**
 * 滚动到指定日期
 * @param date - 目标日期
 * @param containerWidth - 容器宽度
 * @param timeRange - 时间范围
 * @param dayWidth - 每天的像素宽度
 * @returns 滚动位置（像素）
 */
export function scrollToDate(
  date: string,
  containerWidth: number,
  timeRange: TimeRange,
  dayWidth: number
): number {
  const x = dateToX(date, timeRange.startDate, dayWidth);
  return Math.max(0, x - containerWidth / 2);
}

/**
 * 判断日期是否为周末
 * @param date - 日期字符串 (YYYY-MM-DD)
 * @returns 是否为周末
 */
export function isWeekend(date: string): boolean {
  const d = parseISO(date);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 判断日期是否为今天
 * @param date - 日期字符串 (YYYY-MM-DD)
 * @returns 是否为今天
 */
export function isToday(date: string): boolean {
  const today = format(new Date(), 'yyyy-MM-dd');
  return date === today;
}

/**
 * 格式化日期显示
 * @param date - 日期字符串
 * @param formatString - 格式字符串
 * @returns 格式化后的日期
 */
export function formatDateDisplay(date: string, formatString: string = 'yyyy-MM-dd'): string {
  try {
    return format(parseISO(date), formatString);
  } catch {
    return date;
  }
}

/**
 * 安全的日期比较
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 比较结果 (-1, 0, 1)
 */
export function compareDates(date1: string, date2: string): number {
  const d1 = parseISO(date1).getTime();
  const d2 = parseISO(date2).getTime();
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * 添加天数到日期
 * @param date - 基准日期
 * @param days - 天数
 * @returns 新日期
 */
export function addDaysToDate(date: string, days: number): string {
  const result = addDays(parseISO(date), days);
  return format(result, 'yyyy-MM-dd');
}

/**
 * 计算两个日期之间的天数差
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 天数差（包含结束日期）
 */
export function getDaysDiff(startDate: string, endDate: string): number {
  return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
}
