/**
 * 项目详情页头部组件
 *
 * @module features/projects/components/ProjectHeader
 * @description 显示项目标题、面包屑导航和操作按钮
 */

import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/shared/constants';
import { formatDateForDisplay } from '../utils/milestone';
import type { Project } from '../types';

// ============ Props 定义 ============

export interface ProjectHeaderProps {
  /** 项目数据 */
  project: Project | undefined;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
}

// ============ 主组件 ============

export function ProjectHeader({
  project,
  isLoading = false,
  onEdit,
  onDelete,
}: ProjectHeaderProps) {
  const navigate = useNavigate();

  // 加载状态骨架
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // 无数据状态
  if (!project) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
        <div className="text-muted-foreground">项目不存在或已删除</div>
      </div>
    );
  }

  // 获取状态标签
  const statusLabel = PROJECT_STATUS_LABELS[project.status] || project.status;
  const typeLabel = PROJECT_TYPE_LABELS[project.projectType] || project.projectType;

  return (
    <div data-testid="detail-header" className="space-y-4">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to="/projects"
          className="hover:text-foreground transition-colors"
        >
          项目管理
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{project.name}</span>
      </nav>

      {/* 标题栏 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 data-testid="detail-header-title" className="text-2xl font-bold truncate">{project.name}</h1>
            <Badge data-testid="detail-header-status-badge" variant="outline" className="flex-shrink-0">
              {statusLabel}
            </Badge>
            <Badge variant="secondary" className="flex-shrink-0">
              {typeLabel}
            </Badge>
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>编码: {project.code}</span>
            {project.startDate && (
              <span>
                {formatDateForDisplay(project.startDate)}
                {project.deadline && ` ~ ${formatDateForDisplay(project.deadline)}`}
              </span>
            )}
          </div>

          {/* 进度条 */}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={project.progress} className="h-2 w-32" />
            <span className="text-sm text-muted-foreground">
              {project.progress}%
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(onEdit || onDelete) && (
            <>
              {/* 桌面端显示按钮 */}
              <div className="hidden sm:flex gap-2">
                {onEdit && (
                  <Button data-testid="detail-header-btn-edit" variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                )}
              </div>

              {/* 更多操作下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* 移动端显示编辑选项 */}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit} className="sm:hidden">
                      <Pencil className="h-4 w-4 mr-2" />
                      编辑项目
                    </DropdownMenuItem>
                  )}
                  {onEdit && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem
                      data-testid="detail-header-btn-delete"
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除项目
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
