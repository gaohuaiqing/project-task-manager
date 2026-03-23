/**
 * 任务趋势折线图组件
 * 显示30天任务完成趋势
 */
import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

interface TrendDataPoint {
  date: string;
  completed: number;
  created: number;
  delayed: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  isLoading?: boolean;
  title?: string;
}

export function TrendChart({ data, isLoading, title = '任务趋势（30天）' }: TrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      dateLabel: new Date(item.date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              name="新建任务"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="完成任务"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="delayed"
              name="延期任务"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
