/**
 * 项目列表组件
 */
import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectCard } from './ProjectCard';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useProjects } from '../hooks/useProjects';
import type { Project, ProjectStatus, ProjectType } from '../types';

interface ProjectListProps {
  onCreateProject?: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
}

const statusOptions: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'planning', label: '计划中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

const typeOptions: { value: ProjectType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'product_dev', label: '产品开发' },
  { value: 'func_mgmt', label: '职能管理' },
  { value: 'material_sub', label: '物料改代' },
  { value: 'quality_handle', label: '质量处理' },
];

export function ProjectList({ onCreateProject, onEditProject, onDeleteProject }: ProjectListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');

  const { data, isLoading, refetch } = useProjects({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    project_type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const projects = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreateProject}>
          <Plus className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* 项目列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Filter className="h-12 w-12 mb-2 opacity-50" />
          <p>没有找到项目</p>
          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button variant="link" onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}>
              清除筛选条件
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => onEditProject?.(project)}
              onDelete={() => onDeleteProject?.(project)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
