/**
 * 预警卡片组件
 * 用于仪表板顶部的风险预警区域
 *
 * @module analytics/dashboard/components/AlertCard
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Clock, FileCheck, AlertCircle, Calendar, CalendarClock } from 'lucide-react';
import type { AlertData, AlertType } from '../types';

export interface AlertCardProps {
  /** 预警数据 */
  alert: AlertData;
  /** 自定义类名 */
  className?: string;
  /** 点击卡片事件 */
  onClick?: () => void;
  /** 点击操作按钮事件 */
  onActionClick?: () => void;
}

/**
 * 预警类型图标映射
 */
const ALERT_ICONS: Record<AlertType, React.ReactNode> = {
  delay_warning: <AlertTriangle className="w-4 h-4" />,
  overdue: <AlertCircle className="w-4 h-4" />,
  pending_approval: <FileCheck className="w-4 h-4" />,
  high_risk: <AlertTriangle className="w-4 h-4" />,
  today_due: <Clock className="w-4 h-4" />,
  week_due: <CalendarClock className="w-4 h-4" />,
};

/**
 * 预警颜色配置
 */
const ALERT_COLORS = {
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/50',
    icon: 'text-red-500',
    text: 'text-red-700 dark:text-red-400',
    count: 'text-red-600 dark:text-red-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    icon: 'text-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    count: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200 dark:border-sky-800/50',
    icon: 'text-sky-500',
    text: 'text-sky-700 dark:text-sky-400',
    count: 'text-sky-600 dark:text-sky-400',
  },
};

/**
 * 预警卡片组件
 *
 * 设计规范:
 * - 根据严重程度显示不同颜色
 * - 显示数量和趋势
 * - 支持点击跳转
 */
export function AlertCard({ alert, className, onClick, onActionClick }: AlertCardProps) {
  const colors = ALERT_COLORS[alert.color];
  const icon = ALERT_ICONS[alert.type];

  const ALERT_TESTID_MAP: Record<AlertType, string> = {
    delay_warning: 'dashboard-card-alert-delay-warning',
    overdue: 'dashboard-card-alert-overdue',
    pending_approval: 'dashboard-card-alert-pending-approval',
    high_risk: 'dashboard-card-alert-high-risk',
    today_due: 'dashboard-card-alert-today-due',
    week_due: 'dashboard-card-alert-week-due',
  };

  return (
    <Card
      data-testid={ALERT_TESTID_MAP[alert.type]}
      className={cn(
        'relative p-4 rounded-xl',
        'border',
        colors.bg,
        colors.border,
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={colors.icon}>{icon}</span>
          <span className={cn('text-sm font-medium', colors.text)}>{alert.label}</span>
        </div>
        {alert.trend !== undefined && (
          <span
            className={cn(
              'text-xs font-medium',
              alert.trend > 0 ? 'text-red-500' : alert.trend < 0 ? 'text-emerald-500' : 'text-gray-400'
            )}
          >
            {alert.trend > 0 ? '↑' : alert.trend < 0 ? '↓' : '→'} {Math.abs(alert.trend)}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold font-mono tabular-nums', colors.count)}>
          {alert.count}
        </span>
        <span className={cn('text-xs', colors.text)}>个</span>
      </div>
      {alert.actionLabel && (
        <button
          className={cn(
            'mt-2 text-xs font-medium',
            colors.text,
            'hover:underline underline-offset-2'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onActionClick?.();
          }}
        >
          {alert.actionLabel} →
        </button>
      )}
    </Card>
  );
}

/**
 * 预警卡片区组件
 */
export interface AlertCardsProps {
  /** 预警数据列表 */
  alerts: AlertData[];
  /** 自定义类名 */
  className?: string;
  /** 点击卡片事件 */
  onAlertClick?: (alert: AlertData) => void;
  /** 点击操作按钮事件 */
  onAlertActionClick?: (alert: AlertData) => void;
}

export function AlertCards({ alerts, className, onAlertClick, onAlertActionClick }: AlertCardsProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-4', alerts.length <= 3 ? 'grid-cols-3' : 'grid-cols-4', className)}>
      {alerts.map((alert, index) => (
        <AlertCard
          key={`${alert.type}-${index}`}
          alert={alert}
          onClick={() => onAlertClick?.(alert)}
          onActionClick={() => onAlertActionClick?.(alert)}
        />
      ))}
    </div>
  );
}

export default AlertCard;
