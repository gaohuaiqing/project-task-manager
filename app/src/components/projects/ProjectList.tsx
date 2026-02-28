/**
 * 项目列表组件
 *
 * 功能：
 * - 项目列表展示
 * - 搜索过滤
 * - 状态筛选
 * - 排序
 * - 工具栏
 *
 * @module components/projects/ProjectList
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Plus, ArrowUpDown, Grid3x3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectStatus } from '@/types/project';
import { ProjectCardGrid } from './ProjectCard';

interface ProjectListProps {
  /** 项目列表 */
  projects: Project[];
  /** 成员列表 */
  members: any[];
  /** 当前用户是否有编辑权限 */
  canEdit: boolean;
  /** 当前用户是否有创建权限 */
  canCreate: boolean;
  /** 当前用户是否有删除权限 */
  canDelete: boolean;
  /** 项目点击回调 */
  onProjectClick?: (project: Project) => void;
  /** 新建项目回调 */
  onCreateProject: () => void;
  /** 编辑回调 */
  onEdit: (project: Project) => void;
  /** 删除回调 */
  onDelete: (project: Project) => void;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 加载错误信息 */
  error?: string | null;
  /** 重试加载回调 */
  onRetry?: () => void;
  /** 是否启用分页 */
  enablePagination?: boolean;
  /** 每页显示数量 */
  pageSize?: number;
  /** 自定义类名 */
  className?: string;
}

/** 状态筛选配置 */
interface StatusFilterConfig {
  status: ProjectStatus;
  label: string;
  colorClass: string;
  dotColor: string;
}

const STATUS_FILTERS: StatusFilterConfig[] = [
  { status: 'planning', label: '规划中', colorClass: 'text-gray-400', dotColor: 'bg-gray-500' },
  { status: 'in_progress', label: '进行中', colorClass: 'text-blue-400', dotColor: 'bg-blue-500' },
  { status: 'completed', label: '已完成', colorClass: 'text-green-400', dotColor: 'bg-green-500' },
  { status: 'delayed', label: '延期', colorClass: 'text-red-400', dotColor: 'bg-red-500' },
  { status: 'archived', label: '已归档', colorClass: 'text-yellow-400', dotColor: 'bg-yellow-500' },
];

/** 排序选项 */
type SortOption = 'name' | 'progress' | 'plannedEndDate' | 'createdAt';

/** 显示模式 */
type ViewMode = 'grid' | 'list';

/**
 * 项目列表组件
 */
