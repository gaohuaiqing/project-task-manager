/**
 * 散点图组件（支持四象限）
 */

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { ScatterChartData, ScatterPoint } from '../../types';
import { CHART_COLORS } from '../../config';

export interface ScatterChartProps {
  data: ScatterChartData;
  height?: number;
  showQuadrant?: boolean;
  onPointClick?: (point: ScatterPoint) => void;
}

export function ScatterChart({
  data,
  height = 300,
  showQuadrant = true,
  onPointClick,
}: ScatterChartProps) {
  const getPointColor = (point: ScatterPoint) => {
    if (point.color) return point.color;

    // 根据活跃度着色
    const activityRate = point.size || 50;
    if (activityRate >= 80) return CHART_COLORS.success;
    if (activityRate >= 60) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsScatterChart
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          type="number"
          dataKey="x"
          name={data.xAxis.label}
          domain={[data.xAxis.min, data.xAxis.max]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          label={{
            value: data.xAxis.label,
            position: 'bottom',
            offset: 0,
            fontSize: 10,
            fill: 'hsl(var(--muted-foreground))',
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={data.yAxis.label}
          domain={[data.yAxis.min, data.yAxis.max]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          label={{
            value: data.yAxis.label,
            angle: -90,
            position: 'insideLeft',
            fontSize: 10,
            fill: 'hsl(var(--muted-foreground))',
          }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
          formatter={(value: number, name: string) => {
            if (name === data.xAxis.label) return [value, data.xAxis.label];
            if (name === data.yAxis.label) return [value, data.yAxis.label];
            return [value, name];
          }}
          labelFormatter={(_, payload) => {
            if (payload?.[0]?.payload) {
              const point = payload[0].payload as ScatterPoint;
              return point.label;
            }
            return '';
          }}
        />

        {/* 四象限线 */}
        {showQuadrant && data.quadrantLines && (
          <>
            <ReferenceLine
              x={data.quadrantLines.x}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
            <ReferenceLine
              y={data.quadrantLines.y}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
          </>
        )}

        <Scatter
          data={data.points}
          fill={CHART_COLORS.primary}
        >
          {data.points.map((point, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getPointColor(point)}
              cursor={onPointClick ? 'pointer' : 'default'}
              onClick={() => onPointClick?.(point)}
            />
          ))}
        </Scatter>
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}
