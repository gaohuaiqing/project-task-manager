/**
 * 项目时间线可视化组件
 *
 * 类似 Microsoft Project 的甘特图时间线
 * 功能：
 * - 可视化显示项目时间跨度
 * - 在时间线上显示里程碑节点
 * - 支持拖拽调整里程碑日期
 * - 点击时间线添加里程碑
 * - 支持缩放（日/周/月视图）
 * - 与表单数据双向绑定
 *
 * @module components/projects/ProjectTimelineView
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ZoomIn, ZoomOut, GripVertical, Trash2, Edit3, MoreVertical, Copy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeNodeEditor } from './TimeNodeEditor';
import type { ProjectMilestone } from '@/types/project';

export interface ProjectTimelineViewProps {
  /** 计划开始日期 */
  plannedStartDate: string;
  /** 计划结束日期 */
  plannedEndDate: string;
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** 里程碑变更回调 */
  onMilestonesChange: (milestones: ProjectMilestone[]) => void;
  /** 项目日期范围变更回调（用于自动扩展项目起止时间） */
  onProjectDateRangeChange?: (startDate: string, endDate: string) => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 自定义类名 */
  className?: string;
}

type ViewScale = 'day' | 'week' | 'month';

/**
 * 计算日期范围天数
 */
function calculateDayRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 格式化日期显示
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

/**
 * 格式化完整日期
 */
function formatFullDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 添加天数
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 项目时间线可视化组件
 */
