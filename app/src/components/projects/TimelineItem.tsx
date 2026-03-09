/**
 * 时间轴条目组件
 *
 * 单条时间轴的完整展示
 * 包含左侧标签和右侧任务轨道、右键菜单
 *
 * @module components/projects/TimelineItem
 */

import React, { useState } from 'react';
import type { Timeline, ZoomConfig } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { TimelineTrack } from './TimelineTrack';
import { TimelineContextMenu, type ContextMenuPosition } from './TimelineContextMenu';
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
  /** 编辑任务回调 */
  onEditTask?: (task: any) => void;
  /** 复制任务回调 */
  onCopyTask?: (task: any) => void;
  /** 切换状态回调 */
  onToggleTaskStatus?: (task: any) => void;
  /** 删除任务回调 */
  onDeleteTask?: (task: any) => void;
  /** 重命名时间轴回调 */
  onRenameTimeline?: (timeline: Timeline) => void;
  /** 删除时间轴回调 */
  onDeleteTimeline?: (timeline: Timeline) => void;
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
  onEditTask,
  onCopyTask,
  onToggleTaskStatus,
  onDeleteTask,
  onRenameTimeline,
  onDeleteTimeline,
  className = '',
}: TimelineItemProps) {
  const stats = calculateSingleTimelineStats(timeline);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleRename = () => {
    onRenameTimeline?.(timeline);
  };

  const handleDelete = () => {
    onDeleteTimeline?.(timeline);
  };

  const handleAddTask = () => {
    if (onTrackClick) {
      // 在时间轴的开头添加新任务
      const startDate = timeRange.startDate;
      onTrackClick(startDate, timeline.config.id);
    }
  };

  return (
    <>
      <div className={`flex border-b border-gray-200 ${className}`}>
        {/* 左侧标签 */}
        <div
          className="flex-shrink-0 w-48 bg-gray-50 border-r border-gray-200 flex items-center px-3 cursor-pointer hover:bg-gray-100 transition-colors"
          onContextMenu={handleContextMenu}
        >
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
      </div>

      {/* 右侧任务轨道 */}
      <div className="flex-1 overflow-hidden flex">
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
          onEditTask={onEditTask}
          onCopyTask={onCopyTask}
          onToggleTaskStatus={onToggleTaskStatus}
          onDeleteTask={onDeleteTask}
        />

        {/* 右侧添加任务按钮 */}
        <div className="flex-shrink-0 w-24 flex items-center justify-center border-l border-gray-200 bg-gray-50">
          <button
            onClick={handleAddTask}
            className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="添加任务到此时间轴"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>添加任务</span>
          </button>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <TimelineContextMenu
          timeline={timeline}
          position={contextMenu}
          onClose={handleCloseContextMenu}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
