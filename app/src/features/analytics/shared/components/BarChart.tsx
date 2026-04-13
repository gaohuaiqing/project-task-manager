/**
 * 柱状图组件 - 共享组件
 * 用于仪表板和报表分析的统一柱状图
 *
 * 设计亮点:
 * - 双色渐变柱体（饱和→明亮）
 * - 悬停时柱体发光 + 微缩放
 * - 数值标签带半透明背景药丸
 * - 点状网格线，更现代
 * - 流畅的交错入场动画
 *
 * @module analytics/shared/components/BarChart
 * @see REQ_07_INDEX.md §5 UI 规范摘要
 */

import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { BarChartDataItem } from '../types/charts';
import { DEFAULT_CHART_COLORS } from '../types/charts';
import { CHART_GRADIENT_PAIRS } from '../constants/colors';

export interface BarChartProps {
  /** 数据 */
  data: BarChartDataItem[];
  /** 加载状态 */
  isLoading?: boolean;
  /** 标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** 数据键配置 */
  dataKeys?: Array<{
    key: string;
    name: string;
    color?: string;
  }>;
  /** X轴数据键 */
  xAxisKey?: string;
  /** 布局方向 */
  layout?: 'horizontal' | 'vertical';
  /** 是否显示网格线 */
  showGrid?: boolean;
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 是否堆叠 */
  stacked?: boolean;
  /** 柱子宽度 */
  barSize?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onBarClick?: (data: BarChartDataItem) => void;
  /** 最大值（Y轴） */
  maxValue?: number;
  /** 参考线配置 */
  referenceLine?: {
    value: number;
    label: string;
    color?: string;
  };
  /** 副标题/说明文字 */
  subtitle?: string;
  /** 是否在柱子顶部显示数值标签 */
  showValueLabel?: boolean;
  /** X轴标签 */
  xAxisLabel?: string;
  /** Y轴标签 */
  yAxisLabel?: string;
}

const DEFAULT_DATA_KEYS = [
  { key: 'value', name: '数量', color: DEFAULT_CHART_COLORS[0] },
];

/**
 * 柱状图组件
 *
 * 设计规范:
 * - 默认高度: 300px
 * - 双色渐变柱体
 * - 悬停发光 + 微缩放
 * - 大圆角柱体
 * - 数值标签药丸背景
 */
