/**
 * 柱状图组件
 * 注意：XAxis/YAxis 必须是 RechartsBarChart 的直接子元素，
 * 不能用 Fragment 包裹，否则 recharts 2.x 无法识别
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
import type { BarChartData } from '../../types';
import { CHART_COLORS } from '../../config';

export interface BarChartProps {
  data: BarChartData;
  height?: number;
  showLegend?: boolean;
  layout?: 'vertical' | 'horizontal';
  stacked?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** 柱子最大宽度，默认32px */
  maxBarSize?: number;
}

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
];

export function BarChart({
  data,
  height = 300,
  showLegend = true,
  layout = 'horizontal',
  stacked = false,
  xAxisLabel,
  yAxisLabel,
  maxBarSize = 32,
}: BarChartProps) {
  const chartData = data.labels.map((label, index) => {
    const item: Record<string, string | number> = { name: label };
    data.datasets.forEach((dataset) => {
      item[dataset.label] = dataset.values[index];
    });
    return item;
  });

  const isVertical = layout === 'vertical';

  // 根据数据量动态调整X轴标签显示
  const labelCount = data.labels.length;
  const interval = labelCount > 10 ? Math.ceil(labelCount / 8) : 0;
  const needRotate = labelCount > 5;

  // 根据是否有标签调整margin
  const marginBottom = xAxisLabel ? (needRotate ? 55 : 40) : (needRotate ? 40 : 25);
  const marginLeft = yAxisLabel ? 55 : 35;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={chartData}
        layout={isVertical ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 20, left: marginLeft, bottom: marginBottom }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />

        {/* XAxis - 直接子元素，不用 Fragment 包裹 */}
        {isVertical ? (
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' } : undefined}
          />
        ) : (
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            interval={interval}
            angle={needRotate ? -35 : 0}
            textAnchor={needRotate ? 'end' : 'middle'}
            height={needRotate ? 60 : 40}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: needRotate ? -5 : -2, fontSize: 11, fill: 'hsl(var(--muted-foreground))' } : undefined}
          />
        )}

        {/* YAxis - 直接子元素，不用 Fragment 包裹 */}
        {isVertical ? (
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={90}
          />
        ) : (
          <YAxis
            tick={{ fontSize: 11 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: 'hsl(var(--muted-foreground))', style: { textAnchor: 'middle' } } : undefined}
          />
        )}

        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {data.datasets.map((dataset, index) => (
          <Bar
            key={dataset.label}
            dataKey={dataset.label}
            fill={dataset.color || COLORS[index % COLORS.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? undefined : [4, 4, 0, 0]}
            maxBarSize={maxBarSize}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
