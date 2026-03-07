/**
 * 甘特图拖拽管理 Hook
 *
 * 处理任务条的拖拽移动和调整大小操作
 *
 * @module hooks/useGanttDrag
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createInitialDragState,
  startDrag,
  updateDragPosition,
  endDrag,
  calculateDragResult,
  calculateDragPreview,
  getHandleAtPosition,
  isDragging,
  formatDragTooltip,
  type DragState,
  type DragOperation,
} from '@/utils/ganttDragging';

/**
 * Hook 选项
 */
export interface UseGanttDragOptions {
  /** 时间轴开始日期 */
  timelineStartDate: string;
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 任务变更回调 */
  onTaskChange?: (taskId: string, updates: { startDate: string; endDate: string; duration: number }) => void;
  /** 拖拽开始回调 */
  onDragStart?: (taskId: string, operation: DragOperation) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (taskId: string, committed: boolean) => void;
}

/**
 * 使用甘特图拖拽管理
 */
export function useGanttDrag(options: UseGanttDragOptions) {
  const { timelineStartDate, dayWidth, onTaskChange, onDragStart, onDragEnd } = options;

  const [dragState, setDragState] = useState<DragState>(createInitialDragState());
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 开始拖拽
   */
  const handleDragStart = useCallback((
    taskId: string,
    operation: DragOperation,
    startX: number,
    task: { id: string; startDate: string; endDate: string; duration: number }
  ) => {
    const newState = startDrag(taskId, operation, startX, task);
    setDragState(newState);
    onDragStart?.(taskId, operation);
  }, [onDragStart]);

  /**
   * 处理鼠标移动
   */
  useEffect(() => {
    if (!isDragging(dragState)) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft;
        setDragState(prev => updateDragPosition(prev, x));
      }
    };

    const handleMouseUp = () => {
      // 计算最终结果
      const result = calculateDragResult(dragState, timelineStartDate, dayWidth);

      if (result.valid && dragState.taskId && onTaskChange) {
        onTaskChange(dragState.taskId, {
          startDate: result.startDate,
          endDate: result.endDate,
          duration: result.duration,
        });
        onDragEnd?.(dragState.taskId!, true);
      } else {
        onDragEnd?.(dragState.taskId!, false);
      }

      setDragState(endDrag());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, timelineStartDate, dayWidth, onTaskChange, onDragEnd]);

  /**
   * 处理 ESC 键取消拖拽
   */
  useEffect(() => {
    if (!isDragging(dragState)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDragEnd?.(dragState.taskId!, false);
        setDragState(endDrag());
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragState, onDragEnd]);

  /**
   * 计算当前拖拽预览
   */
  const preview = calculateDragPreview(dragState, timelineStartDate, dayWidth);

  /**
   * 计算当前拖拽结果
   */
  const result = calculateDragResult(dragState, timelineStartDate, dayWidth);

  /**
   * 格式化提示文本
   */
  const tooltipText = formatDragTooltip(result);

  return {
    dragState,
    preview,
    result,
    tooltipText,
    isDragging: isDragging(dragState),
    containerRef,
    handleDragStart,
    getHandleAtPosition,
  };
}
