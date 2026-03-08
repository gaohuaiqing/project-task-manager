/**
 * 项目卡片组件
 *
 * 展示单个项目的摘要信息，包括：
 * - 项目编码和名称
 * - 状态标签
 * - 项目描述
 * - 成员头像
 * - 操作按钮
 *
 * @module components/projects/ProjectCard
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Edit3, Trash2, CheckCircle2, Rocket, AlertTriangle, RefreshCw, Info, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Member } from '@/types';

/**
 * 项目类型图标映射
 */
const PROJECT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  product_development: Rocket,
  functional_management: Users,
  material_substitution: RefreshCw,
  troubleshooting: AlertTriangle,
  other: Info,
};

/**
 * 项目类型标签映射（设计文档：图标 + 文字）
 */
const PROJECT_TYPE_LABELS: Record<string, string> = {
  product_development: '产品开发类',
  functional_management: '职能管理类',
  material_substitution: '物料改代类',
  troubleshooting: '故障排查类',
  other: '其他',
};

/**
 * 项目类型颜色映射
 */
const PROJECT_TYPE_COLORS: Record<string, string> = {
  product_development: 'text-blue-400',
  functional_management: 'text-purple-400',
  material_substitution: 'text-green-400',
  troubleshooting: 'text-red-400',
  other: 'text-gray-400',
};

/**
 * 获取项目类型图标组件
 */
function getProjectTypeIcon(type?: string) {
  return PROJECT_TYPE_ICONS[type] || Rocket;
}

/**
 * 获取项目类型颜色
 */
function getProjectTypeColor(type?: string) {
  return PROJECT_TYPE_COLORS[type] || 'text-gray-400';
}

interface ProjectCardProps {
  /** 项目数据 */
  project: Project;
  /** 成员列表 */
  members: Member[];
  /** 成员 Map（用于高效查询） */
  membersMap?: Map<string | number, Member>;
  /** 当前用户是否有编辑权限 */
  canEdit: boolean;
  /** 当前用户是否有删除权限 */
  canDelete: boolean;
  /** 点击卡片时的回调 */
  onClick?: () => void;
  /** 编辑按钮点击回调 */
  onEdit: (project: Project) => void;
  /** 删除按钮点击回调 */
  onDelete: (project: Project) => void;
}

/**
 * 获取项目状态配置
 */
function getStatusConfig(status: Project['status']) {
  switch (status) {
    case 'planning':
      return { label: '规划中', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    case 'in_progress':
      return { label: '进行中', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'completed':
      return { label: '已完成', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'delayed':
      return { label: '延期', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
}

/**
 * 项目卡片组件
 */
export function ProjectCard({
  project,
  members,
  membersMap,
  canEdit,
  canDelete,
  onClick,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const status = getStatusConfig(project.status);

  // 构建 membersMap（如果未传入）
  const cachedMembersMap = React.useMemo(() => {
    if (membersMap) return membersMap;
    const map = new Map<string | number, Member>();
    members.forEach(m => {
      map.set(m.id, m);
      map.set(String(m.id), m);
    });
    return map;
  }, [members, membersMap]);

  // 获取成员信息
  const getMemberName = (memberId: string | number): string => {
    const member = cachedMembersMap.get(memberId) || cachedMembersMap.get(String(memberId));
    return member?.name || '';
  };

  const getMemberAvatar = (memberId: string | number): string => {
    const member = cachedMembersMap.get(memberId) || cachedMembersMap.get(String(memberId));
    return member?.avatar || '';
  };

  // 处理卡片点击（排除操作按钮）
  const handleCardClick = (e: React.MouseEvent) => {
    // 如果点击的是操作按钮，不触发卡片点击
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  // 处理编辑按钮点击
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(project);
  };

  // 处理删除按钮点击
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project);
  };

  // 设计文档：延期项目特别显眼（红色边框）
  const isDelayed = project.status === 'delayed';

  return (
    <Card
      className={cn(
        "bg-card border-border hover:border-muted-foreground/50 transition-all cursor-pointer group relative",
        isDelayed && "border-red-500/50 hover:border-red-500 shadow-red-500/10"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-5">
        {/* 项目类型图标+文字 和标题、状态（设计文档第73行） */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {/* 项目类型：图标 + 文字（设计文档要求） */}
            <div className="flex items-center gap-1 mb-1.5">
              {React.createElement(getProjectTypeIcon(project.projectType), {
                className: cn("w-3.5 h-3.5", getProjectTypeColor(project.projectType))
              })}
              <span className="text-xs text-muted-foreground">
                {PROJECT_TYPE_LABELS[project.projectType] || '其他'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{project.code}</p>
            <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* 编辑按钮 - 移到右上角 */}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                onClick={handleEditClick}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Badge variant="outline" className={cn("text-xs flex-shrink-0", status.color)}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* 描述 - 设计文档第167行：鼠标悬停时显示 */}
        <div className="mb-4 h-10">
          <p
            className="text-sm text-muted-foreground line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity"
            title={project.description || '暂无描述'}
          >
            {project.description || '暂无描述'}
          </p>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>进度</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                project.progress === 100 ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* 时间范围 */}
        {(project.plannedStartDate || project.plannedEndDate) && (
          <div className="flex items-center gap-1.5 mb-4 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-foreground" />
            <span>
              {project.plannedStartDate ? project.plannedStartDate : '---'}
              {' ~ '}
              {project.plannedEndDate ? project.plannedEndDate : '---'}
            </span>
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          {/* 成员 */}
          {project.members && project.members.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex -space-x-1.5">
                {project.members.slice(0, 3).map((memberId) => (
                  <Avatar
                    key={memberId}
                    className="w-5 h-5 border border-card"
                    title={getMemberName(memberId)}
                  >
                    <AvatarImage src={getMemberAvatar(memberId)} />
                    <AvatarFallback className="bg-primary text-white text-[8px]">
                      {getMemberName(memberId).slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {project.members.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{project.members.length - 3}
                </span>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                onClick={handleDeleteClick}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 完成标记 */}
        {project.status === 'completed' && (
          <div className="absolute top-3 right-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 项目卡片网格容器
 */
export interface ProjectCardGridProps {
  /** 项目列表 */
  projects: Project[];
  /** 成员列表 */
  members: Member[];
  /** 当前用户是否有编辑权限 */
  canEdit: boolean;
  /** 当前用户是否有删除权限 */
  canDelete: boolean;
  /** 项目点击回调 */
  onProjectClick?: (project: Project) => void;
  /** 编辑回调 */
  onEdit: (project: Project) => void;
  /** 删除回调 */
  onDelete: (project: Project) => void;
}

/**
 * 项目卡片网格
 */
export function ProjectCardGrid({
  projects,
  members,
  canEdit,
  canDelete,
  onProjectClick,
  onEdit,
  onDelete,
}: ProjectCardGridProps) {
  const membersMap = React.useMemo(() => {
    const map = new Map<string | number, Member>();
    members.forEach(m => {
      map.set(m.id, m);
      map.set(String(m.id), m);
    });
    return map;
  }, [members]);
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">暂无项目</p>
        <p className="text-sm">点击"新建项目"创建您的第一个项目</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          members={members}
          membersMap={membersMap}
          canEdit={canEdit}
          canDelete={canDelete}
          onClick={() => onProjectClick?.(project)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
