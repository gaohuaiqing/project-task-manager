/**
 * 现代甘特图视图组件
 *
 * 纯时间轴视图，所有任务平铺显示
 * 支持无级缩放、实时拖拽编辑、双击快速编辑
 *
 * @module components/gantt/ModernGanttView
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGanttZoom } from '@/hooks/useGanttZoom';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { calculateTimeRange, calculateTimelineWidth, dateToX, scrollToDate, isToday, isWeekend } from '@/utils/ganttGeometry';
import type { TimeRange, ZoomConfig } from '@/utils/ganttGeometry';
import type { DragOperation } from '@/utils/ganttDragging';

/**
 * 时间节点数据（任务或里程碑）
 */
export interface TimeNode {
  /** 节点ID */
  id: string;
  /** 节点类型 */
  type: 'task' | 'milestone';
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 工期（天数） */
  duration: number;
  /** 状态 */
  status?: string;
  /** 负责人 */
  assignee?: string;
  /** 颜色 */
  color?: string;
}

/**
 * 组件属性
 */
export interface ModernGanttViewProps {
  /** 项目开始日期 */
  projectStartDate: string;
  /** 项目结束日期 */
  projectEndDate: string;
  /** 时间节点列表（任务和里程碑） */
  nodes: TimeNode[];
  /** 节点变更回调 */
  onNodesChange?: (nodes: TimeNode[]) => void;
  /** 节点点击回调 */
  onNodeClick?: (node: TimeNode) => void;
  /** 节点双击回调 */
  onNodeDoubleClick?: (node: TimeNode) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 行高（像素） */
  rowHeight?: number;
  /** 额外的类名 */
  className?: string;
}

/**
 * 默认行高
 */
const DEFAULT_ROW_HEIGHT = 48;

/**
 * 现代甘特图视图组件
 */
