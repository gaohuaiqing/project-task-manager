/**
 * 里程碑工具函数
 */
import type { Milestone } from '../types';
import type { MilestoneDisplayStatus } from '@/shared/constants';

/**
 * 根据里程碑数据计算显示状态
 * @param milestone 里程碑数据
 * @returns 显示状态
 */
export function getDisplayStatus(milestone: Milestone): MilestoneDisplayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 只比较日期

  const targetDate = new Date(milestone.targetDate);
  targetDate.setHours(0, 0, 0, 0);

  const completionPercentage = milestone.completionPercentage ?? 0;

  // 如果完成百分比为 100%，则已达成
  if (completionPercentage >= 100) {
    return 'completed';
  }

  // 如果目标日期已过且未完成，则逾期
  if (targetDate < today && completionPercentage < 100) {
    return 'delayed';
  }

  // 如果完成百分比大于 0%，则进行中
  if (completionPercentage > 0) {
    return 'in_progress';
  }

  // 默认为待处理
  return 'pending';
}

/**
 * 批量计算里程碑显示状态
 * @param milestones 里程碑列表
 * @returns 带有 displayStatus 的里程碑列表
 */
export function enrichMilestonesWithDisplayStatus<T extends Milestone>(
  milestones: T[]
): (T & { displayStatus: MilestoneDisplayStatus })[] {
  return milestones.map((milestone) => ({
    ...milestone,
    displayStatus: getDisplayStatus(milestone),
  }));
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDateForDisplay(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查里程碑是否逾期
 */
export function isMilestoneOverdue(milestone: Milestone): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(milestone.targetDate);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < today && (milestone.completionPercentage ?? 0) < 100;
}

/**
 * 检查里程碑是否已完成
 */
export function isMilestoneCompleted(milestone: Milestone): boolean {
  return (milestone.completionPercentage ?? 0) >= 100;
}
