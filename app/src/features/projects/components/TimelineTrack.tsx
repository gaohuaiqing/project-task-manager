/**
 * 时间轴轨道组件
 *
 * @module features/projects/components/TimelineTrack
 * @description 单条时间轴轨道，显示任务条
 */

import { useCallback, useMemo } from 'react';
import { TimelineTaskBar } from './TimelineTaskBar';
import type { Timeline, TimelineTask, DragState, Holiday } from '@/types/timeline';
import {
  TRACK_SPECS,
  TASK_BAR_SPECS,
  calculateTaskBarGeometry,
  autoArrangeTasks,
} from '@/utils/ganttGeometry';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineTrackProps {
  /** 时间轴数据 */
  timeline: Timeline;
  /** 任务列表 */
  tasks: TimelineTask[];
  /** 时间线开始日期 */
  minDate: string;
  /** 每天像素宽度 */
  dayWidth: number;
  /** 选中的任务ID */
  selectedTaskId: string | null;
  /** 悬停的任务Id */
  hoveredTaskId: string | null;
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽状态 */
  dragState: DragState;
  /** 是否只读 */
  readOnly?: boolean;
  /** 任务鼠标按下回调 */
  onTaskMouseDown: (
    e: React.MouseEvent,
    task: TimelineTask,
    taskX: number,
    taskWidth: number
  ) => void;
  /** 任务鼠标进入回调 */
  onTaskMouseEnter: (task: TimelineTask) => void;
  /** 任务鼠标离开回调 */
  onTaskMouseLeave: () => void;
  /** 右键菜单回调 */
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  /** 双击回调 */
  onDoubleClick: (timelineId: string, date: string) => void;
}

// ============ 组件实现 ============

export function TimelineTrack({
  timeline,
  tasks,
  minDate,
  dayWidth,
  selectedTaskId,
  hoveredTaskId,
  isDragging,
  dragState,
  readOnly = false,
  onTaskMouseDown,
  onTaskMouseEnter,
  onTaskMouseLeave,
  onContextMenu,
  onDoubleClick,
}: TimelineTrackProps) {
  // 计算轨道宽度（天数 * 每天宽度）
  const trackWidth = useMemo(() => {
    const start = new Date(timeline.startDate);
    const end = new Date(timeline.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days * dayWidth;
  }, [timeline.startDate, timeline.endDate, dayWidth]);

  // 自动排列任务
  const taskYPositions = useMemo(() => {
    if (tasks.length === 0) return new Map();
    return autoArrangeTasks(tasks);
  }, [tasks]);

  // 计算轨道高度
  const trackHeight = useMemo(() => {
    if (tasks.length === 0) return TRACK_SPECS.height;
    const maxRow = Math.max(...Array.from(taskYPositions.values())) as r => r, 0) + 1;
    return Math.max(
      TRACK_SPECS.height,
      (maxRow + 1) * (TASK_BAR_SPECS.height + TASK_BAR_SPECS.taskBarGap) + TASK_BAR_SPECS.taskBarGap
    );
  }, [taskYPositions]);

  // 处理双击创建任务
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const days = Math.floor(x / dayWidth);
    const date = new Date(minDate);
    date.setDate(date.getDate() + days);
    onDoubleClick(timeline.id, date.toISOString().split('T')[0]);
  }, [readOnly, dayWidth, minDate, onDoubleClick, timeline.id]);

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    onContextMenu(e, taskId);
  }, [onContextMenu]);

  return (
    <div
      className={cn(
        'relative',
        'border-b',
        'bg-white',
        isDragging && 'pointer-events-none'
      )}
      style={{
        width: trackWidth,
        height: trackHeight,
        minHeight: TRACK_SPECS.height,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 背景网格线 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: Math.ceil(trackWidth / dayWidth) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-gray-100"
            style={{ left: i * dayWidth }}
          />
        ))}
      </div>

      {/* 任务条 */}
      {tasks.map((task) => {
        const { x, width } = calculateTaskBarGeometry(
          task.startDate,
          task.endDate,
          minDate,
          dayWidth
        );

        const y = taskYPositions.get(task.id) || 0;
        const taskY = TRACK_SPECS.taskBarGap + y * (TASK_BAR_SPECS.height + TASK_BAR_SPECS.taskBarGap);

        const isSelected = selectedTaskId === task.id;
        const isHovered = hoveredTaskId === task.id;
        const isDraggingThis = dragState.taskId === task.id;

        return (
          <TimelineTaskBar
            key={task.id}
            task={task}
            x={x}
            y={taskY}
            width={width}
            height={TASK_BAR_SPECS.height}
            isSelected={isSelected}
            isHovered={isHovered && !isSelected}
            isDragging={isDraggingThis}
            readOnly={readOnly}
            onMouseDown={(e) => onTaskMouseDown(e, task, x, width)}
            onMouseEnter={() => onTaskMouseEnter(task)}
            onMouseLeave={onTaskMouseLeave}
            onContextMenu={(e) => handleContextMenu(e, task.id)}
          />
        );
      })}

      {/* 拖拽预览 */}
      {isDragging && dragState.taskId && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            right: 1,
            top: TRACK_SPECS.taskBarGap,
            height: TASK_BAR_SPECS.height,
            backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with 10% opacity
            border: '2px dashed rgb(59, 130, 246)',
            borderRadius: TASK_BAR_SPECS.borderRadius,
          }}
        />
      )}
    </div>
  );
}
