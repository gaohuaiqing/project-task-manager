/**
 * 时间轴刻度组件
 *
 * 显示时间刻度、日期标记
 * 支持日/周/月不同刻度间隔
 *
 * @module components/projects/TimelineRuler
 */

import React, { useMemo } from 'react';
import type { ZoomConfig } from '@/types/timeline';
import type { TimeRange } from '@/utils/ganttGeometry';
import { formatDateDisplay, isWeekend, isToday } from '@/utils/ganttGeometry';
import { format, parseISO, addDays } from 'date-fns';

interface TimelineRulerProps {
  /** 时间范围 */
  timeRange: TimeRange;
  /** 缩放配置 */
  zoomConfig: ZoomConfig;
  /** 刻度高度 */
  height?: number;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 时间轴刻度
 */
export function TimelineRuler({
  timeRange,
  zoomConfig,
  height = 40,
  className = '',
}: TimelineRulerProps) {
  // 生成刻度标记
  const ticks = useMemo(() => {
    const ticks: React.ReactNode[] = [];
    const { dayWidth } = zoomConfig;

    // 根据缩放级别确定刻度间隔
    const interval = dayWidth >= 50 ? 1 : dayWidth >= 20 ? 7 : dayWidth >= 10 ? 14 : 30;

    for (let i = 0; i <= timeRange.totalDays; i += interval) {
      const date = parseISO(timeRange.startDate);
      const targetDate = addDays(date, i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const x = i * dayWidth;

      const weekend = isWeekend(dateStr);
      const today = isToday(dateStr);

      // 格式化日期标签
      let label = '';
      if (dayWidth >= 50) {
        // 日视图：显示月日
        label = format(targetDate, 'M/d');
      } else if (dayWidth >= 20) {
        // 周视图：显示月日和周数
        label = format(targetDate, 'M/d');
      } else if (dayWidth >= 10) {
        // 双周视图：显示月日
        label = format(targetDate, 'M/d');
      } else {
        // 月视图：显示年月
        label = format(targetDate, 'yyyy/M');
      }

      ticks.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 flex items-center justify-center"
          style={{ left: `${x}px`, width: `${interval * dayWidth}px` }}
        >
          {/* 刻度线 */}
          <div className="absolute top-0 bottom-0 w-px bg-gray-300" />

          {/* 日期标签 */}
          <span className={`text-xs font-medium z-10 ${
            weekend ? 'text-gray-400' : 'text-gray-600'
          } ${today ? 'text-blue-600 font-bold' : ''}`}>
            {label}
          </span>

          {/* 今天高亮 */}
          {today && (
            <div className="absolute top-0 bottom-0 w-full bg-blue-100/50 -z-10" />
          )}
        </div>
      );
    }

    return ticks;
  }, [timeRange, zoomConfig]);

  // 生成周末高亮背景
  const weekendHighlights = useMemo(() => {
    const highlights: React.ReactNode[] = [];
    const { dayWidth } = zoomConfig;

    for (let i = 0; i < timeRange.totalDays; i++) {
      const date = parseISO(timeRange.startDate);
      const targetDate = addDays(date, i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      if (isWeekend(dateStr)) {
        highlights.push(
          <div
            key={i}
            className="absolute top-0 bottom-0 bg-gray-100/50 -z-10"
            style={{
              left: `${i * dayWidth}px`,
              width: `${dayWidth}px`,
            }}
          />
        );
      }
    }

    return highlights;
  }, [timeRange, zoomConfig]);

  return (
    <div
      className={`relative bg-gray-50 border-b border-gray-200 overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* 周末高亮 */}
      {weekendHighlights}

      {/* 刻度标记 */}
      {ticks}

      {/* 当前日期指示线 */}
      {timeRange.totalDays > 0 && (() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayIndex = Math.floor(
          (parseISO(today).getTime() - parseISO(timeRange.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (todayIndex >= 0 && todayIndex <= timeRange.totalDays) {
          return (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-20"
              style={{ left: `${todayIndex * zoomConfig.dayWidth}px` }}
            >
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
