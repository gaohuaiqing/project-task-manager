/**
 * 柱状图组件
 * 注意：XAxis/YAxis 必须是 RechartsBarChart 的直接子元素，
 * 不能用 Fragment 包裹，否则 recharts 2.x 无法识别
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
  /** 是否显示X轴，默认true */
  showXAxis?: boolean;
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
  showXAxis = true,
}: BarChartProps) {
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

  const isVertical = layout === 'vertical';

  // 根据数据量动态调整X轴标签显示
  const labelCount = labels.length;
  const interval = labelCount > 10 ? Math.ceil(labelCount / 8) : 0;
  const needRotate = labelCount > 5;

  // 根据是否有标签调整margin
  // 如果隐藏X轴，减少底部边距
  const marginBottom = showXAxis
    ? (xAxisLabel ? (needRotate ? 55 : 40) : (needRotate ? 40 : 25))
    : 10;
  const marginLeft = yAxisLabel ? 55 : 35;

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
  const TICK_STROKE = 'hsl(var(--border))';
  const TICK_STYLE = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={chartData}
        layout={isVertical ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 20, left: marginLeft, bottom: marginBottom }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={!isVertical} horizontal={isVertical} />

        {/* XAxis - 直接子元素，不用 Fragment 包裹 */}
        {isVertical ? (
          <XAxis
            type="number"
            tick={showXAxis ? TICK_STYLE : false}
            stroke={AXIS_STROKE}
            tickLine={{ stroke: TICK_STROKE, strokeWidth: 1 }}
            tickSize={4}
            axisLine={{ stroke: showXAxis ? AXIS_STROKE : 'transparent', strokeWidth: showXAxis ? 1 : 0 }}
            label={showXAxis && xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : undefined}
          />
        ) : (
          <XAxis
            dataKey="name"
            tick={showXAxis ? TICK_STYLE : false}
            stroke={showXAxis ? AXIS_STROKE : 'transparent'}
            tickLine={{ stroke: showXAxis ? TICK_STROKE : 'transparent', strokeWidth: showXAxis ? 1 : 0 }}
            tickSize={4}
            axisLine={{ stroke: showXAxis ? AXIS_STROKE : 'transparent', strokeWidth: showXAxis ? 1 : 0 }}
            interval={interval}
            angle={showXAxis && needRotate ? -35 : 0}
            textAnchor={showXAxis && needRotate ? 'end' : 'middle'}
            height={showXAxis && needRotate ? 60 : 40}
            label={showXAxis && xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: needRotate ? -5 : -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' } : undefined}
          />
        )}

        {/* YAxis - 直接子元素，不用 Fragment 包裹 */}
        {isVertical ? (
          <YAxis
            type="category"
            dataKey="name"
            tick={TICK_STYLE}
            stroke={AXIS_STROKE}
            tickLine={{ stroke: TICK_STROKE, strokeWidth: 1 }}
            tickSize={4}
            axisLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
            width={90}
          />
        ) : (
          <YAxis
            tick={TICK_STYLE}
            stroke={AXIS_STROKE}
            tickLine={{ stroke: TICK_STROKE, strokeWidth: 1 }}
            tickSize={4}
            axisLine={{ stroke: AXIS_STROKE, strokeWidth: 1 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))', style: { textAnchor: 'middle' } } : undefined}
          />
        )}

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
              fill={baseFill}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? undefined : [4, 4, 0, 0]}
              maxBarSize={maxBarSize}
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
