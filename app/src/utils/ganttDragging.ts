/**
 * 甘特图/时间线拖拽工具函数
 *
 * @module utils/ganttDragging
 * @description 处理任务条拖拽相关的计算逻辑
 */

import type { DragOperation } from '@/types/timeline';

// ============ 类型定义 ============

/** 拖拽状态 */
export interface DragState {
  isActive: boolean;
  taskId: string | null;
  operation: DragOperation | null;
  startX: number;
  currentX: number;
  originalTask: {
    id: string;
    startDate: string;
    endDate: string;
    duration: number;
  } | null;
}

/** 拖拽结果 */
export interface DragResult {
  valid: boolean;
  startDate: string;
  endDate: string;
  duration: number;
  deltaX: number;
}

/** 拖拽预览 */
export interface DragPreview {
  x: number;
  width: number;
  startDate: string;
  endDate: string;
}

// ============ 工厂函数 ============

/**
 * 创建初始拖拽状态
 */
export function createInitialDragState(): DragState {
  return {
    isActive: false,
    taskId: null,
    operation: null,
    startX: 0,
    currentX: 0,
    originalTask: null,
  };
}

/**
 * 开始拖拽
 */
export function startDrag(
  taskId: string,
  operation: DragOperation,
  startX: number,
  task: { id: string; startDate: string; endDate: string; duration: number }
): DragState {
  return {
    isActive: true,
    taskId,
    operation,
    startX,
    currentX: startX,
    originalTask: task,
  };
}

/**
 * 更新拖拽位置
 */
export function updateDragPosition(state: DragState, currentX: number): DragState {
  if (!state.isActive) return state;
  return {
    ...state,
    currentX,
  };
}

/**
 * 结束拖拽
 */
export function endDrag(): DragState {
  return createInitialDragState();
}

/**
 * 检查是否正在拖拽
 */
export function isDragging(state: DragState): boolean {
  return state.isActive && state.taskId !== null;
}

// ============ 计算函数 ============

/**
 * 计算拖拽结果
 */
export function calculateDragResult(
  state: DragState,
  timelineStartDate: string,
  dayWidth: number
): DragResult {
  if (!state.isActive || !state.originalTask) {
    return {
      valid: false,
      startDate: '',
      endDate: '',
      duration: 0,
      deltaX: 0,
    };
  }

  const deltaX = state.currentX - state.startX;
  const daysDelta = Math.round(deltaX / dayWidth);

  // 解析原始日期
  const originalStart = new Date(state.originalTask.startDate);
  const originalEnd = new Date(state.originalTask.endDate);

  let newStart: Date;
  let newEnd: Date;
  let duration = state.originalTask.duration;

  switch (state.operation) {
    case 'move':
      newStart = new Date(originalStart);
      newStart.setDate(newStart.getDate() + daysDelta);
      newEnd = new Date(originalEnd);
      newEnd.setDate(newEnd.getDate() + daysDelta);
      break;

    case 'resize_start':
      newStart = new Date(originalStart);
      newStart.setDate(newStart.getDate() + daysDelta);
      newEnd = originalEnd;
      // 重新计算持续时间
      duration = Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      // 验证开始日期不能晚于结束日期
      if (newStart >= newEnd) {
        return {
          valid: false,
          startDate: '',
          endDate: '',
          duration: 1,
          deltaX,
        };
      }
      break;

    case 'resize_end':
      newStart = originalStart;
      newEnd = new Date(originalEnd);
      newEnd.setDate(newEnd.getDate() + daysDelta);
      // 重新计算持续时间
      duration = Math.ceil((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      // 验证结束日期不能早于开始日期
      if (newEnd <= newStart) {
        return {
          valid: false,
          startDate: '',
          endDate: '',
          duration: 1,
          deltaX,
        };
      }
      break;

    default:
      return {
        valid: false,
        startDate: '',
        endDate: '',
        duration: 1,
        deltaX,
      };
  }

  return {
    valid: true,
    startDate: formatDate(newStart),
    endDate: formatDate(newEnd),
    duration,
    deltaX,
  };
}

/**
 * 计算拖拽预览
 */
export function calculateDragPreview(
  state: DragState,
  timelineStartDate: string,
  dayWidth: number
): DragPreview | null {
  if (!state.isActive || !state.originalTask) {
    return null;
  }

  const result = calculateDragResult(state, timelineStartDate, dayWidth);
  if (!result.valid) {
    return null;
  }

  // 计算预览位置
  const timelineStart = new Date(timelineStartDate);
  const previewStart = new Date(result.startDate);

  const daysFromTimelineStart = Math.floor(
    (previewStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const x = daysFromTimelineStart * dayWidth;
  const width = result.duration * dayWidth;

  return {
    x,
    width: Math.max(width, 20), // 最小宽度 20px
    startDate: result.startDate,
    endDate: result.endDate,
  };
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
 * 获取鼠标位置对应的操作类型
 */
export function getHandleAtPosition(
  mouseX: number,
  taskWidth: number,
  handleSize: number = 8
): DragOperation | 'body' {
  // 左手柄区域
  if (mouseX < handleSize) {
    return 'resize_start';
  }
  // 右手柄区域
  if (mouseX > taskWidth - handleSize) {
    return 'resize_end';
  }
  // 中间区域
  return 'body';
}

/**
 * 格式化拖拽提示文本
 */
export function formatDragTooltip(
  result: DragResult,
  originalStartDate?: string
): string {
  if (!result.valid) {
    return '无效的日期范围';
  }

  const startText = formatDateShort(result.startDate);
  const endText = formatDateShort(result.endDate);

  if (originalStartDate) {
    const original = formatDateShort(originalStartDate);
    return `${startText} → ${endText} (${result.duration}天)\n原: ${original}`;
  }

  return `${startText} → ${endText} (${result.duration}天)`;
}

/**
 * 格式化日期为短格式 (M/D)
 */
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 计算边界吸附
 */
export function snapToBoundary(
  value: number,
  min: number,
  max: number,
  threshold: number = 10
): number {
  if (value < min + threshold) {
    return min;
  }
  if (value > max - threshold) {
    return max;
  }
  return value;
}

/**
 * 验证任务日期范围
 */
export function validateTaskDateRange(
  startDate: string,
  endDate: string,
  timelineStartDate: string,
  timelineEndDate: string
): { valid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timelineStart = new Date(timelineStartDate);
  const timelineEnd = new Date(timelineEndDate);

  if (start < timelineStart) {
    return { valid: false, error: '任务开始日期不能早于时间线开始日期' };
  }
  if (end > timelineEnd) {
    return { valid: false, error: '任务结束日期不能晚于时间线结束日期' };
  }
  if (end < start) {
    return { valid: false, error: '结束日期不能早于开始日期' };
  }

  return { valid: true };
}
