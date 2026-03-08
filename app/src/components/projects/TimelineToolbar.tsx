/**
 * 时间轴工具栏组件
 *
 * 提供缩放控制、视图切换、编辑操作等工具
 * 位于编辑器底部
 *
 * @module components/projects/TimelineToolbar
 */

import React from 'react';
import type { TimelineZoomLevel } from '@/types/timeline';

interface TimelineToolbarProps {
  /** 当前缩放级别 */
  zoomLevel: TimelineZoomLevel;
  /** 缩放变化回调 */
  onZoomChange: (level: TimelineZoomLevel) => void;
  /** 放大回调 */
  onZoomIn?: () => void;
  /** 缩小回调 */
  onZoomOut?: () => void;
  /** 添加任务回调 */
  onAddTask?: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 导出回调 */
  onExport?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴工具栏
 */
export function TimelineToolbar({
  zoomLevel,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onAddTask,
  onAutoArrange,
  onRefresh,
  onExport,
  className = '',
}: TimelineToolbarProps) {
  const zoomLevels: Array<{ value: TimelineZoomLevel; label: string; icon: string }> = [
    { value: 'day', label: '日视图', icon: '📅' },
    { value: 'week', label: '周视图', icon: '📆' },
    { value: 'month', label: '月视图', icon: '🗓️' },
  ];

  return (
    <div className={`flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 ${className}`}>
      {/* 左侧：缩放控制 */}
      <div className="flex items-center gap-3">
        {/* 缩小按钮 */}
        <button
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          onClick={onZoomOut}
          title="缩小"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* 视图切换按钮组 */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {zoomLevels.map((level) => (
            <button
              key={level.value}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                zoomLevel === level.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => onZoomChange(level.value)}
              title={level.label}
            >
              <span className="mr-1">{level.icon}</span>
              {level.label}
            </button>
          ))}
        </div>

        {/* 放大按钮 */}
        <button
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          onClick={onZoomIn}
          title="放大"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 添加任务 */}
        {onAddTask && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            onClick={onAddTask}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>添加任务</span>
          </button>
        )}

        {/* 自动排列 */}
        {onAutoArrange && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            onClick={onAutoArrange}
            title="自动排列任务，避免重叠"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>自动排列</span>
          </button>
        )}

        {/* 刷新 */}
        {onRefresh && (
          <button
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            onClick={onRefresh}
            title="刷新"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* 导出 */}
        {onExport && (
          <button
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            onClick={onExport}
            title="导出"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
