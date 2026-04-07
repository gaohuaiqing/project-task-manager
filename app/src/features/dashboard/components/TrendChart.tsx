/**
 * 任务趋势折线图组件
 * 显示任务完成趋势，支持时间范围选择
 *
 * 设计规范:
 * - 标题栏集成时间选择器
 * - 图表区域优化样式
 */
import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  onRangeChange?: (days: number) => void;
}

const TIME_RANGES = [
  { value: '7', label: '近7天' },
  { value: '30', label: '近30天' },
  { value: '90', label: '近90天' },
] as const;

export function TrendChart({
  data,
  isLoading,
  title = '任务趋势',
  onRangeChange,
}: TrendChartProps) {
  const [selectedRange, setSelectedRange] = useState('30');

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      dateLabel: new Date(item.date).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    onRangeChange?.(parseInt(value));
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
          <Select value={selectedRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="created"
              name="新建任务"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="完成任务"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="delayed"
              name="延期任务"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
