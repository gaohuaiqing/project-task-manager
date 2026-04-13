/**
 * 饼图组件 - 共享组件
 * 用于仪表板和报表分析的统一饼图/环形图
 *
 * 设计亮点:
 * - 环形图带中心数据展示
 * - 悬停时扇区外扩 + 发光阴影
 * - 扇区间留白间距
 * - 流畅入场动画
 *
 * @module analytics/shared/components/PieChart
 * @see REQ_07_INDEX.md §5 UI 规范摘要
 */

import * as React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PieChartDataItem } from '../types/charts';
import { DEFAULT_CHART_COLORS } from '../types/charts';

export interface PieChartProps {
  /** 数据 */
  data: PieChartDataItem[];
  /** 加载状态 */
  isLoading?: boolean;
  /** 标题 */
  title?: string;
  /** 图表高度 */
  height?: number;
  /** 是否显示为环形图 */
  donut?: boolean;
  /** 内半径（环形图模式） */
  innerRadius?: number;
  /** 外半径 */
  outerRadius?: number;
  /** 是否显示标签 */
  showLabels?: boolean;
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 自定义颜色 */
  colors?: string[];
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onSliceClick?: (data: PieChartDataItem) => void;
  /** 中心文本（环形图模式） */
  centerText?: string;
  /** 中心数值（环形图模式） */
  centerValue?: string | number;
  /** 副标题/说明文字 */
  subtitle?: string;
}

/**
 * 饼图组件
 *
 * 设计规范:
 * - 默认高度: 300px
 * - 环形图模式，中心数据展示
 * - 悬停外扩 + 发光阴影
 * - 扇区间留白
 */
export function PieChart({
  data,
  isLoading,
  title = '分布',
  height = 300,
  donut = true,
  innerRadius = 55,
  outerRadius = 90,
  showLabels = false,
  showPercentage = true,
  colors = DEFAULT_CHART_COLORS,
  className,
  onSliceClick,
  centerText,
  centerValue,
  subtitle,
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // 计算总值
  const total = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as PieChartDataItem;
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
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
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0 shadow-sm"
              style={{ backgroundColor: item.color || colors[data.indexOf(item) % colors.length] }}
            />
            <span className="font-semibold text-foreground text-xs">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              数量: <span className="font-mono font-bold text-foreground">{item.value.toLocaleString()}</span>
            </span>
            <span className="text-muted-foreground">
              占比: <span className="font-mono font-bold text-foreground">{percent}%</span>
            </span>
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
          <div className="relative">
            <div className="w-36 h-36 rounded-full bg-muted/20 animate-pulse" />
            {donut && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-background" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 空数据
  if (!data || data.length === 0 || total === 0) {
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

  return (
    <Card data-testid="report-chart-pie" className={cn('rounded-xl border-border/40 shadow-none overflow-hidden', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={donut ? innerRadius : 0}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              label={showLabels ? renderLabel(data, total, showPercentage) : undefined}
              labelLine={showLabels}
              onClick={(_, idx) => onSliceClick?.(data[idx])}
              cursor={onSliceClick ? 'pointer' : 'default'}
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => {
                const isActive = activeIndex === null || activeIndex === index;
                const isHovered = activeIndex === index;
                const baseColor = entry.color || colors[index % colors.length];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={baseColor}
                    fillOpacity={isActive ? 1 : 0.3}
                    stroke="none"
                    style={{
                      transition: 'fill-opacity 0.25s ease, transform 0.25s ease',
                      transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      transformOrigin: 'center',
                      filter: isHovered
                        ? `drop-shadow(0 4px 8px ${baseColor}40)`
                        : 'none',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
          </RechartsPieChart>
        </ResponsiveContainer>

        {/* 环形图中心文本 */}
        {donut && (centerText || centerValue !== undefined) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ top: title ? '36px' : 0 }}
          >
            <div className="text-center">
              {centerValue !== undefined && (
                <div className="text-2xl font-bold font-mono tabular-nums tracking-tight">
                  {typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}
                </div>
              )}
              {centerText && (
                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{centerText}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 渲染标签函数工厂 */
function renderLabel(data: PieChartDataItem[], total: number, showPercentage: boolean) {
  return (entry: PieChartDataItem) => {
    if (!showPercentage) return entry.name;
    const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
    return `${percent}%`;
  };
}

export default PieChart;