export function ProjectTimelineView({
  plannedStartDate,
  plannedEndDate,
  milestones,
  onMilestonesChange,
  onProjectDateRangeChange,
  readonly = false,
  className,
}: ProjectTimelineViewProps) {
  const [viewScale, setViewScale] = useState<ViewScale>('week');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [draggingMilestone, setDraggingMilestone] = useState<number | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    milestoneIndex: number;
  }>({ visible: false, x: 0, y: 0, milestoneIndex: -1 });

  // 双击编辑状态
  const [editingMilestone, setEditingMilestone] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    milestoneIndex: number;
  }>({ visible: false, position: { x: 0, y: 0 }, milestoneIndex: -1 });
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [isDragCreating, setIsDragCreating] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 计算时间轴参数
  const startDate = new Date(plannedStartDate);
  const endDate = new Date(plannedEndDate);
  const totalDays = calculateDayRange(plannedStartDate, plannedEndDate);

  // 根据缩放级别计算显示参数
  const getScaleConfig = useCallback((): {
    dayWidth: number;
    showAllDates: boolean;
    tickInterval: number;
  } => {
    switch (viewScale) {
      case 'day':
        return { dayWidth: 40, showAllDates: true, tickInterval: 1 };
      case 'week':
        return { dayWidth: 20, showAllDates: false, tickInterval: 7 };
      case 'month':
        return { dayWidth: 10, showAllDates: false, tickInterval: 30 };
    }
  }, [viewScale]);

  const { dayWidth, showAllDates, tickInterval } = getScaleConfig();

  // 处理时间线点击（添加里程碑）
  const handleTimelineClick = (dayIndex: number) => (e: React.MouseEvent) => {
    if (readonly || addingMilestone) return;

    const clickedDate = addDays(startDate, dayIndex);
    const newMilestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> = {
      name: '新里程碑',
      description: '',
      plannedDate: clickedDate.toISOString().split('T')[0],
      status: 'pending',
      sortOrder: milestones.length,
    };

    onMilestonesChange([...milestones, {
      ...newMilestone,
      id: `temp-${Date.now()}`,
      projectId: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);

    setAddingMilestone(false);

    // 检查是否需要自动扩展项目日期范围
    if (!onProjectDateRangeChange) return;

    const projectStartDate = new Date(plannedStartDate);
    const projectEndDate = new Date(plannedEndDate);

    let newStartDate = plannedStartDate;
    let newEndDate = plannedEndDate;
    let needsUpdate = false;

    if (clickedDate < projectStartDate) {
      newStartDate = clickedDate.toISOString().split('T')[0];
      needsUpdate = true;
    }

    if (clickedDate > projectEndDate) {
      newEndDate = clickedDate.toISOString().split('T')[0];
      needsUpdate = true;
    }

    if (needsUpdate) {
      onProjectDateRangeChange(newStartDate, newEndDate);
    }
  };

  // 处理里程碑拖拽开始
  const handleDragStart = (index: number, e: React.MouseEvent) => {
    if (readonly) return;
    e.stopPropagation();
    setDraggingMilestone(index);
  };

  // 处理里程碑拖拽
  const handleDrag = useCallback((dayIndex: number) => {
    if (draggingMilestone === null) return;

    const newMilestones = [...milestones];
    const newDate = addDays(startDate, dayIndex);
    newMilestones[draggingMilestone] = {
      ...newMilestones[draggingMilestone],
      plannedDate: newDate.toISOString().split('T')[0],
    };

    onMilestonesChange(newMilestones);
  }, [draggingMilestone, milestones, startDate, onMilestonesChange]);

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggingMilestone(null);
    setIsDragCreating(false);
    setDragStartX(null);
    setDragCurrentX(null);

    // 检查是否需要自动扩展项目日期范围
    if (!onProjectDateRangeChange) return;

    const projectStartDate = new Date(plannedStartDate);
    const projectEndDate = new Date(plannedEndDate);

    // 查找最早的和最晚的里程碑日期
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    milestones.forEach(milestone => {
      const milestoneDate = new Date(milestone.plannedDate);
      if (!earliestDate || milestoneDate < earliestDate) {
        earliestDate = milestoneDate;
      }
      if (!latestDate || milestoneDate > latestDate) {
        latestDate = milestoneDate;
      }
    });

    // 检查是否需要扩展项目日期范围
    let newStartDate = plannedStartDate;
    let newEndDate = plannedEndDate;
    let needsUpdate = false;

    if (earliestDate && earliestDate < projectStartDate) {
      newStartDate = earliestDate.toISOString().split('T')[0];
      needsUpdate = true;
    }

    if (latestDate && latestDate > projectEndDate) {
      newEndDate = latestDate.toISOString().split('T')[0];
      needsUpdate = true;
    }

    // 如果需要扩展项目日期范围，则触发回调
    if (needsUpdate) {
      onProjectDateRangeChange(newStartDate, newEndDate);
    }
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      milestoneIndex: index,
    });
  };

  // 删除里程碑
  const handleDeleteMilestone = (index: number) => () => {
    const newMilestones = milestones.filter((_, i) => i !== index);
    onMilestonesChange(newMilestones);
    closeContextMenu();
  };

  // 更新里程碑状态
  const handleUpdateMilestoneStatus = (index: number, newStatus: ProjectMilestone['status']) => {
    const newMilestones = [...milestones];
    newMilestones[index] = {
      ...newMilestones[index],
      status: newStatus,
    };
    onMilestonesChange(newMilestones);
    closeContextMenu();
  };

  // 复制里程碑
  const handleCopyMilestone = (index: number) => {
    const milestone = milestones[index];
    const originalDate = new Date(milestone.plannedDate);
    // 复制的里程碑延后7天
    const newDate = addDays(originalDate, 7);

    const newMilestone: ProjectMilestone = {
      ...milestone,
      id: `temp-${Date.now()}`,
      name: `${milestone.name} (副本)`,
      plannedDate: newDate.toISOString().split('T')[0],
      sortOrder: milestones.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onMilestonesChange([...milestones, newMilestone]);
    closeContextMenu();
  };

  // 快速调整日期
  const handleQuickDateAdjust = (index: number, daysOffset: number) => {
    const milestone = milestones[index];
    const originalDate = new Date(milestone.plannedDate);
    const newDate = addDays(originalDate, daysOffset);

    const newMilestones = [...milestones];
    newMilestones[index] = {
      ...newMilestones[index],
      plannedDate: newDate.toISOString().split('T')[0],
    };
    onMilestonesChange(newMilestones);
    closeContextMenu();
  };

  // 双击里程碑打开编辑器
  const handleDoubleClick = (index: number, e: React.MouseEvent) => {
    if (readonly) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditingMilestone({
      visible: true,
      position: {
        x: Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 340),
        y: Math.min(rect.bottom + 8, window.innerHeight - 400),
      },
      milestoneIndex: index,
    });
  };

  // 处理编辑器保存
  const handleEditorSave = (updatedMilestone: Partial<ProjectMilestone>) => {
    const newMilestones = [...milestones];
    newMilestones[editingMilestone.milestoneIndex] = {
      ...newMilestones[editingMilestone.milestoneIndex],
      ...updatedMilestone,
      updatedAt: new Date().toISOString(),
    } as ProjectMilestone;
    onMilestonesChange(newMilestones);
    setEditingMilestone({ ...editingMilestone, visible: false });
  };

  // 处理编辑器删除
  const handleEditorDelete = () => {
    handleDeleteMilestone(editingMilestone.milestoneIndex)();
    setEditingMilestone({ ...editingMilestone, visible: false });
  };

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 渲染时间轴刻度
  const renderTicks = () => {
    const ticks: JSX.Element[] = [];

    for (let day = 0; day <= totalDays; day += tickInterval) {
      const currentDate = addDays(startDate, day);
      const isHovered = hoveredDay === day;

      ticks.push(
        <div
          key={day}
          className="relative flex-shrink-0"
          style={{ width: dayWidth * tickInterval }}
          onMouseEnter={() => setHoveredDay(day)}
          onMouseLeave={() => setHoveredDay(null)}
          onClick={!readonly ? handleTimelineClick(day) : undefined}
        >
          {/* 刻度线 */}
          <div className={cn(
            "absolute top-0 bottom-0 w-px bg-border",
            isHovered && "bg-primary/50"
          )} />

          {/* 日期标签 */}
          <div className={cn(
            "absolute top-0 left-0 text-xs text-muted-foreground -mt-1",
            isHovered && "text-primary font-medium"
          )}>
            {showAllDates ? formatDate(currentDate) : `${currentDate.getMonth() + 1}/${currentDate.getDate()}`}
          </div>

          {/* 添加里程碑提示 */}
          {isHovered && !readonly && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Plus className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>
      );
    }

    return ticks;
  };

  // 渲染里程碑
  const renderMilestones = () => {
    return milestones
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime())
      .map((milestone, sortedIndex) => {
        const milestoneDate = new Date(milestone.plannedDate);
        const dayDiff = Math.round((milestoneDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const leftPosition = dayDiff * dayWidth;
        const isDragging = draggingMilestone === milestones.indexOf(milestone);

        // 获取状态颜色
        const getStatusColor = () => {
          switch (milestone.status) {
            case 'pending': return 'bg-gray-500';
            case 'in_progress': return 'bg-blue-500';
            case 'completed': return 'bg-green-500';
            case 'delayed': return 'bg-red-500';
            default: return 'bg-gray-500';
          }
        };

        return (
          <div
            key={milestone.id}
            className={cn(
              "absolute top-4 group",
              isDragging ? "z-20" : "z-10"
            )}
            style={{ left: `${leftPosition}px` }}
            onMouseDown={(e) => handleDragStart(milestones.indexOf(milestone), e)}
            onContextMenu={(e) => handleContextMenu(e, milestones.indexOf(milestone))}
            onDoubleClick={(e) => handleDoubleClick(milestones.indexOf(milestone), e)}
          >
            {/* 连接线 */}
            <div className="absolute top-0 left-1/2 w-px h-4 bg-border" style={{ transform: 'translateX(-50%)' }} />

            {/* 里程碑节点 */}
            <div
              className={cn(
                "relative w-4 h-4 rounded-full cursor-pointer transition-transform group-hover:scale-125",
                getStatusColor(),
                isDragging && "scale-150 shadow-lg"
              )}
              style={{ transform: 'translateX(-50%)' }}
            />

            {/* 里程碑信息卡片 */}
            <div className={cn(
              "absolute top-6 left-1/2 min-w-[120px] bg-card border border-border rounded-lg p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
              isDragging && "opacity-100"
            )} style={{ transform: 'translateX(-50%)' }}>
              <div className="text-xs font-medium text-white truncate">
                {milestone.name}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatFullDate(milestoneDate)}
              </div>
            </div>
          </div>
        );
      });
  };

  // 渲染图例
  const renderLegend = () => (
    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-gray-500" />
        <span>待开始</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span>进行中</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span>已完成</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span>已延期</span>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">项目时间线</h3>
        </div>

        {/* 缩放控制 */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewScale('day')}
            className={cn(
              "h-7 px-2 text-xs",
              viewScale === 'day' && "bg-primary text-primary-foreground"
            )}
          >
            日
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewScale('week')}
            className={cn(
              "h-7 px-2 text-xs",
              viewScale === 'week' && "bg-primary text-primary-foreground"
            )}
          >
            周
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewScale('month')}
            className={cn(
              "h-7 px-2 text-xs",
              viewScale === 'month' && "bg-primary text-primary-foreground"
            )}
          >
            月
          </Button>
        </div>
      </div>

      {/* 图例 */}
      {renderLegend()}

      {/* 时间轴容器 */}
      <div
        ref={timelineRef}
        className={cn(
          "relative h-32 border border-border rounded-lg overflow-x-auto overflow-y-hidden select-none",
          !readonly && "cursor-crosshair"
        )}
        style={{ minWidth: '100%' }}
        onMouseLeave={handleDragEnd}
        onMouseMove={(e) => {
          if (draggingMilestone !== null && timelineRef.current) {
            const rect = timelineRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left + timelineRef.current.scrollLeft;
            const dayIndex = Math.floor(offsetX / dayWidth);
            handleDrag(dayIndex);
          }
        }}
        onMouseUp={handleDragEnd}
      >
        {/* 时间轴背景 */}
        <div className="absolute inset-0 flex">
          {renderTicks()}
        </div>

        {/* 里程碑层 */}
        <div className="absolute inset-0">
          {renderMilestones()}
        </div>
      </div>

      {/* 提示信息 */}
      {!readonly && (
        <p className="text-xs text-muted-foreground text-center">
          💡 点击时间线添加里程碑，拖拽调整日期，双击编辑，右键打开更多操作
        </p>
      )}

      {/* 时间范围信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatFullDate(startDate)}</span>
        <span>共 {totalDays} 天</span>
        <span>{formatFullDate(endDate)}</span>
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
            里程碑操作
          </div>

          {/* 编辑 */}
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              closeContextMenu();
              const milestoneIndex = contextMenu.milestoneIndex;
              const menuElement = document.elementFromPoint(contextMenu.x, contextMenu.y);
              if (menuElement) {
                const rect = menuElement.getBoundingClientRect();
                setEditingMilestone({
                  visible: true,
                  position: {
                    x: Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 340),
                    y: Math.min(rect.bottom + 8, window.innerHeight - 400),
                  },
                  milestoneIndex,
                });
              }
            }}
          >
            <Edit3 className="w-3 h-3" />
            编辑里程碑
          </button>

          {/* 复制 */}
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => handleCopyMilestone(contextMenu.milestoneIndex)}
          >
            <Copy className="w-3 h-3" />
            复制里程碑
          </button>

          {/* 快速调整日期子菜单 */}
          <div className="relative group/menu">
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-foreground" />
                调整日期
              </span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <div className="absolute left-full top-0 ml-1 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px] opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, 1)}
              >
                +1 天
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, 7)}
              >
                +1 周
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, 30)}
              >
                +1 月
              </button>
              <div className="border-t border-border my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, -1)}
              >
                -1 天
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, -7)}
              >
                -1 周
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleQuickDateAdjust(contextMenu.milestoneIndex, -30)}
              >
                -1 月
              </button>
            </div>
          </div>

          {/* 切换状态 */}
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => {
              const milestone = milestones[contextMenu.milestoneIndex];
              const statuses: ProjectMilestone['status'][] = ['pending', 'in_progress', 'completed', 'delayed'];
              const currentIndex = statuses.indexOf(milestone.status);
              const nextStatus = statuses[(currentIndex + 1) % statuses.length];
              handleUpdateMilestoneStatus(contextMenu.milestoneIndex, nextStatus);
            }}
          >
            <Plus className="w-3 h-3" />
            切换状态
          </button>

          <div className="border-t border-border my-1" />

          {/* 删除 */}
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2"
            onClick={handleDeleteMilestone(contextMenu.milestoneIndex)}
          >
            <Trash2 className="w-3 h-3" />
            删除里程碑
          </button>
        </div>
      )}

      {/* 双击编辑器 */}
      {editingMilestone.visible && (
        <TimeNodeEditor
          nodeType="milestone"
          node={milestones[editingMilestone.milestoneIndex]}
          onChange={handleEditorSave}
          onDelete={handleEditorDelete}
          readonly={readonly}
          position={editingMilestone.position}
          open={editingMilestone.visible}
          onOpenChange={(visible) => setEditingMilestone({ ...editingMilestone, visible })}
        />
      )}
    </div>
  );
}

export default ProjectTimelineView;
