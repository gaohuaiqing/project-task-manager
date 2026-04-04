/**
 * 趋势指示器组件
 * 显示数据的变化趋势（环比、同比）
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendData {
  /** 变化百分比（正数表示上升，负数表示下降） */
  value: number;
  /** 对比周期，如 "vs 上周" */
  period: string;
}

interface TrendIndicatorProps {
  /** 趋势数据 */
  trend: TrendData;
  /** 自定义类名 */
  className?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md';
  /** 反向颜色（如延期率下降是好事） */
  invertColors?: boolean;
}

export function TrendIndicator({
  trend,
  className,
  showIcon = true,
  size = 'sm',
  invertColors = false,
}: TrendIndicatorProps) {
  const isPositive = trend.value > 0;
  const isNeutral = trend.value === 0;

  // 颜色逻辑：正向指标上升为绿色，反向指标（如延期率）下降为绿色
  const getColorClass = () => {
    if (isNeutral) return 'text-muted-foreground';
    const actualPositive = invertColors ? !isPositive : isPositive;
    return actualPositive ? 'text-green-600' : 'text-red-600';
  };

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn('flex items-center gap-1', getColorClass(), className)}>
      {showIcon && <Icon className={iconSize} />}
      <span className={cn('font-medium', textSize)}>
        {isPositive ? '+' : ''}{trend.value.toFixed(1)}%
      </span>
      <span className={cn('text-muted-foreground', textSize)}>
        {trend.period}
      </span>
    </div>
  );
}

/**
 * 计算趋势数据
 * @param current 当前值
 * @param previous 之前值
 * @param period 对比周期描述
 */
export function calculateTrend(
  current: number,
  previous: number,
  period: string = 'vs 上周'
): TrendData | null {
  if (previous === 0) {
    // 无法计算变化率
    return null;
  }

  const changePercent = ((current - previous) / previous) * 100;

  return {
    value: changePercent,
    period,
  };
}
