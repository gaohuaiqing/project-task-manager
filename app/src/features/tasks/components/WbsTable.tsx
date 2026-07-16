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
  ChevronsUp,
  ChevronsDown,
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
  saveColumnVisibility,
  loadStickyConfig,
  saveStickyConfig,
} from './columnConfig';
import { computeTaskPermissions, type TaskPermissions } from '../hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical } from 'lucide-react';

/** DnD 拖拽项类型 */
const TASK_ROW_DND_TYPE = 'TASK_ROW';

/** 可拖拽的任务行组件 */
interface DraggableTaskRowProps {
  task: TaskRowWithUI;
  level: number;
  isSelected: boolean;
  parentId: string | null;
  /** 前一个同级任务的 id（用于排在目标任务之前时） */
  prevSiblingId: string | null;
  onReorderTask?: (taskId: string, afterTaskId: string | null) => Promise<void>;
  children: React.ReactNode;
}

const DraggableTaskRow = React.memo(function DraggableTaskRow({
  task,
  level,
  isSelected,
  parentId,
  prevSiblingId,
  onReorderTask,
  children,
}: DraggableTaskRowProps) {
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null);

  // 拖拽源
  const [{ isDragging }, dragRef] = useDrag({
    type: TASK_ROW_DND_TYPE,
    item: { id: task.id, parentId, level },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // 拖拽目标
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: TASK_ROW_DND_TYPE,
    canDrop: (item: { id: string; parentId: string | null; level: number }) => {
      // 只允许同级拖拽
      return item.parentId === parentId && item.id !== task.id;
    },
    hover: (item: { id: string; parentId: string | null }, monitor) => {
      if (!monitor.canDrop()) return;

      // 获取鼠标相对于目标行的位置
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // 获取目标元素的边界
      const el = (monitor as any).target?.getBoundingClientRect?.() || (monitor as any).getSourceClientOffset?.();
      if (!el && !(monitor as any).target) return;

      // 使用 monitor.getNode() 获取 DOM 元素
      const node = (monitor as any).target;
      if (!node) return;

      const rect = node.getBoundingClientRect?.();
      if (!rect) return;

      const hoverMiddleY = (rect.bottom - rect.top) / 2;
      const hoverClientY = clientOffset.y - rect.top;

      // 根据鼠标位置决定放在前面还是后面
      setDropPosition(hoverClientY < hoverMiddleY ? 'before' : 'after');
    },
    drop: async (item: { id: string; parentId: string | null }, monitor) => {
      if (!onReorderTask || item.id === task.id) return;

      // before: 放在这个任务之前（即前一个任务之后，如果没有前一个则放最前）
      // after: 放在这个任务之后
      if (dropPosition === 'before') {
        await onReorderTask(item.id, prevSiblingId);
      } else {
        await onReorderTask(item.id, task.id);
      }
      setDropPosition(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // 合并 drag 和 drop ref
  const attachRef = (el: HTMLTableRowElement | null) => {
    dragRef(el);
    dropRef(el);
  };

  // 离开时重置位置
  React.useEffect(() => {
    if (!isOver) {
      setDropPosition(null);
    }
  }, [isOver]);

  // 是否显示放置指示
  const showDropIndicator = isOver && canDrop;

  // 给所有 td 子元素添加指示线样式
  const childrenWithIndicator = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const existingClassName = (child.props as React.HTMLAttributes<HTMLElement>).className || '';
      const existingStyle = (child.props as React.HTMLAttributes<HTMLElement>).style || {};

      // before: 在目标行上方显示指示线
      // after: 在目标行下方显示指示线
      let newStyle = existingStyle;
      if (showDropIndicator) {
        if (dropPosition === 'before') {
          newStyle = { ...existingStyle, borderTop: '3px solid #3b82f6' };
        } else {
          newStyle = { ...existingStyle, borderBottom: '3px solid #3b82f6' };
        }
      }

      return React.cloneElement(child, {
        className: existingClassName,
        style: newStyle,
      });
    }
    return child;
  });

  return (
    <tr
      ref={attachRef}
      data-testid="task-table-row"
      className={`group ${isSelected ? 'bg-blue-100 dark:bg-blue-950/60' : 'hover:bg-muted/50'} ${isDragging ? 'opacity-40' : ''}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {childrenWithIndicator}
    </tr>
  );
});
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
  /** 修改任务等级回调 */
  onChangeLevel?: (taskId: string, targetLevel: number) => Promise<void>;
  /** 拖拽排序回调 */
  onReorderTask?: (taskId: string, afterTaskId: string | null) => Promise<void>;
  /** 批量删除回调，taskIds 为根任务ID，totalCount 为用户选中的任务总数（包括子任务） */
  onBatchDelete?: (taskIds: string[], totalCount: number) => void;
  totalCount?: number;
  /** 是否处于搜索激活状态（search 输入非空） */
  searchActive?: boolean;
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
  onBatchDelete,
  onChangeLevel,
  onReorderTask,
  totalCount,
  searchActive,
}: WbsTableProps) {
  // 获取当前用户（用于权限计算）
  const { user } = useAuth();
  // 组件级权限（顶部「新建任务」/空状态「添加根任务」入口用：canCreate=是否可建根任务，仅 manager）
  const rootPermissions = computeTaskPermissions(user);
  const { toast } = useToast();

  // 拖拽历史记录（用于撤销）
  interface ReorderHistoryItem {
    taskId: string;
    previousAfterTaskId: string | null;
    taskDescription: string;
  }
  const [reorderHistory, setReorderHistory] = useState<ReorderHistoryItem[]>([]);

  // 批量选择状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const canBatchDelete = !!onBatchDelete;

  // 清理已不存在的选中ID（删除/刷新后）
  useEffect(() => {
    setSelectedTaskIds(prev => {
      if (prev.size === 0) return prev;
      const currentIds = new Set(tasks.map(t => t.id));
      const next = new Set([...prev].filter(id => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [tasks]);

  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    loadColumnVisibility()
  );

  // 列固定状态
  const [stickyConfig, setStickyConfig] = useState<Record<string, boolean>>(() =>
    loadStickyConfig()
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

  // 搜索激活时：自动展开有 children 的根任务（补全的子孙可见），只增不删，不破坏手动折叠
  useEffect(() => {
    if (!searchActive) return;
    if (tasks.length === 0) return;
    setExpandedRows(prev => {
      const taskIdSet = new Set(tasks.map(t => t.id));
      const topLevelWithChildren = tasks.filter(
        t => t.hasChildren && (!t.parentId || !taskIdSet.has(t.parentId))
      );
      const next = new Set(prev);
      let changed = false;
      topLevelWithChildren.forEach(t => {
        if (!next.has(t.id)) {
          next.add(t.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [searchActive, tasks]);

  // 选中的行
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 等级编辑状态
  const [editingLevelTaskId, setEditingLevelTaskId] = useState<string | null>(null);
  const [editingLevelValue, setEditingLevelValue] = useState<number>(1);
  const [isLevelChanging, setIsLevelChanging] = useState(false);

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

  // 可见列（过滤后，合并 sticky 配置）
  // 三级回退：localStorage 配置 → 列定义默认值 → false
  const visibleColumns = useMemo(() => {
    return WBS_COLUMNS
      .filter(col => columnVisibility[col.id] !== false)
      .map(col => ({ ...col, sticky: stickyConfig[col.id] ?? col.sticky ?? false }));
  }, [columnVisibility, stickyConfig]);

  // 实际测量的列宽（用于精确计算 sticky 偏移）
  // 性能优化：使用 useEffect + requestAnimationFrame 异步测量，避免阻塞渲染
  const [measuredColumnWidths, setMeasuredColumnWidths] = useState<number[]>([]);
  const measureRafRef = useRef<number>(0);

  useEffect(() => {
    // 使用 requestAnimationFrame 在下一帧测量，不阻塞当前渲染
    measureRafRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const table = container.querySelector('table');
      if (!table) return;

      // 优先从表体行测量列宽
      const bodyRow = table.querySelector('tbody tr[data-testid="task-table-row"]');
      const measureCells = bodyRow
        ? bodyRow.querySelectorAll('td')
        : table.querySelectorAll('thead th');
      if (measureCells.length === 0) return;

      const newWidths = Array.from(measureCells).map(cell => (cell as HTMLElement).offsetWidth);

      setMeasuredColumnWidths(prev => {
        // 仅当宽度变化超过 2px 时才更新（避免频繁更新）
        const changed = newWidths.length !== prev.length ||
          newWidths.some((w, i) => Math.abs(w - (prev[i] ?? 0)) > 2);
        return changed ? newWidths : prev;
      });
    });

    return () => cancelAnimationFrame(measureRafRef.current);
  }, [visibleColumns, tasks.length]);

  // 基于实际渲染宽度计算 sticky 偏移量
  // 注意：表格第一列是拖拽手柄列（不在 visibleColumns 中），所以实际列索引需要 +1
  // sticky 列的 left 偏移量 = 拖拽手柄列宽度 + 前面所有 sticky 列宽度之和
  const getStickyOffsetActual = useCallback((colIndex: number): number => {
    // 拖拽手柄列宽度（measuredColumnWidths[0]）
    const dragHandleWidth = measuredColumnWidths[0] ?? 24; // 默认 w-6 = 24px
    let offset = dragHandleWidth;
    for (let i = 0; i < colIndex; i++) {
      if (visibleColumns[i].sticky) {
        // measuredColumnWidths[0] 是拖拽手柄列，visibleColumns[i] 对应 measuredColumnWidths[i + 1]
        offset += measuredColumnWidths[i + 1] ?? visibleColumns[i].width;
      }
    }
    return offset;
  }, [visibleColumns, measuredColumnWidths]);

  // 扁平化任务列表（处理展开/折叠）
  // 性能优化：直接利用传入的 tasks 数据（已经是扁平结构），只处理展开/折叠过滤
  // 避免重复遍历整棵树
  const flatTasks = useMemo(() => {
    const result: { task: TaskRowWithUI; level: number }[] = [];

    if (tasks.length === 0) return result;

    // 传入的 tasks 已经是扁平结构（包含 hasChildren 和 children）
    // 直接遍历，根据展开状态决定是否包含子任务
    const processTask = (task: TaskRowWithUI, level: number) => {
      result.push({ task, level });

      // 如果任务有子任务且已展开，则处理子任务
      if (task.hasChildren && task.children && task.children.length > 0 && expandedRows.has(task.id)) {
        const children = (task.children as TaskRowWithUI[]).map(child => ({
          ...child,
          hasChildren: !!(child.children && child.children.length > 0),
          children: child.children,
          depth: child.wbsLevel
        }));
        children.forEach(child => processTask(child, child.wbsLevel));
      }
    };

    // 从顶级任务开始处理（parentId 为空或不存在于当前列表）
    const taskIdSet = new Set(tasks.map(t => t.id));
    const topLevelTasks = tasks.filter(t => !t.parentId || !taskIdSet.has(t.parentId));
    topLevelTasks.forEach(task => processTask(task, task.wbsLevel));

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
  const ROW_HEIGHT = 32;
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

  // 收集任务及其所有后代任务ID（用于级联选择）
  const collectDescendantIds = useCallback((taskId: string): string[] => {
    const ids: string[] = [taskId];
    const task = taskMap.get(taskId);
    if (task?.children && task.children.length > 0) {
      const collectChildren = (children: TaskRowWithUI[]) => {
        children.forEach(child => {
          ids.push(child.id);
          if (child.children && child.children.length > 0) {
            collectChildren(child.children as TaskRowWithUI[]);
          }
        });
      };
      collectChildren(task.children as TaskRowWithUI[]);
    }
    return ids;
  }, [taskMap]);

  /**
   * 过滤掉有祖先被选中的任务ID
   * 原因：后端删除任务时会级联删除所有子任务，如果同时传递父任务和子任务ID，
   * 子任务会因为已被删除而报错"任务不存在"
   */
  const filterRootTaskIds = useCallback((ids: Set<string>): string[] => {
    const result: string[] = [];
    ids.forEach(id => {
      const task = taskMap.get(id);
      // 如果任务有父任务且父任务也在选中列表中，则跳过
      if (task?.parentId && ids.has(task.parentId)) {
        return;
      }
      result.push(id);
    });
    return result;
  }, [taskMap]);

  // 性能优化：预计算所有渲染任务的权限，避免在循环中重复计算
  const taskPermissionsMap = useMemo(() => {
    const map = new Map<string, TaskPermissions>();
    renderedTasks.forEach(({ task }) => {
      map.set(task.id, computeTaskPermissions(user, task));
    });
    return map;
  }, [renderedTasks, user]);

  // 所有任务ID集合（仅包含有删除权限的任务）
  const allTaskIds = useMemo(() => {
    if (!canBatchDelete) return [];
    return tasks
      .filter(task => computeTaskPermissions(user, task).canDelete)
      .map(task => task.id);
  }, [tasks, canBatchDelete, user]);

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

  // 全部折叠
  const handleCollapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  // 全部展开
  const handleExpandAll = useCallback(() => {
    setExpandedRows(new Set(allExpandableIds));
  }, [allExpandableIds]);

  // 拖拽排序处理（带历史记录）
  const handleReorderTaskWithHistory = useCallback(async (taskId: string, afterTaskId: string | null) => {
    if (!onReorderTask) return;

    // 获取任务在当前排序中的前一个任务ID（作为回退位置）
    // 需要找到当前任务在同级任务中的位置，以及它的前一个任务
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      await onReorderTask(taskId, afterTaskId);
      return;
    }

    const taskParentId = task.parentId ?? null;
    const sameParentTasks = tasks.filter(t => (t.parentId ?? null) === taskParentId);

    // 找当前任务在同级列表中的位置
    const currentIndex = sameParentTasks.findIndex(t => t.id === taskId);

    // 前一个任务的ID（用于回退）
    const previousAfterTaskId = currentIndex > 0 ? sameParentTasks[currentIndex - 1].id : null;

    // 执行排序
    await onReorderTask(taskId, afterTaskId);

    // 记录历史（最多保留10条）
    setReorderHistory(prev => {
      const newHistory = [
        ...prev,
        {
          taskId,
          previousAfterTaskId,
          taskDescription: task.description,
        },
      ].slice(-10);
      return newHistory;
    });

    toast.success('拖拽完成', {
      action: {
        label: '撤销',
        onClick: () => handleUndoReorder(),
      },
      duration: 5000,
    });
  }, [onReorderTask, tasks, toast]);

  // 撤销拖拽排序
  const handleUndoReorder = useCallback(async () => {
    if (reorderHistory.length === 0 || !onReorderTask) {
      toast.info('没有可撤销的操作');
      return;
    }

    // 取出最近一条记录
    const lastRecord = reorderHistory[reorderHistory.length - 1];

    try {
      await onReorderTask(lastRecord.taskId, lastRecord.previousAfterTaskId);

      // 移除这条记录
      setReorderHistory(prev => prev.slice(0, -1));

      toast.success(`已撤销：${lastRecord.taskDescription}`);
    } catch (error) {
      toast.error('撤销失败，任务可能已被删除或移动');
    }
  }, [reorderHistory, onReorderTask, toast]);

  // 切换列可见性
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      saveColumnVisibility(next);
      return next;
    });
  }, []);

  // 切换列固定
  const toggleColumnSticky = useCallback((columnId: string) => {
    setStickyConfig(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      saveStickyConfig(next);
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
      case 'wbsLevel': {
        const level = task.wbsLevel ?? 1;
        const isEditing = editingLevelTaskId === task.id;

        if (isEditing) {
          return (
            <input
              type="number"
              min={1}
              max={5}
              value={editingLevelValue}
              className="w-8 h-6 text-center text-xs border border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLevelChanging}
              autoFocus
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 5) {
                  setEditingLevelValue(val);
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();

                  // 边界验证：根任务不能再提升
                  if (level === 1 && editingLevelValue < 1) {
                    toast({ title: '根任务不能再提升', variant: 'destructive' });
                    setEditingLevelTaskId(null);
                    return;
                  }

                  // 边界验证：第5层任务不能再降低
                  if (level === 5 && editingLevelValue > 5) {
                    toast({ title: '第5层任务不能再降低', variant: 'destructive' });
                    setEditingLevelTaskId(null);
                    return;
                  }

                  // 边界验证：目标等级必须在1-5之间
                  if (editingLevelValue < 1 || editingLevelValue > 5) {
                    toast({ title: '等级必须在1-5之间', variant: 'destructive' });
                    setEditingLevelTaskId(null);
                    return;
                  }

                  if (editingLevelValue !== level && onChangeLevel) {
                    setIsLevelChanging(true);
                    try {
                      await onChangeLevel(task.id, editingLevelValue);
                      toast({ title: `等级已调整为 ${editingLevelValue}` });
                    } catch (error: any) {
                      // 显示后端返回的错误信息
                      const errorMsg = error?.response?.data?.error?.message || error?.message || '修改等级失败';
                      toast({ title: errorMsg, variant: 'destructive' });
                    } finally {
                      setIsLevelChanging(false);
                    }
                  }
                  setEditingLevelTaskId(null);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setEditingLevelTaskId(null);
                }
              }}
              onBlur={() => setEditingLevelTaskId(null)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }

        return (
          <span
            className="inline-block w-6 h-6 leading-6 text-center text-xs font-medium rounded-full bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
            title={`点击修改等级（当前：${level}级）${level === 1 ? '，根任务不能再提升' : level === 5 ? '，第5层不能再降低' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setEditingLevelTaskId(task.id);
              setEditingLevelValue(level);
            }}
          >
            {level}
          </span>
        );
      }

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
          <span data-testid="task-table-badge-type" className="text-xs">{taskType.label}</span>
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
          <span className="font-mono text-xs">{value}</span>
        ) : null;

      case 'projectCode':
        return value ? (
          <span className="font-mono text-xs">{value}</span>
        ) : null;

      default:
        return value ?? '';
    }
  };

  // 渲染操作列（带权限控制）
  const renderActions = (task: TaskRowWithUI) => {
    // 使用预计算的权限（性能优化）
    const permissions = taskPermissionsMap.get(task.id) ?? computeTaskPermissions(user, task);

    return (
      <div className="flex items-center gap-0.5 justify-center">
        {/* 批量选择复选框 */}
        {canBatchDelete && permissions.canDelete && (
          <Checkbox
            checked={selectedTaskIds.has(task.id)}
            onCheckedChange={() => {
              setSelectedTaskIds(prev => {
                const next = new Set(prev);
                // 收集当前任务及其所有后代任务ID（级联选择）
                const idsToToggle = collectDescendantIds(task.id);
                if (next.has(task.id)) {
                  // 取消选择：移除当前任务及所有后代
                  idsToToggle.forEach(id => next.delete(id));
                } else {
                  // 选择：添加当前任务及所有后代
                  idsToToggle.forEach(id => next.add(id));
                }
                return next;
              });
            }}
            className="mr-0.5 scale-75"
          />
        )}
        {/* 添加子任务按钮 - 工程师只能在自己负责的任务下添加 */}
        {(permissions.canCreateSubtask || !task.id) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="task-btn-create-subtask"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onCreateTask?.(task.id, task.depth + 1, task)}
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

        {/* 编辑按钮 - 无权限时浅灰显示并提示 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="task-btn-edit-task"
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${!permissions.canEdit ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={permissions.canEdit ? () => onEditTask?.(task) : undefined}
              >
                <Edit2 className="h-3.5 w-3.5" />
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
                className={`h-6 w-6 ${!permissions.canEdit ? 'opacity-30 cursor-not-allowed' : ''}`}
                onClick={permissions.canEdit ? () => onViewProgress?.(task) : undefined}
              >
                <FileText className="h-3.5 w-3.5" />
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
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onDeleteTask?.(task)}
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
            // 工程师(canCreate=false)仅能基于选中子任务(有parentId)创建同级；manager 可建根任务
            if (rootPermissions.canCreate || selectedTask?.parentId) {
              onCreateTask(selectedTask?.parentId, selectedTask?.depth);
            }
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
    <DndProvider backend={HTML5Backend}>
    <div className="flex flex-col h-full" data-testid="task-table-container">
      {/* 工具栏 */}
      <div className="flex items-center justify-between shrink-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            共 {totalCount ?? flatTasks.length} 条任务
          </div>
          {canBatchDelete && allTaskIds.length > 0 && (
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <Checkbox
                checked={selectedTaskIds.size === allTaskIds.length ? true : selectedTaskIds.size > 0 ? "indeterminate" : false}
                onCheckedChange={() => {
                  setSelectedTaskIds(prev => {
                    if (prev.size === allTaskIds.length) return new Set();
                    return new Set(allTaskIds);
                  });
                }}
              />
              全选
            </label>
          )}
          {canBatchDelete && selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                已选中 {selectedTaskIds.size} 个任务（含 {filterRootTaskIds(selectedTaskIds).length} 个根任务）
              </span>
              <Button
                data-testid="task-btn-batch-delete"
                variant="destructive"
                size="sm"
                onClick={() => {
                  // 过滤掉有祖先被选中的任务，只传递根任务ID
                  const rootTaskIds = filterRootTaskIds(selectedTaskIds);
                  // 传递根任务ID和用户选中的任务总数（包括子任务）
                  onBatchDelete!(rootTaskIds, selectedTaskIds.size);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除选中
              </Button>
            </div>
          )}
          {rootPermissions.canCreate && (
            <Button data-testid="task-btn-create-task" variant="outline" size="sm" onClick={() => onCreateTask()}>
              <Plus className="h-4 w-4 mr-2" />
              新建任务
            </Button>
          )}
          {/* 撤销拖拽 */}
          {reorderHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndoReorder}
              title={`撤销最近拖拽（剩余 ${reorderHistory.length} 条记录）`}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h10a5 5 0 0 1 5 5v2" />
                <path d="M7 6L3 10l4 4" />
              </svg>
              撤销拖拽
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 全部折叠 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCollapseAll}
            title="全部折叠"
          >
            <ChevronsUp className="h-4 w-4" />
          </Button>

          {/* 全部展开 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleExpandAll}
            title="全部展开"
          >
            <ChevronsDown className="h-4 w-4" />
          </Button>

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
          <PopoverContent className="w-72 max-h-96 overflow-y-auto" align="end" onInteractOutside={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">列配置</h4>
              </div>
              {/* 列头：主复选框 */}
              {(() => {
                const allVisible = WBS_COLUMNS.every(col => columnVisibility[col.id] !== false);
                const noneVisible = WBS_COLUMNS.every(col => columnVisibility[col.id] === false);
                const allSticky = WBS_COLUMNS.every(col => stickyConfig[col.id] === true);
                const noneSticky = WBS_COLUMNS.every(col => stickyConfig[col.id] !== true);
                return (
                  <div className="flex items-center text-xs text-muted-foreground border-b pb-1">
                    <div className="w-14 flex justify-center">
                      <Checkbox
                        checked={allVisible ? true : noneVisible ? false : 'indeterminate'}
                        onCheckedChange={(checked) => {
                          const next: Record<string, boolean> = {};
                          WBS_COLUMNS.forEach(col => {
                            if (col.canHide) next[col.id] = !!checked;
                          });
                          setColumnVisibility(next);
                          saveColumnVisibility(next);
                        }}
                      />
                    </div>
                    <div className="w-14 flex justify-center">
                      <Checkbox
                        checked={allSticky ? true : noneSticky ? false : 'indeterminate'}
                        onCheckedChange={(checked) => {
                          const next: Record<string, boolean> = {};
                          WBS_COLUMNS.forEach(col => { next[col.id] = !!checked; });
                          setStickyConfig(next);
                          saveStickyConfig(next);
                        }}
                      />
                    </div>
                    <span className="flex-1 text-center">列名</span>
                  </div>
                );
              })()}
              <div className="space-y-1">
                {WBS_COLUMNS.map(col => (
                  <div key={col.id} className="flex items-center">
                    <div className="w-14 flex justify-center">
                      <Checkbox
                        id={`vis-${col.id}`}
                        checked={columnVisibility[col.id] !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.id)}
                        disabled={!col.canHide}
                      />
                    </div>
                    <div className="w-14 flex justify-center">
                      <Checkbox
                        id={`sticky-${col.id}`}
                        checked={stickyConfig[col.id] === true}
                        onCheckedChange={() => toggleColumnSticky(col.id)}
                        disabled={columnVisibility[col.id] === false}
                      />
                    </div>
                    <label
                      htmlFor={`vis-${col.id}`}
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
        <table className="w-full border-separate border-spacing-0" data-testid="task-table">
          {/* 表头 - 每个 th 独立管理 sticky，避免嵌套 sticky 导致的层叠问题 */}
          <thead data-testid="task-table-header">
            <tr>
              <th className="px-1 py-2 text-xs w-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
              {visibleColumns.map((col, colIndex) => {
                const isSticky = col.sticky === true;
                const stickyLeft = isSticky ? getStickyOffsetActual(colIndex) : undefined;
                const stickyIndex = isSticky
                  ? visibleColumns.slice(0, colIndex).filter(c => c.sticky).length
                  : -1;
                const totalSticky = visibleColumns.filter(c => c.sticky).length;
                const isLastSticky = isSticky && stickyIndex === totalSticky - 1;
                // 固定列 z-index 高于非固定列，确保水平滚动时正确层叠
                const headerZIndex = isSticky ? 20 + totalSticky - stickyIndex : 10;
                return (
                  <th
                    key={col.id}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      position: 'sticky',
                      top: 0,
                      zIndex: headerZIndex,
                      ...(isSticky ? { left: stickyLeft } : {}),
                    }}
                    className={`
                      px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-700
                      bg-gray-50 dark:bg-gray-800
                      ${isLastSticky ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
                    `}
                    title={col.tooltip}
                  >
                    <div className={`relative flex items-center group/header w-full ${col.align === 'right' ? 'justify-end' : col.align === 'left' ? 'justify-start' : 'justify-center'}`}>
                      <span>{col.label}</span>
                      {col.required && <span className="text-red-500">*</span>}
                      {col.canHide && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="absolute right-0 opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded cursor-pointer"
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
                    {rootPermissions.canCreate && (
                      <Button variant="outline" size="sm" onClick={() => onCreateTask?.()}>
                        <Plus className="h-4 w-4 mr-2" />
                        添加根任务
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* 虚拟滚动：顶部占位（仅非分页模式） */}
                {!isPaged && topSpacerHeight > 0 && (
                  <tr aria-hidden="true" style={{ height: topSpacerHeight }} />
                )}
                {renderedTasks.map(({ task, level }, index) => {
                const isSelected = selectedRowId === task.id;

                // 找前一个同级任务（用于拖拽时排在前面）
                let prevSiblingId: string | null = null;
                const taskParentId = task.parentId ?? null;
                for (let i = index - 1; i >= 0; i--) {
                  const prevTask = renderedTasks[i].task;
                  if ((prevTask.parentId ?? null) === taskParentId) {
                    prevSiblingId = prevTask.id;
                    break;
                  }
                  // 如果遇到不同 parentId 的任务，继续向上找
                  // 但如果遇到 parentId 为 null 且当前任务 parentId 也为 null，也匹配
                }

                return (
                  <DraggableTaskRow
                    key={task.id}
                    task={task}
                    level={level}
                    isSelected={isSelected}
                    parentId={taskParentId}
                    prevSiblingId={prevSiblingId}
                    onReorderTask={handleReorderTaskWithHistory}
                  >
                    <td
                      className="px-1 py-1 text-xs whitespace-nowrap border-b border-gray-200 dark:border-gray-700 text-center w-6"
                      onClick={() => setSelectedRowId(task.id)}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                    </td>
                    {visibleColumns.map((col, colIndex) => {
                      const isSticky = col.sticky === true;
                      const stickyLeft = isSticky ? getStickyOffsetActual(colIndex) : undefined;
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
                            cursor-pointer
                            ${isSticky ? `${isSelected ? 'bg-blue-100 dark:bg-blue-950/60' : 'bg-background dark:bg-gray-900'}` : ''}
                            ${isLastSticky ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : ''}
                          `}
                          onClick={() => setSelectedRowId(task.id)}
                          onDoubleClick={() => {
                            if (onEditTask) {
                              const permissions = computeTaskPermissions(user, task);
                              if (permissions.canEdit) onEditTask(task);
                            }
                          }}
                        >
                          {col.id === 'actions' ? (
                            renderActions(task)
                          ) : col.id === 'wbsCode' ? (
                            <div className={`w-full flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'left' ? 'justify-start' : 'justify-center'}`} style={{ paddingLeft: (level - 1) * 20 }}>
                              {task.hasChildren ? (
                                <Button
                                  data-testid="task-table-row-toggle"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 mr-0.5 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRow(task.id);
                                  }}
                                >
                                  {expandedRows.has(task.id) ? (
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
                            // paddingLeft 控制层级缩进（根任务无缩进）
                            <div className={`w-full flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'left' ? 'justify-start' : 'justify-center'}`} style={{ paddingLeft: (level - 1) * 20 }}>
                              <span
                                className="truncate hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:px-1 py-0.5 rounded cursor-pointer text-xs"
                              >
                                {task.description}
                              </span>
                            </div>
                          ) : (
                            <div className={`w-full ${col.align === 'right' ? 'flex justify-end' : col.align === 'left' ? 'flex justify-start' : 'flex justify-center'}`}>
                              {renderCellContent(task, col)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </DraggableTaskRow>
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

      {/* 筛选结果统计栏：显示当前筛选后的任务数量及各状态分布（computed_status 口径，与 WBS 显示一致） */}
      <div className="shrink-0 flex items-center gap-2 px-1 pt-3 text-xs text-muted-foreground flex-wrap border-t border-border/40">
        <span>筛选结果：<span className="font-semibold text-foreground">{tasks.length}</span> 个任务</span>
        <span className="text-border">|</span>
        {(() => {
          const counts: Record<string, number> = {};
          for (const t of tasks) {
            const s = String(t.computedStatus || t.status || '');
            if (s) counts[s] = (counts[s] || 0) + 1;
          }
          // 显示顺序：延期相关优先（用户最关注），其次进行中/未开始，最后完成类
          const ORDER = ['delayed', 'delay_warning', 'in_progress', 'not_started', 'overdue_completed', 'early_completed', 'on_time_completed', 'pending_approval'];
          const COLORS = STATUS_COLORS as Record<string, { bg: string; text: string; label: string }>;
          return ORDER.filter(s => counts[s]).map(s => {
            const c = COLORS[s];
            if (!c) return null;
            return (
              <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                {c.label} {counts[s]}
              </span>
            );
          });
        })()}
        {tasks.length === 0 && <span className="italic">无匹配任务</span>}
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
            共 {totalCount ?? flatTasks.length} 条任务，第 {safeCurrentPage}/{totalPages} 页
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
        onConfirm={handleImportConfirm}
        isLoading={isImporting}
      />
    </div>
    </DndProvider>
  );
});
