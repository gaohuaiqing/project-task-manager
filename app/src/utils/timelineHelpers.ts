/**
 * 时间轴辅助函数
 *
 * 提供时间轴和任务的计算、操作等辅助功能
 *
 * @module utils/timelineHelpers
 */

import type {
  Timeline,
  TimelineTask,
  TimelineConfig,
  TimelineStats,
} from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { parseISO, differenceInDays, addDays, format, min, max } from 'date-fns';

// ==================== 统计计算 ====================

/**
 * 计算时间轴统计信息
 */
export function calculateTimelineStats(timelines: Timeline[]): TimelineStats {
  const totalTasks = timelines.reduce((sum, t) => sum + (t.tasks?.length || 0), 0);
  const completedTasks = timelines.reduce(
    (sum, t) => sum + t.tasks.filter(task => task.status === 'completed').length,
    0
  );
  const inProgressTasks = timelines.reduce(
    (sum, t) => sum + t.tasks.filter(task => task.status === 'in_progress').length,
    0
  );
  const delayedTasks = timelines.reduce(
    (sum, t) => sum + t.tasks.filter(task => task.status === 'delayed').length,
    0
  );

  // 计算整体进度
  const overallProgress = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // 计算时间范围
  const allDates = timelines.flatMap(t =>
    t.tasks.flatMap(task => [task.startDate, task.endDate])
  );

  let earliestDate: string | undefined;
  let latestDate: string | undefined;

  if (allDates.length > 0) {
    const dates = allDates.map(d => parseISO(d));
    earliestDate = format(min(dates), 'yyyy-MM-dd');
    latestDate = format(max(dates), 'yyyy-MM-dd');
  }

  return {
    timelineCount: timelines.length,
    totalTasks,
    completedTasks,
    inProgressTasks,
    delayedTasks,
    overallProgress,
    earliestDate,
    latestDate,
  };
}

/**
 * 计算单条时间轴的统计信息
 */
export function calculateSingleTimelineStats(timeline: Timeline): {
  taskCount: number;
  completedCount: number;
  inProgressCount: number;
  delayedCount: number;
  progress: number;
} {
  const taskCount = timeline.tasks?.length || 0;
  const completedCount = timeline.tasks?.filter(t => t.status === 'completed').length || 0;
  const inProgressCount = timeline.tasks?.filter(t => t.status === 'in_progress').length || 0;
  const delayedCount = timeline.tasks?.filter(t => t.status === 'delayed').length || 0;
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return {
    taskCount,
    completedCount,
    inProgressCount,
    delayedCount,
    progress,
  };
}

// ==================== 时间范围计算 ====================

/**
 * 计算时间轴的时间范围
 */
export function calculateTimelineRange(timeline: Timeline): TimeRange | null {
  if (!timeline.tasks || timeline.tasks.length === 0) {
    return null;
  }

  const allDates = timeline.tasks.flatMap(task => [
    parseISO(task.startDate),
    parseISO(task.endDate),
  ]);

  const startDate = min(allDates);
  const endDate = max(allDates);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    totalDays,
  };
}

/**
 * 计算所有时间轴的合并时间范围
 */
export function calculateMergedRange(timelines: Timeline[]): TimeRange | null {
  const allDates = timelines.flatMap(timeline =>
    timeline.tasks.flatMap(task => [
      parseISO(task.startDate),
      parseISO(task.endDate),
    ])
  );

  if (allDates.length === 0) {
    return null;
  }

  const startDate = min(allDates);
  const endDate = max(allDates);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    totalDays,
  };
}

/**
 * 扩展时间范围（添加缓冲）
 */
export function expandTimeRange(
  range: TimeRange,
  bufferDays: number
): TimeRange {
  const startDate = addDays(parseISO(range.startDate), -bufferDays);
  const endDate = addDays(parseISO(range.endDate), bufferDays);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    totalDays,
  };
}

// ==================== 任务创建 ====================

/**
 * 创建新的时间轴任务
 */
export function createTimelineTask(
  startDate: string,
  endDate: string,
  options: {
    title?: string;
    status?: TimelineTask['status'];
    assigneeId?: string;
    assigneeName?: string;
  } = {}
): Omit<TimelineTask, 'id'> {
  const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;

  return {
    title: options.title || '新任务',
    startDate,
    endDate,
    status: options.status || 'not_started',
    priority: 'medium',
    progress: 0,
    assigneeId: options.assigneeId,
    assigneeName: options.assigneeName,
    tags: days === 1 ? ['里程碑'] : [],
  };
}

