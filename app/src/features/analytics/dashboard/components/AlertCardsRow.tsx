/**
 * 预警卡片行组件
 *
 * @module analytics/dashboard/components/AlertCardsRow
 * @description 预警卡片的行布局，自适应 3/4 列
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { AlertData } from '../types';

export interface AlertCardsRowProps {
  /** 预警数据数组 */
  alerts: AlertData[];
  /** 点击操作按钮回调 */
  onActionClick?: (alert: AlertData) => void;
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 预警图标映射
 */
const ALERT_ICONS: Record<string, React.ReactNode> = {
  delay_warning: <Clock className="h-4 w-4" />,
  overdue: <AlertTriangle className="h-4 w-4" />,
  pending_approval: <AlertCircle className="h-4 w-4" />,
  high_risk: <AlertTriangle className="h-4 w-4" />,
  today_due: <Clock className="h-4 w-4" />,
  week_due: <Clock className="h-4 w-4" />,
};

/**
 * 预警颜色映射
 */
const ALERT_COLORS = {
  danger: {
    border: 'border-red-200 dark:border-red-800',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-500',
    value: 'text-red-600 dark:text-red-400',
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-500',
    value: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-500',
    value: 'text-blue-600 dark:text-blue-400',
  },
};

/**
 * 预警卡片行
 *
 * 设计规范:
 * - 自适应 3-4 列布局
 * - 带颜色边框的卡片
 * - 显示数量和趋势
 * - 支持操作按钮
 */
export function AlertCardsRow({
  alerts,
  onActionClick,
  className,
  'data-testid': testId,
}: AlertCardsRowProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        alerts.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4',
        className
      )}
      data-testid={testId}
    >
      {alerts.map((alert, index) => {
        const colors = ALERT_COLORS[alert.color];
        const icon = ALERT_ICONS[alert.type] || <AlertCircle className="h-4 w-4" />;

        return (
          <Card
            key={alert.type}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all duration-200',
              colors.border,
              colors.bg,
              'hover:shadow-md cursor-pointer'
            )}
            onClick={() => onActionClick?.(alert)}
            data-testid={`alert-card-${index}`}
          >
            {/* 图标和标签 */}
            <div className="flex items-center gap-2 mb-2">
              <span className={colors.icon}>{icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {alert.label}
              </span>
            </div>

            {/* 数值 */}
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold font-mono tabular-nums', colors.value)}>
                {alert.count}
              </span>
              {alert.trend !== undefined && alert.trend !== 0 && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    alert.trend > 0 ? 'text-red-500' : 'text-emerald-500'
                  )}
                >
                  {alert.trend > 0 ? '↑' : '↓'} {Math.abs(alert.trend)}
                </span>
              )}
            </div>

            {/* 操作按钮 */}
            {alert.actionLabel && (
              <button
                className={cn(
                  'mt-2 text-xs font-medium flex items-center gap-1',
                  colors.value,
                  'hover:underline'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onActionClick?.(alert);
                }}
              >
                {alert.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default AlertCardsRow;
