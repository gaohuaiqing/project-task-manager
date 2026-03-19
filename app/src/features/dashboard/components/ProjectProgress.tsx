/**
 * 项目进度组件
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            项目进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无项目数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          项目进度
          <span className="text-sm font-normal text-muted-foreground">
            ({projects.length} 个项目)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.slice(0, 5).map((project) => (
          <div
            key={project.id}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              onProjectClick && 'cursor-pointer hover:bg-accent'
            )}
            onClick={() => onProjectClick?.(project)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{project.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={cn('text-white text-xs', PROJECT_STATUS_CONFIG[project.status].bgColor)}
                  >
                    {PROJECT_STATUS_CONFIG[project.status].label}
                  </Badge>
                  {project.deadline && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex -space-x-2 ml-2">
                {project.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                    +{project.members.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {project.completedTasks}/{project.totalTasks} 任务
                </span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
