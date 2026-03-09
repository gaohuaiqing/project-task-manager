/**
 * 时间轴任务条组件
 *
 * 显示单个任务的时间条，支持拖拽调整
 * 状态指示、进度显示、拖拽手柄、右键菜单
 *
 * @module components/projects/TimelineTaskBar
 */

import React, { useMemo, useState } from 'react';
import type { TimelineTask } from '@/types/timeline';
import { getTaskStatusColor } from '@/utils/timelineHelpers';
import { TaskContextMenu, type ContextMenuPosition } from './TimelineContextMenu';

interface TimelineTaskBarProps {
  /** 任务数据 */
  task: TimelineTask;
  /** 任务条X坐标 */
  x: number;
  /** 任务条宽度 */
  width: number;
  /** 任务条高度 */
  height?: number;
  /** 是否被悬停 */
  isHovered?: boolean;
  /** 是否被选中 */
  isSelected?: boolean;
  /** 是否正在拖拽 */
  isDragging?: boolean;
  /** 是否显示编辑器 */
  isEditing?: boolean;
  /** 鼠标按下回调 */
  onMouseDown?: (e: React.MouseEvent, task: TimelineTask) => void;
  /** 鼠标进入回调 */
  onMouseEnter?: () => void;
  /** 鼠标离开回调 */
  onMouseLeave?: () => void;
  /** 双击回调 */
  onDoubleClick?: () => void;
  /** 编辑任务回调 */
  onEdit?: (task: TimelineTask) => void;
  /** 复制任务回调 */
  onCopy?: (task: TimelineTask) => void;
  /** 切换状态回调 */
  onToggleStatus?: (task: TimelineTask) => void;
  /** 删除任务回调 */
  onDelete?: (task: TimelineTask) => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴任务条
 */
export function TimelineTaskBar({
  task,
  x,
  width,
  height = 28,
  isHovered = false,
  isSelected = false,
  isDragging = false,
  isEditing = false,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  onEdit,
  onCopy,
  onToggleStatus,
  onDelete,
  className = '',
}: TimelineTaskBarProps) {
  const statusColor = useMemo(() => getTaskStatusColor(task.status), [task.status]);
  const isMilestone = task.startDate === task.endDate;
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = () => {
    onEdit?.(task);
  };

  const handleCopy = () => {
    onCopy?.(task);
  };

  const handleToggleStatus = () => {
    onToggleStatus?.(task);
  };

  const handleDelete = () => {
    onDelete?.(task);
  };

  return (
    <>
      <div
        className={`absolute rounded-md shadow-sm transition-all duration-150 ${className} ${
          isDragging ? 'opacity-70 cursor-grabbing' : 'cursor-grab'
        } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${
          isHovered && !isDragging ? 'shadow-md' : ''
        }`}
        style={{
          left: `${x}px`,
          width: `${Math.max(width, isMilestone ? 12 : 40)}px`,
          height: `${height}px`,
          backgroundColor: statusColor,
          opacity: task.status === 'cancelled' ? 0.6 : 1,
        }}
        onMouseDown={(e) => onMouseDown?.(e, task)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
        title={getTaskTooltip(task)}
      >
      {/* 任务内容 */}
      <div className="flex items-center h-full px-2 overflow-hidden">
        {/* 里程碑标识 */}
        {isMilestone && (
          <div className="w-2 h-2 rounded-full bg-white mr-1.5 flex-shrink-0" />
        )}

        {/* 任务内容：持续时间 | 日期范围 */}
        <span className="text-xs font-medium text-white truncate flex-1">
          {formatTaskDisplay(task)}
        </span>

        {/* 进度指示器（非里程碑任务） */}
        {!isMilestone && (task.progress ?? 0) > 0 && (
          <div className="ml-2 text-xs text-white/80 flex-shrink-0">
            {task.progress}%
          </div>
        )}
      </div>

      {/* 进度条覆盖层（非里程碑任务） */}
      {!isMilestone && (task.progress ?? 0) > 0 && (
        <div
          className="absolute top-0 left-0 h-full bg-black/20 rounded-l-md pointer-events-none"
          style={{ width: `${100 - (task.progress ?? 0)}%` }}
        />
      )}

      {/* 拖拽手柄（悬停时显示） */}
      {isHovered && !isDragging && width > 40 && (
        <>
          {/* 左手柄 */}
          <div className="absolute top-1/2 left-1.5 -translate-y-1/2 w-3 h-3 bg-white/80 rounded-full border-2 border-white cursor-ew-resize shadow-sm" />
          {/* 右手柄 */}
          <div className="absolute top-1/2 right-1.5 -translate-y-1/2 w-3 h-3 bg-white/80 rounded-full border-2 border-white cursor-ew-resize shadow-sm" />
        </>
      )}

      {/* 负责人头像（如果有） */}
      {task.assigneeName && isHovered && (
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap z-10">
          {task.assigneeName}
        </div>
      )}

      {/* 优先级指示器 */}
      {task.priority && task.priority !== 'medium' && (
        <div
          className={`absolute top-0 right-0 w-2 h-2 rounded-br-md ${
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'low' ? 'bg-green-500' : ''
          }`}
        />
      )}
    </div>

    {/* 右键菜单 */}
    {contextMenu && (
      <TaskContextMenu
        task={task}
        position={contextMenu}
        onClose={handleCloseContextMenu}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    )}
  </>
  );
}

/**
 * 格式化任务显示文本 (持续时间 | 日期范围)
 */
function formatTaskDisplay(task: TimelineTask): string {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const duration = Math.ceil(
    (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  if (task.startDate === task.endDate) {
    return `1天 | ${formatDate(task.startDate)}`;
  }

  return `${duration}天 | ${formatDate(task.startDate)}-${formatDate(task.endDate)}`;
}

/**
 * 获取任务提示文本
 */
function getTaskTooltip(task: TimelineTask): string {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const duration = Math.ceil(
    (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  let tooltip = `${task.title}\n`;

  if (task.startDate === task.endDate) {
    tooltip += `📅 ${formatDate(task.startDate)}`;
  } else {
    tooltip += `📅 ${formatDate(task.startDate)} - ${formatDate(task.endDate)} (${duration}天)`;
  }

  if (task.assigneeName) {
    tooltip += `\n👤 ${task.assigneeName}`;
  }

  if (task.progress) {
    tooltip += `\n📊 进度: ${task.progress}%`;
  }

  return tooltip;
}
