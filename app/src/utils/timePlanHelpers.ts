/**
 * 时间计划编辑器辅助函数
 *
 * 提供节点创建、日期计算等辅助功能
 * @module utils/timePlanHelpers
 */

import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';

/**
 * 创建新的里程碑节点
 */
export function createMilestone(
  plannedDate: string,
  index: number
): Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> {
  return {
    name: `里程碑 ${index + 1}`,
    description: '',
    plannedDate,
    status: 'pending',
    sortOrder: index,
  };
}

/**
 * 创建完整的里程碑（包含ID和时间戳）
 */
export function createFullMilestone(
  plannedDate: string,
  index: number,
  projectId: number = 0
): ProjectMilestone {
  return {
    ...createMilestone(plannedDate, index),
    id: Date.now() + Math.random(), // 临时ID
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 创建新的WBS任务节点
 */
export function createWbsTask(
  projectId: string,
  memberId: string,
  startDate: string,
  endDate: string,
  order: number
): Omit<WbsTask, 'id' | 'createdAt' | 'updatedAt' | 'wbsCode'> {
  return {
    projectId,
    memberId,
    title: '新任务',
    description: '',
    status: 'not_started',
    priority: 'medium',
    plannedStartDate: startDate,
    plannedEndDate: endDate,
    plannedDays: calculateDaysBetween(startDate, endDate),
    progress: 0,
    level: 0,
    subtasks: [],
    order,
    isExpanded: true,
  };
}

/**
 * 创建完整的WBS任务
 */
export function createFullWbsTask(
  projectId: string,
  memberId: string,
  startDate: string,
  endDate: string,
  order: number,
  wbsCode: string
): WbsTask {
  return {
    ...createWbsTask(projectId, memberId, startDate, endDate, order),
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    wbsCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 计算两个日期之间的天数
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * 添加天数到日期
 */
export function addDays(date: string, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * 计算项目中间日期（用于放置里程碑）
 */
export function calculateMiddleDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = calculateDaysBetween(startDate, endDate);
  const middleDate = new Date(start.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
  return middleDate.toISOString().split('T')[0];
}

/**
 * 生成WBS编码
 */
export function generateWbsCode(parentWbsCode: string | undefined, index: number): string {
  if (!parentWbsCode) {
    return `${index + 1}`;
  }
  return `${parentWbsCode}.${index + 1}`;
}

/**
 * 计算时间范围总天数
 */
export function calculateTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 验证日期范围
 */
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean;
  error?: string;
} {
  if (!startDate || !endDate) {
    return { valid: false, error: '开始日期和结束日期不能为空' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return { valid: false, error: '开始日期不能晚于结束日期' };
  }

  return { valid: true };
}

/**
 * 检查日期是否在范围内
 */
export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const target = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return target >= start && target <= end;
}

/**
 * 格式化日期显示
 */
export function formatDate(date: string, format: 'short' | 'full' = 'short'): string {
  const d = new Date(date);
  if (format === 'full') {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}
