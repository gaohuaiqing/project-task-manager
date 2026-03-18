/**
 * 图表共享组件
 *
 * 提取重复的图表配置和渲染逻辑
 *
 * @author AI Assistant
 * @since 2026-03-18
 */

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

import type { ChartDataItem } from './ReportComponents';

// ==================== 陮图配置 ====================

interface PieChartProps {
  data: ChartDataItem[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showEmpty?: boolean;
}

 const label?: string;
}

export function PieChartComponent({
  data,
  colors = PIE_COLORS,
  innerRadius = 60,
  outerRadius = 100,
  showEmpty = true,
  label
}: PieChartProps) {
  if (!data || data.length === 0) {
    return showEmpty ? (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        暂无数据
      </div>
    ) : null;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => label ?? `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ==================== 柱状图配置 ====================

interface BarChartProps {
  data: ChartDataItem[];
  color?: string;
  layout?: 'vertical' | 'horizontal';
  showEmpty?: boolean;
}

export function BarChartComponent({
  data,
  color = '#3b82f6',
  layout = 'vertical',
  showEmpty = true
}: BarChartProps) {
  if (!data || data.length === 0) {
    return showEmpty ? (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        暂无数据
      </div>
    ) : null;
  }

  const commonProps = {
    layout === 'vertical' ? { layout: 'vertical', margin } undefined } : {}
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout={layout} {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" />
        {layout === 'vertical' ? (
          <>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
          </>
        ) : (
          <XAxis dataKey="name" />
          <YAxis />
        )}
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ==================== 折线图配置 ====================

interface LineChartProps {
  data: ChartDataItem[];
  color?: string;
  showEmpty?: boolean;
}

export function LineChartComponent({
  data,
  color = '#3b82f6',
  showEmpty = true
}: LineChartProps) {
  if (!data || data.length === 0) {
    return showEmpty ? (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        暂无数据
      </div>
    ) : null;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
