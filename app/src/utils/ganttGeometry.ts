/**
 * 甘特图/时间线几何计算工具函数
 *
 * @module utils/ganttGeometry
 * @description 处理时间线视图中的几何计算
 */

import type { Holiday, TimelineZoomLevel } from '@/types/timeline';

// ============ 常量定义 ============

/** 轨道规格 */
export const TRACK_SPECS = {
  height: 44,
  taskBarHeight: 28,
  taskBarGap: 8,
  minLabelWidth: 100,
  maxLabelWidth: 300,
  defaultLabelWidth: 180,
} as const;

/** 时间刻度尺规格 */
export const RULER_SPECS = {
  height: 40,
  tickColor: 'rgb(209, 213, 219)', // gray-300
  todayLineColor: 'rgb(239, 68, 68)', // red-500
  todayBgColor: 'rgba(219, 234, 254, 0.5)', // blue-100/50
  weekendBorderStyle: 'dashed',
  weekendBorderColor: 'rgb(209, 213, 219)', // gray-300
} as const;

/** 任务条规格 */
export const TASK_BAR_SPECS = {
  height: 28,
  minWidth: 40,
  milestoneWidth: 12,
  borderRadius: 6, // rounded-md
  handleWidth: 8,
} as const;

/** 缩放级别配置 */
export const ZOOM_CONFIGS: Record<TimelineZoomLevel, {
  dayWidth: number;
  tickInterval: number;
  dateFormat: (date: Date) => string;
}> = {
  day: {
    dayWidth: 60,
    tickInterval: 1,
    dateFormat: (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`,
  },
  week: {
    dayWidth: 25,
    tickInterval: 7,
    dateFormat: (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`,
  },
  month: {
    dayWidth: 8,
    tickInterval: 30,
    dateFormat: (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}`,
  },
});

// ============ 日期计算函数 ============

/**
 * 计算两个日期之间的天数差
 */
export function getDaysDiff(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

 /**
 * 计算日期对应的像素位置
 */
export function getDatePosition(
  date: string,
  timelineStartDate: string,
  dayWidth: number
): number {
  const days = getDaysDiff(timelineStartDate, date);
  return days * dayWidth;
 }

 }

/**
 * 计算像素位置对应的日期
 */
export function getDateFromPosition(
  x: number,
  timelineStartDate: string,
  dayWidth: number
): string {
  const days = Math.round(x / dayWidth);
  const date = new Date(timelineStartDate);
  date.setDate(date.getDate() + days);
  return formatDate(date);
 }

 /**
 * 计算任务条的宽度和位置
 */
export function calculateTaskBarGeometry(
  taskStartDate: string,
  taskEndDate: string,
  timelineStartDate: string,
  dayWidth: number
): { x: number; width: number } {
  const x = getDatePosition(taskStartDate, timelineStartDate, dayWidth);
  const endX = getDatePosition(taskEndDate, timelineStartDate, dayWidth);
  const width = Math.max(endX - x + dayWidth, TASK_BAR_SPECS.minWidth);
  return { x, width };
}

 }

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为短格式
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
  }

// ============ 时间刻度尺函数 ============

/**
 * 计算刻度间隔
 */
export function calculateTickInterval(dayWidth: number): number {
  if (dayWidth >= 60) {
    return 1; // 日视图：每天一个刻度
 } else if (dayWidth >= 25) {
    return 7; // 周视图：每周一个刻度
 }
 else {
    return 30; // 月视图：每月一个刻度
 }
 }
}

/**
 * 获取刻度格式化函数
 */
export function getTickFormat(dayWidth: number): (date: Date) => string {
  if (dayWidth >= 60) {
    return (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  } else if (dayWidth >= 25) {
    return (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  } else {
    return (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}`;
  }
  }
}

/**
 * 生成时间刻度数据
 */
export function generateTicks(
  startDate: string,
  endDate: string,
  dayWidth: number
): Array<{ date: string; position: number; label: string; isWeekend: boolean }> {
  const ticks: Array<{ date: string; position: number; label: string; isWeekend: boolean }> = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const tickInterval = calculateTickInterval(dayWidth);
  const formatFn = getTickFormat(dayWidth);

  let currentDate = new Date(start);
  let position = 0;

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    ticks.push({
      date: formatDate(currentDate),
      position,
      label: formatFn(currentDate),
      isWeekend,
    });

    currentDate.setDate(currentDate.getDate() + tickInterval);
    position += dayWidth * tickInterval;
  }

  return ticks;
}

