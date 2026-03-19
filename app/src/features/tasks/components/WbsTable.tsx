/**
 * WBS 表格组件
 */
import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useTasks } from '../hooks/useTasks';
import { taskApi } from '@/lib/api/task.api';
import type { Task, TaskWithChildren } from '../types';
import { cn } from '@/lib/utils';
import { TASK_STATUS_CONFIG } from '@/shared/constants';

interface WbsTableProps {
  projectId?: string;
  onCreateTask?: (parentId?: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export function WbsTable({ projectId, onCreateTask, onEditTask, onDeleteTask }: WbsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading } = useTasks(
    projectId ? { project_id: projectId, pageSize: 1000 } : {}
  );

  // 构建 WBS 树
  const tree = useMemo(() => {
    if (!data?.items) return [];
    return taskApi.buildWBSTree(data.items);
  }, [data?.items]);

  // 切换行展开状态
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 渲染任务行
  const renderTaskRow = (task: TaskWithChildren, level: number = 0): React.ReactNode[] => {
    const hasChildren = task.children.length > 0;
    const isExpanded = expandedRows.has(task.id);
    const indent = level * 24;

    const rows: React.ReactNode[] = [
      <TableRow key={task.id} className="group hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft: indent }}>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mr-1"
                onClick={() => toggleRow(task.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span className="w-7" />
            )}
            <span className="font-mono text-xs text-muted-foreground mr-2">
              {task.wbsCode}
            </span>
            <span className="font-medium">{task.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={cn('text-xs', TASK_STATUS_CONFIG[task.status].bgColor, TASK_STATUS_CONFIG[task.status].textColor)}>
            {TASK_STATUS_CONFIG[task.status].label}
          </Badge>
        </TableCell>
        <TableCell>{task.assigneeName || '-'}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={task.progress} className="h-2 w-16" />
            <span className="text-xs">{task.progress}%</span>
          </div>
        </TableCell>
        <TableCell>
          {task.plannedEndDate
            ? new Date(task.plannedEndDate).toLocaleDateString()
            : '-'}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateTask?.(task.id)}>
                <Plus className="h-4 w-4 mr-2" />
                添加子任务
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditTask?.(task)}>
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteTask?.(task)}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>,
    ];

    // 渲染子任务
    if (hasChildren && isExpanded) {
      task.children.forEach((child) => {
        rows.push(...renderTaskRow(child, level + 1));
      });
    }

    return rows;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>暂无任务</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => onCreateTask?.()}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加任务
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">任务名称</TableHead>
            <TableHead className="w-[12%]">状态</TableHead>
            <TableHead className="w-[15%]">负责人</TableHead>
            <TableHead className="w-[13%]">进度</TableHead>
            <TableHead className="w-[12%]">截止日期</TableHead>
            <TableHead className="w-[8%] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((task) => renderTaskRow(task))}
        </TableBody>
      </Table>
    </div>
  );
}
