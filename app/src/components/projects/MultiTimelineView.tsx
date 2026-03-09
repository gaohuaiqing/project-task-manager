/**
 * 多时间轴视图组件
 *
 * 主容器组件，协调所有子组件
 * 管理时间轴状态、处理交互
 *
 * @module components/projects/MultiTimelineView
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Timeline, TimelineTask } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { TimelineStatsBar } from './TimelineStatsBar';
import { TimelineTabs } from './TimelineTabs';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineList } from './TimelineList';
import { useTimelineZoom } from '@/hooks/useTimelineZoom';
import { useTimelineDrag } from '@/hooks/useTimelineDrag';
import {
  calculateTimelineStats,
  calculateMergedRange,
  expandTimeRange,
  createTimelineTaskWithId,
  updateTaskInTimeline,
  addTaskToTimeline,
  removeTaskFromTimeline,
  findTaskById,
  autoArrangeAllTimelines,
} from '@/utils/timelineHelpers';
import { calculateTimelineWidth } from '@/utils/ganttGeometry';

interface MultiTimelineViewProps {
  /** 时间轴列表 */
  timelines: Timeline[];
  /** 时间轴变化回调 */
  onTimelinesChange: (timelines: Timeline[]) => void;
  /** 任务双击回调 */
  onTaskDoubleClick?: (task: TimelineTask) => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 多时间轴视图
 */
