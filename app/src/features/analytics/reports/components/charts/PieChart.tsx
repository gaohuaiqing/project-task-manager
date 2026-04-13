/**
 * 饼图/环形图组件
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
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.values[index],
    percentage: data.percentages[index],
    color: data.colors?.[index] || Object.values(CHART_COLORS.status)[index % 10] || CHART_COLORS.primary,
  }));

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
          label={({ name, percentage }) => `${name} ${percentage}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value, name]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        {showLegend && (
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
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