export function ModernGanttView({
  projectStartDate,
  projectEndDate,
  nodes,
  onNodesChange,
  onNodeClick,
  onNodeDoubleClick,
  readonly = false,
  rowHeight = DEFAULT_ROW_HEIGHT,
  className,
}: ModernGanttViewProps) {
  // ==================== 缩放管理 ====================
  const { config: zoomConfig, zoomIn, zoomOut, setZoom } = useGanttZoom({
    initialLevel: 30,
    minLevel: 5,
    maxLevel: 100,
  });

  // ==================== 时间范围计算 ====================
  const timeRange = useMemo<TimeRange>(() => {
    return calculateTimeRange({
      projectStart: projectStartDate,
      projectEnd: projectEndDate,
      bufferDays: 7,
    });
  }, [projectStartDate, projectEndDate]);

  const timelineWidth = useMemo(() => {
    return calculateTimelineWidth(timeRange, zoomConfig.dayWidth);
  }, [timeRange, zoomConfig.dayWidth]);

  // ==================== 拖拽管理 ====================
  const handleTaskChange = useCallback((taskId: string, updates: { startDate: string; endDate: string; duration: number }) => {
    if (!onNodesChange) return;

    const updatedNodes = nodes.map(node =>
      node.id === taskId
        ? { ...node, startDate: updates.startDate, endDate: updates.endDate, duration: updates.duration }
        : node
    );
    onNodesChange(updatedNodes);
  }, [nodes, onNodesChange]);

  const {
    isDragging,
    preview,
    tooltipText,
    containerRef,
    handleDragStart,
    getHandleAtPosition,
  } = useGanttDrag({
    timelineStartDate: timeRange.startDate,
    dayWidth: zoomConfig.dayWidth,
    onTaskChange: handleTaskChange,
  });

  // ==================== 滚动管理 ====================
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 滚动到今天
   */
  const scrollToToday = useCallback(() => {
    if (scrollContainerRef.current) {
      const today = new Date().toISOString().split('T')[0];
      const scrollPos = scrollToDate(
        today,
        scrollContainerRef.current.clientWidth,
        timeRange,
        zoomConfig.dayWidth
      );
      setScrollLeft(scrollPos);
    }
  }, [timeRange, zoomConfig.dayWidth]);

  // ==================== 节点操作 ====================
  const handleNodeMouseDown = useCallback((
    node: TimeNode,
    e: React.MouseEvent
  ) => {
    if (readonly || node.type === 'milestone') return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const handle = getHandleAtPosition(mouseX, rect.width);
    if (handle) {
      const operation: DragOperation = handle === 'body' ? 'move' : handle;
      handleDragStart(node.id, operation, e.clientX, {
        id: node.id,
        startDate: node.startDate,
        endDate: node.endDate,
        duration: node.duration,
      });
    }
  }, [readonly, getHandleAtPosition, handleDragStart]);

  const handleNodeClick = useCallback((node: TimeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeDoubleClick = useCallback((node: TimeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeDoubleClick?.(node);
  }, [onNodeDoubleClick]);

  // ==================== 渲染时间轴头部 ====================
  const renderTimelineHeader = () => {
    const ticks: JSX.Element[] = [];
    const { tickInterval, tickFormat } = zoomConfig;

    for (let day = 0; day <= timeRange.totalDays; day += tickInterval) {
      const date = new Date(timeRange.startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      const x = day * zoomConfig.dayWidth;

      ticks.push(
        <div
          key={day}
          className="absolute top-0 bottom-0 flex flex-col items-center justify-start pt-2 border-l border-border/30"
          style={{ left: `${x}px`, width: `${tickInterval * zoomConfig.dayWidth}px` }}
        >
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      );
    }

    return <div className="relative h-12 border-b border-border bg-muted/30">{ticks}</div>;
  };

  // ==================== 渲染网格线 ====================
  const renderGridLines = () => {
    const lines: JSX.Element[] = [];

    // 垂直线（每一天）
    for (let day = 0; day <= timeRange.totalDays; day++) {
      const dateStr = new Date(timeRange.startDate);
      dateStr.setDate(dateStr.getDate() + day);
      const date = dateStr.toISOString().split('T')[0];
      const x = day * zoomConfig.dayWidth;

      lines.push(
        <div
          key={`v-${day}`}
          className={cn(
            "absolute top-0 bottom-0 w-px",
            isWeekend(date) ? "bg-background/50" : "bg-border/10"
          )}
          style={{ left: `${x}px` }}
        />
      );
    }

    // 水平线（每一行）
    nodes.forEach((_, index) => {
      lines.push(
        <div
          key={`h-${index}`}
          className="absolute left-0 right-0 h-px bg-border/10"
          style={{ top: `${(index + 1) * rowHeight}px` }}
        />
      );
    });

    // 今天标记线
    const today = new Date().toISOString().split('T')[0];
    const todayX = dateToX(today, timeRange.startDate, zoomConfig.dayWidth);
    if (todayX >= 0 && todayX <= timelineWidth) {
      lines.push(
        <div
          key="today"
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
          style={{ left: `${todayX}px` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
            今天
          </div>
        </div>
      );
    }

    return lines;
  };

  // ==================== 渲染时间节点 ====================
  const renderNodes = () => {
    return nodes.map((node, index) => {
      const x = dateToX(node.startDate, timeRange.startDate, zoomConfig.dayWidth);
      const width = node.duration * zoomConfig.dayWidth;
      const top = index * rowHeight + 8;
      const height = rowHeight - 16;

      if (node.type === 'milestone') {
        // 渲染里程碑（菱形）
        return (
          <div
            key={node.id}
            className={cn(
              "absolute flex items-center gap-2 cursor-pointer group",
              !readonly && "hover:z-10"
            )}
            style={{ left: `${x}px`, top: `${top}px` }}
            onClick={(e) => handleNodeClick(node, e)}
            onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
          >
            <div
              className={cn(
                "w-4 h-4 bg-blue-500 rounded-sm rotate-45 transition-transform group-hover:scale-125",
                node.status === 'completed' && "bg-green-500",
                node.status === 'delayed' && "bg-red-500"
              )}
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-card border border-border rounded px-2 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="text-xs font-medium whitespace-nowrap">{node.name}</div>
              <div className="text-[10px] text-muted-foreground">{node.startDate}</div>
            </div>
          </div>
        );
      }

      // 渲染任务条
      return (
        <div
          key={node.id}
          className={cn(
            "absolute rounded-md shadow-sm flex items-center px-3 transition-colors",
            "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
            "hover:bg-blue-200 dark:hover:bg-blue-900/50",
            node.status === 'completed' && "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
            node.status === 'delayed' && "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800",
            !readonly && "cursor-move"
          )}
          style={{ left: `${x}px`, width: `${Math.max(width, 20)}px`, top: `${top}px`, height: `${height}px` }}
          onMouseDown={(e) => handleNodeMouseDown(node, e)}
          onClick={(e) => handleNodeClick(node, e)}
          onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
        >
          {/* 进度条 */}
          <div
            className={cn(
              "absolute top-0 bottom-0 left-0 rounded-l",
              "bg-blue-500/30 dark:bg-blue-600/30"
            )}
            style={{ width: `${node.status === 'completed' ? 100 : 50}%` }}
          />

          {/* 任务名称 */}
          <span className="relative z-10 text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
            {node.name}
          </span>

          {/* 负责人 */}
          {node.assignee && width > 100 && (
            <span className="relative z-10 ml-auto text-xs text-muted-foreground">
              [{node.assignee}]
            </span>
          )}

          {/* 调整大小的手柄（仅在非只读模式） */}
          {!readonly && width > 40 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30 rounded-l" />
              <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30 rounded-r" />
            </>
          )}
        </div>
      );
    });
  };

  // ==================== 渲染拖拽预览 ====================
  const renderDragPreview = () => {
    if (!isDragging || !preview) return null;

    return (
      <>
        {/* 预览任务条 */}
        <div
          className="absolute rounded-md bg-blue-500/20 border-2 border-blue-500 border-dashed pointer-events-none z-20"
          style={{
            left: `${preview.x}px`,
            width: `${preview.width}px`,
            top: 0,
            bottom: 0,
          }}
        />

        {/* 日期提示 */}
        <div
          className="fixed bg-card border border-border rounded-lg shadow-xl px-3 py-2 text-sm z-50 pointer-events-none"
          style={{
            left: `${Math.max(10, Math.min(window.innerWidth - 200, preview.x + preview.width / 2 - 100))}px`,
            top: '80px',
          }}
        >
          {tooltipText}
        </div>
      </>
    );
  };

  // ==================== 渲染缩放控制 ====================
  const renderZoomControls = () => (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-lg p-2 shadow-lg">
      <button
        onClick={() => zoomOut(10)}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
        title="缩小"
      >
        −
      </button>
      <span className="text-xs text-muted-foreground w-12 text-center">
        {zoomConfig.level}%
      </span>
      <button
        onClick={() => zoomIn(10)}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
        title="放大"
      >
        +
      </button>
      <div className="w-px h-6 bg-border" />
      <button
        onClick={scrollToToday}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-xs"
        title="跳转到今天"
      >
        今天
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-border', className)}
    >
      {/* 工具栏 */}
      {renderZoomControls()}

      {/* 时间轴头部 */}
      {renderTimelineHeader()}

      {/* 时间轴画布 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        style={{ scrollLeft }}
        onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
      >
        <div
          className="relative"
          style={{ width: `${timelineWidth}px`, height: `${nodes.length * rowHeight}px` }}
        >
          {/* 网格线 */}
          {renderGridLines()}

          {/* 时间节点 */}
          {renderNodes()}

          {/* 拖拽预览 */}
          {renderDragPreview()}
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <span>
          {timeRange.startDate} ~ {timeRange.endDate} (共 {timeRange.totalDays} 天)
        </span>
        <span>
          {nodes.length} 个节点
        </span>
      </div>
    </div>
  );
}
