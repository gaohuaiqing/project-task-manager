/**
 * 图表网格组件
 *
 * @module analytics/dashboard/components/ChartGrid
 * @description 2x2 图表网格布局
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface ChartGridItem {
  /** 图表标题 */
  title: string;
  /** 图表组件 */
  chart: React.ReactNode;
  /** 占用列数 */
  colSpan?: 1 | 2;
}

export interface ChartGridProps {
  /** 图表项数组 */
  charts: ChartGridItem[];
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 图表网格
 *
 * 设计规范:
 * - 2列网格布局
 * - 响应式：移动端单列
 * - 统一的卡片样式
 */
export function ChartGrid({
  charts,
  className,
  'data-testid': testId,
}: ChartGridProps) {
  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}
      data-testid={testId}
    >
      {charts.map((item, index) => (
        <Card
          key={index}
          className={cn(
            'rounded-xl border border-gray-100 dark:border-slate-700/50',
            'bg-white dark:bg-slate-800/50 shadow-sm',
            item.colSpan === 2 && 'md:col-span-2'
          )}
          data-testid={`chart-card-${index}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent>{item.chart}</CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ChartGrid;
