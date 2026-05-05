/**
 * 饼图/环形图组件
 * 与项目整体图表风格保持一致
 */

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { PieChartData } from '../../types';
import { CHART_COLORS } from '../../config';

export interface PieChartProps {
  data: PieChartData;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export function PieChart({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  // 安全数据处理
  const safeData = data || { labels: [], values: [], percentages: [] };
  const labels = safeData.labels || [];
  const values = safeData.values || [];
  const percentages = safeData.percentages || [];
  const colors = safeData.colors || [];

  const chartData = labels.map((label, index) => ({
    name: label,
    value: values[index] ?? 0,
    percentage: percentages[index] ?? 0,
    color: colors[index] || Object.values(CHART_COLORS.status)[index % 10] || CHART_COLORS.primary,
  }));

  // 空数据处理
  if (labels.length === 0 || values.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent, x, y }) => (
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }}>
              {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
          )}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `${value} (${props.payload.percentage}%)`,
            name,
          ]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: '11px',
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '10px' }}
            iconType="circle"
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

/** 环形图 */
export function DonutChart(props: Omit<PieChartProps, 'innerRadius'>) {
  return <PieChart {...props} innerRadius={60} />;
}
