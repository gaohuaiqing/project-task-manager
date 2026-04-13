/**
 * 趋势图表组件 - 共享组件
 * 用于仪表板和报表分析的统一趋势图
 *
 * 设计亮点:
 * - 线下柔和渐变面积填充
 * - 悬停时数据点带光晕环
 * - 点状网格线
 * - 流畅曲线入场动画
 *
 * @module analytics/shared/components/TrendChart
 * @see REQ_07_INDEX.md §5 UI 规范摘要
 */

import * as React from 'react';
import {
  AreaChart,
  Area,
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
import { cn } from '@/lib/utils';
import type { TrendDataPoint } from '../types/charts';
import { DEFAULT_CHART_COLORS } from '../types/charts';

export interface TrendChartProps {
  /** 数据 */
  data: TrendDataPoint[];
  /** 加载状态 */
  isLoading?: boolean;
  /** 标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** 是否显示时间范围选择器 */
  showTimeRangeSelector?: boolean;
  /** 时间范围变更回调 */
  onRangeChange?: (days: number) => void;
  /** 默认时间范围（天数） */
  defaultRange?: number;
  /** 数据系列配置 */
  series?: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  /** 自定义类名 */
  className?: string;
  /** 是否平滑曲线 */
  smooth?: boolean;
  /** 是否显示数据点 */
  showDots?: boolean;
  /** 自定义 X 轴格式化函数 */
  xAxisFormatter?: (value: string) => string;
  /** 副标题 */
  subtitle?: string;
  /** Y轴标签 */
  yAxisLabel?: string;
}

const TIME_RANGES = [
  { value: '7', label: '近7天' },
  { value: '30', label: '近30天' },
  { value: '90', label: '近90天' },
] as const;

const DEFAULT_SERIES = [
  { dataKey: 'created', name: '新建', color: DEFAULT_CHART_COLORS[0] },
  { dataKey: 'completed', name: '完成', color: DEFAULT_CHART_COLORS[1] },
  { dataKey: 'delayed', name: '延期', color: DEFAULT_CHART_COLORS[3] },
];

/**
 * 趋势图表组件
 *
 * 使用 AreaChart 替代 LineChart，提供更丰富的渐变面积填充效果。
 * 设计规范:
 * - 图表高度: 300px
 * - 线下渐变面积填充
 * - 悬停数据点光晕环
 * - 曲线入场动画
 */
export function TrendChart({
  data,
  isLoading,
  title = '趋势',
  height = 300,
  showTimeRangeSelector = true,
  onRangeChange,
  defaultRange = 30,
  series = DEFAULT_SERIES,
  className,
  smooth = true,
  showDots = false,
  xAxisFormatter,
  subtitle,
  yAxisLabel,
}: TrendChartProps) {
  const [selectedRange, setSelectedRange] = React.useState(String(defaultRange));
  const gradientId = React.useId();

  // 格式化数据
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      let dateLabel = item.date;
      if (xAxisFormatter) {
        dateLabel = xAxisFormatter(item.date);
      } else {
        // 尝试解析日期，失败则使用原始标签
        const parsed = new Date(item.date);
        dateLabel = isNaN(parsed.getTime())
          ? String(item.date)
          : parsed.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      }
      return { ...item, dateLabel };
    });
  }, [data, xAxisFormatter]);

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    onRangeChange?.(parseInt(value));
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={cn(
            'bg-popover/95 backdrop-blur-md',
            'border border-border/50',
            'rounded-xl shadow-xl shadow-black/[0.08] p-3',
            'text-sm',
            'ring-1 ring-black/[0.03]',
          )}
        >
          <p className="font-semibold text-foreground mb-2 text-xs tracking-wide">{label}</p>
          <div className="space-y-1.5">
            {payload.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground text-xs">{item.name}</span>
                <span className="font-mono font-bold text-foreground text-xs ml-auto tabular-nums">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // 加载骨架屏
  if (isLoading) {
    return (
      <Card className={cn('rounded-xl border-border/40 shadow-none', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-end gap-1 px-6 pb-6 pt-2" style={{ height }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted/20 rounded-t-md animate-pulse"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  // 空数据
  if (!data || data.length === 0) {
    return (
      <Card className={cn('rounded-xl border-border/40 shadow-none', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="report-chart-trend" className={cn('rounded-xl border-border/40 shadow-none overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {showTimeRangeSelector && onRangeChange && (
            <Select value={selectedRange} onValueChange={handleRangeChange}>
              <SelectTrigger className="h-7 w-[90px] text-xs border-border/50">
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: yAxisLabel ? 20 : -4, bottom: 4 }}>
            <defs>
              {series.map((s, index) => {
                const color = s.color || DEFAULT_CHART_COLORS[index];
                return (
                  <linearGradient
                    key={s.dataKey}
                    id={`area-gradient-${gradientId}-${index}`}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="50%" stopColor={color} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 8"
              stroke="hsl(var(--border))"
              strokeOpacity={0.35}
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: 'left',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              } : undefined}
            />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
            {series.map((s, index) => {
              const color = s.color || DEFAULT_CHART_COLORS[index];
              return (
                <Area
                  key={s.dataKey}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeOpacity={0.9}
                  fill={`url(#area-gradient-${gradientId}-${index})`}
                  dot={showDots ? {
                    r: 3,
                    fill: color,
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  } : false}
                  activeDot={{
                    r: 5,
                    fill: 'hsl(var(--background))',
                    stroke: color,
                    strokeWidth: 2.5,
                    style: {
                      filter: `drop-shadow(0 0 6px ${color}50)`,
                    },
                  }}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default TrendChart;
