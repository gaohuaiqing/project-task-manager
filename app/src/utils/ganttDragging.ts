/**
 * 甘特图拖拽计算工具
 *
 * 处理拖拽操作的几何计算、状态管理等
 *
 * @module utils/ganttDragging
 */

import { addDaysToDate, compareDates, getDaysDiff, xToDate, dateToX } from './ganttGeometry';

/**
 * 拖拽操作类型
 */
export type DragOperation = 'move' | 'resize_start' | 'resize_end';

/**
 * 拖拽状态
 */
export interface DragState {
  /** 当前操作类型 */
  operation: DragOperation | null;
  /** 被拖拽任务的ID */
  taskId: string | null;
  /** 拖拽起始X坐标 */
  startX: number;
  /** 当前X坐标 */
  currentX: number;
  /** 原始任务数据 */
  originalTask: {
    id: string;
    startDate: string;
    endDate: string;
    duration: number;
  } | null;
}

/**
 * 拖拽结果
 */
export interface DragResult {
  /** 新的开始日期 */
  startDate: string;
  /** 新的结束日期 */
  endDate: string;
  /** 新的工期（天数） */
  duration: number;
  /** 是否有效 */
  valid: boolean;
}

/**
 * 创建初始拖拽状态
 */
export function createInitialDragState(): DragState {
  return {
    operation: null,
    taskId: null,
    startX: 0,
    currentX: 0,
    originalTask: null,
  };
}

/**
 * 开始拖拽
 * @param taskId - 任务ID
 * @param operation - 操作类型
 * @param startX - 起始X坐标
 * @param task - 任务数据
 * @returns 新的拖拽状态
 */
export function startDrag(
  taskId: string,
  operation: DragOperation,
  startX: number,
  task: { id: string; startDate: string; endDate: string; duration: number }
): DragState {
  return {
    operation,
    taskId,
    startX,
    currentX: startX,
    originalTask: { ...task },
  };
}

/**
 * 更新拖拽位置
 * @param state - 当前拖拽状态
 * @param currentX - 当前X坐标
 * @returns 更新后的拖拽状态
 */
export function updateDragPosition(state: DragState, currentX: number): DragState {
  return {
    ...state,
    currentX,
  };
}

/**
 * 计算拖拽结果
 * @param state - 拖拽状态
 * @param timelineStartDate - 时间轴开始日期
 * @param dayWidth - 每天的像素宽度
 * @returns 拖拽结果
 */
export function calculateDragResult(
  state: DragState,
  timelineStartDate: string,
  dayWidth: number
): DragResult {
  if (!state.originalTask || !state.operation) {
    return {
      startDate: '',
      endDate: '',
      duration: 0,
      valid: false,
    };
  }

  const deltaX = state.currentX - state.startX;
  const deltaDays = Math.round(deltaX / dayWidth);

  if (deltaDays === 0) {
    return {
      startDate: state.originalTask.startDate,
      endDate: state.originalTask.endDate,
      duration: state.originalTask.duration,
      valid: true,
    };
  }

  let newStartDate: string;
  let newEndDate: string;
  let newDuration: number;

  switch (state.operation) {
    case 'move':
      // 移动整个任务
      newStartDate = addDaysToDate(state.originalTask.startDate, deltaDays);
      newEndDate = addDaysToDate(state.originalTask.endDate, deltaDays);
      newDuration = state.originalTask.duration;
      break;

    case 'resize_start':
      // 调整开始日期
      newStartDate = addDaysToDate(state.originalTask.startDate, deltaDays);
      newEndDate = state.originalTask.endDate;
      // 重新计算工期
      newDuration = getDaysDiff(newStartDate, newEndDate);
      break;

    case 'resize_end':
      // 调整结束日期
      newStartDate = state.originalTask.startDate;
      newEndDate = addDaysToDate(state.originalTask.endDate, deltaDays);
      // 重新计算工期
      newDuration = getDaysDiff(newStartDate, newEndDate);
      break;

    default:
      return {
        startDate: '',
        endDate: '',
        duration: 0,
        valid: false,
      };
  }

  // 验证日期有效性
  const valid = compareDates(newStartDate, newEndDate) <= 0 && newDuration > 0;

  return {
    startDate: newStartDate,
    endDate: newEndDate,
    duration: newDuration,
    valid,
  };
}

/**
 * 判断是否在拖拽中
 * @param state - 拖拽状态
 * @returns 是否在拖拽中
 */
export function isDragging(state: DragState): boolean {
  return state.operation !== null;
}

/**
 * 结束拖拽
 * @returns 初始拖拽状态
 */
export function endDrag(): DragState {
  return createInitialDragState();
}

/**
 * 计算拖拽预览位置
 * @param state - 拖拽状态
 * @param timelineStartDate - 时间轴开始日期
 * @param dayWidth - 每天的像素宽度
 * @returns 预览位置和尺寸
 */
export function calculateDragPreview(
  state: DragState,
  timelineStartDate: string,
  dayWidth: number
): { x: number; width: number } | null {
  const result = calculateDragResult(state, timelineStartDate, dayWidth);

  if (!result.valid) {
    return null;
  }

  const x = dateToX(result.startDate, timelineStartDate, dayWidth);
  const width = result.duration * dayWidth;

  return { x, width };
}

/**
 * 检查鼠标是否在任务条的调整手柄区域
 * @param mouseX - 鼠标X坐标（相对于任务条）
 * @param taskWidth - 任务条宽度
 * @param handleSize - 手柄大小（像素）
 * @returns 手柄类型
 */
export function getHandleAtPosition(
  mouseX: number,
  taskWidth: number,
  handleSize: number = 8
): DragOperation | 'body' | null {
  if (mouseX >= 0 && mouseX <= handleSize) {
    return 'resize_start';
  }
  if (mouseX >= taskWidth - handleSize && mouseX <= taskWidth) {
    return 'resize_end';
  }
  if (mouseX > handleSize && mouseX < taskWidth - handleSize) {
    return 'body';
  }
  return null;
}

/**
 * 格式化拖拽提示文本
 * @param result - 拖拽结果
 * @param originalStartDate - 原始开始日期（用于计算偏移）
 * @returns 提示文本
 */
export function formatDragTooltip(result: DragResult, originalStartDate?: string): string {
  if (!result.valid) {
    return '无效的日期范围';
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // 如果有原始开始日期，计算天数偏移
  if (originalStartDate) {
    const originalDate = new Date(originalStartDate);
    const newDate = new Date(result.startDate);
    const dayDiff = Math.round((newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

    const sign = dayDiff >= 0 ? '+' : '';
    return `${formatDate(result.startDate)} ${sign}${dayDiff}天`;
  }

  // 否则显示日期范围
  return `${formatDate(result.startDate)} - ${formatDate(result.endDate)} (${result.duration}天)`;
}
