/**
 * 时间轴右键菜单组件
 *
 * 提供任务和时间轴的右键菜单功能
 *
 * @module components/projects/TimelineContextMenu
 */

import React, { useEffect, useRef, useState } from 'react';
import type { TimelineTask } from '@/types/timeline';
import type { Timeline } from '@/types/timeline';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface TaskContextMenuProps {
  /** 任务数据 */
  task: TimelineTask;
  /** 菜单位置 */
  position: ContextMenuPosition;
  /** 关闭菜单回调 */
  onClose: () => void;
  /** 编辑任务回调 */
  onEdit: (task: TimelineTask) => void;
  /** 复制任务回调 */
  onCopy: (task: TimelineTask) => void;
  /** 切换状态回调 */
  onToggleStatus: (task: TimelineTask) => void;
  /** 删除任务回调 */
  onDelete: (task: TimelineTask) => void;
}

export interface TimelineContextMenuProps {
  /** 时间轴数据 */
  timeline: Timeline;
  /** 菜单位置 */
  position: ContextMenuPosition;
  /** 关闭菜单回调 */
  onClose: () => void;
  /** 重命名时间轴回调 */
  onRename: (timeline: Timeline) => void;
  /** 删除时间轴回调 */
  onDelete: (timeline: Timeline) => void;
}

/**
 * 任务右键菜单
 */
export function TaskContextMenu({
  task,
  position,
  onClose,
  onEdit,
  onCopy,
  onToggleStatus,
  onDelete,
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    // 调整菜单位置以防止超出屏幕
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      let { x, y } = position;

      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
      }
      if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
      }

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  useEffect(() => {
    // 点击外部关闭菜单
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // ESC键关闭菜单
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const getNextStatus = (currentStatus: string): string => {
    const statusFlow: Record<string, string> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
      cancelled: 'pending',
    };
    return statusFlow[currentStatus] || 'pending';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* 编辑 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => handleAction(() => onEdit(task))}
      >
        <span>✏️</span>
        <span>编辑</span>
      </button>

      {/* 复制 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => handleAction(() => onCopy(task))}
      >
        <span>📋</span>
        <span>复制</span>
      </button>

      {/* 分隔线 */}
      <div className="my-1 border-t border-gray-200" />

      {/* 切换状态 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => handleAction(() => onToggleStatus(task))}
      >
        <span>🔄</span>
        <span>切换状态 ({getStatusLabel(task.status)} → {getStatusLabel(getNextStatus(task.status))})</span>
      </button>

      {/* 分隔线 */}
      <div className="my-1 border-t border-gray-200" />

      {/* 删除 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        onClick={() => handleAction(() => onDelete(task))}
      >
        <span>🗑️</span>
        <span>删除</span>
      </button>
    </div>
  );
}

/**
 * 时间轴右键菜单
 */
export function TimelineContextMenu({
  timeline,
  position,
  onClose,
  onRename,
  onDelete,
}: TimelineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    // 调整菜单位置以防止超出屏幕
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      let { x, y } = position;

      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
      }
      if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
      }

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  useEffect(() => {
    // 点击外部关闭菜单
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // ESC键关闭菜单
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* 重命名 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        onClick={() => handleAction(() => onRename(timeline))}
      >
        <span>✏️</span>
        <span>重命名</span>
      </button>

      {/* 分隔线 */}
      <div className="my-1 border-t border-gray-200" />

      {/* 删除 */}
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        onClick={() => handleAction(() => onDelete(timeline))}
      >
        <span>🗑️</span>
        <span>删除</span>
      </button>
    </div>
  );
}
