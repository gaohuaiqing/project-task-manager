/**
 * TaskRow 组件 - WbsTable 行渲染优化
 *
 * 功能:
 * 1. 使用 React.memo 避免不必要的行重渲染
 * 2. 自定义比较函数精确控制渲染时机
 * 3. 独立的行组件便于维护和测试
 *
 * 性能优化原理:
 * - 当父组件状态变化时（如展开状态改变），只有受影响的行会重渲染
 * - 使用自定义比较函数确保只在关键字段变化时才重渲染
 * - 减少大型列表的渲染开销
 */

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  ChevronRight,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
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
  getStickyOffset,
} from './columnConfig';
import { computeTaskPermissions, type TaskPermissions } from '../hooks/usePermissions';
import type { User } from '@/features/auth';

/** TaskRow 组件属性 */
interface TaskRowProps {
  task: TaskRowWithUI;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  visibleColumns: ColumnConfig[];
  user: User | null;
  onToggleRow: (taskId: string) => void;
  onSelectRow: (taskId: string) => void;
  onCreateTask?: (parentId?: string, level?: number, parentTask?: TaskRowWithUI) => void;
  onEditTask?: (task: TaskRowWithUI) => void;
  onDeleteTask?: (task: TaskRowWithUI) => void;
  onViewProgress?: (task: TaskRowWithUI) => void;
  onViewDelayHistory?: (task: TaskRowWithUI) => void;
  onViewPlanChanges?: (task: TaskRowWithUI) => void;
}

/**
 * 渲染状态 Badge
 */
function renderStatusBadge(status: string | undefined) {
  if (!status) {
    return (
      <Badge className="bg-muted text-muted-foreground font-medium">
        未设置
      </Badge>
    );
  }

  const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  if (!config) {
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
}

/**
 * 渲染单元格内容
 */
function renderCellContent(
  task: TaskRowWithUI,
  col: ColumnConfig,
  callbacks: {
    onViewProgress?: (task: TaskRowWithUI) => void;
    onViewDelayHistory?: (task: TaskRowWithUI) => void;
    onViewPlanChanges?: (task: TaskRowWithUI) => void;
  }
) {
  // 类型安全获取属性值
  const value = task[col.id as keyof TaskRowWithUI];

  switch (col.id) {
    case 'status':
      return renderStatusBadge(task.computedStatus || task.status);

    case 'priority':
      const priority = PRIORITY_OPTIONS.find(p => p.value === value);
      return priority ? (
        <Badge data-testid="task-table-badge-priority" variant="outline">{priority.label}</Badge>
      ) : null;

    case 'taskType':
      const taskType = TASK_TYPE_OPTIONS.find(t => t.value === value);
      return taskType ? (
        <span data-testid="task-table-badge-type" className="text-xs">{taskType.label}</span>
      ) : null;

    case 'startDate':
    case 'endDate':
    case 'actualStartDate':
    case 'actualEndDate':
      return formatDate(value);

    case 'duration':
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

    case 'assigneeId':
      return task.assigneeName || '';

    case 'progress':
      return value !== undefined ? `${value}%` : null;

    case 'delayDays':
      return value > 0 ? (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
          {value}天
        </Badge>
      ) : null;

    case 'delayCount':
      return value > 0 ? (
        <button
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => callbacks.onViewDelayHistory?.(task)}
        >
          {value}
        </button>
      ) : (
        0
      );

    case 'planChangeCount':
      return (
        <button
          data-testid="task-btn-view-changes"
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => callbacks.onViewPlanChanges?.(task)}
        >
          {value || 0}
        </button>
      );

    case 'progressRecordCount':
      return (
        <button
          className="text-blue-600 hover:underline cursor-pointer"
          onClick={() => callbacks.onViewProgress?.(task)}
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
        <span className="font-mono text-xs">{value}</span>
      ) : null;

    case 'projectCode':
      return value ? (
        <span className="font-mono text-xs">{value}</span>
      ) : null;

    default:
      return value ?? '';
  }
}

/**
 * 渲染操作列（带权限控制）
 */
