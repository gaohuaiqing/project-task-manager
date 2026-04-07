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
  /** 数值颜色（用于强调，覆盖默认绿色） */
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

/**
 * 统计卡片组件 - 专业仪表盘风格
 * 参考设计: https://api.svips.org/dashboard
 *
 * 设计规范:
 * - 3层信息结构: 标签(小字) → 大数字(加粗) → 副标题(补充)
 * - 主数值: 20px加粗，等宽数字(tabular-nums)，绿色强调
 * - 标签: 12px中等字重，大写字母间距
 * - 卡片圆角: 16px
 * - 边框: 0.8px半透明边框
 * - Hover: 阴影加深 + 轻微上浮
 */
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
        // 基础样式 - 专业仪表盘风格
        'relative p-4 rounded-2xl',
        // 边框 - 半透明，增强层次感
        'border border-gray-100 dark:border-slate-700/50',
        // 背景 - 纯白色卡片，深色主题半透明
        'bg-white dark:bg-slate-800/50',
        // 阴影 - 轻微阴影定义边界
        'shadow-sm',
        // 过渡动画
        'transition-all duration-200',
        // 交互状态 - hover时阴影加深 + 轻微上浮
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {/* 第1层：标签 - 12px 中等字重，大写字母间距 */}
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {title}
      </p>

      {/* 第2层：大数字 - 20px 加粗，等宽数字，绿色强调 */}
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={cn(
            'text-xl font-bold leading-none',
            // 等宽数字，防止数值跳动
            'font-mono tabular-nums',
            // 默认绿色强调，可被 valueColor 覆盖
            valueColor || 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {value}
        </span>
        {trend && (
          <TrendIndicator trend={trend} invertColors={invertTrendColors} />
        )}
      </div>

      {/* 第3层：副标题 - 补充说明（总计、对比等） */}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </Card>
  );
}
