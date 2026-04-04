/**
 * 报表动态维度趋势区域组件
 * 为每个报表Tab提供统一的时间序列趋势图展示
 * 符合需求文档 REQ_07_analytics.md 双维度规范
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useReportTrend, type ReportTrendParams } from '../hooks/useReportData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// 时间范围选项
const TIME_RANGES = [
  { label: '7天', days: 7 },
  { label: '30天', days: 30 },
  { label: '本季度', days: 90 },
] as const;

function getGranularity(days: number): 'day' | 'week' | 'month' {
  if (days <= 14) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

function formatDateLabel(dateStr: string, granularity: string): string {
  if (granularity === 'day') {
    return dateStr.slice(5); // MM-DD
  }
  if (granularity === 'week') {
    return dateStr.slice(5); // MM-DD (周起始日)
  }
  return dateStr.slice(0, 7); // YYYY-MM
}

interface ReportTrendSectionProps {
  metric: ReportTrendParams['metric'];
  title: string;
  projectId?: string;
  color?: string;
}

export function ReportTrendSection({
  metric,
  title,
  projectId,
  color = '#3b82f6',
}: ReportTrendSectionProps) {
  const [selectedDays, setSelectedDays] = useState(30);

  const granularity = getGranularity(selectedDays);

  // 计算日期范围
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - selectedDays);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [selectedDays]);

  const { data: trendData, isLoading } = useReportTrend({
    metric,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    granularity,
    projectId,
  });

  const chartData = useMemo(() => {
    if (!trendData) return [];
    return trendData.map((point) => ({
      date: formatDateLabel(point.date, granularity),
      value: point.value,
    }));
  }, [trendData, granularity]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.days}
              variant={selectedDays === range.days ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setSelectedDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <LoadingSpinner />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            暂无趋势数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
