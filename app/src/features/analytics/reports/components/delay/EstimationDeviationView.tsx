/**
 * T8：预估偏差分布（饼图）
 * 注：PieChart 实际接口为 { labels, values, percentages, colors? }（非 datasets 格式），
 * 故将 brief 中的 datasets 数据转换为 PieChart 所需格式。
 */
import { PieChart } from '../charts';
import { ChartContainer } from '../shared';
import type { EstimationDeviationData } from '../../types';

export interface EstimationDeviationViewProps {
  data: EstimationDeviationData;
}

export function EstimationDeviationView({ data }: EstimationDeviationViewProps) {
  const total = data.accurate + data.slight + data.obvious + data.serious;
  const labels = ['精准(±10%)', '轻微偏差(10-30%)', '明显偏差(30-50%)', '严重偏差(>50%)'];
  const values = [data.accurate, data.slight, data.obvious, data.serious];
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const chartData = {
    labels,
    values,
    // PieChart 的 percentages 字段为必填，按 values 计算百分比
    percentages: total === 0
      ? [0, 0, 0, 0]
      : values.map((v) => Math.round((v / total) * 1000) / 10),
    colors,
  };
  return (
    <ChartContainer title="预估偏差分布" subtitle={`平均偏差 ${data.avgDeviationDays} 天 · 样本 ${data.sampleCount}（完成延期任务）`}>
      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">无完成延期任务样本</div>
      ) : (
        <PieChart data={chartData} innerRadius={50} />
      )}
    </ChartContainer>
  );
}