export function BarChart({
  data,
  isLoading,
  title = '统计',
  height = 300,
  dataKeys = DEFAULT_DATA_KEYS,
  xAxisKey = 'name',
  layout = 'horizontal',
  showGrid = true,
  showLegend = true,
  stacked = false,
  barSize,
  className,
  onBarClick,
  maxValue,
  referenceLine,
  subtitle,
  showValueLabel,
  xAxisLabel,
  yAxisLabel,
}: BarChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

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
                  className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0 shadow-sm"
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
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-end justify-center gap-2 px-6 pb-6 pt-2" style={{ height }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted/30 rounded-xl animate-pulse"
              style={{ height: `${30 + Math.random() * 50}%` }}
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
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  const isVertical = layout === 'vertical';

  // 为每个数据键生成唯一渐变 ID
  const gradientId = React.useId();

  // 根据颜色获取渐变对
  const getGradientPair = (color: string, fallbackIndex: number): [string, string] => {
    const pair = CHART_GRADIENT_PAIRS.find(([start]) => start === color);
    if (pair) return pair;
    // 回退：从 DEFAULT_CHART_COLORS 中查找对应渐变对
    const colorIndex = DEFAULT_CHART_COLORS.indexOf(color as any);
    if (colorIndex >= 0) return CHART_GRADIENT_PAIRS[colorIndex];
    return CHART_GRADIENT_PAIRS[fallbackIndex % CHART_GRADIENT_PAIRS.length];
  };

  return (
    <Card data-testid="report-chart-bar" className={cn('rounded-xl border-border/40 shadow-none overflow-hidden', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{ top: showValueLabel ? 28 : 12, right: 12, left: isVertical ? 80 : (yAxisLabel ? 20 : -4), bottom: xAxisLabel ? 24 : 4 }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              {dataKeys.map((dataKey, index) => {
                const baseColor = dataKey.color || DEFAULT_CHART_COLORS[index];
                const [startColor, endColor] = getGradientPair(baseColor, index);
                return (
                  <linearGradient
                    key={dataKey.key}
                    id={`bar-gradient-${gradientId}-${index}`}
                    x1="0" y1="0" x2={isVertical ? "1" : "0"} y2={isVertical ? "0" : "1"}
                  >
                    <stop offset="0%" stopColor={startColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={endColor} stopOpacity={0.85} />
                  </linearGradient>
                );
              })}
              {/* 悬停发光滤镜 */}
              <filter id={`bar-glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 8"
                stroke="hsl(var(--border))"
                strokeOpacity={0.35}
                horizontal={!isVertical}
                vertical={isVertical}
              />
            )}
            <XAxis
              type={isVertical ? 'number' : 'category'}
              dataKey={isVertical ? undefined : xAxisKey}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              domain={isVertical ? [0, maxValue] : undefined}
              interval={isVertical ? undefined : 'preserveStartEnd'}
              label={xAxisLabel ? {
                value: xAxisLabel,
                position: 'bottom',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              } : undefined}
            />
            <YAxis
              {...(isVertical ? { type: 'category' as const, dataKey: xAxisKey, width: 72 } : {})}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              domain={!isVertical && maxValue != null ? [0, maxValue] : undefined}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: 'left',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              } : undefined}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.04, radius: 4 }}
              isAnimationActive={false}
            />
            {referenceLine && (
              <ReferenceLine
                {...(isVertical
                  ? { x: referenceLine.value }
                  : { y: referenceLine.value })}
                stroke={referenceLine.color || '#F59E0B'}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: referenceLine.label,
                  position: isVertical ? 'top' : 'insideTopRight',
                  fill: referenceLine.color || '#F59E0B',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}
            {/* 多系列时显示 Legend 说明每个系列含义，单系列无需图例（X轴标签已说明） */}
            {showLegend && dataKeys.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
            )}
            {dataKeys.map((dataKey, index) => (
              <Bar
                key={dataKey.key}
                dataKey={dataKey.key}
                name={dataKey.name}
                fill={`url(#bar-gradient-${gradientId}-${index})`}
                stackId={stacked ? 'stack' : undefined}
                barSize={barSize}
                radius={stacked ? undefined : isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                onClick={(data) => onBarClick?.(data.payload)}
                cursor={onBarClick ? 'pointer' : 'default'}
                onMouseEnter={(_, idx) => setActiveIndex(idx)}
                animationBegin={0}
                animationDuration={700}
                animationEasing="ease-out"
              >
                {showValueLabel && (
                  <LabelList
                    dataKey={dataKey.key}
                    position={isVertical ? 'right' : 'top'}
                    content={({ x, y, width, height: barH, value, index: idx }) => {
                      if (idx === undefined || value === undefined || value === 0) return null;
                      const isActive = activeIndex === idx;
                      return (
                        <g>
                          {/* 药丸背景 */}
                          <rect
                            x={isVertical
                              ? (x as number) + (width as number) + 5
                              : (x as number) + (width as number) / 2 - 12}
                            y={isVertical
                              ? (y as number) + (barH as number) / 2 - 8
                              : (y as number) - 16}
                            width={24}
                            height={16}
                            rx={4}
                            fill={isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted)/0.6)'}
                            className="transition-all duration-200"
                          />
                          {/* 数值文本 */}
                          <text
                            x={isVertical
                              ? (x as number) + (width as number) + 17
                              : (x as number) + (width as number) / 2}
                            y={isVertical
                              ? (y as number) + (barH as number) / 2 + 1
                              : (y as number) - 7}
                            fontSize={10}
                            fontWeight={600}
                            fontFamily="system-ui, sans-serif"
                            fill={isActive ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))'}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="transition-colors duration-200"
                          >
                            {typeof value === 'number' ? value : value}
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
              </Bar>
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default BarChart;
