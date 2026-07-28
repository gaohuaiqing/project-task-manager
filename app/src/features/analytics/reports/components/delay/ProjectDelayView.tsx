/**
 * T6：项目维度延期排名（条形图）
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import type { ProjectDelayData } from '../../types';

export interface ProjectDelayViewProps {
  data: ProjectDelayData[];
}

export function ProjectDelayView({ data }: ProjectDelayViewProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="项目延期排名" subtitle="Top 10">
        <Empty />
      </ChartContainer>
    );
  }
  const chartData = {
    labels: data.map((p) => p.projectName),
    datasets: [
      { label: '延期数', values: data.map((p) => p.delayedCount), color: '#ef4444' },
      { label: '延期率(%)', values: data.map((p) => p.delayRate), color: '#f59e0b' },
    ],
  };
  return (
    <ChartContainer title="项目延期排名" subtitle="延期数 + 延期率 Top 10">
      <BarChart data={chartData} layout="vertical" height={280} yAxisLabel="项目" />
    </ChartContainer>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>;
}
