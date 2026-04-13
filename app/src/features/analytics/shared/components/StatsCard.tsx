/**
 * 统计卡片组件 - 共享组件
 * 用于仪表板和报表分析的统一统计卡片
 *
 * @module analytics/shared/components/StatsCard
 * @see REQ_07_INDEX.md §5 UI 规范摘要
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import type { StatsCardMetric } from '../types/metrics';

export interface StatsCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: number | string;
  /** 格式化后的显示值（可选，优先使用） */
  displayValue?: string;
  /** 副标题/说明文字 */
  subtitle?: string;
  /** 指标说明（点击信息图标显示） */
  description?: string;
  /** 数值颜色主题 */
  valueColor?: 'default' | 'success' | 'warning' | 'danger';
  /** 自定义数值颜色 */
  customValueColor?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 趋势数据 */
  trend?: number;
  /** 趋势文本 */
  trendText?: string;
  /** 是否反转趋势颜色（延期率等指标下降是好事） */
  invertTrendColors?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
  /** 加载状态 */
  isLoading?: boolean;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 数值颜色映射
 * 符合 REQ_07a_dashboard.md §1.1 配色规范
 */
const VALUE_COLOR_MAP = {
  default: 'text-[#0F172A] dark:text-[#F1F5F9]',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

/**
 * 趋势方向判断
 */
function getTrendDirection(trend: number): 'up' | 'down' | 'flat' {
  if (trend > 0) return 'up';
  if (trend < 0) return 'down';
  return 'flat';
}

/**
 * 统计卡片组件 - 专业仪表盘风格
 *
 * 设计规范:
 * - 3层信息结构: 标签(小字) → 大数字(加粗) → 副标题(补充)
 * - 主数值: 28px加粗，等宽数字(tabular-nums)
 * - 标签: 12px中等字重，大写字母间距
 * - 卡片圆角: 12px
 * - 边框: 半透明边框
 * - Hover: 阴影加深 + 轻微上浮
 */
export function StatsCard({
  title,
  value,
  displayValue,
  subtitle,
  description,
  valueColor = 'default',
  customValueColor,
  className,
  onClick,
  trend,
  trendText,
  invertTrendColors = false,
  icon,
  isLoading,
  'data-testid': testId,
}: StatsCardProps) {
  // 计算最终显示值
  const finalDisplayValue = displayValue ?? (typeof value === 'number' ? value.toLocaleString() : value);

  // 趋势方向和颜色
  const trendDirection = trend !== undefined ? getTrendDirection(trend) : null;
  const trendColorClass = trendDirection
    ? invertTrendColors
      ? trendDirection === 'down'
        ? 'text-emerald-500'
        : 'text-red-500'
      : trendDirection === 'up'
        ? 'text-emerald-500'
        : 'text-red-500'
    : '';

  if (isLoading) {
    return (
      <Card
        className={cn(
          'relative p-4 rounded-xl',
          'border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50',
          'shadow-sm',
          className
        )}
      >
        <div className="animate-pulse">
          <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-7 w-16 bg-gray-200 dark:bg-slate-700 rounded mt-2" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded mt-2" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      data-testid={testId}
      className={cn(
        // 基础样式
        'relative p-4 rounded-xl',
        // 边框
        'border border-gray-100 dark:border-slate-700/50',
        // 背景
        'bg-white dark:bg-slate-800/50',
        // 阴影
        'shadow-sm',
        // 过渡动画
        'transition-all duration-200',
        // 交互状态
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {/* 第1层：标签 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
          {description && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="max-w-xs p-3"
                side="top"
                align="start"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {icon && (
          <span className="text-gray-400 dark:text-gray-500">
            {icon}
          </span>
        )}
      </div>

      {/* 第2层：大数字 */}
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={cn(
            'text-[28px] font-bold leading-none',
            'font-mono tabular-nums',
            customValueColor || VALUE_COLOR_MAP[valueColor]
          )}
        >
          {finalDisplayValue}
        </span>
        {trendDirection && trend !== undefined && (
          <span className={cn('text-xs font-medium flex items-center gap-0.5', trendColorClass)}>
            {trendDirection === 'up' && '↑'}
            {trendDirection === 'down' && '↓'}
            {trendDirection === 'flat' && '–'}
            {trendText || `${Math.abs(trend)}%`}
          </span>
        )}
      </div>

      {/* 第3层：副标题 */}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
}

/**
 * 从 StatsCardMetric 创建统计卡片
 */
export function StatsCardFromMetric(
  metric: StatsCardMetric,
  props?: Omit<StatsCardProps, 'title' | 'value' | 'displayValue'>
) {
  return (
    <StatsCard
      title={metric.label}
      value={metric.value}
      displayValue={metric.displayValue}
      subtitle={metric.trendText}
      trend={metric.trend}
      {...props}
    />
  );
}

export default StatsCard;
