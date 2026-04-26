/**
 * WBS 表格组件
 * 严格按照需求文档 REQ_04_task.md 实现24列规格
 *
 * 功能特性：
 * - 24列完整显示（列号0-24）
 * - 树形结构（10级，24px缩进）
 * - 9种状态颜色Badge
 * - 单休勾选框
 * - 列显示/隐藏（localStorage持久化）
 * - 快捷键支持
 * - 双击打开 TaskForm 编辑（统一使用 TaskForm 维护）
 * - 基于角色的按钮级权限控制
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  Settings,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  WBS_COLUMNS,
  STATUS_COLORS,
  TASK_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  type TaskRowWithUI,
  type TaskStatus,
  type ColumnConfig,
  formatDate,
  formatDays,
  formatLagDays,
  loadColumnVisibility,
  saveColumnVisibility
} from './columnConfig';
import { computeTaskPermissions, type TaskPermissions } from '../hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { WBSTaskListItem } from '../types';
import { ExportDropdown } from './ExportDropdown';
import { ImportPreviewDialog, type ImportResult } from './ImportPreviewDialog';
import { downloadImportTemplateWithToast } from '../utils/taskExporter';

/** 带UI状态的任务行 */
interface TaskRowWithUI extends WBSTaskListItem {
  hasChildren: boolean;
  depth: number;
  isExpanded?: boolean;
}

/** 组件属性 */
interface WbsTableProps {
  tasks: TaskRowWithUI[];
  members: { id: number; name: string }[];
  projects: { id: string; name: string }[];
  isLoading?: boolean;
  projectId?: string;
  projectName?: string;
  onCreateTask?: (parentId?: string, level?: number, parentTask?: TaskRowWithUI) => void;
  onEditTask?: (task: TaskRowWithUI) => void;
  onDeleteTask?: (task: TaskRowWithUI) => void;
  onViewProgress?: (task: TaskRowWithUI) => void;
  onViewDelayHistory?: (task: TaskRowWithUI) => void;
  onViewPlanChanges?: (task: TaskRowWithUI) => void;
  onImportTasks?: (tasks: any[]) => Promise<ImportResult>;
}

