/**
 * 时间轴列表组件
 *
 * 显示所有时间轴的集合
 * 包含顶部刻度和多个时间轴条目
 *
 * @module components/projects/TimelineList
 */

import React from 'react';
import type { Timeline, ZoomConfig } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { TimelineItem } from './TimelineItem';
import { TimelineRuler } from './TimelineRuler';

interface TimelineListProps {
  /** 时间轴列表 */
  timelines: Timeline[];
  /** 时间范围 */
  timeRange: TimeRange;
  /** 缩放配置 */
  zoomConfig: ZoomConfig;
  /** 轨道高度 */
  trackHeight?: number;
  /** 刻度高度 */
  rulerHeight?: number;
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
 * 时间轴列表
 */
export function TimelineList({
  timelines,
  timeRange,
  zoomConfig,
  trackHeight = 60,
  rulerHeight = 40,
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
}: TimelineListProps) {
  // 过滤可见的时间轴
  const visibleTimelines = timelines.filter(t => t.config.visible !== false);

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {/* 顶部刻度 */}
      <div className="flex">
        {/* 左侧占位（与时间轴标签对齐） */}
        <div className="flex-shrink-0 w-48 bg-gray-50 border-r border-gray-200" style={{ height: `${rulerHeight}px` }} />

        {/* 刻度区域 */}
        <div className="flex-1 overflow-hidden">
          <TimelineRuler
            timeRange={timeRange}
            zoomConfig={zoomConfig}
            height={rulerHeight}
          />
        </div>
      </div>

      {/* 时间轴列表 */}
      <div className="flex-1 overflow-auto">
        {visibleTimelines.map((timeline, index) => (
          <TimelineItem
            key={timeline.config.id}
            timeline={timeline}
            timeRange={timeRange}
            zoomConfig={zoomConfig}
            trackHeight={trackHeight}
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
        ))}

        {/* 空状态 */}
        {visibleTimelines.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <p className="text-sm">暂无时间轴</p>
              <p className="text-xs mt-1">点击"添加"按钮创建时间轴</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
