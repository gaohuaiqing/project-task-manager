/**
 * 折线图组件
 */

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LineChartData } from '../../types';
import { CHART_COLORS } from '../../config';

export interface LineChartProps {
  data: LineChartData;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
];

export function LineChart({
  data,
  height = 300,
  showLegend = true,
  showGrid = true,
  xAxisLabel,
  yAxisLabel,
}: LineChartProps) {
  const chartData = data.labels.map((label, index) => {
    const item: Record<string, string | number> = { name: label };
    data.datasets.forEach((dataset) => {
      item[dataset.label] = dataset.values[index];
    });
    return item;
  });

  // 根据数据量动态调整X轴标签显示
  const labelCount = data.labels.length;
  const interval = labelCount > 10 ? Math.floor(labelCount / 6) : 'preserveStartEnd';
  const needRotate = labelCount > 7;

  // 根据是否有标签调整margin
  const marginBottom = xAxisLabel ? (needRotate ? 55 : 40) : (needRotate ? 40 : 25);
  const marginLeft = yAxisLabel ? 55 : 35;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={chartData}
        margin={{ top: 10, right: 20, left: marginLeft, bottom: marginBottom }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        )}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          interval={interval}
          angle={needRotate ? -35 : 0}
          textAnchor={needRotate ? 'end' : 'middle'}
          height={needRotate ? 60 : 40}
          label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: needRotate ? -5 : -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : undefined}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))', style: { textAnchor: 'middle' } } : undefined}
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
          <Line
            key={dataset.label}
            type="monotone"
            dataKey={dataset.label}
            stroke={dataset.color || COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
