/**
 * 项目卡片组件
 */
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Calendar, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarGroup } from '@/components/ui/avatar-group';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_CONFIG, PROJECT_TYPE_CONFIG } from '@/shared/constants';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设定';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card
      data-testid="project-card"
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                {project.code}
              </Badge>
              <Badge
                data-testid="project-card-status-badge"
                variant="secondary"
                className={cn('text-white text-xs', PROJECT_STATUS_CONFIG[project.status].bgColor)}
              >
                {PROJECT_STATUS_CONFIG[project.status].label}
              </Badge>
            </div>
            <CardTitle data-testid="project-card-title" className="text-lg truncate">{project.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button data-testid="project-card-btn-menu" variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-testid="project-card-btn-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="project-card-btn-delete"
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 描述 */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || '暂无描述'}
        </p>

        {/* 类型标签 + 时间轴数量 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge data-testid="project-card-type-badge" variant="outline" className="text-xs">
            {PROJECT_TYPE_CONFIG[project.projectType]?.label || project.projectType}
          </Badge>
          {/* 时间轴数量 */}
          <Badge
            variant={project.timelineCount && project.timelineCount > 0 ? "secondary" : "outline"}
            className="text-xs flex items-center gap-1"
          >
            <Layers className="h-3 w-3" />
            <span>{project.timelineCount ?? 0} 时间轴</span>
          </Badge>
        </div>

        {/* 进度条 */}
        <div data-testid="project-card-progress" className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">进度</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* 底部：成员头像组 + 截止日期 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <AvatarGroup
            members={project.members || []}
            max={5}
            size="sm"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(project.deadline)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
