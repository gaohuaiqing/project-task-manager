/**
 * T7：任务类型维度延期分布（条形图）
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import type { TaskTypeDelayData } from '../../types';

export interface TaskTypeDelayViewProps {
  data: TaskTypeDelayData[];
}

export function TaskTypeDelayView({ data }: TaskTypeDelayViewProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="任务类型延期分布" subtitle="各类型延期率">
        <Empty />
      </ChartContainer>
    );
  }
  const chartData = {
    labels: data.map((t) => t.taskType),
    datasets: [
      { label: '延期数', values: data.map((t) => t.delayedCount), color: '#ef4444' },
      { label: '延期率(%)', values: data.map((t) => t.delayRate), color: '#f59e0b' },
    ],
  };
  return (
    <ChartContainer title="任务类型延期分布" subtitle="哪类任务最易延期">
      <BarChart data={chartData} layout="vertical" height={280} yAxisLabel="类型" />
    </ChartContainer>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>;
}
