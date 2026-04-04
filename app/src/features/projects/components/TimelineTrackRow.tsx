/**
 * 时间轴轨道行组件
 *
 * @module features/projects/components/TimelineTrackRow
 * @description 单条时间轴轨道，用色块显示时间范围，文字显示进度，颜色表示状态
 *
 * REQ_03 4.3.3节：每条时间轴占一行
 * REQ_03 4.4节：状态颜色 - 未开始灰色、进行中蓝色、已完成绿色、已延期红色
 * REQ_03 4.11.7节：月视图下仅显示缩略名称或隐藏文字
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Timeline, TimelineZoomLevel } from '@/types/timeline';
import { TRACK_SPECS, getDatePosition } from '@/utils/ganttGeometry';

// ============ 状态配置 ============

const STATUS_CONFIG = {
  not_started: { bg: 'bg-gray-300 dark:bg-gray-600', bar: 'bg-gray-400 dark:bg-gray-500', text: 'text-gray-700 dark:text-gray-300', label: '未开始', icon: null },
  in_progress: { bg: 'bg-blue-200 dark:bg-blue-800', bar: 'bg-blue-500 dark:bg-blue-600', text: 'text-blue-700 dark:text-blue-300', label: '进行中', icon: null },
  completed: { bg: 'bg-green-200 dark:bg-green-800', bar: 'bg-green-500 dark:bg-green-600', text: 'text-green-700 dark:text-green-300', label: '已完成', icon: '✓' },
  delayed: { bg: 'bg-red-200 dark:bg-red-800', bar: 'bg-red-500 dark:bg-red-600', text: 'text-red-700 dark:text-red-300', label: '已延期', icon: '⚠️' },
} as const;

// ============ Props 定义 ============

export interface TimelineTrackRowProps {
  /** 时间轴数据 */
  timeline: Timeline;
  /** 时间线开始日期（计算位置基准） */
  minDate: string;
  /** 每天像素宽度 */
  dayWidth: number;
  /** 缩放级别 */
  zoomLevel?: TimelineZoomLevel;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

// ============ 组件实现 ============

export function TimelineTrackRow({
  timeline,
  minDate,
  dayWidth,
  zoomLevel = 'week',
  isSelected = false,
  readOnly = false,
  onClick,
}: TimelineTrackRowProps) {
  const { name, startDate, endDate, progress = 0, status = 'not_started' } = timeline;

  // 状态配置
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  // 计算时间轴色块位置和宽度
  const barGeometry = useMemo(() => {
    const startX = getDatePosition(startDate, minDate, dayWidth);
    const endX = getDatePosition(endDate, minDate, dayWidth);
    return {
      left: startX,
      width: Math.max(endX - startX + dayWidth, dayWidth), // 至少一天宽度
    };
  }, [startDate, endDate, minDate, dayWidth]);

  // 根据缩放级别决定文字显示策略 (REQ_03 4.11.7节)
  const isMonthView = zoomLevel === 'month';
  const showFullText = !isMonthView && barGeometry.width >= 60;
  const showProgress = !isMonthView && barGeometry.width >= 80;
  const displayName = isMonthView
    ? name.length > 4 ? name.slice(0, 4) + '…' : name
    : name;

  return (
    <div
      className={cn(
        'relative border-b border-border transition-colors',
        isSelected ? 'bg-blue-50/60 dark:bg-blue-900/30' : 'hover:bg-muted/50',
        !readOnly && 'cursor-pointer'
      )}
      style={{ height: TRACK_SPECS.height }}
      onClick={onClick}
      title={isMonthView ? `${name} (${progress}%)` : undefined}
    >
      {/* 时间轴色块 */}
      <div
        className={cn(
          'absolute rounded-sm flex items-center px-2 gap-1.5 transition-all duration-200 ease-out',
          config.bar,
          isSelected && 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1'
        )}
        style={{
          left: barGeometry.left,
          width: barGeometry.width,
          top: (TRACK_SPECS.height - TRACK_SPECS.taskBarHeight) / 2,
          height: TRACK_SPECS.taskBarHeight,
        }}
      >
        {/* 进度指示（左侧深色部分表示已完成） */}
        {progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l-sm bg-black/20"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* 名称 + 进度 + 状态 */}
        {showFullText && (
          <>
            <span className="relative text-xs font-medium text-white truncate">
              {displayName}
            </span>
            {showProgress && (
              <span className="relative text-xs text-white/80 whitespace-nowrap">
                {progress}%
              </span>
            )}
            {config.icon && (
              <span className="relative text-xs">{config.icon}</span>
            )}
          </>
        )}

        {/* 月视图下仅显示缩略名称 */}
        {isMonthView && barGeometry.width >= 30 && (
          <span className="relative text-[10px] font-medium text-white truncate">
            {displayName}
          </span>
        )}
      </div>
    </div>
  );
}
