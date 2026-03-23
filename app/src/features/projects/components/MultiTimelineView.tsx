/**
 * 多时间轴视图组件
 *
 * @module features/projects/components/MultiTimelineView
 * @description 项目时间线主容器组件，协调所有子组件
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineStatsBar } from './TimelineStatsBar';
import { TimelineContextMenu } from './TimelineContextMenu';
import { useTimelineZoom } from '@/hooks/useTimelineZoom';
import { useTimelineDrag } from '@/hooks/useTimelineDrag';
import type {
  Timeline,
  TimelineTask,
  TimelineStats,
  TimelineViewState,
  ContextMenuItem,
  Holiday,
} from '@/types/timeline';
import { DEFAULT_VIEW_STATE } from '@/types/timeline';
import {
  getTodayPosition,
  calculateViewRange,
  generateTicks,
  TRACK_SPECS,
} from '@/utils/ganttGeometry';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface MultiTimelineViewProps {
  /** 项目ID */
  projectId: string;
  /** 时间线列表 */
  timelines: Timeline[];
  /** 任务列表（按时间线分组） */
  tasksByTimeline: Record<string, TimelineTask[]>;
  /** 节假日列表 */
  holidays: Holiday[];
  /** 任务变更回调 */
  onTaskChange?: (
    timelineId: string,
    taskId: string,
    updates: { startDate: string; endDate: string }
  ) => void;
  /** 任务创建回调 */
  onTaskCreate?: (timelineId: string, task: Partial<TimelineTask>) => void;
  /** 任务删除回调 */
  onTaskDelete?: (timelineId: string, taskId: string) => void;
  /** 任务点击回调 */
  onTaskClick?: (task: TimelineTask) => void;
  /** 任务双击回调 */
  onTaskDoubleClick?: (task: TimelineTask) => void;
  /** 是否只读 */
  readOnly?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============ 主组件 ============

