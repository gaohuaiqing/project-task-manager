/**
 * 导出下拉菜单
 * 提供导出范围选择
 */
import { useState } from 'react';
import { Download, FileSpreadsheet, Filter, FolderOpen, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  exportTasksToExcel,
  type ExportOptions,
} from '../utils/taskExporter';
import type { WBSTaskListItem } from '../types';
import type { Member } from '@/features/org/types';

export type ExportScope = 'filtered' | 'project' | 'all';

interface ExportDropdownProps {
  tasks: WBSTaskListItem[];
  allTasks?: WBSTaskListItem[]; // 全部任务（用于项目范围导出）
  members: Member[];
  projectName?: string;
  projectId?: string;
  disabled?: boolean;
  filteredCount?: number;
}

export function ExportDropdown({
  tasks,
  allTasks,
  members,
  projectName,
  projectId,
  disabled,
  filteredCount,
}: ExportDropdownProps) {
  const [exporting, setExporting] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);

  const handleExport = async (scope: ExportScope) => {
    if (exporting) return;

    setExporting(true);
    try {
      let tasksToExport: WBSTaskListItem[];
      let exportProjectName: string | undefined;

      switch (scope) {
        case 'filtered':
          tasksToExport = tasks;
          exportProjectName = projectName;
          break;
        case 'project':
          // 如果有全部任务且选择了项目， 则导出该项目的所有任务
          tasksToExport = projectId && allTasks
            ? allTasks.filter(t => t.projectId === projectId)
            : tasks;
          exportProjectName = projectName;
          break;
        case 'all':
          tasksToExport = allTasks || tasks;
          exportProjectName = undefined;
          break;
        default:
          tasksToExport = tasks;
      }

      if (tasksToExport.length === 0) {
        alert('没有可导出的任务');
        return;
      }

      const options: ExportOptions = {
        includeHistory,
        projectName: exportProjectName,
      };

      await exportTasksToExcel(tasksToExport, members, options);
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 历史记录选项 */}
      <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
        <Checkbox
          checked={includeHistory}
          onCheckedChange={(checked) => setIncludeHistory(checked as boolean)}
          className="h-4 w-4"
        />
        <span className="text-muted-foreground">含历史</span>
      </label>

      {/* 导出按钮 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled || exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? '导出中...' : '导出'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            导出范围
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleExport('filtered')}
            className="cursor-pointer"
          >
            <Filter className="h-4 w-4 mr-2" />
            <span>筛选结果</span>
            {filteredCount !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredCount}条
              </span>
            )}
          </DropdownMenuItem>

          {projectName && (
            <DropdownMenuItem
              onClick={() => handleExport('project')}
              className="cursor-pointer"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              <span>当前项目</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {projectName}
              </span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => handleExport('all')}
            className="cursor-pointer"
          >
            <Layers className="h-4 w-4 mr-2" />
            <span>全部任务</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
