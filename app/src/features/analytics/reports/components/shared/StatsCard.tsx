/**
 * 统计卡片组件
 * 显示单个统计指标，支持趋势对比
 */

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatCard as StatCardType } from '../../types';

export interface StatsCardProps {
  data: StatCardType;
  className?: string;
}

export function StatsCard({ data, className }: StatsCardProps) {
  const { label, value, unit, trend } = data;

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') {
      return <TrendingUp className="h-3 w-3" />;
    }
    if (trend.direction === 'down') {
      return <TrendingDown className="h-3 w-3" />;
    }
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    return trend.isPositive ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex flex-col space-y-2">
        {/* 标签 */}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>

        {/* 主数值 */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {/* 趋势指标 */}
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs', getTrendColor())}>
            {getTrendIcon()}
            <span>
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.direction === 'stable' && '→'}
              {Math.abs(trend.value)}
              {typeof trend.value === 'number' && trend.value < 10 ? '%' : ''} vs 上期
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 统计卡片组 */
export interface StatsCardGroupProps {
  stats: StatCardType[];
  className?: string;
}

export function StatsCardGroup({ stats, className }: StatsCardGroupProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <StatsCard key={stat.key} data={stat} />
      ))}
    </div>
  );
}
