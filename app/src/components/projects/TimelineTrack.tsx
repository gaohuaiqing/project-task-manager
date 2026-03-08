/**
 * 时间轴任务轨道组件
 *
 * 显示单条时间轴的任务轨道
 * 包含时间刻度、任务条、网格线
 *
 * @module components/projects/TimelineTrack
 */

import React, { useMemo } from 'react';
import type { Timeline, ZoomConfig } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { TimelineTaskBar } from './TimelineTaskBar';
import { dateToX, calculateTaskRect, isWeekend, isToday } from '@/utils/ganttGeometry';

interface TimelineTrackProps {
  /** 时间轴数据 */
  timeline: Timeline;
  /** 时间范围 */
  timeRange: TimeRange;
  /** 缩放配置 */
  zoomConfig: ZoomConfig;
  /** 轨道高度 */
  height?: number;
  /** 轨道索引（用于交替背景色） */
  index?: number;
  /** 悬停的任务ID */
  hoveredTaskId?: string | null;
  /** 选中的任务ID */
  selectedTaskId?: string | null;
  /** 拖拽中的任务ID */
  draggingTaskId?: string | null;
  /** 任务点击回调 */
  onTaskClick?: (task: Timeline) => void;
  /** 任务双击回调 */
  onTaskDoubleClick?: (task: Timeline) => void;
  /** 任务鼠标按下回调 */
  onTaskMouseDown?: (e: React.MouseEvent, task: Timeline) => void;
  /** 任务鼠标进入回调 */
  onTaskMouseEnter?: (taskId: string) => void;
  /** 任务鼠标离开回调 */
  onTaskMouseLeave?: () => void;
  /** 点击轨道回调（用于添加任务） */
  onTrackClick?: (date: string, timelineId: string) => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴任务轨道
 */
export function TimelineTrack({
  timeline,
  timeRange,
  zoomConfig,
  height = 60,
  index = 0,
  hoveredTaskId,
  selectedTaskId,
  draggingTaskId,
  onTaskClick,
  onTaskDoubleClick,
  onTaskMouseDown,
  onTaskMouseEnter,
  onTaskMouseLeave,
  onTrackClick,
  className = '',
}: TimelineTrackProps) {
  const isEven = index % 2 === 0;

  // 生成网格线
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const { dayWidth } = zoomConfig;

    for (let i = 0; i <= timeRange.totalDays; i++) {
      const date = new Date(timeRange.startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const x = i * dayWidth;

      // 判断是否是周末
      const weekend = isWeekend(dateStr);
      const today = isToday(dateStr);

      lines.push(
        <div
          key={i}
          className={`absolute top-0 bottom-0 pointer-events-none ${
            weekend ? 'bg-gray-100' : ''
          } ${today ? 'bg-blue-50' : ''}`}
          style={{
            left: `${x}px`,
            width: `${dayWidth}px`,
          }}
        />
      );
    }

    return lines;
  }, [timeRange, zoomConfig]);

  // 处理轨道点击
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!onTrackClick) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + (e.currentTarget as HTMLElement).scrollLeft;
    const day = Math.floor(x / zoomConfig.dayWidth);

    const date = new Date(timeRange.startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    onTrackClick(dateStr, timeline.config.id);
  };

  return (
    <div
      className={`relative border-b border-gray-200 ${isEven ? 'bg-white' : 'bg-gray-50'} ${className}`}
      style={{ height: `${height}px` }}
      onClick={handleTrackClick}
    >
      {/* 网格线 */}
      {gridLines}

      {/* 任务列表 */}
      {timeline.tasks.map((task) => {
        const rect = calculateTaskRect(
          task.startDate,
          task.endDate,
          timeRange.startDate,
          zoomConfig.dayWidth
        );

        return (
          <TimelineTaskBar
            key={task.id}
            task={task}
            x={rect.x}
            width={rect.width}
            height={height - 20}
            isHovered={hoveredTaskId === task.id}
            isSelected={selectedTaskId === task.id}
            isDragging={draggingTaskId === task.id}
            onMouseDown={onTaskMouseDown}
            onMouseEnter={() => onTaskMouseEnter?.(task.id)}
            onMouseLeave={onTaskMouseLeave}
            onDoubleClick={() => onTaskDoubleClick?.(task)}
          />
        );
      })}

      {/* 空状态提示 */}
      {timeline.tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          点击轨道添加任务
        </div>
      )}
    </div>
  );
}
