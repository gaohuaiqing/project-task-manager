/**
 * 状态指示器组件
 *
 * 功能：
 * 1. 显示后端/服务连接状态
 * 2. 显示操作状态
 * 3. 支持自定义图标和颜色
 *
 * @module components/common/StatusIndicator
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, LucideIcon } from 'lucide-react';

export type StatusType = 'online' | 'offline' | 'loading' | 'warning';

export interface StatusIndicatorProps {
  /** 状态类型 */
  status: StatusType;
  /** 状态文本 */
  text?: string;
  /** 时间戳 */
  timestamp?: Date | string;
  /** 自定义图标 */
  icon?: LucideIcon;
  /** 自定义类名 */
  className?: string;
}

/**
 * 状态配置
 */
const STATUS_CONFIG = {
  online: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    text: '在线',
  },
  offline: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    text: '离线',
  },
  loading: {
    icon: CheckCircle2, // 可以用 LoadingIcon
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    text: '加载中',
  },
  warning: {
    icon: XCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    text: '警告',
  },
} as const;

/**
 * 格式化时间
 */
function formatTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString();
}

/**
 * 状态指示器组件
 *
 * @example
 * ```tsx
 * <StatusIndicator
 *   status="online"
 *   text="后端服务在线"
 *   timestamp={lastCheckTime}
 * />
 * ```
 */
export function StatusIndicator({
  status,
  text,
  timestamp,
  icon: CustomIcon,
  className
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = CustomIcon || config.icon;
  const defaultText = text || config.text;

  return (
    <div className={cn("flex items-center gap-2 text-xs", config.color, className)}>
      <Icon className="w-4 h-4" />
      <span>{defaultText}</span>
      {timestamp && (
        <span className="text-slate-500 ml-2">
          最后检查: {formatTime(timestamp)}
        </span>
      )}
    </div>
  );
}

export default StatusIndicator;
