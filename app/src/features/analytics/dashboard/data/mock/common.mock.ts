/**
 * 通用模拟数据
 *
 * @module analytics/dashboard/data/mock/common.mock
 */

import type { TrendDataPoint, PieChartDataItem } from '../../../shared/types';

// ============ 工具函数 ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePastDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// ============ 任务趋势 ============

export function generateTaskTrends(): TrendDataPoint[] {
  const dates = generatePastDates(30);
  return dates.map((date) => ({
    date,
    created: randomInt(0, 5),
    completed: randomInt(0, 4),
    delayed: randomInt(0, 2),
  }));
}

// ============ 任务类型分布 ============

/**
 * 基于 FINAL_REQUIREMENTS §2.2.5 定义的12种任务类型
 * 使用分组色系：硬件开发(蓝) / 物料管理(绿) / 设计管理(橙) / 综合职能(紫)
 */
export function generateTaskTypeDistribution(): PieChartDataItem[] {
  return [
    // 硬件开发组 - 蓝色系
    { name: '固件', value: 35, color: '#2563EB' },
    { name: '板卡', value: 28, color: '#3B82F6' },
    { name: '驱动', value: 22, color: '#60A5FA' },
    { name: '接口类', value: 18, color: '#93C5FD' },
    { name: '硬件恢复包', value: 12, color: '#BFDBFE' },
    // 物料管理组 - 绿色系
    { name: '物料导入', value: 8, color: '#059669' },
    { name: '物料改代', value: 10, color: '#34D399' },
    // 设计管理组 - 橙色系
    { name: '系统设计', value: 15, color: '#EA580C' },
    { name: '核心风险', value: 6, color: '#FB923C' },
    // 综合职能组 - 紫色系
    { name: '接口人', value: 4, color: '#7C3AED' },
    { name: '职能任务', value: 9, color: '#A78BFA' },
    { name: '其它', value: 5, color: '#C4B5FD' },
  ];
}
