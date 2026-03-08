/**
 * 时间轴统计信息栏组件
 *
 * 显示时间轴数量、任务数量、整体进度等统计信息
 * 紧凑简洁的设计风格
 *
 * @module components/projects/TimelineStatsBar
 */

import React from 'react';
import type { TimelineStats } from '@/types/timeline';

interface TimelineStatsBarProps {
  /** 统计信息 */
  stats: TimelineStats;
  /** 是否显示详情 */
  showDetails?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴统计信息栏
 */
export function TimelineStatsBar({
  stats,
  showDetails = false,
  className = '',
}: TimelineStatsBarProps) {
  return (
    <div className={`flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 ${className}`}>
      {/* 时间轴数量 */}
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <span className="text-sm text-gray-600">{stats.timelineCount} 条时间轴</span>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-gray-300" />

      {/* 任务统计 */}
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-sm text-gray-600">
          {stats.totalTasks} 个任务
          {showDetails && (
            <>
              <span className="text-green-600 ml-1">({stats.completedTasks} 完成</span>
              <span className="text-blue-600">, {stats.inProgressTasks} 进行中</span>
              {stats.delayedTasks > 0 && (
                <span className="text-red-600">, {stats.delayedTasks} 延期</span>
              )}
              <span>)</span>
            </>
          )}
        </span>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-gray-300" />

      {/* 整体进度 */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-sm text-gray-600">{stats.overallProgress}%</span>
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${stats.overallProgress}%` }}
          />
        </div>
      </div>

      {/* 时间范围（可选显示） */}
      {showDetails && stats.earliestDate && stats.latestDate && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(stats.earliestDate)}</span>
            <span className="text-gray-400">→</span>
            <span>{formatDate(stats.latestDate)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 格式化日期显示（简化版）
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
