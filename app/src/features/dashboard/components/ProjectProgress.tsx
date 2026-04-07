/**
 * 项目进度组件 - 专业仪表盘风格
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FolderKanban, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_CONFIG } from '@/shared/constants';
import type { ProjectProgressItem } from '../types';

interface ProjectProgressProps {
  projects: ProjectProgressItem[];
  className?: string;
  onProjectClick?: (project: ProjectProgressItem) => void;
}

export function ProjectProgress({ projects, className, onProjectClick }: ProjectProgressProps) {
  if (projects.length === 0) {
    return (
      <Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <FolderKanban className="h-4 w-4 text-gray-400" />
            项目进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-xs">暂无项目数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <FolderKanban className="h-4 w-4 text-gray-400" />
          项目进度
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
            ({projects.length} 个项目)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.slice(0, 5).map((project) => (
          <div
            key={project.id}
            className={cn(
              'p-3 rounded-xl border border-gray-100 dark:border-slate-700/30 bg-gray-50/50 dark:bg-slate-900/30 transition-all duration-200',
              onProjectClick && 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-slate-700/30'
            )}
            onClick={() => onProjectClick?.(project)}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{project.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="secondary"
                    className={cn('text-white text-[10px] px-1.5 py-0', PROJECT_STATUS_CONFIG[project.status].bgColor)}
                  >
                    {PROJECT_STATUS_CONFIG[project.status].label}
                  </Badge>
                  {project.deadline && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex -space-x-2 ml-2">
                {project.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-5 w-5 border-2 border-background">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-[9px]">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-slate-700 border-2 border-background flex items-center justify-center text-[9px]">
                    +{project.members.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-gray-400">
                  {project.completedTasks}/{project.totalTasks} 任务
                </span>
                <span className="font-medium font-mono tabular-nums text-gray-900 dark:text-gray-100">{project.progress}%</span>
              </div>
              <Progress
                value={project.progress}
                className="h-1.5 bg-gray-200 dark:bg-slate-700"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
