/**
 * 项目卡片组件
 */
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Calendar, Users, CheckCircle2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  planning: { label: '计划中', color: 'bg-gray-500' },
  in_progress: { label: '进行中', color: 'bg-blue-500' },
  completed: { label: '已完成', color: 'bg-green-500' },
  delayed: { label: '已延期', color: 'bg-red-500' },
};

const typeLabels: Record<string, string> = {
  product_development: '产品开发',
  functional_management: '职能管理',
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                {project.code}
              </span>
              <Badge
                variant="secondary"
                className={cn('text-white text-xs', statusConfig[project.status].color)}
              >
                {statusConfig[project.status].label}
              </Badge>
            </div>
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
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

        {/* 类型标签 */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {typeLabels[project.projectType] || project.projectType}
          </Badge>
        </div>

        {/* 时间信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {project.startDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(project.startDate).toLocaleDateString()}</span>
            </div>
          )}
          {project.deadline && (
            <div className="flex items-center gap-1">
              <span>至</span>
              <span>{new Date(project.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* 进度条 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">进度</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
