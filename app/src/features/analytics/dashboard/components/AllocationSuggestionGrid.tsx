/**
 * 调配建议网格组件
 *
 * @module analytics/dashboard/components/AllocationSuggestionGrid
 * @description 显示资源调配建议
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { AlertTriangle, UserCheck, AlertCircle } from 'lucide-react';
import type { AllocationSuggestion } from '../types';

export interface AllocationSuggestionGridProps {
  /** 调配建议数据 */
  suggestions: AllocationSuggestion[];
  /** 点击成员回调 */
  onMemberClick?: (suggestion: AllocationSuggestion) => void;
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 建议类型配置
 */
const SUGGESTION_CONFIG = {
  overload: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: '过载',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/50',
  },
  idle: {
    icon: <UserCheck className="h-4 w-4" />,
    label: '空闲',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  low_activity: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: '低活跃',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
};

/**
 * 调配建议网格
 *
 * 设计规范:
 * - 3列网格布局
 * - 不同类型使用不同颜色
 * - 显示成员名称、数值、建议
 */
export function AllocationSuggestionGrid({
  suggestions,
  onMemberClick,
  className,
  'data-testid': testId,
}: AllocationSuggestionGridProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  // 按类型分组
  const groupedSuggestions = {
    overload: suggestions.filter((s) => s.type === 'overload'),
    idle: suggestions.filter((s) => s.type === 'idle'),
    low_activity: suggestions.filter((s) => s.type === 'low_activity'),
  };

  return (
    <div className={cn('grid gap-4 grid-cols-1 md:grid-cols-3', className)} data-testid={testId}>
      {Object.entries(groupedSuggestions).map(([type, items]) => {
        if (items.length === 0) return null;

        const config = SUGGESTION_CONFIG[type as keyof typeof SUGGESTION_CONFIG];

        return (
          <Card
            key={type}
            className={cn(
              'p-4 rounded-xl border',
              config.border,
              config.bg
            )}
            data-testid={`suggestion-${type}`}
          >
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-3">
              <span className={config.color}>{config.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {config.label}
              </span>
            </div>

            {/* 成员列表 */}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.memberId}
                  className={cn(
                    'p-2 rounded-lg bg-white/50 dark:bg-slate-800/50',
                    'hover:bg-white dark:hover:bg-slate-700/50 cursor-pointer transition-colors'
                  )}
                  onClick={() => onMemberClick?.(item)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.memberName}
                    </span>
                    <span className={cn('text-xs font-mono', config.color)}>
                      {item.value}% {item.valueLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default AllocationSuggestionGrid;
