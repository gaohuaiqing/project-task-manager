/**
 * 任务类型分布图表 - 专用组件
 * 基于12种任务类型的分组展示，解决多类别图表可读性问题
 *
 * 设计要点:
 * - 按分组色系着色，一目了然
 * - 按数量降序排列，突出重点
 * - 柱条右侧显示"数量 + 占比%"
 * - Tooltip 包含分类说明
 * - 底部分组图例
 * - 悬停高亮非活跃柱条淡出
 * - 双色渐变柱体
 *
 * @module analytics/shared/components/TaskTypeChart
 */

import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PieChartDataItem } from '../types/charts';
import {
  TASK_TYPE_GROUPS,
  TASK_TYPE_DESCRIPTIONS,
  TASK_TYPE_GROUP_MAP,
  TASK_TYPE_LABELS,
} from '../constants/labels';
import {
  TASK_TYPE_COLORS,
  TASK_TYPE_GROUP_COLORS,
} from '../constants/colors';

export interface TaskTypeChartProps {
  /** 数据 - 复用 PieChartDataItem 格式 */
  data: PieChartDataItem[];
  /** 加载状态 */
  isLoading?: boolean;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
  /** 图表高度（默认 480，适合12条目完整显示） */
  height?: number;
}

/** 中文类型名 → 常量 key 反查表 */
const NAME_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(TASK_TYPE_LABELS).map(([k, v]) => [v, k])
);

/** 分组配置 */
const GROUP_ENTRIES = Object.entries(TASK_TYPE_GROUPS) as [
  keyof typeof TASK_TYPE_GROUPS,
  (typeof TASK_TYPE_GROUPS)[keyof typeof TASK_TYPE_GROUPS],
][];

/**
 * 任务类型分布图表
 */
export function TaskTypeChart({
  data,
  isLoading,
  title = '任务类型分布',
  className,
  height = 480,
}: TaskTypeChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // 排序 + 计算百分比
  const { sortedData, total } = React.useMemo(() => {
    const t = data.reduce((sum, item) => sum + item.value, 0);
    const sorted = [...data]
      .sort((a, b) => b.value - a.value)
      .map((item) => ({
        ...item,
        percentage: t > 0 ? ((item.value / t) * 100).toFixed(1) : '0',
        // 查找常量 key 以获取分组颜色
        color: item.color || getTaskColor(item.name),
      }));
    return { sortedData: sorted, total: t };
  }, [data]);

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const key = NAME_TO_KEY[item.name];
    const desc = key ? TASK_TYPE_DESCRIPTIONS[key] : '';
    const groupKey = key ? TASK_TYPE_GROUP_MAP[key] : undefined;
    const groupLabel = groupKey ? TASK_TYPE_GROUPS[groupKey].label : '';

    return (
      <div
        className={cn(
          'bg-popover/95 backdrop-blur-md',
          'border border-border/50',
          'rounded-xl shadow-xl shadow-black/[0.08] p-3',
          'text-sm max-w-[260px]',
          'ring-1 ring-black/[0.03]',
        )}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-[3px] flex-shrink-0 shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-semibold text-foreground">
            {item.name}
          </span>
        </div>
        {desc && (
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
            {desc}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            数量: <span className="font-mono font-bold text-foreground">{item.value}</span>
          </span>
          <span className="text-muted-foreground">
            占比: <span className="font-mono font-bold text-foreground">{item.percentage}%</span>
          </span>
        </div>
        {groupLabel && (
          <div className="mt-2 pt-1.5 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground">
              分组: {groupLabel}
            </span>
          </div>
        )}
      </div>
    );
  };

  // 加载状态
  if (isLoading) {
    return (
      <Card className={cn('rounded-xl border-border/40 shadow-none', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="animate-pulse w-full h-32 bg-muted/20 rounded" />
        </CardContent>
      </Card>
    );
  }

  // 空数据
  if (!data || data.length === 0 || total === 0) {
    return (
      <Card className={cn('rounded-xl border-border/40 shadow-none', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 生成渐变 ID
  const gradientId = React.useId();

  return (
    <Card className={cn('rounded-xl border-border/40 shadow-none overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          共 {total} 项任务 · {data.length} 种类型
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 75, left: 5, bottom: 22 }}
            barCategoryGap="80%"
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              {sortedData.map((entry, idx) => {
                const baseColor = entry.color || '#94A3B8';
                // 创建同色系渐变：从原色到更亮版本
                return (
                  <linearGradient
                    key={`grad-${idx}`}
                    id={`task-grad-${gradientId}-${idx}`}
                    x1="0" y1="0" x2="1" y2="0"
                  >
                    <stop offset="0%" stopColor={baseColor} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={1} />
                  </linearGradient>
                );
              })}
              {/* 悬停发光滤镜 */}
              <filter id={`task-glow-${gradientId}`} x="-10%" y="-30%" width="120%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              label={{
                value: '数量',
                position: 'bottom',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              stroke="none"
              tickLine={false}
              axisLine={false}
              width={90}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.04 }} />
            <Bar
              dataKey="value"
              barSize={22}
              radius={[0, 6, 6, 0]}
              onMouseEnter={(_, idx) => setActiveIndex(idx)}
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {sortedData.map((entry, idx) => {
                const isActive = activeIndex === null || activeIndex === idx;
                return (
                  <Cell
                    key={`cell-${idx}`}
                    fill={`url(#task-grad-${gradientId}-${idx})`}
                    fillOpacity={isActive ? 1 : 0.25}
                    style={{
                      transition: 'fill-opacity 0.25s ease, filter 0.25s ease',
                      filter: activeIndex === idx ? `url(#task-glow-${gradientId})` : 'none',
                    }}
                  />
                );
              })}
              <LabelList
                dataKey="value"
                position="right"
                content={({ x, y, width, height: barH, value, index }) => {
                  if (index === undefined || index >= sortedData.length) return null;
                  const item = sortedData[index];
                  const isActive = activeIndex === index;
                  return (
                    <g>
                      <text
                        x={(x as number) + (width as number) + 8}
                        y={(y as number) + (barH as number) / 2}
                        fontSize={11}
                        fontWeight={700}
                        fontFamily="system-ui, sans-serif"
                        fill={isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
                        dominantBaseline="middle"
                        className="transition-colors duration-200"
                      >
                        {value}
                      </text>
                      <text
                        x={(x as number) + (width as number) + 8 + String(value).length * 7 + 4}
                        y={(y as number) + (barH as number) / 2}
                        fontSize={10}
                        fontFamily="system-ui, sans-serif"
                        fill="hsl(var(--muted-foreground))"
                        dominantBaseline="middle"
                        opacity={0.7}
                      >
                        ({item.percentage}%)
                      </text>
                    </g>
                  );
                }}
              />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>

        {/* 分组图例 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border/40">
          {GROUP_ENTRIES.map(([key, group]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block w-2.5 h-2.5 rounded-[3px]"
                style={{ backgroundColor: TASK_TYPE_GROUP_COLORS[key] }}
              />
              <span className="text-muted-foreground">{group.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 根据任务类型中文名查找对应颜色
 */
function getTaskColor(name: string): string {
  const key = NAME_TO_KEY[name];
  if (key && TASK_TYPE_COLORS[key]) {
    return TASK_TYPE_COLORS[key];
  }
  return '#94A3B8';
}

export default TaskTypeChart;
