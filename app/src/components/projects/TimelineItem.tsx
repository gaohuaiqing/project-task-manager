/**
 * 时间轴条目组件
 *
 * 单条时间轴的完整展示
 * 包含左侧标签和右侧任务轨道
 *
 * @module components/projects/TimelineItem
 */

import React from 'react';
import type { Timeline, ZoomConfig } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { TimelineTrack } from './TimelineTrack';
import { calculateSingleTimelineStats } from '@/utils/timelineHelpers';

interface TimelineItemProps {
  /** 时间轴数据 */
  timeline: Timeline;
  /** 时间范围 */
  timeRange: TimeRange;
  /** 缩放配置 */
  zoomConfig: ZoomConfig;
  /** 轨道高度 */
  trackHeight?: number;
  /** 时间轴索引 */
  index?: number;
  /** 悬停的任务ID */
  hoveredTaskId?: string | null;
  /** 选中的任务ID */
  selectedTaskId?: string | null;
  /** 拖拽中的任务ID */
  draggingTaskId?: string | null;
  /** 任务点击回调 */
  onTaskClick?: (task: any) => void;
  /** 任务双击回调 */
  onTaskDoubleClick?: (task: any) => void;
  /** 任务鼠标按下回调 */
  onTaskMouseDown?: (e: React.MouseEvent, task: any) => void;
  /** 任务鼠标进入回调 */
  onTaskMouseEnter?: (taskId: string) => void;
  /** 任务鼠标离开回调 */
  onTaskMouseLeave?: () => void;
  /** 点击轨道回调 */
  onTrackClick?: (date: string, timelineId: string) => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴条目
 */
export function TimelineItem({
  timeline,
  timeRange,
  zoomConfig,
  trackHeight = 60,
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
}: TimelineItemProps) {
  const stats = calculateSingleTimelineStats(timeline);

  return (
    <div className={`flex border-b border-gray-200 ${className}`}>
      {/* 左侧标签 */}
      <div className="flex-shrink-0 w-48 bg-gray-50 border-r border-gray-200 flex items-center px-3">
        <div className="flex-1 min-w-0">
          {/* 时间轴图标和名称 */}
          <div className="flex items-center gap-2 mb-1">
            {timeline.config.icon && (
              <span className="text-lg flex-shrink-0">{timeline.config.icon}</span>
            )}
            <span className="text-sm font-medium text-gray-900 truncate">
              {timeline.config.name}
            </span>
          </div>

          {/* 颜色指示器 */}
          {timeline.config.color && (
            <div
              className="w-full h-1 rounded-full mb-1.5"
              style={{ backgroundColor: timeline.config.color }}
            />
          )}

          {/* 任务统计 */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{stats.taskCount} 个任务</span>
            {stats.completedCount > 0 && (
              <>
                <span>·</span>
                <span className="text-green-600">{stats.completedCount} 完成</span>
              </>
            )}
            {stats.inProgressCount > 0 && (
              <>
                <span>·</span>
                <span className="text-blue-600">{stats.inProgressCount} 进行中</span>
              </>
            )}
          </div>

          {/* 进度条 */}
          {stats.taskCount > 0 && (
            <div className="mt-1.5 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 右侧任务轨道 */}
      <div className="flex-1 overflow-hidden">
        <TimelineTrack
          timeline={timeline}
          timeRange={timeRange}
          zoomConfig={zoomConfig}
          height={trackHeight}
          index={index}
          hoveredTaskId={hoveredTaskId}
          selectedTaskId={selectedTaskId}
          draggingTaskId={draggingTaskId}
          onTaskClick={onTaskClick}
          onTaskDoubleClick={onTaskDoubleClick}
          onTaskMouseDown={onTaskMouseDown}
          onTaskMouseEnter={onTaskMouseEnter}
          onTaskMouseLeave={onTaskMouseLeave}
          onTrackClick={onTrackClick}
        />
      </div>
    </div>
  );
}
