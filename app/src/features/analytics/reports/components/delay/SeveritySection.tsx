/**
 * T3：延期严重度分布（饼图）
 * 注：PieChart 实际接口为 { labels, values, percentages, colors? }（非 datasets 格式），
 * 故将 brief 中的 datasets 数据转换为 PieChart 所需格式。
 */
import { PieChart } from '../charts';
import { ChartContainer } from '../shared';
import type { SeverityData } from '../../types';

export interface SeveritySectionProps {
  data: SeverityData;
}

export function SeveritySection({ data }: SeveritySectionProps) {
  const total = data.mild + data.moderate + data.severe;
  const labels = ['轻微(<7天)', '中等(7-30天)', '严重(>30天)'];
  const values = [data.mild, data.moderate, data.severe];
  const colors = ['#10b981', '#f59e0b', '#ef4444'];
  const chartData = {
    labels,
    values,
    // PieChart 的 percentages 字段为必填，按 values 计算百分比
    percentages: total === 0
      ? [0, 0, 0]
      : values.map((v) => Math.round((v / total) * 1000) / 10),
    colors,
  };
  return (
    <ChartContainer title="延期严重度分布" subtitle={`平均延期 ${data.avgDelayDays} 天 · 共 ${total} 项`}>
      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无延期任务</div>
      ) : (
        <PieChart data={chartData} innerRadius={50} />
      )}
    </ChartContainer>
  );
}
