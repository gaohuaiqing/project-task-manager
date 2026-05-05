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
  // 安全数据处理
  const safeData = data || {
    points: [],
    xAxis: { label: '', min: 0, max: 100 },
    yAxis: { label: '', min: 0, max: 100 },
  };
  const points = safeData.points || [];
  const xAxis = safeData.xAxis || { label: '', min: 0, max: 100 };
  const yAxis = safeData.yAxis || { label: '', min: 0, max: 100 };
  const quadrantLines = safeData.quadrantLines;

  // 空数据处理
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        暂无数据
      </div>
    );
  }

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
          name={xAxis.label}
          domain={[xAxis.min, xAxis.max]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          label={{
            value: xAxis.label,
            position: 'bottom',
            offset: 0,
            fontSize: 10,
            fill: 'hsl(var(--muted-foreground))',
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yAxis.label}
          domain={[yAxis.min, yAxis.max]}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          label={{
            value: yAxis.label,
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
            if (name === xAxis.label) return [value, xAxis.label];
            if (name === yAxis.label) return [value, yAxis.label];
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
        {showQuadrant && quadrantLines && (
          <>
            <ReferenceLine
              x={quadrantLines.x}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
            <ReferenceLine
              y={quadrantLines.y}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
          </>
        )}

        <Scatter
          data={points}
          fill={CHART_COLORS.primary}
        >
          {points.map((point, index) => (
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