export const WbsTable = React.memo(function WbsTable({
  tasks,
  members,
  projects,
  isLoading,
  projectId,
  projectName,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onViewProgress,
  onViewDelayHistory,
  onViewPlanChanges,
  onImportTasks,
}: WbsTableProps) {
  // 获取当前用户（用于权限计算）
  const { user } = useAuth();
  const { toast } = useToast();

  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    loadColumnVisibility()
  );

  // 计算所有有子任务的ID（用于默认全部展开）
  const allExpandableIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (items: TaskRowWithUI[]) => {
      items.forEach(task => {
        if (task.hasChildren) {
          ids.add(task.id);
          if (task.children && task.children.length > 0) {
            collect(task.children as TaskRowWithUI[]);
          }
        }
      });
    };
    collect(tasks);
    return ids;
  }, [tasks]);

  // 展开状态 - 默认全部展开
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  // 追踪是否已完成初始展开（防止用户手动折叠后被回弹）
  const initialExpandDone = useRef(false);

  // 仅在首次加载数据时自动展开所有行
  useEffect(() => {
    if (!initialExpandDone.current && allExpandableIds.size > 0) {
      initialExpandDone.current = true;
      setExpandedRows(new Set(allExpandableIds));
    }
  }, [allExpandableIds]);

  // 选中的行
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 导入预览对话框状态
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importedData, setImportedData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({ newCount: 0, updateCount: 0 });
  const [isImporting, setIsImporting] = useState(false);

  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 虚拟滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerHeightRef = useRef(600);
  const [scrollTop, setScrollTop] = useState(0);

  // 分页状态
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  // 可见列（过滤后）
  const visibleColumns = useMemo(() => {
    return WBS_COLUMNS.filter(col => columnVisibility[col.id] !== false);
  }, [columnVisibility]);

  // 扁平化任务列表（处理展开/折叠）
  const flatTasks = useMemo(() => {
    const result: { task: TaskRowWithUI; level: number }[] = [];

    if (tasks.length === 0) return result;

    const flatten = (items: TaskRowWithUI[], level: number = 0) => {
      items.forEach(task => {
        result.push({ task, level });
        // 使用 children 属性直接获取子任务
        if (task.hasChildren && task.children && task.children.length > 0 && expandedRows.has(task.id)) {
          const children = (task.children as TaskRowWithUI[]).map(child => ({
            ...child,
            hasChildren: !!(child.children && child.children.length > 0),
            children: child.children
          }));
          flatten(children, level + 1);
        }
      });
    };

    // 构建任务ID集合，用于判断父任务是否在当前结果中
    const taskIdSet = new Set(tasks.map(t => t.id));

    // 从"顶级任务"开始遍历
    const topLevelTasks = tasks.filter(t => !t.parentId || !taskIdSet.has(t.parentId));
    flatten(topLevelTasks);

    return result;
  }, [tasks, expandedRows]);

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(flatTasks.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // 分页切换时重置滚动位置
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, []);

  // 数据变化时页码重置
  useEffect(() => {
    setCurrentPage(1);
  }, [tasks]);

  // 当前页的数据切片
  const pagedFlatTasks = useMemo(() => {
    if (flatTasks.length <= PAGE_SIZE) return flatTasks;
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return flatTasks.slice(start, start + PAGE_SIZE);
  }, [flatTasks, safeCurrentPage]);

  const isPaged = flatTasks.length > PAGE_SIZE;

  // 虚拟滚动：计算可见行范围（仅非分页模式下生效）
  const ROW_HEIGHT = 40;
  const OVERSCAN = 5;
  const virtualizedRange = useMemo(() => {
    const containerHeight = containerHeightRef.current;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(
      flatTasks.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
    );
    return { start, end };
  }, [scrollTop, flatTasks.length]);

  const visibleFlatTasks = useMemo(
    () => flatTasks.slice(virtualizedRange.start, virtualizedRange.end),
    [flatTasks, virtualizedRange]
  );
  const topSpacerHeight = virtualizedRange.start * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (flatTasks.length - virtualizedRange.end) * ROW_HEIGHT);

  // 最终渲染的行数据：分页模式用 pagedFlatTasks，否则用虚拟滚动的 visibleFlatTasks
  const renderedTasks = isPaged ? pagedFlatTasks : visibleFlatTasks;

  // 任务ID -> 任务 Map（O(1)查找优化）
  const taskMap = useMemo(() => {
    const map = new Map<string, TaskRowWithUI>();
    const collect = (items: TaskRowWithUI[]) => {
      items.forEach(task => {
        map.set(task.id, task);
        if (task.children && task.children.length > 0) {
          collect(task.children as TaskRowWithUI[]);
        }
      });
    };
    collect(tasks);
    return map;
  }, [tasks]);

  // 切换行展开
  const toggleRow = useCallback((taskId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // 切换列可见性
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      saveColumnVisibility(next);
      return next;
    });
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { parseExcelFile } = await import('../utils/taskImporter');
      const parsedData = await parseExcelFile(file);

      // 完整验证（与后端保持一致）
      const errors: Array<{ rowNumber: number; field: string; message: string }> = [];
      const validData: any[] = [];
      const wbsCodePattern = /^\d+(\.\d+)*$/;
      const wbsCodeSet = new Set<string>();

      // 第一轮：验证必填字段和格式
      parsedData.forEach((item: any) => {
        const rowErrors: Array<{ rowNumber: number; field: string; message: string }> = [];

        // 检查 WBS 编码
        if (!item.wbsCode?.trim()) {
          rowErrors.push({
            rowNumber: item.rowNumber,
            field: 'WBS编码',
            message: 'WBS编码不能为空'
          });
        } else if (!wbsCodePattern.test(item.wbsCode)) {
          rowErrors.push({
            rowNumber: item.rowNumber,
            field: 'WBS编码',
            message: `WBS编码格式无效："${item.wbsCode}"，应为数字点分格式（如 1, 1.1, 1.2.3）`
          });
        } else if (wbsCodeSet.has(item.wbsCode)) {
          rowErrors.push({
            rowNumber: item.rowNumber,
            field: 'WBS编码',
            message: `WBS编码重复："${item.wbsCode}"`
          });
        } else {
          wbsCodeSet.add(item.wbsCode);
        }

        // 检查任务描述
        if (!item.description?.trim()) {
          rowErrors.push({
            rowNumber: item.rowNumber,
            field: '任务描述',
            message: '任务描述不能为空'
          });
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          validData.push(item);
        }
      });

      setImportFileName(file.name);
      setImportedData(validData);
      setImportErrors(errors);
      setImportStats({
        newCount: validData.filter(d => !d.id).length,
        updateCount: validData.filter(d => d.id).length
      });
      setImportPreviewOpen(true);
    } catch (error) {
      console.error('解析文件失败:', error);
      toast({
        title: '解析文件失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 处理导入确认 - 返回导入结果给对话框显示
  const handleImportConfirm = useCallback(async () => {
    if (!onImportTasks || importedData.length === 0) return;

    setIsImporting(true);
    try {
      const result = await onImportTasks(importedData);
      // 返回结果给对话框显示
      return result;
    } catch (error) {
      console.error('导入失败:', error);
      toast({
        title: '导入失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
      return {
        success: 0,
        failed: importedData.length,
        results: importedData.map(d => ({
          success: false,
          wbsCode: d.wbsCode || d['WBS编码'] || '未知',
          rowNumber: d.rowNumber,
          error: error instanceof Error ? error.message : '导入异常',
        })),
      };
    } finally {
      setIsImporting(false);
    }
  }, [onImportTasks, importedData, toast]);

  // 下载模板
  const handleDownloadTemplate = useCallback(async () => {
    try {
      await downloadImportTemplateWithToast(toast);
    } catch (error) {
      console.error('下载模板失败:', error);
      toast({
        title: '下载失败',
        description: error instanceof Error ? error.message : '模板下载失败，请重试',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // 虚拟滚动：滚动事件处理（requestAnimationFrame 节流）
  const rafIdRef = useRef(0);
  const handleVirtualScroll = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        containerHeightRef.current = scrollContainerRef.current.clientHeight;
        setScrollTop(scrollContainerRef.current.scrollTop);
      }
    });
  }, []);

  // 渲染状态Badge
  const renderStatusBadge = (task: TaskRowWithUI) => {
    const status = task.computedStatus || task.status;

    if (!status) {
      return (
        <Badge className="bg-muted text-muted-foreground font-medium">
          未设置
        </Badge>
      );
    }

    const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    if (!config) {
      console.warn(`[WbsTable] 未知的任务状态: ${status}`);
      return (
        <Badge className="bg-muted text-muted-foreground font-medium">
          {status}
        </Badge>
      );
    }
    return (
      <Badge data-testid="task-table-badge-status" className={`${config.bg} ${config.text} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  // 渲染单元格内容
  const renderCellContent = (task: TaskRowWithUI, col: ColumnConfig) => {
    const value = (task as any)[col.id];

    // 根据列类型渲染
    switch (col.id) {
      case 'status':
        return renderStatusBadge(task);

      case 'priority':
        const priority = PRIORITY_OPTIONS.find(p => p.value === value);
        return priority ? (
          <Badge data-testid="task-table-badge-priority" variant="outline">{priority.label}</Badge>
        ) : null;

      case 'taskType':
        const taskType = TASK_TYPE_OPTIONS.find(t => t.value === value);
        return taskType ? (
          <span data-testid="task-table-badge-type" className="text-sm">{taskType.label}</span>
        ) : null;

      case 'startDate':
      case 'endDate':
      case 'actualStartDate':
      case 'actualEndDate':
        return formatDate(value);

      case 'duration':
        // 只有工期有值时才显示"双休/单休"标签
        if (value == null || value === undefined) {
          return null;
        }
        return (
          <div className="flex items-center gap-2">
            <span>{formatDays(value)}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      task.isSixDayWeek
                        ? 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30'
                        : 'border-border text-muted-foreground bg-muted/50'
                    }`}
                  >
                    {task.isSixDayWeek ? '单休' : '双休'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.isSixDayWeek ? '每周工作6天' : '每周工作5天'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );

      case 'lagDays':
        return formatLagDays(value);

      case 'fullTimeRatio':
        return `${value || 100}%`;

      case 'warningDays':
        return formatDays(value);

      case 'plannedDuration': {
        // 兜底计算：计划周期 = 结束日期 - 开始日期 + 1
        if (value == null && task.startDate && task.endDate) {
          const start = new Date(task.startDate);
          const end = new Date(task.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return formatDays(days > 0 ? days : null);
        }
        return formatDays(value);
      }
      case 'actualDuration': {
        // 兜底计算：实际工期 = 实际结束 - 实际开始 + 1（日历天数）
        if (value == null && task.actualStartDate && task.actualEndDate) {
          const start = new Date(task.actualStartDate);
          const end = new Date(task.actualEndDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return formatDays(days > 0 ? days : null);
        }
        return formatDays(value);
      }
      case 'actualCycle': {
        // 兜底计算：实际周期 = 实际结束 - 实际开始 + 1（日历天数）
        if (value == null && task.actualStartDate && task.actualEndDate) {
          const start = new Date(task.actualStartDate);
          const end = new Date(task.actualEndDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return formatDays(days > 0 ? days : null);
        }
        return formatDays(value);
      }

      case 'delayCount':
        return (
          <button
            data-testid="task-btn-view-delay"
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => onViewDelayHistory?.(task)}
          >
            {value || 0}
          </button>
        );

      case 'planChangeCount':
        return (
          <button
            data-testid="task-btn-view-changes"
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => onViewPlanChanges?.(task)}
          >
            {value || 0}
          </button>
        );

      case 'progressRecordCount':
        return (
          <button
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => onViewProgress?.(task)}
          >
            {value || 0}
          </button>
        );

      case 'redmineLink':
        return value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            链接
          </a>
        ) : null;

      case 'predecessorCode':
        return value ? (
          <span className="font-mono text-sm">{value}</span>
        ) : null;

      case 'projectCode':
        return value ? (
          <span className="font-mono text-sm">{value}</span>
        ) : null;

      default:
        return value ?? '';
    }
  };

  // 渲染操作列（带权限控制）
  const renderActions = (task: TaskRowWithUI) => {
    // 使用纯函数计算权限（不能在循环中调用 hooks）
    const permissions = computeTaskPermissions(user, task);

    return (
      <div className="flex items-center gap-1">
        {/* 添加子任务按钮 - 工程师只能在自己负责的任务下添加 */}
        {(permissions.canCreateSubtask || !task.id) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="task-btn-create-subtask"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onCreateTask?.(task.id, task.depth + 1, task)}
                  disabled={!permissions.canCreateSubtask}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canCreateSubtask ? '添加子任务' : '只能在自己负责的任务下添加子任务'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 编辑按钮 - 无权限时浅灰显示并提示 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="task-btn-edit-task"
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${!permissions.canEdit ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={permissions.canEdit ? () => onEditTask?.(task) : undefined}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {permissions.canEdit ? '编辑任务' : '非责任人无法操作'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 维护进展按钮 - 无权限时浅灰显示并提示 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="task-btn-view-progress"
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${!permissions.canEdit ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={permissions.canEdit ? () => onViewProgress?.(task) : undefined}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {permissions.canEdit ? '维护进展' : '非责任人无法操作'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 删除按钮 - 只有管理员和经理可以删除 */}
        {permissions.canDelete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="task-btn-delete-task"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDeleteTask?.(task)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除任务</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 表格导航快捷键
      if (!selectedRowId) return;

      switch (e.key) {
        case 'Insert':
          e.preventDefault();
          // 添加同级任务 - 使用 Map O(1) 查找
          if (onCreateTask) {
            const selectedTask = taskMap.get(selectedRowId);
            onCreateTask(selectedTask?.parentId, selectedTask?.depth);
          }
          break;
        case 'Delete':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // 删除任务 - 使用 Map O(1) 查找
            const taskToDelete = taskMap.get(selectedRowId);
            if (taskToDelete && onDeleteTask) {
              onDeleteTask(taskToDelete);
            }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // 折叠
          if (expandedRows.has(selectedRowId)) {
            toggleRow(selectedRowId);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // 展开
          if (!expandedRows.has(selectedRowId)) {
            toggleRow(selectedRowId);
          }
          break;
        case 'F2':
        case 'Enter':
          e.preventDefault();
          // 打开编辑表单 - 使用 Map O(1) 查找
          const taskToEdit = taskMap.get(selectedRowId);
          if (taskToEdit && onEditTask) {
            onEditTask(taskToEdit);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowId, taskMap, expandedRows, toggleRow, onCreateTask, onDeleteTask, onEditTask]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="task-table-container">
      {/* 工具栏 */}
      <div className="flex items-center justify-between shrink-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            共 {flatTasks.length} 条任务
          </div>
          <Button data-testid="task-btn-create-task" variant="outline" size="sm" onClick={() => onCreateTask()}>
            <Plus className="h-4 w-4 mr-2" />
            新建任务
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* 下载模板 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            title="下载导入模板"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            下载模板
          </Button>

          {/* 导入 */}
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              data-testid="task-import-btn-upload"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              导入
            </Button>
          </>

          {/* 导出 */}
          <ExportDropdown
            tasks={tasks}
            members={members}
            projectName={projectName}
            projectId={projectId}
            disabled={isLoading || tasks.length === 0}
            filteredCount={flatTasks.length}
          />

          {/* 列配置 */}
          <Popover data-testid="task-popover-column-settings">
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              列配置
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 max-h-96 overflow-y-auto" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">显示/隐藏列</h4>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      const allVisible: Record<string, boolean> = {};
                      WBS_COLUMNS.filter(col => col.canHide).forEach(col => {
                        allVisible[col.id] = true;
                      });
                      setColumnVisibility(allVisible);
                      saveColumnVisibility(allVisible);
                    }}
                  >
                    全选
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      const allVisible: Record<string, boolean> = {};
                      WBS_COLUMNS.forEach(col => {
                        allVisible[col.id] = true;
                      });
                      setColumnVisibility(allVisible);
                      saveColumnVisibility(allVisible);
                    }}
                  >
                    重置
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {WBS_COLUMNS.filter(col => col.canHide).map(col => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${col.id}`}
                      checked={columnVisibility[col.id] !== false}
                      onCheckedChange={() => toggleColumnVisibility(col.id)}
                    />
                    <label
                      htmlFor={`col-${col.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {col.label}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {/* 表格容器 - 使用 flex-1 填充剩余空间，内部滚动 */}
      <div ref={scrollContainerRef} onScroll={handleVirtualScroll} className="flex-1 min-h-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto bg-background dark:bg-gray-900">
        <table className="w-full border-collapse" data-testid="task-table">
          {/* 表头 */}
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700" data-testid="task-table-header">
            <tr>
              {visibleColumns.map((col, colIndex) => {
                const isFirstCol = colIndex === 0;
                return (
                  <th
                    key={col.id}
                    style={{ width: col.width, minWidth: col.minWidth, left: isFirstCol ? 0 : undefined }}
                    className={`
                      px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap
                      ${isFirstCol ? 'sticky left-0 bg-gray-50 dark:bg-gray-800 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
                    `}
                    title={col.tooltip}
                  >
                    <div className="flex items-center gap-1 group/header">
                      <span>{col.label}</span>
                      {col.required && <span className="text-red-500">*</span>}
                      {col.canHide && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnVisibility(col.id);
                                }}
                              >
                                <EyeOff className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>隐藏此列</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {flatTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-4">
                    <p>暂无任务数据</p>
                    <Button variant="outline" size="sm" onClick={() => onCreateTask?.()}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加根任务
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* 虚拟滚动：顶部占位（仅非分页模式） */}
                {!isPaged && topSpacerHeight > 0 && (
                  <tr aria-hidden="true" style={{ height: topSpacerHeight }} />
                )}
                {renderedTasks.map(({ task, level }) => {
                const isSelected = selectedRowId === task.id;

                return (
                  <tr
                    key={task.id}
                    data-testid="task-table-row"
                    className={`
                      group border-b border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors
                      ${isSelected ? 'bg-blue-100 dark:bg-blue-950/60' : ''}
                    `}
                    onClick={() => setSelectedRowId(task.id)}
                  >
                    {visibleColumns.map((col, colIndex) => {
                      const isFirstCol = colIndex === 0;

                      return (
                        <td
                          key={col.id}
                          data-col-id={col.id}
                          style={{ minWidth: col.minWidth, left: isFirstCol ? 0 : undefined }}
                          className={`
                            px-3 py-2 text-sm whitespace-nowrap
                            ${col.id === 'description' ? '' : 'text-center'}
                            cursor-pointer
                            ${isFirstCol ? 'sticky left-0 bg-background dark:bg-gray-900 z-[5] shadow-[2px_0_4px_-2px_rgba(1,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
                          `}
                        >
                          {col.id === 'actions' ? (
                            renderActions(task)
                          ) : col.id === 'wbsCode' ? (
                            <div className="flex items-center" style={{ paddingLeft: level * 24 }}>
                              {task.hasChildren ? (
                                <Button
                                  data-testid="task-table-row-toggle"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 mr-1 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRow(task.id);
                                  }}
                                >
                                  {expandedRows.has(task.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <span className="w-6 shrink-0" />
                              )}
                              <span className="font-mono text-xs">{task.wbsCode}</span>
                            </div>
                          ) : col.id === 'description' ? (
                            <div className="flex items-center" style={{ paddingLeft: level * 24 }}>
                              {/* 固定占位，与 wbsCode 列的折叠按钮对齐 */}
                              <span className="w-6 shrink-0" />
                              <span
                                className="truncate hover:bg-blue-100 dark:hover:bg-blue-900/50 px-1 py-0.5 rounded cursor-pointer"
                              >
                                {task.description}
                              </span>
                            </div>
                          ) : (
                            renderCellContent(task, col)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
                {/* 虚拟滚动：底部占位（仅非分页模式） */}
                {!isPaged && bottomSpacerHeight > 0 && (
                  <tr aria-hidden="true" style={{ height: bottomSpacerHeight }} />
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* 快捷键提示 */}
      <div className="shrink-0 pt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>快捷键：</span>
        <span><kbd className="px-1 bg-muted rounded">双击</kbd> 编辑任务</span>
        <span><kbd className="px-1 bg-muted rounded">F2/Enter</kbd> 编辑选中行</span>
        <span><kbd className="px-1 bg-muted rounded">Insert</kbd> 添加同级任务</span>
        <span><kbd className="px-1 bg-muted rounded">Ctrl+Delete</kbd> 删除任务</span>
        <span><kbd className="px-1 bg-muted rounded">←/→</kbd> 折叠/展开</span>
      </div>

      {/* 分页控件 */}
      {isPaged && (
        <div className="shrink-0 pt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            共 {flatTasks.length} 条任务，第 {safeCurrentPage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => handlePageChange(safeCurrentPage - 1)}
            >
              上一页
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                // 显示首页、末页、当前页前后各1页
                return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1;
              })
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-1">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safeCurrentPage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[32px]"
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                )
              )
            }
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => handlePageChange(safeCurrentPage + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 导入预览对话框 */}
      <ImportPreviewDialog
        open={importPreviewOpen}
        onOpenChange={setImportPreviewOpen}
        fileName={importFileName}
        parsedData={importedData}
        errors={importErrors}
        newCount={importStats.newCount}
        updateCount={importStats.updateCount}
        projectId={projectId || ''}
        onConfirm={handleImportConfirm}
        isLoading={isImporting}
      />
    </div>
  );
});
