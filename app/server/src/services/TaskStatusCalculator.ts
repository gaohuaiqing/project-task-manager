/**
 * 任务状态计算服务
 *
 * 统一的任务状态计算逻辑：
 * 优先级：actualEndDate > actualStartDate > plannedEndDate > status
 *
 * 规则：
 * - 有实际结束日期：根据与计划结束日期的比较确定状态
 * - 有实际开始日期但无结束日期：进行中/延期
 * - 无实际开始日期：
 *   - 计划开始日期已过：延期
 *   - 计划开始日期未到：未开始
 */

import { parseISO, isBefore, isAfter, isEqual, addDays, differenceInDays } from 'date-fns';

// ==================== 类型定义 ====================

export enum TaskStatusCode {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  OVERDUE_COMPLETED = 'overdue_completed',
  EARLY_COMPLETED = 'early_completed',
  ON_TIME_COMPLETED = 'on_time_completed',
  CANCELLED = 'cancelled'
}

export interface TaskStatusInfo {
  status: string;
  statusCode: TaskStatusCode;
  color: string;
  bgColor: string;
  label: string;
}

// ==================== 状态计算函数 ====================

/**
 * 计算任务状态
 */
export function calculateTaskStatus(task: {
  status?: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}): TaskStatusInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 已取消的任务
  if (task.status === 'cancelled') {
    return {
      status: 'cancelled',
      statusCode: TaskStatusCode.CANCELLED,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      label: '已取消'
    };
  }

  // 优先级1: 有实际结束日期
  if (task.actualEndDate) {
    try {
      const actualEnd = parseISO(task.actualEndDate);
      actualEnd.setHours(0, 0, 0, 0);

      // 如果有计划结束日期，进行比较
      if (task.plannedEndDate) {
        const plannedEnd = parseISO(task.plannedEndDate);
        plannedEnd.setHours(0, 0, 0, 0);

        if (isAfter(actualEnd, plannedEnd)) {
          return {
            status: 'overdue_completed',
            statusCode: TaskStatusCode.OVERDUE_COMPLETED,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/20',
            label: '超期完成'
          };
        } else if (isBefore(actualEnd, plannedEnd)) {
          return {
            status: 'early_completed',
            statusCode: TaskStatusCode.EARLY_COMPLETED,
            color: 'text-green-400',
            bgColor: 'bg-green-500/20',
            label: '提前完成'
          };
        } else {
          return {
            status: 'on_time_completed',
            statusCode: TaskStatusCode.ON_TIME_COMPLETED,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
            label: '按期完成'
          };
        }
      }

      // 没有计划结束日期，但有实际结束日期
      return {
        status: 'completed',
        statusCode: TaskStatusCode.COMPLETED,
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        label: '已完成'
      };
    } catch (error) {
      console.error('[TaskStatusCalculator] 解析实际结束日期失败:', error);
    }
  }

  // 优先级2: 无实际结束日期，但有实际开始日期
  if (task.actualStartDate) {
    // 检查是否有计划结束日期
    if (task.plannedEndDate) {
      try {
        const plannedEnd = parseISO(task.plannedEndDate);
        plannedEnd.setHours(0, 0, 0, 0);

        if (isBefore(plannedEnd, today)) {
          return {
            status: 'delayed',
            statusCode: TaskStatusCode.DELAYED,
            color: 'text-red-400',
            bgColor: 'bg-red-500/20',
            label: '延期'
          };
        }
      } catch (error) {
        console.error('[TaskStatusCalculator] 解析计划结束日期失败:', error);
      }
    }

    return {
      status: 'in_progress',
      statusCode: TaskStatusCode.IN_PROGRESS,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      label: '进行中'
    };
  }

  // 优先级3: 无实际开始日期
  if (task.plannedStartDate) {
    try {
      const plannedStart = parseISO(task.plannedStartDate);
      plannedStart.setHours(0, 0, 0, 0);

      if (isBefore(plannedStart, today) || isEqual(plannedStart, today)) {
        return {
          status: 'delayed',
          statusCode: TaskStatusCode.DELAYED,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          label: '延期'
        };
      }
    } catch (error) {
      console.error('[TaskStatusCalculator] 解析计划开始日期失败:', error);
    }
  }

  // 默认：未开始
  return {
    status: 'not_started',
    statusCode: TaskStatusCode.NOT_STARTED,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    label: '未开始'
  };
}

/**
 * 计算实际工期（工作日）
 */
export function calculateActualDays(
  actualStartDate: string | null | undefined,
  actualEndDate: string | null | undefined,
  holidays: string[] = []
): number | null {
  if (!actualStartDate || !actualEndDate) {
    return null;
  }

  try {
    const start = parseISO(actualStartDate);
    const end = parseISO(actualEndDate);

    if (isBefore(end, start)) {
      return 0;
    }

    return countWorkDays(start, end, holidays);
  } catch (error) {
    console.error('[TaskStatusCalculator] 计算实际工期失败:', error);
    return null;
  }
}

/**
 * 计算计划工期（工作日）
 */
export function calculatePlannedDays(
  plannedStartDate: string | null | undefined,
  plannedEndDate: string | null | undefined,
  holidays: string[] = []
): number {
  if (!plannedStartDate || !plannedEndDate) {
    return 1;
  }

  try {
    const start = parseISO(plannedStartDate);
    const end = parseISO(plannedEndDate);
    return Math.max(1, countWorkDays(start, end, holidays));
  } catch (error) {
    console.error('[TaskStatusCalculator] 计算计划工期失败:', error);
    return 1;
  }
}

/**
 * 计算工作日天数（排除周末和节假日）
 */
function countWorkDays(start: Date, end: Date, holidays: string[] = []): number {
  let days = 0;
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // 排除周末（周六、周日）和节假日
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
      days++;
    }

    current = addDays(current, 1);
  }

  return days;
}

/**
 * 检查任务是否即将到期（3天内）
 */
export function isNearDeadline(
  plannedEndDate: string | null | undefined,
  actualEndDate: string | null | undefined
): boolean {
  if (actualEndDate || !plannedEndDate) {
    return false;
  }

  try {
    const endDate = parseISO(plannedEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffDays = differenceInDays(endDate, today);
    return diffDays >= 0 && diffDays <= 3;
  } catch {
    return false;
  }
}

/**
 * 检查任务是否已延期
 */
export function isOverdue(
  plannedEndDate: string | null | undefined,
  actualEndDate: string | null | undefined,
  actualStartDate: string | null | undefined
): boolean {
  if (actualEndDate) {
    return false; // 已完成的任务不算延期
  }

  if (!plannedEndDate || !actualStartDate) {
    return false;
  }

  try {
    const endDate = parseISO(plannedEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return isBefore(endDate, today);
  } catch {
    return false;
  }
}

/**
 * 批量计算任务状态
 */
export function calculateBatchTaskStatus(
  tasks: Array<{
    id: number;
    status?: string;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    plannedStartDate?: string | null;
    plannedEndDate?: string | null;
  }>
): Map<number, TaskStatusInfo> {
  const result = new Map<number, TaskStatusInfo>();

  for (const task of tasks) {
    result.set(task.id, calculateTaskStatus(task));
  }

  return result;
}
