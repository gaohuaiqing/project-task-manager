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

/** 时间刻度尺规格（三行布局，REQ_03 4.5.2节：总高60px） */
export const RULER_SPECS = {
  height: 60,
  monthRowHeight: 20,
  weekdayRowHeight: 20,
  dayRowHeight: 20,
  tickColor: 'rgb(209, 213, 219)',
  todayLineColor: 'rgb(239, 68, 68)',
  todayBgColor: 'rgba(219, 234, 254, 0.5)',
  weekendBorderStyle: 'dashed',
  weekendBorderColor: 'rgb(209, 213, 219)',
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
    dayWidth: 36,
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
};

// ============ 日期计算函数 ============

/**
 * 规范化日期为 YYYY-MM-DD 格式字符串
 * 支持：Date 对象、ISO 字符串、YYYY-MM-DD 字符串
 */
export function normalizeDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  // 处理 Date 对象
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 处理字符串
  if (typeof date === 'string') {
    // 如果是 ISO 格式（包含 T），提取日期部分
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // 尝试解析其他格式
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * 解析日期为本地时间 Date 对象
 * 支持：Date 对象、ISO 字符串、YYYY-MM-DD 字符串
 */
function parseLocalDate(dateInput: Date | string): Date {
  // 如果已经是 Date 对象，返回副本
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  // 规范化字符串
  const dateStr = normalizeDate(dateInput);
  if (!dateStr) {
    console.warn('[ganttGeometry] 无法解析日期:', dateInput);
    return new Date(); // 返回今天作为默认值
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 计算两个日期之间的天数差
 * @returns 整数天数，start 和 end 同一天返回 0
 */
export function getDaysDiff(startDate: Date | string, endDate: Date | string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  // 重置时间部分，确保只比较日期
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 计算日期对应的像素位置（日期左边缘）
 * @returns 该日期在时间线上的起始像素位置
 */
export function getDatePosition(
  date: Date | string,
  timelineStartDate: Date | string,
  dayWidth: number
): number {
  const days = getDaysDiff(timelineStartDate, date);
  return days * dayWidth;
}

/**
 * 计算日期对应的像素位置（日期中心点）
 * 用于里程碑等需要居中显示的元素
 */
export function getDateCenterPosition(
  date: Date | string,
  timelineStartDate: Date | string,
  dayWidth: number
): number {
  const days = getDaysDiff(timelineStartDate, date);
  return days * dayWidth + dayWidth / 2;
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
  const date = parseLocalDate(timelineStartDate);
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
  const date = parseLocalDate(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
  }

// ============ 时间刻度尺函数 ============

/**
 * 计算刻度间隔
 */
export function calculateTickInterval(dayWidth: number): number {
  if (dayWidth >= 36) {
    return 1; // 日视图：每天一个刻度
 } else if (dayWidth >= 25) {
    return 7; // 周视图：每周一个刻度
 }
 else {
    return 30; // 月视图：每月一个刻度
 }
 }

/**
 * 获取刻度格式化函数
 */
export function getTickFormat(dayWidth: number): (date: Date) => string {
  if (dayWidth >= 36) {
    return (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  } else if (dayWidth >= 25) {
    return (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  } else {
    return (date: Date) => `${date.getFullYear()}/${date.getMonth() + 1}`;
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
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

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

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 生成每日刻度数据（每天一个刻度）
 */
export function generateDayTicks(
  startDate: string,
  endDate: string,
  dayWidth: number
): Array<{
  date: string;
  position: number;
  label: string;
  isWeekend: boolean;
  day: number;
  weekdayLabel: string;
  isToday: boolean;
  isFirstDay: boolean;
  isLastDay: boolean;
}> {
  const result: Array<{
    date: string;
    position: number;
    label: string;
    isWeekend: boolean;
    day: number;
    weekdayLabel: string;
    isToday: boolean;
    isFirstDay: boolean;
    isLastDay: boolean;
  }> = [];

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = new Date(start);
  let pos = 0;

  while (current <= end) {
    const dow = current.getDay();
    const isW = dow === 0 || dow === 6;
    const d = current.getDate();
    const isTodayDate = current.getTime() === today.getTime();
    const isFirstDay = d === 1;

    // 计算是否月末最后一天
    const nextDay = new Date(current);
    nextDay.setDate(nextDay.getDate() + 1);
    const isLastDay = nextDay.getMonth() !== current.getMonth();

    result.push({
      date: formatDate(current),
      position: pos,
      label: `${current.getMonth() + 1}/${d}`,
      isWeekend: isW,
      day: d,
      weekdayLabel: WEEKDAY_LABELS[dow],
      isToday: isTodayDate,
      isFirstDay,
      isLastDay,
    });

    current.setDate(current.getDate() + 1);
    pos += dayWidth;
  }

  return result;
}

/**
 * 生成月份刻度数据
 */
export function generateMonthTicks(
  startDate: string,
  endDate: string,
  dayWidth: number
): Array<{ date: string; position: number; label: string; width: number; year: number; month: number }> {
  const result: Array<{ date: string; position: number; label: string; width: number; year: number; month: number }> = [];

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthEnd = new Date(year, month + 1, 0); // 月底

    // 计算实际显示的开始日期（月份第一天和时间线开始日期的较晚者）
    const effectiveStart = current < start ? start : current;
    // 计算实际显示的结束日期（月底和时间线结束日期的较早者）
    const effectiveEnd = monthEnd > end ? end : monthEnd;

    // 计算位置
    const daysFromStart = Math.floor(
      (effectiveStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    // 计算实际宽度（从实际开始到实际结束的天数）
    const effectiveDays = Math.floor(
      (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    result.push({
      date: formatDate(current),
      position: Math.max(0, daysFromStart) * dayWidth,
      label: `${year}年${month + 1}月`,
      width: effectiveDays * dayWidth,
      year,
      month,
    });
    current.setMonth(current.getMonth() + 1);
  }
  return result;
}

/**
 * 生成年行刻度数据（用于月视图）
 * REQ_03 4.11.3: 月视图显示年行 + 月行
 */
export function generateYearTicks(
  startDate: string,
  endDate: string,
  dayWidth: number
): Array<{ year: number; position: number; width: number; label: string }> {
  const result: Array<{ year: number; position: number; width: number; label: string }> = [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  // 从年份的第一天开始
  let currentYear = start.getFullYear();
  const endYear = end.getFullYear();

  while (currentYear <= endYear) {
    // 计算这一年的开始日期
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // 计算实际显示的开始和结束日期（考虑时间线范围）
    const effectiveStart = yearStart < start ? start : yearStart;
    const effectiveEnd = yearEnd > end ? end : yearEnd;

    // 计算位置
    const daysFromStart = Math.floor(
      (effectiveStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysInYear = Math.floor(
      (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    result.push({
      year: currentYear,
      position: Math.max(0, daysFromStart) * dayWidth,
      width: daysInYear * dayWidth,
      label: `${currentYear}年`,
    });

    currentYear++;
  }

  return result;
}

/**
 * 生成周末列数据
 */
export function generateWeekendColumns(
  startDate: string,
  endDate: string,
  dayWidth: number
): Array<{ start: number; width: number }> {
  const columns: Array<{ start: number; width: number }> = [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  let current = new Date(start);
  let weekendRun: { start: number; count: number } | null = null;
  let pos = 0;

  while (current <= end) {
    const dow = current.getDay();
    const isW = dow === 0 || dow === 6;
    if (isW) {
      if (!weekendRun) weekendRun = { start: pos, count: 1 };
      else weekendRun.count++;
    } else if (weekendRun) {
      columns.push({ start: weekendRun.start, width: weekendRun.count * dayWidth });
      weekendRun = null;
    }
    current.setDate(current.getDate() + 1);
    pos += dayWidth;
  }
  if (weekendRun) columns.push({ start: weekendRun.start, width: weekendRun.count * dayWidth });
  return columns;
}

/**
 * 生成节假日列数据
 */
export function generateHolidayColumns(
  startDate: string,
  endDate: string,
  dayWidth: number,
  holidays: Holiday[]
): Array<{ start: number; width: number; holiday: Holiday }> {
  const columns: Array<{ start: number; width: number; holiday: Holiday }> = [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  for (const holiday of holidays) {
    const d = parseLocalDate(holiday.date);
    if (d >= start && d <= end) {
      const daysDiff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      columns.push({ start: daysDiff * dayWidth, width: dayWidth, holiday });
    }
  }
  return columns;
}

// ============ 周末和节假日判断 ============

/**
 * 判断是否是周末
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
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

  const startDate = parseLocalDate(timelineStartDate);
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

  const start = parseLocalDate(timelineStartDate);
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
    return parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime();
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
  taskBarGap: number = TRACK_SPECS.taskBarGap
): Map<string, number> {
  const result = new Map<string, number>();
  const sortedTasks = sortTasksByStartDate(tasks);

  // 每一行的任务列表
  const rows: Array<Array<{ id: string; endDate: Date }>> = [];

  for (const task of sortedTasks) {
    const taskStart = parseLocalDate(task.startDate);
    const taskEnd = parseLocalDate(task.endDate);

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
  const start = parseLocalDate(startDate);
  start.setDate(start.getDate() - paddingDays);

  const end = parseLocalDate(endDate);
  end.setDate(end.getDate() + paddingDays);

  return {
    extendedStart: formatDate(start),
    extendedEnd: formatDate(end),
  };
}
