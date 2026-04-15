/**
 * 堆叠柱状图组件
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StackedBarChartData } from '../../types';
import { CHART_COLORS } from '../../config';

export interface StackedBarChartProps {
  data: StackedBarChartData;
  height?: number;
  showLegend?: boolean;
}

const COLORS = [
  CHART_COLORS.status.not_started,
  CHART_COLORS.status.in_progress,
  CHART_COLORS.status.completed,
  CHART_COLORS.status.delayed,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
];

export function StackedBarChart({
  data,
  height = 300,
  showLegend = true,
}: StackedBarChartProps) {
  const chartData = data.labels.map((label, index) => {
    const item: Record<string, string | number> = { name: label };
    data.datasets.forEach((dataset) => {
      item[dataset.label] = dataset.values[index];
    });
    return item;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />}
        {data.datasets.map((dataset, index) => (
          <Bar
            key={dataset.label}
            dataKey={dataset.label}
            stackId="stack"
            fill={dataset.color || COLORS[index % COLORS.length]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
