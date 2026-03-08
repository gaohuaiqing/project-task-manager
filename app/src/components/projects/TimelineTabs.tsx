/**
 * 时间轴标签页组件
 *
 * 显示所有时间轴的标签，支持切换和添加
 * 紧凑的水平排列
 *
 * @module components/projects/TimelineTabs
 */

import React, { useState } from 'react';
import type { Timeline } from '@/types/timeline';

interface TimelineTabsProps {
  /** 时间轴列表 */
  timelines: Timeline[];
  /** 当前选中的时间轴ID */
  activeTimelineId?: string;
  /** 选中时间轴回调 */
  onSelectTimeline?: (timelineId: string) => void;
  /** 添加时间轴回调 */
  onAddTimeline?: () => void;
  /** 编辑时间轴回调 */
  onEditTimeline?: (timelineId: string) => void;
  /** 删除时间轴回调 */
  onDeleteTimeline?: (timelineId: string) => void;
  /** 切换时间轴可见性 */
  onToggleVisibility?: (timelineId: string) => void;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴标签页
 */
export function TimelineTabs({
  timelines,
  activeTimelineId,
  onSelectTimeline,
  onAddTimeline,
  onEditTimeline,
  onDeleteTimeline,
  onToggleVisibility,
  className = '',
}: TimelineTabsProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className={`flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200 overflow-x-auto ${className}`}>
      {/* 时间轴标签列表 */}
      {timelines.map((timeline) => {
        const isActive = timeline.config.id === activeTimelineId;
        const isHovered = timeline.config.id === hoveredTab;

        return (
          <div
            key={timeline.config.id}
            className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md cursor-pointer transition-all duration-150 ${
              isActive
                ? 'bg-white text-blue-600 border-t-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            } ${!timeline.config.visible ? 'opacity-50' : ''}`}
            onMouseEnter={() => setHoveredTab(timeline.config.id)}
            onMouseLeave={() => setHoveredTab(null)}
            onClick={() => onSelectTimeline?.(timeline.config.id)}
          >
            {/* 时间轴图标 */}
            {timeline.config.icon && (
              <span className="text-sm">{timeline.config.icon}</span>
            )}

            {/* 时间轴名称 */}
            <span className="text-sm font-medium whitespace-nowrap">
              {timeline.config.name}
            </span>

            {/* 任务数量徽章 */}
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
            }`}>
              {timeline.tasks?.length || 0}
            </span>

            {/* 颜色指示器 */}
            {timeline.config.color && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: timeline.config.color }}
              />
            )}

            {/* 操作按钮（悬停时显示） */}
            {isHovered && (
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-white rounded shadow-lg border border-gray-200 p-0.5 z-10">
                {/* 可见性切换 */}
                <button
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility?.(timeline.config.id);
                  }}
                  title={timeline.config.visible ? '隐藏' : '显示'}
                >
                  {timeline.config.visible ? (
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>

                {/* 编辑 */}
                {onEditTimeline && (
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTimeline(timeline.config.id);
                    }}
                    title="编辑"
                  >
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}

                {/* 删除 */}
                {onDeleteTimeline && timelines.length > 1 && (
                  <button
                    className="p-1 hover:bg-red-100 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要删除时间轴"${timeline.config.name}"吗？`)) {
                        onDeleteTimeline(timeline.config.id);
                      }
                    }}
                    title="删除"
                  >
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 添加时间轴按钮 */}
      {onAddTimeline && (
        <button
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          onClick={onAddTimeline}
          title="添加时间轴"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>添加</span>
        </button>
      )}
    </div>
  );
}