// ============ 周末和节假日判断 ============

/**
 * 判断是否是周末
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // 周日或周六
 }

/**
 * 判断是否是节假日
 */
export function isHoliday(date: Date | string, holidays: Holiday[]): Holiday | null {
  const dateStr = typeof date === 'string' ? date : formatDate(date as Date);
  const holiday = holidays.find((h) => h.date === dateStr);
  return holiday || null;
}

/**
 * 获取日期的类型（工作日/周末/节假日）
 */
export function getDayType(
  date: Date | string,
  holidays: Holiday[]
): 'workday' | 'weekend' | 'holiday' | 'workday_holiday' {
  const isW = isWeekend(date);
  const holiday = isHoliday(date, holidays);

  if (holiday) {
    // 调休工作日
    if (holiday.type === 'workday') {
      return 'workday_holiday';
    }
    return 'holiday';
  }

  if (isW) {
    return 'weekend';
  }

  return 'workday';
}

// ============ 视图范围计算 ============

/**
 * 计算时间线视图的日期范围
 */
export function calculateViewRange(
  scrollLeft: number,
  containerWidth: number,
  dayWidth: number,
  timelineStartDate: string
): { visibleStartDate: string; visibleEndDate: string } {
  const startDays = Math.floor(scrollLeft / dayWidth);
  const visibleDays = Math.ceil(containerWidth / dayWidth);

  const startDate = new Date(timelineStartDate);
  startDate.setDate(startDate.getDate() + startDays);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + visibleDays);

  return {
    visibleStartDate: formatDate(startDate),
    visibleEndDate: formatDate(endDate),
  };
}

/**
 * 计算今天在时间线中的位置
 */
export function getTodayPosition(
  timelineStartDate: string,
  dayWidth: number
): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(timelineStartDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) {
    return null;
  }

  const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff * dayWidth;
}

// ============ 任务排序和自动排列 ============

/**
 * 按开始日期排序任务
 */
export function sortTasksByStartDate<T extends { startDate: string }>(
  tasks: T[]
): T[] {
  return [...tasks].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

/**
 * 自动排列任务，避免重叠
 * 返回每个任务的推荐Y位置
 */
export function autoArrangeTasks<T extends { id: string; startDate: string; endDate: string }>(
  tasks: T[],
  trackHeight: number = TRACK_SPECS.height,
  taskBarHeight: number = TASK_BAR_SPECS.taskBarHeight,
  taskBarGap: number = TASK_BAR_SPECS.taskBarGap
): Map<string, number> {
  const result = new Map<string, number>();
  const sortedTasks = sortTasksByStartDate(tasks);

  // 每一行的任务列表
  const rows: Array<Array<{ id: string; endDate: Date }>> = [];

  for (const task of sortedTasks) {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    // 查找可用的行
    let foundRow = -1;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const lastTask = row[row.length - 1];
      // 检查是否与最后一个任务重叠
      if (lastTask.endDate < taskStart) {
        foundRow = rowIndex;
        break;
      }
    }

    if (foundRow === -1) {
      // 需要新行
      foundRow = rows.length;
      rows.push([]);
    }

    rows[foundRow].push({ id: task.id, endDate: taskEnd });
    result.set(task.id, foundRow);
  }

  return result;
}

// ============ 边界计算 ============

/**
 * 计算时间线边界
 */
export function calculateTimelineBounds(
  tasks: Array<{ startDate: string; endDate: string }>
): { minDate: string; maxDate: string } | null {
  if (tasks.length === 0) {
    return null;
  }

  let minDate = tasks[0].startDate;
  let maxDate = tasks[0].endDate;

  for (const task of tasks) {
    if (task.startDate < minDate) {
      minDate = task.startDate;
    }
    if (task.endDate > maxDate) {
      maxDate = task.endDate;
    }
  }

  return { minDate, maxDate };
}

/**
 * 扩展时间线范围以包含边距
 */
export function extendTimelineRange(
  startDate: string,
  endDate: string,
  paddingDays: number = 7
): { extendedStart: string; extendedEnd: string } {
  const start = new Date(startDate);
  start.setDate(start.getDate() - paddingDays);

  const end = new Date(endDate);
  end.setDate(end.getDate() + paddingDays);

  return {
    extendedStart: formatDate(start),
    extendedEnd: formatDate(end),
  };
}
