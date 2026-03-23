/**
 * WBS 表格组件
 * 严格按照需求文档 REQ_04_task.md 实现24列规格
 *
 * 功能特性：
 * - 24列完整显示（列号0-24）
 * - 行内编辑（双击/F2）
 * - 可编辑列视觉区分（微蓝灰边框）
 * - 树形结构（10级，24px缩进）
 * - 9种状态颜色Badge
 * - 单休勾选框
 * - 列显示/隐藏（localStorage持久化）
 * - 快捷键支持
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
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  WBS_COLUMNS,
  STATUS_COLORS,
  TASK_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  type TaskRowWithUI,
  type TaskStatus,
  type ColumnConfig,
  isColumnEditable,
  formatDate,
  formatDays,
  formatLagDays,
  loadColumnVisibility,
  saveColumnVisibility,
  EDITABLE_COLUMNS,
} from './columnConfig';
import type { WBSTaskListItem } from '../types';

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
  onCreateTask?: (parentId?: string, level?: number) => void;
  onEditTask?: (task: TaskRowWithUI) => void;
  onDeleteTask?: (task: TaskRowWithUI) => void;
  onViewProgress?: (task: TaskRowWithUI) => void;
  onViewDelayHistory?: (task: TaskRowWithUI) => void;
  onViewPlanChanges?: (task: TaskRowWithUI) => void;
  onUpdateTask?: (taskId: string, field: string, value: unknown) => Promise<void>;
}

/** 编辑状态 */
interface EditState {
  taskId: string;
  field: string;
  value: unknown;
}

/** 可编辑列样式 - 微蓝灰边框（支持深色主题） */
const EDITABLE_CELL_CLASS = 'border-l-[3px] border-l-blue-200 dark:border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/40';
const READONLY_CELL_CLASS = 'border-l-[3px] border-l-gray-200 dark:border-l-gray-700';

