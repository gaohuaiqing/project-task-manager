/**
 * 时间刻度尺组件
 *
 * @module features/projects/components/TimelineRuler
 * @description 根据缩放级别显示不同行结构的刻度尺，符合 REQ_03 4.11.3 规范
 *
 * 行结构规范:
 * - 日视图 (dayWidth=36): 月/周/日 三行
 * - 周视图 (dayWidth=25): 月/日 两行+空行
 * - 月视图 (dayWidth=8):  年/月 两行+空行
 * - 总高度保持 60px
 */

import { useMemo } from 'react';
import type { Holiday, TimelineZoomLevel } from '@/types/timeline';
import {
  RULER_SPECS,
  isWeekend as checkIsWeekend,
  isHoliday as checkIsHoliday,
  generateDayTicks,
  generateMonthTicks,
  generateYearTicks,
  getDateCenterPosition,
} from '@/utils/ganttGeometry';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineRulerProps {
  /** 开始日期 */
  minDate: string;
  /** 结束日期 */
  maxDate: string;
  /** 节假日列表 */
  holidays: Holiday[];
  /** 每天像素宽度 */
  dayWidth: number;
  /** 总宽度（可选） */
  width?: number;
  /** 缩放级别 */
  zoomLevel?: TimelineZoomLevel;
}

// ============ 常量 ============

/** 行高度 */
const ROW_HEIGHT = 20;

// ============ 组件实现 ============