export function ProjectList({
  projects,
  members,
  canEdit,
  canCreate,
  canDelete,
  onProjectClick,
  onCreateProject,
  onEdit,
  onDelete,
  isLoading = false,
  error = null,
  onRetry,
  enablePagination = false,
  pageSize = 20,
  className,
}: ProjectListProps) {
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');

  // 状态筛选
  const [statusFilter, setStatusFilter] = useState<Record<ProjectStatus, boolean>>({
    planning: true,
    in_progress: true,
    completed: true,
    delayed: true,
    archived: false,
  });

  // 排序选项
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 显示模式
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选和排序后的项目列表
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.code.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      );
    }

    // 状态过滤
    result = result.filter(project => statusFilter[project.status] || false);

    // 排序
    result.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'progress':
          compareValue = a.progress - b.progress;
          break;
        case 'plannedEndDate':
          const aDate = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : 0;
          const bDate = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : 0;
          compareValue = aDate - bDate;
          break;
        case 'createdAt':
          const aCreated = new Date(a.createdAt).getTime();
          const bCreated = new Date(b.createdAt).getTime();
          compareValue = aCreated - bCreated;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy, sortOrder]);

  // 分页后的项目列表
  const paginatedProjects = useMemo(() => {
    if (!enablePagination) return filteredProjects;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredProjects.slice(startIndex, endIndex);
  }, [filteredProjects, enablePagination, currentPage, pageSize]);

  // 总页数
  const totalPages = Math.ceil(filteredProjects.length / pageSize);

  // 监听筛选条件变化，重置到第一页
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // 统计信息
  const stats = useMemo(() => {
    const total = projects.length;
    const byStatus: Record<ProjectStatus, number> = {
      planning: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0,
      archived: 0,
    };

    projects.forEach(p => {
      byStatus[p.status]++;
    });

    return { total, byStatus, filteredCount: filteredProjects.length };
  }, [projects, filteredProjects.length]);

  // 切换排序
  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('asc');
    }
  };

  // 切换状态筛选
  const toggleStatusFilter = (status: ProjectStatus) => {
    setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }));
  };

  // 全选/全不选状态筛选
  const selectAllStatuses = () => {
    setStatusFilter({
      planning: true,
      in_progress: true,
      completed: true,
      delayed: true,
      archived: false,
    });
  };

  const clearAllStatuses = () => {
    setStatusFilter({
      planning: false,
      in_progress: false,
      completed: false,
      delayed: false,
      archived: false,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索项目名称、编码或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-white"
          />
        </div>

        {/* 筛选按钮 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border text-muted-foreground hover:text-white">
              <Filter className="w-4 h-4 mr-2" />
              筛选
              {Object.values(statusFilter).filter(Boolean).length < 5 && (
                <span className="ml-1 text-xs">
                  ({Object.values(statusFilter).filter(Boolean).length})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-border w-56">
            <DropdownMenuLabel>项目状态筛选</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_FILTERS.map((filter) => (
              <DropdownMenuCheckboxItem
                key={filter.status}
                checked={statusFilter[filter.status]}
                onCheckedChange={() => toggleStatusFilter(filter.status)}
                className="text-white"
              >
                <span className={cn("w-2 h-2 rounded-full mr-2", filter.dotColor)} />
                <span className={filter.colorClass}>{filter.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  ({stats.byStatus[filter.status]})
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <div className="flex items-center gap-1 px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={selectAllStatuses}
              >
                全选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={clearAllStatuses}
              >
                清空
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 排序按钮 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border text-muted-foreground hover:text-white">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              排序
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-border">
            <DropdownMenuCheckboxItem
              checked={sortBy === 'name'}
              onCheckedChange={() => toggleSort('name')}
              className="text-white"
            >
              按名称排序
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'progress'}
              onCheckedChange={() => toggleSort('progress')}
              className="text-white"
            >
              按进度排序
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'plannedEndDate'}
              onCheckedChange={() => toggleSort('plannedEndDate')}
              className="text-white"
            >
              按截止日期排序
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'createdAt'}
              onCheckedChange={() => toggleSort('createdAt')}
              className="text-white"
            >
              按创建时间排序
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'asc'}
              onCheckedChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-white"
            >
              {sortOrder === 'asc' ? '升序' : '降序'}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 视图切换 */}
        <div className="flex items-center border border-border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 rounded-none",
              viewMode === 'grid' ? "bg-muted" : "hover:bg-muted/50"
            )}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 rounded-none",
              viewMode === 'list' ? "bg-muted" : "hover:bg-muted/50"
            )}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* 新建项目按钮 */}
        {canCreate && (
          <Button
            className="bg-primary hover:bg-secondary text-white ml-auto"
            onClick={onCreateProject}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建项目
          </Button>
        )}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>共 {enablePagination ? stats.filteredCount : filteredProjects.length} 个项目</span>
        <span>（总计 {stats.total} 个）</span>
        {enablePagination && (
          <span className="text-xs">
            第 {currentPage} / {totalPages || 1} 页
          </span>
        )}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="text-red-400 text-4xl">⚠️</div>
          <p className="text-lg text-red-400">加载失败</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              重新加载
            </Button>
          )}
        </div>
      )}

      {/* 项目列表 */}
      {!isLoading && !error && (viewMode === 'grid' ? (
        <ProjectCardGrid
          projects={paginatedProjects}
          members={members}
          canEdit={canEdit}
          canDelete={canDelete}
          onProjectClick={onProjectClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <ProjectListView
          projects={paginatedProjects}
          members={members}
          canEdit={canEdit}
          canDelete={canDelete}
          onProjectClick={onProjectClick}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {/* 分页控件 */}
      {!isLoading && !error && enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-8 h-8',
                  page === currentPage ? 'bg-primary text-white' : 'bg-transparent'
                )}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 空状态 */}
      {paginatedProjects.length === 0 && !isLoading && !error && (
        <div className="text-center py-16 text-muted-foreground">
          {searchQuery || !Object.values(statusFilter).every(Boolean) ? (
            <>
              <p className="text-lg mb-2">没有找到匹配的项目</p>
              <p className="text-sm">请尝试调整搜索关键词或筛选条件</p>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">暂无项目</p>
              <p className="text-sm mb-4">点击"新建项目"创建您的第一个项目</p>
              {canCreate && (
                <Button onClick={onCreateProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建项目
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 项目列表视图（列表模式）
 */
interface ProjectListViewProps {
  projects: Project[];
  members: any[];
  canEdit: boolean;
  canDelete: boolean;
  onProjectClick?: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectListView({
  projects,
  members,
  canEdit,
  canDelete,
  onProjectClick,
  onEdit,
  onDelete,
}: ProjectListViewProps) {
  const getStatusConfig = (status: Project['status']) => {
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
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium">项目编码</th>
            <th className="px-4 py-3 font-medium">项目名称</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">进度</th>
            <th className="px-4 py-3 font-medium">成员</th>
            <th className="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => {
            const status = getStatusConfig(project.status);

            return (
              <tr
                key={project.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onProjectClick?.(project)}
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">{project.code}</td>
                <td className="px-4 py-3 text-sm font-medium text-white">{project.name}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs border", status.color)}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          project.progress === 100 ? "bg-green-500" : "bg-blue-500"
                        )}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{project.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {project.members?.length || 0} 人
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onEdit(project)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => onDelete(project)}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
