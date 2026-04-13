/**
 * 调配建议卡片组件
 * 用于显示人员/资源配置建议
 *
 * @module analytics/dashboard/components/AllocationSuggestion
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserCheck, RefreshCw } from 'lucide-react';
import type { AllocationSuggestion } from '../types';

export interface AllocationSuggestionProps {
  /** 建议数据 */
  suggestions: AllocationSuggestion[];
  /** 标题 */
  title?: string;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击成员 */
  onMemberClick?: (suggestion: AllocationSuggestion) => void;
  /** 提醒更新 */
  onRemindUpdate?: (suggestion: AllocationSuggestion) => void;
}

/**
 * 建议类型配置
 */
const SUGGESTION_CONFIG = {
  overload: {
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    label: '过载',
    color: 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
  idle: {
    icon: <UserCheck className="w-4 h-4 text-sky-500" />,
    label: '可接单',
    color: 'border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/30',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
  low_activity: {
    icon: <RefreshCw className="w-4 h-4 text-amber-500" />,
    label: '低活跃',
    color: 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
};

/**
 * 调配建议卡片组件
 */
export function AllocationSuggestionCards({
  suggestions,
  title = '调配建议',
  isLoading,
  className,
  onMemberClick,
  onRemindUpdate,
}: AllocationSuggestionProps) {
  // 加载状态
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-3 gap-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse h-20 bg-gray-100 dark:bg-slate-700/50 rounded-xl"
          />
        ))}
      </div>
    );
  }

  // 空状态
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardContent className="py-4">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            暂无调配建议
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-testid="dashboard-card-allocation-suggestion" className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      )}
      <div className="grid grid-cols-3 gap-4">
        {suggestions.map((suggestion, index) => {
          const config = SUGGESTION_CONFIG[suggestion.type];

          return (
            <Card
              key={`${suggestion.type}-${suggestion.memberId}-${index}`}
              className={cn(
                'rounded-xl border p-3 cursor-pointer',
                'transition-all duration-200 hover:shadow-md',
                config.color
              )}
              onClick={() => onMemberClick?.(suggestion)}
            >
              <div className="flex items-center gap-2 mb-2">
                {config.icon}
                <span className={cn('text-xs font-medium', config.textColor)}>
                  {config.label}: {suggestion.memberName}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-mono">{suggestion.value}%</span>
                <span className="text-xs ml-1">{suggestion.valueLabel}</span>
              </div>
              {suggestion.type === 'low_activity' && onRemindUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-6 text-xs w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemindUpdate(suggestion);
                  }}
                >
                  提醒更新
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default AllocationSuggestionCards;
