/**
 * 时间轴拖拽管理 Hook
 *
 * 处理时间轴任务条的拖拽移动和调整大小操作
 * 复用甘特图的拖拽逻辑
 *
 * @module hooks/useTimelineDrag
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TimelineTask, DragState as TimelineDragState } from '@/types/timeline';
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
  type DragOperation,
} from '@/utils/ganttDragging';

/**
 * Hook 选项
 */
export interface UseTimelineDragOptions {
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
  /** 点击任务回调 */
  onTaskClick?: (task: TimelineTask) => void;
  /** 双击任务回调 */
  onTaskDoubleClick?: (task: TimelineTask) => void;
}

/**
 * 使用时间轴拖拽管理
 */
export function useTimelineDrag(options: UseTimelineDragOptions) {
  const {
    timelineStartDate,
    dayWidth,
    onTaskChange,
    onDragStart,
    onDragEnd,
    onTaskClick,
    onTaskDoubleClick,
  } = options;

  const [dragState, setDragState] = useState(createInitialDragState());
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [dragHandle, setDragHandle] = useState<DragOperation | 'body' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 记录点击时间，用于区分单击和双击
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTaskRef = useRef<string | null>(null);

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
    setDragHandle(operation);
    onDragStart?.(taskId, operation);
  }, [onDragStart]);

  /**
   * 处理任务条鼠标按下
   */
  const handleTaskMouseDown = useCallback((
    e: React.MouseEvent,
    task: TimelineTask,
    taskX: number,
    taskWidth: number
  ) => {
    e.stopPropagation();

    // 计算鼠标在任务条内的位置
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // 确定操作类型
    const handle = getHandleAtPosition(mouseX, taskWidth, 8);

    if (handle === 'body') {
      // 可能是点击或双击的开始
      const now = Date.now();
      const isDoubleClick =
        lastClickTaskRef.current === task.id &&
        clickTimeoutRef.current !== null &&
        now - (clickTimeoutRef.current as unknown as number) < 300;

      if (isDoubleClick) {
        // 双击
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        onTaskDoubleClick?.(task);
      } else {
        // 单击（设置延迟以等待可能的双击）
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
          onTaskClick?.(task);
          clickTimeoutRef.current = null;
        }, 300) as unknown as NodeJS.Timeout;
      }

      lastClickTaskRef.current = task.id;
      // 仍然允许拖动
      const duration = Math.ceil(
        (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      handleDragStart(
        task.id,
        'move',
        e.clientX,
        {
          id: task.id,
          startDate: task.startDate,
          endDate: task.endDate,
          duration,
        }
      );
    } else if (handle) {
      // 调整大小
      const duration = Math.ceil(
        (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      handleDragStart(
        task.id,
        handle,
        e.clientX,
        {
          id: task.id,
          startDate: task.startDate,
          endDate: task.endDate,
          duration,
        }
      );
    }
  }, [handleDragStart, onTaskClick, onTaskDoubleClick]);

  /**
   * 处理鼠标移动
   */
  useEffect(() => {
    if (!isDragging(dragState)) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + (containerRef.current.scrollLeft || 0);
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
        onDragEnd?.(dragState.taskId, true);
      } else {
        onDragEnd?.(dragState.taskId!, false);
      }

      setDragState(endDrag());
      setDragHandle(null);
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
        setDragHandle(null);
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
  const tooltipText = formatDragTooltip(result, dragState.originalTask?.startDate);

  /**
   * 处理任务悬停
   */
  const handleTaskMouseEnter = useCallback((taskId: string) => {
    setHoveredTask(taskId);
  }, []);

  /**
   * 处理任务离开
   */
  const handleTaskMouseLeave = useCallback(() => {
    setHoveredTask(null);
  }, []);

  /**
   * 获取任务的光标样式
   */
  const getTaskCursor = useCallback((
    task: TimelineTask,
    taskWidth: number,
    mouseX: number
  ): string => {
    if (isDragging(dragState)) {
      return 'grabbing';
    }

    const handle = getHandleAtPosition(mouseX, taskWidth, 8);
    if (handle === 'resize_start' || handle === 'resize_end') {
      return 'ew-resize';
    }
    if (handle === 'body') {
      return 'grab';
    }
    return 'default';
  }, [dragState]);

  return {
    // 状态
    dragState,
    hoveredTask,
    dragHandle,

    // 计算结果
    preview,
    result,
    tooltipText,
    isDragging: isDragging(dragState),

    // 容器引用
    containerRef,

    // 事件处理
    handleTaskMouseDown,
    handleTaskMouseEnter,
    handleTaskMouseLeave,
    getTaskCursor,
  };
}