export function WbsTable({
  tasks,
  members,
  projects,
  isLoading,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onViewProgress,
  onViewDelayHistory,
  onViewPlanChanges,
  onUpdateTask,
}: WbsTableProps) {
  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    loadColumnVisibility()
  );

  // 展开状态
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 编辑状态
  const [editState, setEditState] = useState<EditState | null>(null);

  // 选中的行
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 表格引用
  const tableRef = useRef<HTMLDivElement>(null);

  // 进展记录对话框
  const [progressDialogTask, setProgressDialogTask] = useState<TaskRowWithUI | null>(null);

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
        if (task.hasChildren && expandedRows.has(task.id)) {
          const children = tasks.filter(t => t.parentId === task.id);
          flatten(children, level + 1);
        }
      });
    };

    // 从根任务开始
    const rootTasks = tasks.filter(t => !t.parentId);
    flatten(rootTasks);

    return result;
  }, [tasks, expandedRows]);

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

  // 开始编辑
  const startEdit = useCallback((taskId: string, field: string, currentValue: unknown) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 检查是否可编辑
    if (!isColumnEditable(field, task)) return;

    setEditState({ taskId, field, value: currentValue });
  }, [tasks]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditState(null);
  }, []);

  // 保存编辑
  const saveEdit = useCallback(async () => {
    if (!editState || !onUpdateTask) return;

    try {
      await onUpdateTask(editState.taskId, editState.field, editState.value);
      setEditState(null);
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [editState, onUpdateTask]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在编辑，处理编辑快捷键
      if (editState) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      // 表格导航快捷键
      if (!selectedRowId) return;

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          // 进入编辑模式（第一个可编辑列）
          const task = tasks.find(t => t.id === selectedRowId);
          if (task) {
            const firstEditableCol = WBS_COLUMNS.find(col => isColumnEditable(col.id, task));
            if (firstEditableCol) {
              startEdit(selectedRowId, firstEditableCol.id, (task as any)[firstEditableCol.id]);
            }
          }
          break;
        case 'Insert':
          e.preventDefault();
          // 添加同级任务
          if (onCreateTask) {
            const selectedTask = tasks.find(t => t.id === selectedRowId);
            onCreateTask(selectedTask?.parentId, selectedTask?.depth);
          }
          break;
        case 'Delete':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // 删除任务
            const taskToDelete = tasks.find(t => t.id === selectedRowId);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editState, selectedRowId, tasks, expandedRows, startEdit, saveEdit, cancelEdit, onCreateTask, onDeleteTask, toggleRow]);

  // 渲染状态Badge
  const renderStatusBadge = (status: TaskStatus) => {
    // 防御性检查：status 必须是有效值
    if (!status) {
      return (
        <Badge className="bg-gray-100 text-gray-600 font-medium">
          未设置
        </Badge>
      );
    }

    const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    // 安全检查：如果状态配置不存在，显示默认样式
    if (!config) {
      console.warn(`[WbsTable] 未知的任务状态: ${status}`);
      return (
        <Badge className="bg-gray-100 text-gray-600 font-medium">
          {status}
        </Badge>
      );
    }
    return (
      <Badge className={`${config.bg} ${config.text} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  // 渲染单元格内容
  const renderCellContent = (task: TaskRowWithUI, col: ColumnConfig) => {
    const value = (task as any)[col.id];
    const isEditing = editState?.taskId === task.id && editState?.field === col.id;
    const editable = isColumnEditable(col.id, task);

    // 如果正在编辑此单元格
    if (isEditing) {
      return renderEditCell(task, col, value);
    }

    // 根据列类型渲染
    switch (col.id) {
      case 'status':
        return renderStatusBadge(value as TaskStatus);

      case 'priority':
        const priority = PRIORITY_OPTIONS.find(p => p.value === value);
        return priority ? (
          <Badge variant="outline">{priority.label}</Badge>
        ) : null;

      case 'taskType':
        const taskType = TASK_TYPE_OPTIONS.find(t => t.value === value);
        return taskType ? (
          <span className="text-sm">{taskType.label}</span>
        ) : null;

      case 'startDate':
      case 'endDate':
      case 'actualStartDate':
      case 'actualEndDate':
        return formatDate(value);

      case 'duration':
        return (
          <div className="flex items-center gap-2">
            <span>{formatDays(value)}</span>
            {task.isSixDayWeek && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">单休</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>每周工作6天</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );

      case 'lagDays':
        return formatLagDays(value);

      case 'fullTimeRatio':
        return `${value || 100}%`;

      case 'warningDays':
        return formatDays(value);

      case 'plannedDuration':
      case 'actualDuration':
      case 'actualCycle':
        return formatDays(value);

      case 'delayCount':
        return (
          <button
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => onViewDelayHistory?.(task)}
          >
            {value || 0}
          </button>
        );

      case 'planChangeCount':
        return (
          <button
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

      default:
        return value ?? '';
    }
  };

  // 渲染编辑单元格
  const renderEditCell = (task: TaskRowWithUI, col: ColumnConfig, value: unknown) => {
    const onSave = () => saveEdit();
    const onCancel = () => cancelEdit();

    switch (col.dataType) {
      case 'text':
        return (
          <Input
            value={(editState?.value as string) ?? ''}
            onChange={e => setEditState(prev => prev ? { ...prev, value: e.target.value } : null)}
            onBlur={onSave}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="h-8"
            autoFocus
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(editState?.value as number) ?? ''}
            onChange={e => setEditState(prev => prev ? { ...prev, value: Number(e.target.value) } : null)}
            onBlur={onSave}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="h-8 w-20"
            autoFocus
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(editState?.value as string) ?? ''}
            onChange={e => setEditState(prev => prev ? { ...prev, value: e.target.value } : null)}
            onBlur={onSave}
            className="h-8"
            autoFocus
          />
        );

      case 'select':
        const options = col.id === 'taskType' ? TASK_TYPE_OPTIONS :
                        col.id === 'priority' ? PRIORITY_OPTIONS :
                        col.id === 'assigneeName' ? members.map(m => ({ value: String(m.id), label: m.name })) :
                        col.id === 'projectName' ? projects.map(p => ({ value: p.id, label: p.name })) :
                        [];

        return (
          <Select
            value={String(editState?.value ?? '')}
            onValueChange={v => {
              setEditState(prev => prev ? { ...prev, value: v } : null);
              setTimeout(onSave, 0);
            }}
            open
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  // 渲染操作列
  const renderActions = (task: TaskRowWithUI) => {
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCreateTask?.(task.id, task.depth + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>添加子任务</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditTask?.(task)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>编辑任务</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onViewProgress?.(task)}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>维护进展</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
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
      </div>
    );
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            共 {flatTasks.length} 条任务
          </div>
        </div>

        {/* 列配置 */}
        <Popover>
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
                      // 全选：设置所有可隐藏列为可见
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
                      // 重置：恢复默认显示（所有列可见）
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

      {/* 表格 */}
      <div ref={tableRef} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto max-h-[calc(100vh-280px)] bg-background dark:bg-gray-900">
        <table className="w-full border-collapse">
          {/* 表头 */}
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {visibleColumns.map((col, colIndex) => {
                const isEditable = EDITABLE_COLUMNS.includes(col.id);
                const isFirstCol = colIndex === 0;
                return (
                  <th
                    key={col.id}
                    style={{ width: col.width, minWidth: col.minWidth, left: isFirstCol ? 0 : undefined }}
                    className={`px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap
                      ${isEditable ? 'border-l-[3px] border-l-blue-200 dark:border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/50' : 'border-l-[3px] border-l-gray-200 dark:border-l-gray-700'}
                      ${isFirstCol ? 'sticky left-0 bg-background dark:bg-gray-900 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
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
              // 空状态行
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
              flatTasks.map(({ task, level }) => {
                const isSelected = selectedRowId === task.id;
                const isEditing = editState?.taskId === task.id;

                return (
                  <tr
                    key={task.id}
                    className={`
                      group border-b border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-950/60' : ''}
                      ${isEditing ? 'bg-yellow-50 dark:bg-yellow-950/40' : ''}
                    `}
                    onClick={() => setSelectedRowId(task.id)}
                    onDoubleClick={(e) => {
                      const target = e.target as HTMLElement;
                      const colId = target.closest('td')?.dataset.colId;
                      if (colId && isColumnEditable(colId, task)) {
                        startEdit(task.id, colId, (task as any)[colId]);
                      }
                    }}
                  >
                    {visibleColumns.map((col, colIndex) => {
                      const isEditable = EDITABLE_COLUMNS.includes(col.id);
                      const canEdit = isColumnEditable(col.id, task);
                      const isFirstCol = colIndex === 0;

                      return (
                        <td
                          key={col.id}
                          data-col-id={col.id}
                          style={{ minWidth: col.minWidth, left: isFirstCol ? 0 : undefined }}
                          className={`
                            px-3 py-2 text-sm whitespace-nowrap
                            ${isEditable ? (canEdit ? EDITABLE_CELL_CLASS : READONLY_CELL_CLASS) : READONLY_CELL_CLASS}
                            ${col.id === 'description' ? '' : 'text-center'}
                            ${canEdit ? 'cursor-pointer' : ''}
                            ${isFirstCol ? 'sticky left-0 bg-background dark:bg-gray-900 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
                          `}
                        >
                          {col.id === 'actions' ? (
                            renderActions(task)
                          ) : col.id === 'wbsCode' ? (
                            <div className="flex items-center" style={{ paddingLeft: level * 24 }}>
                              {task.hasChildren ? (
                                <Button
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
                            <div className="flex items-center">
                              {!task.hasChildren && <span className="w-6 shrink-0" />}
                              <span
                                className="truncate hover:bg-blue-100 dark:hover:bg-blue-900/50 px-1 py-0.5 rounded cursor-pointer"
                                style={{ marginLeft: task.hasChildren ? 0 : 0 }}
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 快捷键提示 */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>快捷键：</span>
        <span><kbd className="px-1 bg-muted rounded">双击</kbd> 编辑单元格</span>
        <span><kbd className="px-1 bg-muted rounded">F2</kbd> 进入编辑</span>
        <span><kbd className="px-1 bg-muted rounded">Insert</kbd> 添加同级任务</span>
        <span><kbd className="px-1 bg-muted rounded">Ctrl+Delete</kbd> 删除任务</span>
        <span><kbd className="px-1 bg-muted rounded">←/→</kbd> 折叠/展开</span>
      </div>
    </div>
  );
}
