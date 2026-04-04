/**
 * 当前位置指示器组件
 *
 * @module features/projects/components/TodayIndicator
 * @description 明确标识"今天"位置，垂直贯穿整个内容区域
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TodayIndicatorProps {
  /** 今天在时间线中的 X 位置 */
  position: number;
  /** 内容区域高度 */
  height: number | string;
  /** 标签文本（默认: "今天"） */
  label?: string;
  /** 是否显示日期 */
  showDate?: boolean;
  /** 今天的日期 */
  date?: string;
  /** 自定义类名 */
  className?: string;
}

// ============ 组件实现 ============

export function TodayIndicator({
  position,
  height,
  label = '今天',
  showDate = true,
  date,
  className,
}: TodayIndicatorProps) {
  // 格式化日期显示
  const dateLabel = useMemo(() => {
    if (!showDate || !date) return null;
    // 使用本地时间解析，避免时区问题
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }, [showDate, date]);

  // 如果位置为负（今天在时间线开始之前），不显示
  if (position < 0) return null;

  return (
    <div
      className={cn(
        'absolute top-0 z-50 pointer-events-none',
        className
      )}
      style={{
        left: position,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* 顶部标签 */}
      <div
        className={cn(
          'absolute -top-0 left-1/2 -translate-x-1/2',
          'flex flex-col items-center',
          'z-10'
        )}
      >
        {/* 箭头 */}
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid rgb(239, 68, 68)', // red-500
          }}
        />
        {/* 标签背景 */}
        <div
          className={cn(
            'px-2 py-0.5 rounded text-xs font-semibold',
            'bg-red-500 text-white',
            'whitespace-nowrap',
            'shadow-sm'
          )}
        >
          {label}
          {dateLabel && (
            <span className="ml-1 opacity-90">{dateLabel}</span>
          )}
        </div>
      </div>

      {/* 垂直虚线 */}
      <div
        className={cn(
          'absolute top-8 left-1/2 -translate-x-1/2',
          'w-0.5',
          'bg-red-500'
        )}
        style={{
          height: 'calc(100% - 32px)',
          backgroundImage: 'linear-gradient(to bottom, rgb(239, 68, 68) 50%, transparent 50%)',
          backgroundSize: '1px 8px',
        }}
      />
    </div>
  );
}

// ============ 辅助函数 ============

/**
 * 计算今天在时间线中的位置
 */
export function calculateTodayPosition(
  timelineStartDate: string,
  dayWidth: number
): { position: number; date: string } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 使用本地时间解析，避免时区问题
  const [year, month, day] = timelineStartDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  start.setHours(0, 0, 0, 0);

  // 今天在开始日期之前
  if (today < start) {
    return null;
  }

  const daysDiff = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    position: daysDiff * dayWidth + dayWidth / 2, // 居中显示
    date: today.toISOString().split('T')[0],
  };
}