export function MultiTimelineView({
  timelines,
  onTimelinesChange,
  onTaskDoubleClick,
  className = '',
}: MultiTimelineViewProps) {
  // 状态
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(
    timelines.length > 0 ? timelines[0].config.id : null
  );
  const [scrollLeft, setScrollLeft] = useState(0);

  // 计算统计信息
  const stats = useMemo(() => calculateTimelineStats(timelines), [timelines]);

  // 计算时间范围
  const timeRange = useMemo(() => {
    const range = calculateMergedRange(timelines);
    if (range) {
      // 添加7天缓冲
      return expandTimeRange(range, 7);
    }
    // 默认范围：今天前后30天
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays: 60,
    };
  }, [timelines]);

  // 缩放管理
  const zoom = useTimelineZoom({
    initialLevel: 'week',
  });

  // 拖拽管理
  const drag = useTimelineDrag({
    timelineStartDate: timeRange.startDate,
    dayWidth: zoom.config.dayWidth,
    onTaskChange: handleTaskChange,
    onTaskDoubleClick: handleTaskDoubleClickInternal,
    onTaskClick: handleTaskClick,
  });

  /**
   * 处理任务变更（拖拽后）
   */
  function handleTaskChange(taskId: string, updates: { startDate: string; endDate: string; duration: number }) {
    const updatedTimelines = timelines.map(timeline => {
      const task = timeline.tasks.find(t => t.id === taskId);
      if (task) {
        return updateTaskInTimeline(timeline, taskId, updates);
      }
      return timeline;
    });
    onTimelinesChange(updatedTimelines);
  }

  /**
   * 处理任务双击
   */
  function handleTaskDoubleClickInternal(task: TimelineTask) {
    setSelectedTaskId(task.id);
    onTaskDoubleClick?.(task);
  }

  /**
   * 处理任务点击
   */
  function handleTaskClick(task: TimelineTask) {
    setSelectedTaskId(task.id);
  }

  /**
   * 处理轨道点击（添加任务）
   */
  const handleTrackClick = useCallback((date: string, timelineId: string) => {
    const newTask = createTimelineTaskWithId(date, date, {
      title: '新任务',
    });

    const updatedTimelines = timelines.map(timeline => {
      if (timeline.config.id === timelineId) {
        return addTaskToTimeline(timeline, newTask);
      }
      return timeline;
    });

    onTimelinesChange(updatedTimelines);
    setSelectedTaskId(newTask.id);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理添加时间轴
   */
  const handleAddTimeline = useCallback(() => {
    const newTimeline: Timeline = {
      config: {
        id: `timeline_${Date.now()}`,
        name: `时间轴 ${timelines.length + 1}`,
        icon: '📋',
        color: '#3b82f6',
        type: 'custom',
        visible: true,
        editable: true,
        sortOrder: timelines.length,
      },
      tasks: [],
    };

    onTimelinesChange([...timelines, newTimeline]);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理删除时间轴
   */
  const handleDeleteTimeline = useCallback((timelineId: string) => {
    const updatedTimelines = timelines.filter(t => t.config.id !== timelineId);
    onTimelinesChange(updatedTimelines);

    // 如果删除的是当前激活的时间轴，切换到第一个
    if (activeTimelineId === timelineId && updatedTimelines.length > 0) {
      setActiveTimelineId(updatedTimelines[0].config.id);
    }
  }, [timelines, activeTimelineId, onTimelinesChange]);

  /**
   * 处理自动排列
   */
  const handleAutoArrange = useCallback(() => {
    const arranged = autoArrangeAllTimelines(timelines, 1);
    onTimelinesChange(arranged);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理编辑任务
   */
  const handleEditTask = useCallback((task: TimelineTask) => {
    onTaskDoubleClick?.(task);
  }, [onTaskDoubleClick]);

  /**
   * 处理复制任务
   */
  const handleCopyTask = useCallback((task: TimelineTask) => {
    const newTask = {
      ...task,
      id: `task_${Date.now()}`,
      title: `${task.title} (副本)`,
    };

    const updatedTimelines = timelines.map(timeline => {
      if (timeline.config.id === task.timelineId) {
        return {
          ...timeline,
          tasks: [...timeline.tasks, newTask],
        };
      }
      return timeline;
    });

    onTimelinesChange(updatedTimelines);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理切换任务状态
   */
  const handleToggleTaskStatus = useCallback((task: TimelineTask) => {
    const statusFlow: Record<string, string> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
      cancelled: 'pending',
    };

    const newStatus = statusFlow[task.status] || 'pending';

    const updatedTimelines = timelines.map(timeline => {
      const taskIndex = timeline.tasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        const updatedTasks = [...timeline.tasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          status: newStatus as any,
        };
        return {
          ...timeline,
          tasks: updatedTasks,
        };
      }
      return timeline;
    });

    onTimelinesChange(updatedTimelines);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理删除任务
   */
  const handleDeleteTask = useCallback((task: TimelineTask) => {
    const updatedTimelines = timelines.map(timeline => {
      if (timeline.tasks.some(t => t.id === task.id)) {
        return {
          ...timeline,
          tasks: timeline.tasks.filter(t => t.id !== task.id),
        };
      }
      return timeline;
    });

    onTimelinesChange(updatedTimelines);
  }, [timelines, onTimelinesChange]);

  /**
   * 处理重命名时间轴
   */
  const handleRenameTimeline = useCallback((timeline: Timeline) => {
    const newName = prompt('请输入新的时间轴名称：', timeline.config.name);
    if (newName && newName.trim() !== '') {
      const updatedTimelines = timelines.map(t => {
        if (t.config.id === timeline.config.id) {
          return {
            ...t,
            config: {
              ...t.config,
              name: newName.trim(),
            },
          };
        }
        return t;
      });
      onTimelinesChange(updatedTimelines);
    }
  }, [timelines, onTimelinesChange]);

  /**
   * 计算时间轴总宽度
   */
  const totalWidth = useMemo(() => {
    return calculateTimelineWidth(timeRange, zoom.config.dayWidth);
  }, [timeRange, zoom.config.dayWidth]);

  return (
    <div className={`flex flex-col bg-white h-full ${className}`}>
      {/* 统计信息栏 */}
      <TimelineStatsBar stats={stats} showDetails={false} />

      {/* 时间轴标签页 */}
      <TimelineTabs
        timelines={timelines}
        activeTimelineId={activeTimelineId || undefined}
        onSelectTimeline={setActiveTimelineId}
        onAddTimeline={handleAddTimeline}
        onDeleteTimeline={handleDeleteTimeline}
      />

      {/* 主视图区域 */}
      <div className="flex-1 overflow-hidden">
        <TimelineList
          timelines={timelines}
          timeRange={timeRange}
          zoomConfig={zoom.config}
          hoveredTaskId={hoveredTaskId}
          selectedTaskId={selectedTaskId}
          draggingTaskId={drag.dragState.taskId}
          onTaskMouseDown={(e, task) => drag.handleTaskMouseDown(e, task, 0, 0)}
          onTaskMouseEnter={setHoveredTaskId}
          onTaskMouseLeave={() => setHoveredTaskId(null)}
          onTrackClick={handleTrackClick}
          onEditTask={handleEditTask}
          onCopyTask={handleCopyTask}
          onToggleTaskStatus={handleToggleTaskStatus}
          onDeleteTask={handleDeleteTask}
          onRenameTimeline={handleRenameTimeline}
          onDeleteTimeline={handleDeleteTimeline}
        />
      </div>

      {/* 底部工具栏 */}
      <TimelineToolbar
        zoomLevel={zoom.zoomLevel}
        onZoomChange={zoom.setZoom}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onAddTask={() => handleTrackClick(
          new Date().toISOString().split('T')[0],
          activeTimelineId || timelines[0]?.config.id || ''
        )}
        onAutoArrange={handleAutoArrange}
      />

      {/* 拖拽提示（拖拽时显示） */}
      {drag.isDragging && drag.tooltipText && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
          {drag.tooltipText}
        </div>
      )}
    </div>
  );
}
