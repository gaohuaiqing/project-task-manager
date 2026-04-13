/**
 * 散点图组件 - 共享组件
 * 用于仪表板和报表分析的散点图/四象限图
 *
 * 设计亮点:
 * - 四象限柔和背景填充
 * - 气泡悬停发光 + 描边高亮
 * - 点状网格线
 * - 风险等级彩色标签
 *
 * @module analytics/shared/components/ScatterChart
 * @see REQ_07_INDEX.md §5 UI 规范摘要
 */

import * as React from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScatterDataPoint } from '../types/charts';
import { DEFAULT_CHART_COLORS } from '../types/charts';

export interface ScatterChartProps {
  /** 数据 */
  data: ScatterDataPoint[];
  /** 加载状态 */
  isLoading?: boolean;
  /** 标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** X轴配置 */
  xAxisConfig?: {
    key: string;
    label: string;
    domain?: [number, number];
  };
  /** Y轴配置 */
  yAxisConfig?: {
    key: string;
    label: string;
    domain?: [number, number];
  };
  /** 是否显示四象限线 */
  showQuadrant?: boolean;
  /** 四象限参考线位置 */
  quadrantConfig?: any;
  /** 是否按分组显示 */
  groupBy?: string;
  /** 分组颜色映射 */
  groupColors?: Record<string, string>;
  /** 是否显示大小变化 */
  showSize?: boolean;
  /** 大小数据键 */
  sizeKey?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onPointClick?: (data: ScatterDataPoint) => void;
  /** 副标题 */
  subtitle?: string;
}

/**
 * 散点图组件
 *
 * 设计规范:
 * - 默认高度: 300px
 * - 四象限柔和背景
 * - 气泡悬停发光
 * - 轴标签清晰
 */
