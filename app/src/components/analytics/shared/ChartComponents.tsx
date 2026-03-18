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

// ==================== 颜色配置 ====================

export const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ==================== 饼图配置 ====================

interface PieChartProps {
  data: ChartDataItem[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showEmpty?: boolean;
  label?: string;
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
}

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

  const chartMargin = layout === 'vertical'
    ? { top: 20, right: 30, bottom: 20, left: 100 }
    : { top: 20, right: 30, bottom: 20, left: 20 };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout={layout} margin={chartMargin}>
        <CartesianGrid strokeDasharray="3 3" />
        {layout === 'vertical' ? (
          <>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" />
            <YAxis />
          </>
        )}
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

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

// ==================== 图表容器组件 ====================

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({ title, children, className = '' }: ChartContainerProps) {
  return (
    <div className={`bg-card rounded-lg border p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ==================== 趋势图组件 ====================

interface TrendChartProps {
  data: { date: string; value: number }[];
  color?: string;
  showEmpty?: boolean;
}

export function TrendChart({
  data,
  color = '#ef4444',
  showEmpty = true
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return showEmpty ? (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        暂无数据
      </div>
    ) : null;
  }

  const chartData = data.map(item => ({
    name: typeof item.date === 'string' ? item.date : String(item.date),
    value: item.value
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
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
