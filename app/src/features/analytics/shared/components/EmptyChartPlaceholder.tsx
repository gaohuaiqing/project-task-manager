/**
 * 图表空状态占位符组件
 * 当图表无数据时显示友好提示
 * @module analytics/shared/components/EmptyChartPlaceholder
 */

import { FileQuestion } from 'lucide-react';

export interface EmptyChartPlaceholderProps {
  /** 提示标题 */
  title?: string;
  /** 提示描述 */
  description?: string;
  /** 图表高度 */
  height?: number;
}

export function EmptyChartPlaceholder({
  title = '暂无数据',
  description = '当前筛选条件下没有可展示的数据',
  height = 300,
}: EmptyChartPlaceholderProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-muted-foreground"
      style={{ height }}
    >
      <FileQuestion className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1 opacity-70">{description}</p>
    </div>
  );
}

/**
 * 检查图表数据是否为空
 */
export function isChartDataEmpty(data: { labels: unknown[]; datasets: unknown[] }): boolean {
  return !data ||
    !data.labels ||
    data.labels.length === 0 ||
    !data.datasets ||
    data.datasets.length === 0 ||
    data.datasets.every(ds => !ds || (ds as { values?: unknown[] }).values?.length === 0);
}
