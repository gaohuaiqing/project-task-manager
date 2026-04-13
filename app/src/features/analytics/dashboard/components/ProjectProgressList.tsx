/**
 * 项目进度列表组件
 * 用于仪表板显示参与项目的进度
 *
 * @module analytics/dashboard/components/ProjectProgressList
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';
import type { ProjectProgress } from '../types';

export interface ProjectProgressListProps {
  /** 项目列表 */
  projects: ProjectProgress[];
  /** 标题 */
  title?: string;
  /** 最大显示数量 */
  maxItems?: number;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击项目 */
  onProjectClick?: (project: ProjectProgress) => void;
}

/**
 * 项目状态配置
 */
const PROJECT_STATUS_CONFIG = {
  on_track: {
    label: '正常',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    progressColor: 'bg-emerald-500',
  },
  at_risk: {
    label: '风险',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    progressColor: 'bg-amber-500',
  },
  delayed: {
    label: '延期',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    progressColor: 'bg-red-500',
  },
};

/**
 * 项目进度列表组件
 *
 * 设计规范:
 * - 紧凑的列表布局
 * - 显示项目名称、进度条、状态
 * - 支持点击跳转
 */
export function ProjectProgressList({
  projects,
  title = '参与项目进度',
  maxItems = 5,
  isLoading,
  className,
  onProjectClick,
}: ProjectProgressListProps) {
  const displayProjects = projects.slice(0, maxItems);

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
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-2 w-full bg-gray-100 dark:bg-slate-700/50 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // 空状态
  if (!projects || projects.length === 0) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            暂无参与项目
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="dashboard-card-project-progress"
      className={cn(
        'rounded-xl border border-gray-100 dark:border-slate-700/50',
        'bg-white dark:bg-slate-800/50 shadow-sm',
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent data-testid="dashboard-list-project-progress" className="space-y-3">
        {displayProjects.map((project) => {
          const statusConfig = PROJECT_STATUS_CONFIG[project.status];

          return (
            <div
              key={project.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl',
                'hover:bg-gray-50 dark:hover:bg-slate-700/30',
                'transition-colors cursor-pointer'
              )}
              onClick={() => onProjectClick?.(project)}
            >
              {/* 项目名称 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {project.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      {project.progress}%
                    </span>
                    <Badge className={cn('text-xs', statusConfig.color)}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>

                {/* 进度条 */}
                <Progress
                  value={project.progress}
                  className="h-1.5"
                />

                {/* 任务统计 */}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>总任务: {project.totalTasks}</span>
                  <span>已完成: {project.completedTasks}</span>
                  {project.delayedTasks > 0 && (
                    <span className="text-red-500">延期: {project.delayedTasks}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default ProjectProgressList;