/**
 * 创建带ID的时间轴任务
 */
export function createTimelineTaskWithId(
  startDate: string,
  endDate: string,
  options: {
    title?: string;
    status?: TimelineTask['status'];
    assigneeId?: string;
    assigneeName?: string;
  } = {}
): TimelineTask {
  return {
    ...createTimelineTask(startDate, endDate, options),
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

// ==================== 时间轴管理 ====================

/**
 * 创建新的时间轴配置
 */
export function createTimelineConfig(
  name: string,
  options: {
    icon?: string;
    color?: string;
    type?: TimelineConfig['type'];
    sortOrder?: number;
  } = {}
): TimelineConfig {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  ];

  return {
    id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    icon: options.icon || '📋',
    color: options.color || colors[0],
    type: options.type || 'custom',
    visible: true,
    editable: true,
    sortOrder: options.sortOrder ?? 0,
  };
}

/**
 * 创建新的时间轴
 */
export function createTimeline(
  name: string,
  options: {
    icon?: string;
    color?: string;
    type?: TimelineConfig['type'];
    sortOrder?: number;
  } = {}
): Timeline {
  return {
    config: createTimelineConfig(name, options),
    tasks: [],
  };
}

/**
 * 添加任务到时间轴
 */
export function addTaskToTimeline(
  timeline: Timeline,
  task: TimelineTask
): Timeline {
  return {
    ...timeline,
    tasks: [...timeline.tasks, task],
  };
}

/**
 * 从时间轴移除任务
 */
export function removeTaskFromTimeline(
  timeline: Timeline,
  taskId: string
): Timeline {
  return {
    ...timeline,
    tasks: timeline.tasks.filter(task => task.id !== taskId),
  };
}

/**
 * 更新时间轴中的任务
 */
export function updateTaskInTimeline(
  timeline: Timeline,
  taskId: string,
  updates: Partial<TimelineTask>
): Timeline {
  return {
    ...timeline,
    tasks: timeline.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ),
  };
}

/**
 * 排序时间轴中的任务
 */
export function sortTasksInTimeline(
  timeline: Timeline,
  sortBy: 'date' | 'name' | 'status' | 'progress'
): Timeline {
  const sortedTasks = [...timeline.tasks].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      case 'name':
        return a.title.localeCompare(b.title, 'zh-CN');
      case 'status':
        const statusOrder = ['in_progress', 'not_started', 'delayed', 'completed', 'cancelled'];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      case 'progress':
        return (b.progress || 0) - (a.progress || 0);
      default:
        return 0;
    }
  });

  return {
    ...timeline,
    tasks: sortedTasks,
  };
}

// ==================== 自动排列 ====================

/**
 * 自动排列时间轴中的任务（避免重叠）
 */
export function autoArrangeTimelineTasks(
  timeline: Timeline,
  minGapDays: number = 1
): Timeline {
  if (timeline.tasks.length === 0) {
    return timeline;
  }

  // 按开始日期排序
  const sortedTasks = [...timeline.tasks].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const arrangedTasks: TimelineTask[] = [];
  let currentDate = parseISO(sortedTasks[0].startDate);

  sortedTasks.forEach(task => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    const taskDuration = differenceInDays(taskEnd, taskStart) + 1;

    // 如果当前日期晚于任务开始日期，使用当前日期
    if (currentDate > taskStart) {
      const newStart = format(currentDate, 'yyyy-MM-dd');
      const newEnd = format(addDays(currentDate, taskDuration - 1), 'yyyy-MM-dd');

      arrangedTasks.push({
        ...task,
        startDate: newStart,
        endDate: newEnd,
      });

      // 更新当前日期（添加间隔）
      currentDate = addDays(currentDate, taskDuration + minGapDays);
    } else {
      // 保持原日期
      arrangedTasks.push(task);
      currentDate = addDays(taskEnd, minGapDays);
    }
  });

  return {
    ...timeline,
    tasks: arrangedTasks,
  };
}

/**
 * 自动排列所有时间轴中的任务
 */
export function autoArrangeAllTimelines(
  timelines: Timeline[],
  minGapDays: number = 1
): Timeline[] {
  return timelines.map(timeline =>
    autoArrangeTimelineTasks(timeline, minGapDays)
  );
}