export function TimelineRuler({
  minDate,
  maxDate,
  holidays,
  dayWidth,
  width,
  zoomLevel = 'week',
}: TimelineRulerProps) {
  const hasHolidays = holidays.length > 0;

  // 生成月份刻度
  const monthTicks = useMemo(
    () => generateMonthTicks(minDate, maxDate, dayWidth),
    [minDate, maxDate, dayWidth]
  );

  // 生成年份刻度（月视图使用）
  const yearTicks = useMemo(
    () => generateYearTicks(minDate, maxDate, dayWidth),
    [minDate, maxDate, dayWidth]
  );

  // 生成日期刻度（每天）
  const dayTicks = useMemo(
    () => generateDayTicks(minDate, maxDate, dayWidth),
    [minDate, maxDate, dayWidth]
  );

  // 今天位置（居中）
  const todayPosition = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pos = getDateCenterPosition(today, minDate, dayWidth);
    return pos >= 0 ? pos : null;
  }, [minDate, dayWidth]);

  // 计算周末列
  const weekendColumns = useMemo(() => {
    const columns: Array<{ start: number; width: number }> = [];
    let currentWeekend: { start: number; count: number } | null = null;

    dayTicks.forEach((tick) => {
      if (tick.isWeekend) {
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

    if (currentWeekend) {
      columns.push({
        start: currentWeekend.start,
        width: currentWeekend.count * dayWidth,
      });
    }

    return columns;
  }, [dayTicks, dayWidth]);

  // 计算节假日列
  const holidayColumns = useMemo(() => {
    if (!hasHolidays) return [];

    return dayTicks
      .filter((tick) => checkIsHoliday(tick.date, holidays))
      .map((tick) => ({
        start: tick.position,
        width: dayWidth,
        holiday: checkIsHoliday(tick.date, holidays)!,
      }));
  }, [dayTicks, dayWidth, hasHolidays, holidays]);

  // 根据缩放级别计算行位置
  const getRowPositions = () => {
    switch (zoomLevel) {
      case 'day':
        // 日视图：月/周/日 三行
        return {
          firstRow: { top: 0, visible: true, type: 'month' },
          secondRow: { top: ROW_HEIGHT, visible: true, type: 'weekday' },
          thirdRow: { top: ROW_HEIGHT * 2, visible: true, type: 'day' },
        };
      case 'week':
        // 周视图：月/周/日 三行（与日视图相同）
        return {
          firstRow: { top: 0, visible: true, type: 'month' },
          secondRow: { top: ROW_HEIGHT, visible: true, type: 'weekday' },
          thirdRow: { top: ROW_HEIGHT * 2, visible: true, type: 'day' },
        };
      case 'month':
        // 月视图：年/月 两行+空行
        return {
          firstRow: { top: 0, visible: true, type: 'year' },
          secondRow: { top: ROW_HEIGHT, visible: true, type: 'month' },
          thirdRow: { top: ROW_HEIGHT * 2, visible: false, type: 'empty' },
        };
    }
  };

  const rowPositions = getRowPositions();
  const totalHeight = ROW_HEIGHT * 3; // 保持总高度 60px

  return (
    <div
      className="relative border-b transition-all duration-200 ease-out"
      style={{ height: totalHeight, width: width || '100%' }}
    >
      {/* 月份交替背景列 */}
      {monthTicks.map((month, i) => {
        const isOdd = (month.year * 12 + month.month) % 2 === 1;
        return (
          <div
            key={`month-bg-${i}`}
            className={cn('absolute top-0 bottom-0', isOdd ? 'bg-slate-100/60' : 'bg-white')}
            style={{
              left: month.position,
              width: month.width,
            }}
          />
        );
      })}

      {/* 周末背景 - 只在日视图和周视图显示 */}
      {zoomLevel !== 'month' && weekendColumns.map((col, i) => (
        <div
          key={`weekend-${i}`}
          className="absolute bg-gray-200/50"
          style={{
            left: col.start,
            width: col.width,
            top: zoomLevel === 'day' ? ROW_HEIGHT : ROW_HEIGHT,
            height: zoomLevel === 'day' ? ROW_HEIGHT * 2 : ROW_HEIGHT,
          }}
        />
      ))}

      {/* 节假日背景 - 只在日视图和周视图显示 */}
      {zoomLevel !== 'month' && holidayColumns.map((col, i) => (
        <div
          key={`holiday-${i}`}
          className="absolute bg-red-100 dark:bg-red-900/30"
          style={{
            left: col.start,
            width: col.width,
            top: zoomLevel === 'day' ? ROW_HEIGHT : ROW_HEIGHT,
            height: zoomLevel === 'day' ? ROW_HEIGHT * 2 : ROW_HEIGHT,
          }}
          title={col.holiday.name}
        />
      ))}

      {/* 第一行：年行（月视图）或 月行（日/周视图） */}
      <div
        className="absolute left-0 right-0 border-b border-border z-10"
        style={{ top: rowPositions.firstRow.top, height: ROW_HEIGHT }}
      >
        {rowPositions.firstRow.type === 'year' ? (
          // 年行 - 月视图
          yearTicks.map((year, i) => (
            <div
              key={`year-${i}`}
              className={cn(
                'absolute top-0 bottom-0 flex items-center justify-center border-r font-semibold text-sm text-gray-800',
                i % 2 === 0 ? 'border-gray-300 bg-slate-200/50' : 'border-gray-200 bg-slate-50/80'
              )}
              style={{
                left: year.position,
                width: year.width,
              }}
            >
              {year.label}
            </div>
          ))
        ) : (
          // 月行 - 日/周视图
          monthTicks.map((month, i) => {
            const isOdd = (month.year * 12 + month.month) % 2 === 1;
            return (
              <div
                key={`month-${i}`}
                className={cn(
                  'absolute top-0 bottom-0 flex items-center justify-center border-r font-semibold text-sm text-gray-800',
                  isOdd ? 'border-gray-300 bg-slate-200/50' : 'border-gray-200 bg-slate-50/80'
                )}
                style={{
                  left: month.position,
                  width: month.width,
                }}
              >
                {month.label}
              </div>
            );
          })
        )}
      </div>

      {/* 第二行：周行（日/周视图）或 月行（月视图） */}
      <div
        className={cn(
          'absolute left-0 right-0 z-10',
          zoomLevel !== 'month' && 'border-b border-gray-200'
        )}
        style={{ top: rowPositions.secondRow.top, height: ROW_HEIGHT }}
      >
        {(zoomLevel === 'day' || zoomLevel === 'week') && dayWidth >= 25 && dayTicks.map((tick, i) => (
          // 周行 - 日/周视图
          <div
            key={`weekday-${i}`}
            className={cn(
              'absolute top-0 bottom-0 flex items-center justify-center border-r border-border/60',
              tick.isWeekend ? 'text-red-400/70 dark:text-red-400/50 font-medium' : 'text-muted-foreground'
            )}
            style={{
              left: tick.position,
              width: dayWidth,
            }}
          >
            <span className="text-xs">{tick.weekdayLabel}</span>
          </div>
        ))}

        {zoomLevel === 'month' && (
          // 月行 - 月视图
          <div className="flex items-center h-full">
            {monthTicks.map((month, i) => {
              const isOdd = (month.year * 12 + month.month) % 2 === 1;
              return (
                <div
                  key={`month-label-${i}`}
                  className={cn(
                    'absolute top-0 bottom-0 flex items-center justify-center border-r border-border text-xs text-muted-foreground',
                    isOdd && 'bg-muted/30'
                  )}
                  style={{
                    left: month.position,
                    width: month.width,
                  }}
                >
                  {month.month + 1}月
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 第三行：日行（日/周视图）或 空行 */}
      {(zoomLevel === 'day' || zoomLevel === 'week') && (
        <div
          className="absolute left-0 right-0 z-10"
          style={{ top: rowPositions.thirdRow.top, height: ROW_HEIGHT }}
        >
          {dayTicks.map((tick, i) => {
            const isH = hasHolidays && checkIsHoliday(tick.date, holidays);

            return (
              <div
                key={`day-${i}`}
                className={cn(
                  'absolute top-0 bottom-0 flex items-center justify-center border-r border-border',
                  tick.isWeekend ? 'text-muted-foreground' : 'text-foreground',
                  isH && 'text-red-500 dark:text-red-400',
                  tick.isToday && 'bg-blue-100/50 dark:bg-blue-900/30 font-bold text-blue-600 dark:text-blue-400'
                )}
                style={{
                  left: tick.position,
                  width: dayWidth,
                }}
              >
                <span className={cn(
                  'font-medium',
                  dayWidth >= 28 ? 'text-sm' : 'text-[10px]'
                )}>{tick.day}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
