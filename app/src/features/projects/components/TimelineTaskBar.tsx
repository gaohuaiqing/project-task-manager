/**
 * 时间线任务条组件
 *
 * @module features/projects/components/TimelineTaskBar
 * @description 可拖拽的任务条组件
 */

import { useMemo } from 'react';
import type { TimelineTask, TimelineTaskStatus } from '@/types/timeline';
import { cn } from '@/lib/utils';

// ============ 状态颜色映射 ============

const STATUS_COLORS: Record<TimelineTaskStatus, { bg: string; text: string; border: string }> = {
  not_started: {
    bg: 'bg-gray-400',
    text: 'text-white',
    border: 'border-gray-500',
  },
  in_progress: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-600',
  },
  completed: {
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-600',
  },
  delayed: {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-600',
  },
  cancelled: {
    bg: 'bg-slate-400 opacity-60',
    text: 'text-gray-600',
    border: 'border-slate-300',
  },
};

// ============ Props 定义 ============

export interface TimelineTaskBarProps {
  /** 任务数据 */
  task: TimelineTask;
  /** X 位置 */
  x: number;
  /** Y 位置 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否悬停 */
  isHovered?: boolean;
  /** 是否正在拖拽 */
  isDragging?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 鼠标按下回调 */
  onMouseDown: (e: React.MouseEvent) => void;
  /** 鼠标进入回调 */
  onMouseEnter: () => void;
  /** 鼠标离开回调 */
  onMouseLeave: () => void;
  /** 右键菜单回调 */
  onContextMenu: (e: React.MouseEvent) => void;
}

// ============ 组件实现 ============

export function TimelineTaskBar({
  task,
  x,
  y,
  width,
  height,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  readOnly = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
}: TimelineTaskBarProps) {
  // 获取状态颜色
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.not_started;

  // 计算进度条宽度
  const progressWidth = useMemo(() => {
    return (width * (task.progress || 0)) / 100;
  }, [width, task.progress]);

  // 是否是里程碑（单日任务）
  const isMilestone = useMemo(() => {
    return task.startDate === task.endDate;
  }, [task.startDate, task.endDate]);

  // 计算光标样式
  const cursorStyle = useMemo(() => {
    if (readOnly) return 'default';
    if (isDragging) return 'grabbing';
    return 'grab';
  }, [readOnly, isDragging]);

  return (
    <div
      className={cn(
        'absolute group',
        'rounded-md',
        'transition-all duration-150',
        'select-none',
        statusColor.bg,
        statusColor.border,
        'border',
        isSelected && 'ring-2 ring-offset-1 ring-blue-500',
        isHovered && !isSelected && 'shadow-md',
        isDragging && 'opacity-70 z-10',
        isMilestone && 'rounded-full'
      )}
      style={{
        left: x,
        top: y,
        width: isMilestone ? 12 : width,
        height: isMilestone ? 12 : height,
        cursor: cursorStyle,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
    >
      {/* 进度条背景 */}
      {!isMilestone && task.progress > 0 && (
        <div
          className={cn(
            'absolute inset-0 rounded-md overflow-hidden',
          )}
        >
          <div
            className="h-full bg-white/30"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {/* 左手柄 */}
      {!readOnly && !isMilestone && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-2',
            'cursor-ew-resize',
            'opacity-0 group-hover:opacity-100',
            'bg-black/10',
            'hover:bg-black/20',
            'transition-opacity',
            'rounded-l-md'
          )}
        />
      )}

      {/* 右手柄 */}
      {!readOnly && !isMilestone && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-2',
            'cursor-ew-resize',
            'opacity-0 group-hover:opacity-100',
            'bg-black/10',
            'hover:bg-black/20',
            'transition-opacity',
            'rounded-r-md'
          )}
        />
      )}

      {/* 任务标题 */}
      {!isMilestone && (
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
          <span
            className={cn(
              'text-xs font-medium truncate',
              statusColor.text
            )}
          >
            {task.title}
          </span>
        </div>
      )}

      {/* 悬停提示 */}
      {isHovered && (
        <div
          className={cn(
            'absolute -top-8 left-1/2 -translate-x-1/2',
            'px-2 py-1 rounded',
            'bg-gray-800 text-white text-xs',
            'whitespace-nowrap',
            'pointer-events-none',
            'z-50'
          )}
        >
          {task.title}
          <div className="text-gray-300">
            {task.startDate} ~ {task.endDate}
          </div>
        </div>
      )}

      {/* 里程碑标记 */}
      {isMilestone && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'text-white text-xs font-bold'
          )}
        >
          ◇
        </div>
      )}
    </div>
  );
}
