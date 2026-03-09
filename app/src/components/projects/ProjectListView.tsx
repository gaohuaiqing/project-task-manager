/**
 * 项目列表视图组件
 *
 * 功能：
 * - 大数据集虚拟滚动
 * - 小数据集普通渲染
 * - 自动切换渲染模式
 *
 * @module components/projects/ProjectListView
 */

import React, { useMemo } from 'react';
import type { Project } from '@/types/project';
import { ProjectCardGrid } from './ProjectCard';

interface ProjectListViewProps {
  /** 项目列表 */
  projects: Project[];
  /** 成员列表 */
  members: any[];
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
  /** 启用虚拟滚动的阈值 */
  virtualScrollThreshold?: number;
}

/**
 * 项目列表视图组件
 * 自动根据项目数量选择最佳渲染方式
 */
export function ProjectListView({
  projects,
  members,
  canEdit,
  canDelete,
  onProjectClick,
  onEdit,
  onDelete,
  virtualScrollThreshold = 100,
}: ProjectListViewProps) {
  // 小数据集：使用普通渲染
  if (projects.length <= virtualScrollThreshold) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(project => (
          <ProjectCardGrid
            key={project.id}
            projects={[project]}
            members={members}
            canEdit={canEdit}
            canDelete={canDelete}
            onProjectClick={onProjectClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  // 大数据集：使用分页渲染（暂不使用 react-window，等待依赖安装）
  // TODO: 安装 react-window 后启用虚拟滚动
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        显示 {projects.length} 个项目（共 {projects.length} 个）
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(project => (
          <ProjectCardGrid
            key={project.id}
            projects={[project]}
            members={members}
            canEdit={canEdit}
            canDelete={canDelete}
            onProjectClick={onProjectClick}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 虚拟滚动版本（需要 react-window）
 * 待依赖安装完成后启用
 */
export function VirtualScrollProjectView({
  projects,
  members,
  canEdit,
  canDelete,
  onProjectClick,
  onEdit,
  onDelete,
}: ProjectListViewProps) {
  // TODO: 待 react-window 安装完成后实现
  // import { FixedSizeList } from 'react-window';
  // import AutoSizer from 'react-virtualized-auto-sizer';

  return (
    <div className="p-8 text-center text-muted-foreground">
      <p>虚拟滚动组件待依赖安装完成后启用</p>
      <p className="text-sm mt-2">当前项目数: {projects.length}</p>
    </div>
  );
}

export default ProjectListView;
