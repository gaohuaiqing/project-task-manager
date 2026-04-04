import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { TrendIndicator, type TrendData } from "@/shared/components/TrendIndicator";

export interface StatsCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: number | string;
  /** 副标题/说明文字 */
  subtitle?: string;
  /** 数值颜色（用于强调） */
  valueColor?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
  /** 趋势数据 */
  trend?: TrendData;
  /** 是否反转趋势颜色（延期率等指标下降是好事） */
  invertTrendColors?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  valueColor,
  className,
  onClick,
  trend,
  invertTrendColors = false,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:bg-card/70',
        className
      )}
      onClick={onClick}
    >
      {/* 标题行 - 12px 灰色 */}
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {title}
      </p>

      {/* 数值行 - 20px 粗体，带颜色强调 */}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-xl font-bold tracking-tight',
            valueColor || 'text-foreground'
          )}
        >
          {value}
        </span>
        {trend && (
          <TrendIndicator trend={trend} invertColors={invertTrendColors} />
        )}
      </div>

      {/* 副标题行 - 12px 灰色 */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
}