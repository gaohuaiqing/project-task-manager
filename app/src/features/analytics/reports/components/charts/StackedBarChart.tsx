/**
 * 堆叠柱状图组件
 */

import {
  BarChart as RechartsBarChart,
  Bar,
  Cell,
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
  // 安全数据处理
  const safeData = data || { labels: [], datasets: [] };
  const labels = safeData.labels || [];
  const datasets = safeData.datasets || [];

  const chartData = labels.map((label, index) => {
    const item: Record<string, string | number> = { name: label };
    datasets.forEach((dataset) => {
      item[dataset.label] = dataset.values?.[index] ?? 0;
    });
    return item;
  });

  // 空数据处理
  if (labels.length === 0 || datasets.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        暂无数据
      </div>
    );
  }

  // 坐标轴样式
  const AXIS_STROKE = 'hsl(var(--border))';
  const TICK_STYLE = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={AXIS_STROKE} opacity={0.3} vertical={false} />
        <XAxis
          dataKey="name"
          tick={TICK_STYLE}
          stroke={AXIS_STROKE}
          tickLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
          tickSize={4}
          axisLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={TICK_STYLE}
          stroke={AXIS_STROKE}
          tickLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
          tickSize={4}
          axisLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
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
        {datasets.map((dataset, index) => {
          const baseFill = Array.isArray(dataset.color)
            ? COLORS[index % COLORS.length]
            : (dataset.color || COLORS[index % COLORS.length]);

          return (
            <Bar
              key={dataset.label}
              dataKey={dataset.label}
              stackId="stack"
              fill={baseFill}
            >
              {Array.isArray(dataset.color) &&
                dataset.color.map((color, cellIndex) => (
                  <Cell key={cellIndex} fill={color} />
                ))}
            </Bar>
          );
        })}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
