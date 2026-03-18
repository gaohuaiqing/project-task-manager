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
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TimelineTask | null>(null);

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
   * 处理键盘事件
   * Delete 键删除选中的任务
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只处理 Delete 键
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 如果有选中的任务
        if (selectedTaskId) {
          // 查找选中的任务
          const task = findTaskById(timelines, selectedTaskId);
          if (task) {
            e.preventDefault();
            setTaskToDelete(task);
            setShowDeleteConfirm(true);
          }
        }
      }
      // Esc 键取消选中
      if (e.key === 'Escape' && selectedTaskId) {
        setSelectedTaskId(null);
      }
    };

    // 添加事件监听
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTaskId, timelines]);

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
   * 确认删除任务
   */
  const handleConfirmDelete = useCallback(() => {
    if (taskToDelete) {
      handleDeleteTask(taskToDelete);
      setSelectedTaskId(null);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    }
  }, [taskToDelete, handleDeleteTask]);

  /**
   * 取消删除任务
   */
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, []);

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
  }, [timelines, onTimelinesChange]);

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
          timelines.find(t => t.config.visible !== false)?.config.id || timelines[0]?.config.id || ''
        )}
        onAutoArrange={handleAutoArrange}
      />

      {/* 拖拽提示（拖拽时显示） */}
      {drag.isDragging && drag.tooltipText && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
          {drag.tooltipText}
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && taskToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  确认删除任务
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  确定要删除任务 <span className="font-medium text-gray-900 dark:text-white">"{taskToDelete.title}"</span> 吗？
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  此操作无法撤销
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