export function ScatterChart({
  data,
  isLoading,
  title = '散点分析',
  height = 300,
  xAxisConfig = { key: 'x', label: 'X轴', domain: [0, 100] as [number, number] },
  yAxisConfig = { key: 'y', label: 'Y轴', domain: [0, 100] as [number, number] },
  showQuadrant = false,
  quadrantConfig,
  groupBy,
  groupColors = {},
  showSize = false,
  sizeKey = 'size',
  className,
  onPointClick,
  subtitle,
}: ScatterChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // 按分组聚合数据
  const groupedData = React.useMemo(() => {
    if (!groupBy) {
      return { default: data };
    }
    const groups: Record<string, ScatterDataPoint[]> = {};
    data.forEach((point) => {
      const group = String((point as any)[groupBy] || 'default');
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(point);
    });
    return groups;
  }, [data, groupBy]);

  // 获取分组颜色
  const getGroupColor = (group: string, index: number) => {
    return groupColors[group] || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ScatterDataPoint;
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
          {point.name && (
            <p className="font-semibold text-foreground mb-2 text-xs">{point.name}</p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{xAxisConfig.label}:</span>
              <span className="font-mono font-bold text-foreground">
                {(point as any)[xAxisConfig.key]?.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{yAxisConfig.label}:</span>
              <span className="font-mono font-bold text-foreground">
                {(point as any)[yAxisConfig.key]?.toFixed(1)}
              </span>
            </div>
            {showSize && (point as any)[sizeKey] !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">大小:</span>
                <span className="font-mono font-bold text-foreground">
                  {(point as any)[sizeKey]}
                </span>
              </div>
            )}
            {(point as any).riskLevel && (
              <div className={cn(
                'mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block',
                (point as any).riskLevel === 'high' && 'bg-red-100/80 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                (point as any).riskLevel === 'medium' && 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                (point as any).riskLevel === 'low' && 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              )}>
                {(point as any).riskLevel === 'high' ? '高风险' : (point as any).riskLevel === 'medium' ? '中风险' : '低风险'}
              </div>
            )}
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
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="w-full h-full bg-muted/15 rounded-xl animate-pulse relative">
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-muted/30 rounded-full" />
            <div className="absolute top-1/3 left-2/3 w-4 h-4 bg-muted/30 rounded-full" />
            <div className="absolute top-2/3 left-1/3 w-3 h-3 bg-muted/30 rounded-full" />
            <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-muted/30 rounded-full" />
          </div>
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

  // 四象限参考线位置
  const xRef = quadrantConfig?.centerX ?? quadrantConfig?.xThreshold ?? 50;
  const yRef = quadrantConfig?.centerY ?? quadrantConfig?.yThreshold ?? 50;
  const xDomain = xAxisConfig.domain || [0, 100];
  const yDomain = yAxisConfig.domain || [0, 100];

  return (
    <Card data-testid="report-chart-scatter" className={cn('rounded-xl border-border/40 shadow-none overflow-hidden', className)}>
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
          <RechartsScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            {/* 四象限背景 */}
            {showQuadrant && (
              <>
                <ReferenceArea
                  x1={xRef} x2={xDomain[1]}
                  y1={yRef} y2={yDomain[1]}
                  fill="#10B981" fillOpacity={0.04}
                />
                <ReferenceArea
                  x1={xDomain[0]} x2={xRef}
                  y1={yRef} y2={yDomain[1]}
                  fill="#F59E0B" fillOpacity={0.04}
                />
                <ReferenceArea
                  x1={xDomain[0]} x2={xRef}
                  y1={yDomain[0]} y2={yRef}
                  fill="#EF4444" fillOpacity={0.04}
                />
                <ReferenceArea
                  x1={xRef} x2={xDomain[1]}
                  y1={yDomain[0]} y2={yRef}
                  fill="#3B82F6" fillOpacity={0.04}
                />
              </>
            )}

            <CartesianGrid strokeDasharray="3 8" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis
              type="number"
              dataKey={xAxisConfig.key}
              name={xAxisConfig.label}
              domain={xAxisConfig.domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              label={{
                value: xAxisConfig.label,
                position: 'bottom',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
                offset: 0,
              }}
            />
            <YAxis
              type="number"
              dataKey={yAxisConfig.key}
              name={yAxisConfig.label}
              domain={yAxisConfig.domain}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              label={{
                value: yAxisConfig.label,
                angle: -90,
                position: 'left',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            {showSize && <ZAxis type="number" dataKey={sizeKey} range={[60, 320]} />}
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.2 }} />
            {groupBy && (
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
            )}

            {/* 四象限参考线 */}
            {showQuadrant && (
              <>
                <ReferenceLine
                  x={xRef}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.3}
                  strokeWidth={1}
                />
                <ReferenceLine
                  y={yRef}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.3}
                  strokeWidth={1}
                />
              </>
            )}

            {/* 四象限角标 */}
            {showQuadrant && quadrantConfig?.quadrantLabels && (
              <>
                <ReferenceLine
                  x={xDomain[0]} y={yDomain[1]}
                  label={{ value: quadrantConfig.quadrantLabels.topLeft || '', position: 'insideTopLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                  stroke="none"
                />
                <ReferenceLine
                  x={xDomain[1]} y={yDomain[1]}
                  label={{ value: quadrantConfig.quadrantLabels.topRight || '', position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                  stroke="none"
                />
                <ReferenceLine
                  x={xDomain[0]} y={yDomain[0]}
                  label={{ value: quadrantConfig.quadrantLabels.bottomLeft || '', position: 'insideBottomLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                  stroke="none"
                />
                <ReferenceLine
                  x={xDomain[1]} y={yDomain[0]}
                  label={{ value: quadrantConfig.quadrantLabels.bottomRight || '', position: 'insideBottomRight', fontSize: 9, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
                  stroke="none"
                />
              </>
            )}

            {/* 渲染散点 */}
            {Object.entries(groupedData).map(([group, points], index) => (
              <Scatter
                key={group}
                name={group === 'default' ? '数据点' : group}
                data={points}
                fill={getGroupColor(group, index)}
                fillOpacity={0.75}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                onClick={(data) => onPointClick?.(data)}
                cursor={onPointClick ? 'pointer' : 'default'}
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
          </RechartsScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default ScatterChart;
