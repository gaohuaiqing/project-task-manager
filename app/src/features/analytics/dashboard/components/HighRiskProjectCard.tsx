/**
 * 高风险项目卡片组件
 *
 * @module analytics/dashboard/components/HighRiskProjectCard
 * @description 显示高风险项目的详细信息
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { HighRiskProject } from '../types';

export interface HighRiskProjectCardProps {
  /** 高风险项目数据 */
  projects: HighRiskProject[];
  /** 点击项目回调 */
  onProjectClick?: (project: HighRiskProject) => void;
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 高风险项目卡片
 *
 * 设计规范:
 * - 显示项目名称、风险因素、完成率、延期任务数
 * - 可展开/收起
 * - 点击跳转项目详情
 */
export function HighRiskProjectCard({
  projects,
  onProjectClick,
  className,
  'data-testid': testId,
}: HighRiskProjectCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)} data-testid={testId}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            高风险项目 ({projects.length})
          </span>
        </div>
        <button
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起详情' : '展开详情'}
        </button>
      </div>

      {/* 项目列表 */}
      {isExpanded && (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={cn(
                'p-4 rounded-xl',
                'border border-red-200 dark:border-red-800/50',
                'bg-red-50/50 dark:bg-red-900/10',
                'hover:shadow-md cursor-pointer transition-all duration-200'
              )}
              onClick={() => onProjectClick?.(project)}
              data-testid={`high-risk-project-${project.id}`}
            >
              {/* 项目名称 */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {project.name}
                </h4>
                <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              </div>

              {/* 风险因素标签 */}
              <div className="flex flex-wrap gap-1 mb-3">
                {project.riskFactors.map((factor, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                  >
                    {factor}
                  </Badge>
                ))}
              </div>

              {/* 统计数据 */}
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>
                  完成率:{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {project.completionRate}%
                  </span>
                </span>
                <span>
                  延期:{' '}
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {project.delayedTasks}
                  </span>
                </span>
              </div>

              {/* 负责人 */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                负责人: {project.manager}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default HighRiskProjectCard;
