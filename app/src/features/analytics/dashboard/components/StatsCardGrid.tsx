/**
 * 统计卡片网格组件
 *
 * @module analytics/dashboard/components/StatsCardGrid
 * @description 统一的统计卡片网格布局，支持 2/4 列
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatsCard } from '../../shared/components/StatsCard';
import type { StatsCardMetric } from '../../shared/types';

export interface StatsCardGridProps {
  /** 指标数据数组 */
  metrics: StatsCardMetric[];
  /** 列数，默认 4 */
  columns?: 2 | 3 | 4;
  /** 自定义类名 */
  className?: string;
  /** 加载状态 */
  isLoading?: boolean;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 统计卡片网格
 *
 * 设计规范:
 * - 4列网格布局 (grid-cols-4)
 * - 响应式：移动端 2 列，平板 4 列
 * - 卡片间距 gap-4
 */
export function StatsCardGrid({
  metrics,
  columns = 4,
  className,
  isLoading,
  'data-testid': testId,
}: StatsCardGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div
      className={cn('grid gap-4', gridCols[columns], className)}
      data-testid={testId}
    >
      {metrics.map((metric, index) => (
        <StatsCard
          key={metric.label}
          title={metric.label}
          value={metric.value}
          displayValue={metric.displayValue}
          description={metric.description}
          trend={metric.trend}
          trendText={metric.trendText}
          isLoading={isLoading}
          data-testid={`stats-card-${index}`}
        />
      ))}
    </div>
  );
}

export default StatsCardGrid;