function renderActions(
  task: TaskRowWithUI,
  user: User | null,
  callbacks: {
    onCreateTask?: (parentId?: string, level?: number, parentTask?: TaskRowWithUI) => void;
    onEditTask?: (task: TaskRowWithUI) => void;
    onDeleteTask?: (task: TaskRowWithUI) => void;
    onViewProgress?: (task: TaskRowWithUI) => void;
  }
) {
  const permissions = computeTaskPermissions(user, task);

  return (
    <div className="flex items-center gap-0.5">
      {/* 添加子任务按钮 */}
      {(permissions.canCreateSubtask || !task.id) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="task-btn-create-subtask"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => callbacks.onCreateTask?.(task.id, task.depth + 1, task)}
                disabled={!permissions.canCreateSubtask}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {permissions.canCreateSubtask ? '添加子任务' : '只能在自己负责的任务下添加子任务'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* 编辑按钮 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="task-btn-edit-task"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => callbacks.onEditTask?.(task)}
              disabled={!permissions.canEdit}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {permissions.canEdit ? '编辑任务' : '只能编辑自己负责的任务'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 维护进展按钮 */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="task-btn-view-progress"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => callbacks.onViewProgress?.(task)}
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>维护进展</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 删除按钮 */}
      {permissions.canDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="task-btn-delete-task"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => callbacks.onDeleteTask?.(task)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>删除任务</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * TaskRow 组件 - 使用 React.memo 优化渲染
 *
 * 自定义比较函数确保只在以下情况重渲染：
 * - 任务数据变化（id, status, description等关键字段）
 * - 选中状态变化
 * - 展开状态变化（仅对有子任务的行）
 * - 可见列配置变化
 */
const TaskRow = React.memo(function TaskRow({
  task,
  level,
  isSelected,
  isExpanded,
  visibleColumns,
  user,
  onToggleRow,
  onSelectRow,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onViewProgress,
  onViewDelayHistory,
  onViewPlanChanges,
}: TaskRowProps) {
  // 稳定的回调函数引用
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRow(task.id);
  }, [onToggleRow, task.id]);

  const handleSelect = useCallback(() => {
    onSelectRow(task.id);
  }, [onSelectRow, task.id]);

  const callbacks = {
    onViewProgress,
    onViewDelayHistory,
    onViewPlanChanges,
    onCreateTask,
    onEditTask,
    onDeleteTask,
  };

  return (
    <tr
      key={task.id}
      data-testid="task-table-row"
      className={`
        group border-b border-gray-200 dark:border-gray-700 hover:bg-muted/50 transition-colors
        ${isSelected ? 'bg-blue-50 dark:bg-blue-950/60' : ''}
      `}
      onClick={handleSelect}
    >
      {visibleColumns.map((col, colIndex) => {
        const isSticky = col.sticky === true;
        const stickyLeft = isSticky ? getStickyOffset(visibleColumns, colIndex) : undefined;
        const stickyIndex = isSticky
          ? visibleColumns.slice(0, colIndex).filter(c => c.sticky).length
          : -1;
        const totalSticky = visibleColumns.filter(c => c.sticky).length;
        const isLastSticky = isSticky && stickyIndex === totalSticky - 1;
        const stickyZIndex = isSticky ? 5 + totalSticky - stickyIndex : undefined;

        return (
          <td
            key={col.id}
            data-col-id={col.id}
            style={{
              width: col.width,
              minWidth: col.minWidth,
              ...(isSticky ? { position: 'sticky', left: stickyLeft, zIndex: stickyZIndex } : {}),
            }}
            className={`
              px-2 py-1 text-xs whitespace-nowrap border-b border-gray-200 dark:border-gray-700
              ${col.id === 'description' ? '' : 'text-center'}
              cursor-pointer
              ${isSticky ? `${isSelected ? 'bg-blue-50 dark:bg-blue-950/60' : 'bg-background dark:bg-gray-900'}` : ''}
              ${isLastSticky ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
            `}
          >
            {col.id === 'actions' ? (
              renderActions(task, user, callbacks)
            ) : col.id === 'wbsCode' ? (
              <div className="flex items-center" style={{ paddingLeft: level * 20 }}>
                {task.hasChildren ? (
                  <Button
                    data-testid="task-table-row-toggle"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-0.5 shrink-0"
                    onClick={handleToggle}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <span className="font-mono text-[11px]">{task.wbsCode}</span>
              </div>
            ) : col.id === 'description' ? (
              <div className="flex items-center" style={{ paddingLeft: level * 20 }}>
                {/* 固定占位，与 wbsCode 列的折叠按钮对齐 */}
                <span className="w-5 shrink-0" />
                <span
                  className="truncate hover:bg-blue-100 dark:hover:bg-blue-900/50 px-1 py-0.5 rounded cursor-pointer"
                >
                  {task.description}
                </span>
              </div>
            ) : (
              renderCellContent(task, col, callbacks)
            )}
          </td>
        );
      })}
    </tr>
  );
}, /**
 * 自定义比较函数 - 精确控制重渲染时机
 *
 * 仅在以下情况重渲染：
 * 1. 任务关键字段变化
 * 2. 选中状态变化
 * 3. 展开状态变化（仅对有子任务的行有意义）
 * 4. 可见列数量变化（列配置改变）
 * 5. 用户信息变化（影响权限计算）
 */
(prevProps, nextProps) => {
  // 快速路径：选中状态变化必须重渲染
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false; // 不相等，需要重渲染
  }

  // 快速路径：展开状态变化影响折叠按钮显示
  if (prevProps.isExpanded !== nextProps.isExpanded && prevProps.task.hasChildren) {
    return false;
  }

  // 快速路径：用户变化影响权限
  if (prevProps.user?.id !== nextProps.user?.id || prevProps.user?.role !== nextProps.user?.role) {
    return false;
  }

  // 检查可见列数量变化
  if (prevProps.visibleColumns.length !== nextProps.visibleColumns.length) {
    return false;
  }

  // 检查可见列配置变化（列ID列表比较）
  const prevColIds = prevProps.visibleColumns.map(c => c.id).join(',');
  const nextColIds = nextProps.visibleColumns.map(c => c.id).join(',');
  if (prevColIds !== nextColIds) {
    return false;
  }

  // 检查任务关键字段变化
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // 关键字段比较
  const keyFields = [
    'id',
    'description',
    'status',
    'computedStatus',
    'priority',
    'taskType',
    'progress',
    'assigneeId',
    'assigneeName',
    'startDate',
    'endDate',
    'actualStartDate',
    'actualEndDate',
    'delayDays',
    'delayCount',
    'planChangeCount',
    'progressRecordCount',
    'hasChildren',
    'wbsCode',
    'isSixDayWeek',
    'redmineLink',
    'predecessorCode',
    'projectCode',
    'projectName',
  ] as const;

  for (const field of keyFields) {
    if (prevTask[field] !== nextTask[field]) {
      return false; // 字段变化，需要重渲染
    }
  }

  // 深度变化影响缩进
  if (prevProps.level !== nextProps.level) {
    return false;
  }

  // 所有条件满足，跳过重渲染
  return true;
});

export { TaskRow };
export type { TaskRowProps };