export function MultiTimelineView({
  projectId,
  timelines,
  tasksByTimeline,
  holidays,
  onTaskChange,
  onTaskCreate,
  onTaskDelete,
  onTaskClick,
  onTaskDoubleClick,
  readOnly = false,
  className,
}: MultiTimelineViewProps) {
  // ============ 状态管理 ============

  /** 视图状态 */
  const [viewState, setViewState] = useState<TimelineViewState>(DEFAULT_VIEW_STATE);

  /** 选中的任务 */
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null);

  /** 悬停的任务 */
  const [hoveredTask, setHoveredTask] = useState<TimelineTask | null>(null);

  /** 右键菜单 */
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    taskId: string | null;
    timelineId: string | null;
  }>({ visible: false, x: 0, y: 0, taskId: null, timelineId: null });

  /** 容器引用 */
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ============ 缩放管理 ============

  const {
    config: zoomConfig,
    zoomLevel,
    setZoom,
    zoomIn,
    zoomOut,
    getViewLabel,
  } = useTimelineZoom({
    initialLevel: viewState.zoomLevel,
    onZoomChange: (config) => {
      setViewState((prev) => ({ ...prev, zoomLevel: config.level }));
    },
  });

  // ============ 计算时间线范围 ============

  /** 计算所有时间线的日期范围 */
  const { minDate, maxDate } = useMemo(() => {
    if (timelines.length === 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const end = new Date(today);
      end.setDate(end.getDate() + 90);
      return {
        minDate: start.toISOString().split('T')[0],
        maxDate: end.toISOString().split('T')[0],
      };
    }

    let minDate = timelines[0].startDate;
    let maxDate = timelines[0].endDate;

    for (const timeline of timelines) {
      if (timeline.startDate < minDate) {
        minDate = timeline.startDate;
      }
      if (timeline.endDate > maxDate) {
        maxDate = timeline.endDate;
      }
    }

    return { minDate, maxDate };
  }, [timelines]);

  /** 生成时间刻度 */
  const ticks = useMemo(
    () => generateTicks(minDate, maxDate, zoomConfig.dayWidth),
    [minDate, maxDate, zoomConfig.dayWidth]
  );

  /** 今天的位置 */
  const todayPosition = useMemo(
    () => getTodayPosition(minDate, zoomConfig.dayWidth),
    [minDate, zoomConfig.dayWidth]
  );

  // ============ 统计信息 ============

  /** 计算统计信息 */
  const stats = useMemo((): TimelineStats => {
    const allTasks = Object.values(tasksByTimeline).flat();
    return {
      timelineCount: timelines.length,
      taskCount: allTasks.length,
      completedTaskCount: allTasks.filter((t) => t.status === 'completed').length,
 progress: allTasks.length > 0
 ? Math.round(
          (allTasks.filter((t) => t.status === 'completed').length / allTasks.length) *
          100
        )
      : 0,
    };
  }, [timelines, tasksByTimeline]);

  // ============ 拖拽管理 ============

  const {
    dragState,
    isDragging,
    containerRef: dragContainerRef,
    handleTaskMouseDown,
  } = useTimelineDrag({
    timelineStartDate: minDate,
    dayWidth: zoomConfig.dayWidth,
    onTaskChange: (taskId, updates) => {
      // 找到任务所属的时间线
      for (const [timelineId, tasks] of Object.entries(tasksByTimeline)) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          onTaskChange?.(timelineId, taskId, {
            startDate: updates.startDate,
            endDate: updates.endDate,
          });
          break;
        }
      }
    },
    onDragStart: (taskId) => {
      setSelectedTask(
        Object.values(tasksByTimeline)
          .flat()
          .find((t) => t.id === taskId) || null
      );
    },
    onDragEnd: (taskId, committed) => {
      if (!committed) {
        setSelectedTask(null);
      }
    },
    onTaskClick: (task) => {
      setSelectedTask(task);
      onTaskClick?.(task);
    },
    onTaskDoubleClick: (task) => {
      onTaskDoubleClick?.(task);
    },
  });

  // ============ 键盘快捷键 ============

  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete 删除选中的任务
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTask) {
 {
        e.preventDefault();
        // 找到时间线ID
        for (const [timelineId, tasks] of Object.entries(tasksByTimeline)) {
          if (tasks.some((t) => t.id === selectedTask.id)) {
            onTaskDelete?.(timelineId, selectedTask.id);
            setSelectedTask(null);
            break;
          }
        }
        return;
      }

      // Escape 取消选中/取消拖拽
      if (e.key === 'Escape') {
        if (isDragging) {
          // 拖拽取消由 useTimelineDrag 处理
          return;
        }
        setSelectedTask(null);
        setContextMenu({ visible: false, x: 0, y: 0, taskId: null, timelineId: null });
        return;
      }

      // + 放大
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
        return;
      }

      // - 缩小
      if (e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // 方向键滚动
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          const scrollAmount = zoomConfig.dayWidth * 7;
 // 滚动一周
          scrollContainerRef.current.scrollLeft +=
            e.key === 'ArrowLeft' ? -scrollAmount : scrollAmount;
        }
      }
      return;
      }

      // Home 滚动到开始
      if (e.key === 'Home') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = 00;
        }
        return;
      }

      // End 滚动到结束
      if (e.key === 'End') {
        e.preventDefault();
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft =
            scrollContainerRef.current.scrollWidth;
        }
        return;
      }

      // T 滚动到今天
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (scrollContainerRef.current && todayPosition !== null) {
          scrollContainerRef.current.scrollLeft = todayPosition - 100;
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    readOnly,
    selectedTask,
    isDragging,
    zoomIn,
    zoomOut,
    zoomConfig.dayWidth,
    todayPosition,
    tasksByTimeline,
    onTaskDelete,
  ]);

  // ============ 右键菜单 ============

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, taskId: string, timelineId: string) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        taskId,
        timelineId,
      });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, taskId: null, timelineId: null });
  }, []);

  const contextMenuItems: ContextMenuItem[] = useMemo(
    () => [
      {
        id: 'edit',
        label: '编辑',
        shortcut: 'Enter',
        onClick: () => {
          if (contextMenu.taskId) {
            const task = Object.values(tasksByTimeline)
              .flat()
              .find((t) => t.id === contextMenu.taskId);
            if (task) {
              onTaskDoubleClick?.(task);
            }
          }
          handleCloseContextMenu();
        },
      },
      { id: 'divider1', label: '', divider: true },
 disabled: false, danger: false },
      {
        id: 'copy',
        label: '复制',
        onClick: () => {
          if (contextMenu.taskId && contextMenu.timelineId) {
            const task = tasksByTimeline[contextMenu.timelineId]?.find(
t) => t.id === contextMenu.taskId);
            if (task) {
              onTaskCreate?.(contextMenu.timelineId, {
            ...task,
            title: `${task.title} (副本)`,
            id: undefined,
          });
          }
        }
        handleCloseContextMenu();
      },
      },
      {
        id: 'delete',
        label: '删除',
        shortcut: 'Delete',
        danger: true,
        onClick: () => {
          if (contextMenu.taskId && contextMenu.timelineId) {
            onTaskDelete?.(contextMenu.timelineId, contextMenu.taskId);
          }
          handleCloseContextMenu();
        },
      },
    ],
    [contextMenu, tasksByTimeline, onTaskDoubleClick, onTaskCreate, onTaskDelete]
 ]
 );

  // ============ 滚动同步 ============

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setViewState((prev) => ({
        ...prev,
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
      }));
    }
  }, []);

  // ============ 双击创建任务 ============

  const handleTrackDoubleClick = useCallback(
    (timelineId: string, date: string) => {
      if (readOnly) return;
      onTaskCreate?.(timelineId, {
        startDate: date,
        endDate: date,
        title: '新任务',
      });
    },
    [readOnly, onTaskCreate]
  );

  // ============ 渲染 ============

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        ref={containerRef}
        className={cn(
          'flex flex-col h-full bg-white border rounded-lg overflow-hidden',
          className
        )}
      >
        {/* 统计信息栏 */}
        <TimelineStatsBar stats={stats} />

        {/* 主体区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 时间轴列表区 */}
          <div
            className="border-r flex-shrink-0 overflow-y-auto"
            style={{ width: viewState.labelWidth }}
          >
            {/* 表头 */}
            <div
              className="h-10 px-3 border-b bg-muted text-sm font-medium"
              style={{ height: TRACK_SPECS.Ruler.height + TRACK_SPECS.height }}
            >
              时间轴
            </div>
            {/* 时间轴标签列表 */}
            {timelines.map((timeline) => (
              <div
                key={timeline.id}
                className="flex items-center px-3 border-b hover:bg-accent cursor-pointer"
                style={{ height: TRACK_SPECS.height }}
              >
                <span className="truncate text-sm">{timeline.name}</span>
              </div>
            ))}
          </div>

          {/* 时间线主区域 */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto"
            onScroll={handleScroll}
          >
            {/* 时间刻度尺 */}
            <TimelineRuler
              ticks={ticks}
              todayPosition={todayPosition}
              holidays={holidays}
              dayWidth={zoomConfig.dayWidth}
            />

            {/* 时间轴轨道 */}
            <div ref={dragContainerRef}>
              {timelines.map((timeline) => (
                <TimelineTrack
                  key={timeline.id}
                  timeline={timeline}
                  tasks={tasksByTimeline[timeline.id] || []}
                  minDate={minDate}
                  dayWidth={zoomConfig.dayWidth}
                  selectedTaskId={selectedTask?.id || null}
                  hoveredTaskId={hoveredTask?.id || null}
                  isDragging={isDragging}
                  dragState={dragState}
                  readOnly={readOnly}
                  onTaskMouseDown={handleTaskMouseDown}
                  onTaskMouseEnter={(task) => setHoveredTask(task)}
                  onTaskMouseLeave={() => setHoveredTask(null)}
                  onContextMenu={handleContextMenu}
                  onDoubleClick={handleTrackDoubleClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 工具栏 */}
        <TimelineToolbar
          zoomLevel={zoomLevel}
          zoomLabel={getViewLabel()}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onSetZoom={setZoom}
          onAddTask={() => {
            if (timelines.length > 0) {
              const today = new Date().toISOString().split('T')[0];
              onTaskCreate?.(timelines[0].id, {
                startDate: today,
                endDate: today,
                title: '新任务',
              });
            }
          }}
          readOnly={readOnly}
        />

        {/* 右键菜单 */}
        {contextMenu.visible && (
          <TimelineContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenuItems}
            onClose={handleCloseContextMenu}
          />
        )}
      </div>
    </DndProvider>
  );
}