// ==================== 任务查询 ====================

/**
 * 根据ID查找任务
 */
export function findTaskById(
  timelines: Timeline[],
  taskId: string
): { task: TimelineTask | null; timeline: Timeline | null } {
  for (const timeline of timelines) {
    const task = timeline.tasks.find(t => t.id === taskId);
    if (task) {
      return { task, timeline };
    }
  }
  return { task: null, timeline: null };
}

/**
 * 根据条件筛选任务
 */
export function filterTasks(
  timelines: Timeline[],
  predicate: (task: TimelineTask) => boolean
): Array<{ task: TimelineTask; timeline: Timeline }> {
  const results: Array<{ task: TimelineTask; timeline: Timeline }> = [];

  timelines.forEach(timeline => {
    timeline.tasks.forEach(task => {
      if (predicate(task)) {
        results.push({ task, timeline });
      }
    });
  });

  return results;
}

/**
 * 查找指定日期范围内的任务
 */
export function findTasksInDateRange(
  timelines: Timeline[],
  startDate: string,
  endDate: string
): Array<{ task: TimelineTask; timeline: Timeline }> {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return filterTasks(timelines, task => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    return taskStart <= end && taskEnd >= start;
  });
}

/**
 * 查找延期任务
 */
export function findDelayedTasks(
  timelines: Timeline[]
): Array<{ task: TimelineTask; timeline: Timeline }> {
  const today = new Date();

  return filterTasks(timelines, task => {
    if (task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    const endDate = parseISO(task.endDate);
    return endDate < today;
  });
}

/**
 * 查找进行中的任务
 */
export function findInProgressTasks(
  timelines: Timeline[]
): Array<{ task: TimelineTask; timeline: Timeline }> {
  return filterTasks(timelines, task => task.status === 'in_progress');
}

// ==================== 日期计算 ====================

/**
 * 计算任务持续时间（天数）
 */
export function calculateTaskDuration(task: TimelineTask): number {
  return differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1;
}

/**
 * 检查任务是否在指定日期范围内
 */
export function isTaskInDateRange(
  task: TimelineTask,
  startDate: string,
  endDate: string
): boolean {
  const taskStart = parseISO(task.startDate);
  const taskEnd = parseISO(task.endDate);
  const rangeStart = parseISO(startDate);
  const rangeEnd = parseISO(endDate);

  return taskStart <= rangeEnd && taskEnd >= rangeStart;
}

/**
 * 检查两个任务是否重叠
 */
export function areTasksOverlapping(task1: TimelineTask, task2: TimelineTask): boolean {
  const start1 = parseISO(task1.startDate);
  const end1 = parseISO(task1.endDate);
  const start2 = parseISO(task2.startDate);
  const end2 = parseISO(task2.endDate);

  return start1 <= end2 && end1 >= start2;
}

/**
 * 格式化日期范围显示
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  format: 'short' | 'full' = 'short'
): string {
  if (startDate === endDate) {
    return formatDateDisplay(startDate, format);
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (format === 'short') {
    return `${format(start, 'MM/dd')} - ${format(end, 'MM/dd')}`;
  }

  return `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'yyyy年MM月dd日')}`;
}

/**
 * 格式化日期显示
 */
function formatDateDisplay(date: string, formatType: 'short' | 'full' = 'short'): string {
  const d = parseISO(date);

  if (formatType === 'full') {
    return format(d, 'yyyy年MM月dd日');
  }

  return format(d, 'MM/dd');
}

// ==================== 颜色和样式 ====================

/**
 * 获取任务状态颜色
 */
export function getTaskStatusColor(status: TimelineTask['status']): string {
  const colors: Record<TimelineTask['status'], string> = {
    not_started: '#9ca3af',
    in_progress: '#3b82f6',
    completed: '#10b981',
    delayed: '#ef4444',
    cancelled: '#6b7280',
  };
  return colors[status];
}

/**
 * 获取任务优先级颜色
 */
export function getTaskPriorityColor(
  priority: NonNullable<TimelineTask['priority']>
): string {
  const colors: Record<NonNullable<TimelineTask['priority']>, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    urgent: '#dc2626',
  };
  return colors[priority];
}

/**
 * 生成时间轴颜色（自动分配）
 */
export function generateTimelineColor(index: number): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#6366f1', '#f97316', '#14b8a6', '#eab308',
  ];
  return colors[index % colors.length];
}
