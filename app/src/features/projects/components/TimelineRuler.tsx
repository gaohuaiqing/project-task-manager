/**
 * 时间刻度尺组件
 *
 * @module features/projects/components/TimelineRuler
 * @description 显示时间刻度和今天指示线
 */

import { useMemo } from 'react';
import type { Holiday } from '@/types/timeline';
import { RULER_SPECS, isWeekend, isHoliday } from '@/utils/ganttGeometry';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineRulerProps {
  /** 刻度数据 */
  ticks: Array<{
    date: string;
    position: number;
    label: string;
    isWeekend: boolean;
  }>;
  /** 今天位置 */
  todayPosition: number | null;
  /** 节假日列表 */
  holidays: Holiday[];
  /** 每天像素宽度 */
  dayWidth: number;
}

// ============ 组件实现 ============

export function TimelineRuler({
  ticks,
  todayPosition,
  holidays,
  dayWidth,
}: TimelineRulerProps) {
  // 判断是否有节假日数据
  const hasHolidays = holidays.length > 0;

  // 计算周末列
  const weekendColumns = useMemo(() => {
    const columns: Array<{ start: number; width: number }> = [];
    let currentWeekend: { start: number; count: number } | null = null;

    ticks.forEach((tick) => {
      const isW = tick.isWeekend;
      if (isW) {
        if (!currentWeekend) {
          currentWeekend = { start: tick.position, count: 1 };
        } else {
          currentWeekend.count++;
        }
      } else {
        if (currentWeekend) {
          columns.push({
            start: currentWeekend.start,
            width: currentWeekend.count * dayWidth,
          });
          currentWeekend = null;
        }
      }
    });

    // 处理最后一个周末块
    if (currentWeekend) {
      columns.push({
        start: currentWeekend.start,
        width: currentWeekend.count * dayWidth,
      });
    }

    return columns;
  }, [ticks, dayWidth]);

  // 计算节假日列
  const holidayColumns = useMemo(() => {
    if (!hasHolidays) return [];

    return ticks
      .filter((tick) => isHoliday(tick.date, holidays))
      .map((tick) => ({
        start: tick.position,
        width: dayWidth,
        holiday: isHoliday(tick.date, holidays)!,
      }));
  }, [ticks, dayWidth, hasHolidays, holidays]);

  return (
    <div
      className="relative bg-white border-b"
      style={{ height: RULER_SPECS.height }}
    >
      {/* 周末背景 */}
      {weekendColumns.map((col, i) => (
        <div
          key={`weekend-${i}`}
          className="absolute top-0 bottom-0 bg-gray-50"
          style={{
            left: col.start,
            width: col.width,
          }}
        >
          {/* 周末虚线边框 */}
          <div
            className={cn(
              'absolute inset-y-0',
              'border-l border-r',
              RULER_SPECS.weekendBorderStyle,
            )}
            style={{
              borderColor: RULER_SPECS.weekendBorderColor,
            }}
          />
        </div>
      ))}

      {/* 节假日背景 */}
      {holidayColumns.map((col, i) => (
        <div
          key={`holiday-${i}`}
          className="absolute top-0 bottom-0 bg-red-50"
          style={{
            left: col.start,
            width: col.width,
          }}
          title={col.holiday.name}
        >
          {/* 节假日虚线边框 */}
          <div
            className={cn(
              'absolute inset-y-0',
              'border-l border-r',
              RULER_SPECS.weekendBorderStyle,
            )}
            style={{
              borderColor: RULER_SPECS.weekendBorderColor,
            }}
          />
        </div>
      ))}

      {/* 时间刻度 */}
      {ticks.map((tick, i) => {
        const isW = tick.isWeekend;
        const isH = hasHolidays && isHoliday(tick.date, holidays);

        return (
          <div
            key={i}
            className={cn(
              'absolute top-0 bottom-0',
              'flex flex-col items-center justify-center',
              'text-xs',
              'border-l',
              i === 0 && 'border-l-0',
              isW ? 'text-gray-400' : 'text-gray-600',
              isH && 'text-red-500'
            )}
            style={{
              left: tick.position,
              width: dayWidth,
              borderColor: RULER_SPECS.tickColor,
            }}
          >
            <span className="font-medium">{tick.label}</span>
          </div>
        );
      })}

      {/* 今天指示线 */}
      {todayPosition !== null && (
        <div
          className="absolute top-0 bottom-0 z-10"
          style={{ left: todayPosition }}
        >
          {/* 垂直线 */}
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{ backgroundColor: RULER_SPECS.todayLineColor }}
          />
          {/* 今天背景 */}
          <div
            className="absolute top-0 bottom-0 w-full"
            style={{
              width: dayWidth,
              backgroundColor: RULER_SPECS.todayBgColor,
            }}
          />
          {/* 标记 */}
          <div
            className={cn(
              'absolute -top-0.5 left-1/2 -translate-x-1/2',
              'px-1.5 py-0.5 rounded text-xs font-medium',
              'text-white',
              'bg-red-500'
            )}
          >
            今
          </div>
        </div>
      )}
    </div>
  );
}
