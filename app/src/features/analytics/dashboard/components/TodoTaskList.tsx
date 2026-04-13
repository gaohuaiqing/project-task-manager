/**
 * 待办任务列表组件
 * 用于仪表板显示待办任务
 *
 * @module analytics/dashboard/components/TodoTaskList
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import type { TodoTask } from '../types';

export interface TodoTaskListProps {
  /** 任务列表 */
  tasks: TodoTask[];
  /** 标题 */
  title?: string;
  /** 最大显示数量 */
  maxItems?: number;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击任务 */
  onTaskClick?: (task: TodoTask) => void;
  /** 查看全部 */
  onViewAll?: () => void;
  /** 显示更新按钮 */
  showUpdateButton?: boolean;
  /** 更新任务 */
  onUpdateTask?: (task: TodoTask) => void;
}

/**
 * 优先级颜色映射
 */
const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * 逾期天数显示
 */
function DaysOverdueBadge({ days }: { days: number }) {
  if (days <= 0) return null;

  return (
    <Badge variant="destructive" className="text-xs gap-1">
      <AlertTriangle className="w-3 h-3" />
      逾期 {days} 天
    </Badge>
  );
}

/**
 * 待办任务列表组件
 *
 * 设计规范:
 * - 紧凑的列表布局
 * - 显示任务名称、项目、到期日期、进度
 * - 支持逾期标记
 */
export function TodoTaskList({
  tasks,
  title = '待办任务',
  maxItems = 5,
  isLoading,
  className,
  onTaskClick,
  onViewAll,
  showUpdateButton,
  onUpdateTask,
}: TodoTaskListProps) {
  const displayTasks = tasks.slice(0, maxItems);

  // 加载状态
  if (isLoading) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
                <div className="h-2 w-1/2 bg-gray-100 dark:bg-slate-700/50 rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // 空状态
  if (!tasks || tasks.length === 0) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            暂无待办任务
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="dashboard-card-todo-tasks"
      className={cn(
        'rounded-xl border border-gray-100 dark:border-slate-700/50',
        'bg-white dark:bg-slate-800/50 shadow-sm',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
          {onViewAll && tasks.length > maxItems && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700"
              onClick={onViewAll}
            >
              查看全部 <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent data-testid="dashboard-list-todo-tasks" className="space-y-2">
        {displayTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl',
              'hover:bg-gray-50 dark:hover:bg-slate-700/30',
              'transition-colors cursor-pointer'
            )}
            onClick={() => onTaskClick?.(task)}
          >
            {/* 优先级/状态指示器 */}
            <div
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                task.priority === 'high' && 'bg-red-500',
                task.priority === 'medium' && 'bg-amber-500',
                task.priority === 'low' && 'bg-gray-400'
              )}
            />

            {/* 任务信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {task.name}
                </span>
                {task.daysOverdue && task.daysOverdue > 0 && (
                  <DaysOverdueBadge days={task.daysOverdue} />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.projectName}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.dueDate}
                </span>
              </div>
            </div>

            {/* 进度 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {task.progress}%
              </span>
              {showUpdateButton && (
                <Button
                  data-testid="dashboard-btn-update-task"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTask?.(task);
                  }}
                >
                  更新
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default TodoTaskList;
