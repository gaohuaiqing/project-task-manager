/**
 * 项目列表组件
 */
import { useState, useRef } from 'react';
import { Plus, Search, Filter, Download, Upload, FileSpreadsheet, FileDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectCard } from './ProjectCard';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useProjects } from '../hooks/useProjects';
import apiClient from '@/lib/api/client';
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useProjects({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    project_type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const projects = data?.items ?? [];

  /** 下载导入模板 */
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/analytics/templates/projects');
      if (!response.ok) throw new Error('下载模板失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projects_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载模板失败:', err);
    }
  };

  /** 导入项目数据 */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const ExcelJS = await import('exceljs');
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('工作表为空');

      const rows: Record<string, unknown>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头
        const values = row.values as unknown[];
        rows.push({
          name: values[1],
          project_type: values[2],
          planned_start_date: values[3],
          planned_end_date: values[4],
          manager_id: values[5],
        });
      });

      const result = await apiClient.post('/analytics/import/projects', { data: rows });
      const { succeeded, failed, errors } = result.data?.data ?? result.data ?? {};

      if (failed > 0) {
        const errorList = errors?.map((e: { row: number; message: string }) => `行${e.row}: ${e.message}`).join('\n');
        alert(`导入完成：成功 ${succeeded} 条，失败 ${failed} 条\n\n${errorList}`);
      } else {
        alert(`成功导入 ${succeeded} 个项目`);
        refetch();
      }
    } catch (err) {
      console.error('导入失败:', err);
      alert(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setImporting(false);
      // 重置 file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /** 导出项目列表 */
  const handleExport = async () => {
    try {
      const response = await apiClient.get('/analytics/export/projects', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          project_type: typeFilter !== 'all' ? typeFilter : undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="project-input-search"
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select data-testid="project-select-status" value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
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
          <Select data-testid="project-select-type" value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
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
        <div className="flex gap-2">
          {/* 导入导出下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="project-menu-import-export" variant="outline" size="sm" className="gap-1.5 h-9">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                <span>导入导出</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem data-testid="project-menuitem-export" onClick={handleExport} className="gap-2.5 cursor-pointer">
                <FileDown className="h-4 w-4 text-emerald-500" />
                <span>导出项目列表</span>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="project-menuitem-download-template" onClick={handleDownloadTemplate} className="gap-2.5 cursor-pointer">
                <Download className="h-4 w-4 text-violet-500" />
                <span>下载导入模板</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="project-menuitem-import"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="gap-2.5 cursor-pointer"
              >
                <Upload className="h-4 w-4 text-amber-500" />
                <span>{importing ? '导入中...' : '导入项目数据'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Button data-testid="project-btn-create" onClick={onCreateProject} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            新建项目
          </Button>
        </div>
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
