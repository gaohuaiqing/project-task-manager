/**
 * 日期工具函数
 */

import { formatDistanceToNow as dateFnsFormatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化距离现在的时间（中文）
 */
export function formatDistanceToNow(date: Date): string {
  try {
    return dateFnsFormatDistanceToNow(date, {
      locale: zhCN,
      addSuffix: true
    });
  } catch {
    return '未知时间';
  }
}

/**
 * 格式化日期为短格式
 */
export function formatShortDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return '无效日期';
  }
}

/**
 * 格式化日期为长格式
 */
export function formatLongDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
  } catch {
    return '无效日期';
  }
}

/**
 * 检查日期是否已过期
 */
export function isExpired(date: string | Date): boolean {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d < new Date();
  } catch {
    return false;
  }
}

/**
 * 计算两个日期之间的小时数
 */
export function getHoursDifference(date1: string | Date, date2: string | Date): number {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}

/**
 * 检查是否超过指定小时数
 */
export function isOverHours(date: string | Date, hours: number): boolean {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hoursElapsed = getHoursDifference(d, new Date());
    return hoursElapsed > hours;
  } catch {
    return false;
  }
}

/**
 * 获取今天的日期字符串
 */
export function getTodayString(): string {
  return formatShortDate(new Date());
}
