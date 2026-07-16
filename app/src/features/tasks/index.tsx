/**
 * 任务管理页面
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { WbsTable } from './components/WbsTable';
import { TaskForm } from './components/TaskForm';
import { TaskFilterBar } from './components/TaskFilterBar';
import { TaskDetailDialog } from './components/TaskDetailDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ChangeReasonDialog, type ChangedField } from '@/shared/components/ChangeReasonDialog';
import { useTasks } from './hooks/useTasks';
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useChangeTaskLevel,
  useReorderTask,
} from './hooks/useTaskMutations';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { taskApi, batchDeleteTasks, getTaskFilterOptions } from '@/lib/api/task.api';
import type { BatchDeleteTaskResult, ImportResult } from '@/lib/api/task.api';
import { queryKeys } from '@/lib/api/query-keys';
import { invalidationBatcher } from '@/lib/utils/invalidationBatcher';
import { useAuth } from '@/features/auth';
import { PLAN_FIELDS } from './hooks/usePermissions';
import type { WBSTaskListItem, CreateTaskRequest, UpdateTaskRequest, TaskQueryParams } from './types';

/** 计划字段的中文标签 */
const FIELD_LABELS: Record<string, string> = {
  startDate: '开始日期',
  duration: '工期',
  predecessorId: '前置任务',
  lagDays: '提前/落后天数',
  // snake_case 版本（后端字段名）
  start_date: '开始日期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

interface TasksPageProps {
  projectId?: string;
}

export default function TasksPage({ projectId }: TasksPageProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { id: urlTaskId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 筛选状态
  const [filters, setFilters] = useState<TaskQueryParams>({
    projectId,
    pageSize: 100, // 减小默认页面大小，提升性能
  });

  // 对话框状态
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<WBSTaskListItem | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [wbsLevel, setWbsLevel] = useState<number>(1);
  const [inheritedProjectId, setInheritedProjectId] = useState<string | undefined>(undefined);
  const [inheritedTaskType, setInheritedTaskType] = useState<string | undefined>(undefined);
  const [detailDefaultTab, setDetailDefaultTab] = useState<'progress' | 'delays' | 'changes'>('progress');

  // 变更原因弹窗状态
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingFieldUpdate, setPendingFieldUpdate] = useState<{
    taskId: string;
    field: string;
    value: unknown;
    version: number;
    changes: ChangedField[];
  } | null>(null);

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: TaskQueryParams) => {
    setFilters((prev) => ({
      ...newFilters,
      projectId: projectId || newFilters.projectId, // 项目详情页保持项目ID
      pageSize: 100, // 保持较小的页面大小
    }));
  }, [projectId]);

  // 项目联动失效清理：项目筛选变化时清空已选负责人（候选已变，可能失效）
  const selectedProjectKey = Array.isArray(filters.projectId)
    ? filters.projectId.join(',')
    : filters.projectId;
  useEffect(() => {
    setFilters((prev) => {
      if (!prev.assigneeId && !prev.includeUnassigned) return prev;
      return { ...prev, assigneeId: undefined, includeUnassigned: undefined };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectKey]);

  // 查询任务列表（使用筛选参数）
  const { data: tasksData, isLoading: tasksLoading } = useTasks(filters);

  // 查询项目列表（用于下拉选择）
  const { data: projectsData } = useProjects({ pageSize: 100 });

  // 查询负责人候选（有任务的 distinct 责任人，项目联动）
  const projectIdForFilter = useMemo(() => {
    if (!filters.projectId) return undefined;
    return Array.isArray(filters.projectId) ? filters.projectId : [filters.projectId];
  }, [filters.projectId]);
  const { data: filterOptionsData } = useQuery({
    queryKey: ['task', 'filterOptions', filters.projectId],
    queryFn: () => getTaskFilterOptions({ projectId: projectIdForFilter }),
    staleTime: 60 * 1000,
  });

  // Mutations
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();
  const updateMutation = useUpdateTask(); // 不传参数，在调用时传递 { id, data }
  const changeLevelMutation = useChangeTaskLevel();
  const reorderMutation = useReorderTask();

  // 处理创建任务
  const handleCreateTask = (parentTaskId?: string, level?: number, parentTask?: WBSTaskListItem) => {
    setSelectedTask(null);
    setParentId(parentTaskId ?? null);
    setWbsLevel(level ?? 1);

    // 如果是创建子任务，继承父任务的项目和任务类型
    if (parentTaskId && parentTask) {
      setInheritedProjectId(parentTask.projectId);
      setInheritedTaskType(parentTask.taskType);
    } else {
      setInheritedProjectId(undefined);
      setInheritedTaskType(undefined);
    }

    setFormOpen(true);
  };

  // 处理编辑任务
  const handleEditTask = (task: WBSTaskListItem) => {
    setSelectedTask(task);
    setParentId(task.parentId);
    setWbsLevel(task.wbsLevel);
    setInheritedProjectId(task.projectId); // 设置项目ID，确保表单能正确显示项目信息
    setFormOpen(true);
  };

  // 删除预览数据
  const [deletePreview, setDeletePreview] = useState<{ descendantCount: number; descendants: Array<{ id: string; wbs_code: string; description: string }>; hasMore: boolean } | null>(null);

  // 处理删除任务 - 先获取预览数据
  const handleDeleteTask = async (task: WBSTaskListItem) => {
    setSelectedTask(task);
    setDeletePreview(null);
    try {
      const res = await taskApi.getDeletePreview(task.id);
      setDeletePreview(res.data);
    } catch {
      // 预览获取失败不影响删除流程
    }
    setDeleteOpen(true);
  };

  // 提交表单
  const handleFormSubmit = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    if (selectedTask) {
      // 编辑模式：添加 version 字段，使用 { id, data } 格式
      const updateData: UpdateTaskRequest = {
        ...data,
        version: selectedTask.version,
      } as UpdateTaskRequest;
      await updateMutation.mutateAsync({ id: selectedTask.id, data: updateData });
    } else {
      await createMutation.mutateAsync(data as CreateTaskRequest);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (selectedTask) {
      await deleteMutation.mutateAsync(selectedTask.id);
      setDeleteOpen(false);
      setSelectedTask(null);
    }
  };

  // 批量删除任务 - 仅管理员和部门经理可用
  const canBatchDelete = user?.role === 'admin' || user?.role === 'dept_manager';

  // 批量删除时记录用户选中的任务总数（包括子任务）
  const [batchDeleteTotalCount, setBatchDeleteTotalCount] = useState(0);

  const handleBatchDelete = useCallback((taskIds: string[], totalCount: number) => {
    setSelectedTaskIds(taskIds);
    setBatchDeleteTotalCount(totalCount);
    setBatchDeleteOpen(true);
  }, []);

  const handleConfirmBatchDelete = async () => {
    setBatchDeleteLoading(true);
    try {
      const result = await batchDeleteTasks(selectedTaskIds);
      setBatchDeleteOpen(false);
      setSelectedTaskIds([]);
      // 强制刷新任务列表（批量删除后需要重新计算 WBS 编码）
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
      await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
      invalidationBatcher.invalidate(queryKeys.analytics.all);
      if (result.failed > 0) {
        // 简化错误提示，只显示失败数量
        toast.error(`删除完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
      } else {
        // 显示用户实际选中的任务总数（包括级联删除的子任务）
        toast.success(`删除成功！已移除 ${batchDeleteTotalCount} 个任务`);
      }
    } catch (error: any) {
      const msg = error?.message || (error instanceof Error ? error.message : '批量删除失败');
      toast.error(msg);
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  // 查看进展记录
  const handleViewProgress = (task: WBSTaskListItem) => {
    setSelectedTask(task);
    setDetailDefaultTab('progress');
    setDetailOpen(true);
  };

  // 查看延期历史
  const handleViewDelayHistory = (task: WBSTaskListItem) => {
    setSelectedTask(task);
    setDetailDefaultTab('delays');
    setDetailOpen(true);
  };

  // 查看计划变更
  const handleViewPlanChanges = (task: WBSTaskListItem) => {
    setSelectedTask(task);
    setDetailDefaultTab('changes');
    setDetailOpen(true);
  };

  // 导入任务处理 - 支持分批导入并自动刷新
  // 项目编码由后端自动匹配项目UUID
  const handleImportTasks = useCallback(async (tasks: Array<Record<string, unknown>>) => {
    // 分批导入，每批500条（避免跨批次查找父任务的问题）
    const BATCH_SIZE = 500;
    const batches: Array<Array<Record<string, unknown>>> = [];

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      batches.push(tasks.slice(i, i + BATCH_SIZE));
    }

    const allResults: ImportResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const batch of batches) {
        const result = await taskApi.importTasks(batch);
        allResults.push(...result.results);
        successCount += result.success;
        failedCount += result.failed;
      }

      // 导入成功后强制刷新任务列表
      if (successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
        await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
        invalidationBatcher.invalidate(queryKeys.analytics.all);
      }

      return {
        total: tasks.length,
        success: successCount,
        failed: failedCount,
        results: allResults,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`导入失败: ${errorMessage}`);
      return {
        success: 0,
        failed: tasks.length,
        results: tasks.map(t => ({
          success: false,
          wbsCode: (t.wbsCode || t['WBS编码'] || '未知') as string,
          rowNumber: t.rowNumber as number,
          error: errorMessage,
        })),
      };
    }
  }, [queryClient]);

  // 计算任务树（添加 hasChildren 和 depth）
  // 展平嵌套的 children 结构
  const { tasksWithMeta, taskMap } = useMemo(() => {
    if (!tasksData?.items) return { tasksWithMeta: [], taskMap: new Map() };

    const taskMap = new Map<string, WBSTaskListItem & { hasChildren: boolean; depth: number }>();

    // 当后端返回扁平列表（无项目过滤）时，使用 parentId 前端构建树结构
    const buildTreeIfNeeded = (items: WBSTaskListItem[]): WBSTaskListItem[] => {
      const hasTreeStructure = items.some(item => Array.isArray(item.children) && item.children.length > 0);
      if (hasTreeStructure) return items;

      const nodeMap = new Map<string, WBSTaskListItem>();
      const roots: WBSTaskListItem[] = [];

      items.forEach(item => {
        nodeMap.set(item.id, { ...item, children: [] });
      });

      items.forEach(item => {
        const node = nodeMap.get(item.id)!;
        if (item.parentId && nodeMap.has(item.parentId)) {
          nodeMap.get(item.parentId)!.children!.push(node);
        } else {
          roots.push(node);
        }
      });

      return roots;
    };

    // 递归展平任务（包括 children）
    const flattenTasks = (tasks: WBSTaskListItem[]) => {
      tasks.forEach(task => {
        // 添加当前任务到 map，保留 children 用于 WbsTable
        taskMap.set(task.id, {
          ...task,
          hasChildren: !!(task.children && task.children.length > 0),
          depth: task.wbsLevel,
          children: task.children // 保留 children 引用
        });

        // 如果有 children，递归处理
        if (task.children && task.children.length > 0) {
          // 递归展平 children
          flattenTasks(task.children as WBSTaskListItem[]);
        }
      });
    };

    const treeItems = buildTreeIfNeeded(tasksData.items);
    flattenTasks(treeItems);

    return { tasksWithMeta: Array.from(taskMap.values()), taskMap };
  }, [tasksData]);

  // 性能优化：使用ref存储taskMap最新值，避免handleUpdateTaskField因taskMap变化重建
  const taskMapRef = useRef(taskMap);
  taskMapRef.current = taskMap;

  // 行内更新任务（字段级别）- 使用 Map O(1) 查找，稳定引用避免重渲染
  const handleUpdateTaskField = useCallback(async (taskId: string, field: string, value: unknown) => {
    const task = taskMapRef.current.get(taskId);
    if (!task) return;

    // 工程师修改计划字段时，弹出变更原因弹窗
    const isEngineer = user?.role === 'engineer';
    const isPlanField = PLAN_FIELDS.includes(field as typeof PLAN_FIELDS[number]);

    if (isEngineer && isPlanField) {
      const originalValue = (task as Record<string, unknown>)[field];
      setPendingFieldUpdate({
        taskId,
        field,
        value,
        version: task.version,
        changes: [{
          field,
          label: FIELD_LABELS[field] || field,
          oldValue: originalValue ?? '-',
          newValue: value ?? '-',
        }],
      });
      setReasonDialogOpen(true);
      return;
    }

    // 直接更新（非计划字段或管理员）
    const updateData: UpdateTaskRequest = {
      [field]: value,
      version: task.version,
    } as UpdateTaskRequest;

    await taskApi.updateTask(taskId, updateData);
    // 强制刷新任务列表
    await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
    await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
  }, [user?.role, queryClient]);

  /** 行内更新携带变更原因提交 */
  const handleReasonConfirm = useCallback(async (reason: string) => {
    if (!pendingFieldUpdate) return;

    const { taskId, field, value, version } = pendingFieldUpdate;
    const updateData: UpdateTaskRequest = {
      [field]: value,
      version,
      reason,
    } as UpdateTaskRequest;

    await taskApi.updateTask(taskId, updateData);
    // 强制刷新任务列表
    await queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
    await queryClient.refetchQueries({ queryKey: queryKeys.task.lists() });
    setReasonDialogOpen(false);
    setPendingFieldUpdate(null);
  }, [pendingFieldUpdate, queryClient]);

  // 负责人候选（有任务的 distinct 责任人，含未分配 id=null）
  const members = useMemo(() => {
    return filterOptionsData?.assignees ?? [];
  }, [filterOptionsData]);

  // 项目列表（简化格式）
  const projects = useMemo(() => {
    return projectsData?.items.map(p => ({ id: String(p.id), name: p.name })) ?? [];
  }, [projectsData]);

  // 处理 URL 中的任务 ID，自动打开任务详情
  useEffect(() => {
    if (!urlTaskId || tasksLoading) return;

    // 首先尝试在当前列表中查找
    const task = tasksData?.items?.find(t => String(t.id) === urlTaskId);
    if (task) {
      setSelectedTask(task);
      setDetailOpen(true);
      navigate('/tasks', { replace: true });
      return;
    }

    // 任务不在当前视图，尝试直接获取
    const fetchAndOpenTask = async () => {
      const result = await taskApi.tryGetTask(urlTaskId);
      if (result.success && result.task) {
        // 将任务转换为 WBSTaskListItem 格式
        const taskItem = { ...result.task, hasChildren: false, depth: result.task.wbsLevel, children: [] } as WBSTaskListItem;
        setSelectedTask(taskItem);
        setDetailOpen(true);
        navigate('/tasks', { replace: true });
      } else {
        // 任务不存在或无权限，显示提示后清除 URL
        toast.error(result.error?.message || '无法访问该任务');
        navigate('/tasks', { replace: true });
      }
    };
    fetchAndOpenTask();
  }, [urlTaskId, tasksData, tasksLoading, navigate]);

  return (
    <div className="flex flex-col h-full animate-fade-in" data-testid="task-page-container">
      {/* 筛选器 */}
      <div className="shrink-0">
        <TaskFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          projects={projects}
          members={members}
          showProjectFilter={!projectId}
        />
      </div>

      {/* WBS 表格 - 填充剩余空间 */}
      <div className="flex-1 min-h-0 mt-3">
        <WbsTable
          tasks={tasksWithMeta}
          members={members}
          projects={projects}
          isLoading={tasksLoading}
          projectId={projectId || filters.projectId}
          projectName={projects.find(p => p.id === (projectId || filters.projectId))?.name}
          onCreateTask={handleCreateTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onViewProgress={handleViewProgress}
          onViewDelayHistory={handleViewDelayHistory}
          onViewPlanChanges={handleViewPlanChanges}
          onImportTasks={handleImportTasks}
          onBatchDelete={canBatchDelete ? handleBatchDelete : undefined}
          onChangeLevel={async (taskId, targetLevel) => {
            await changeLevelMutation.mutateAsync({ taskId, targetLevel });
          }}
          onReorderTask={async (taskId, afterTaskId) => {
            await reorderMutation.mutateAsync({ taskId, afterTaskId });
          }}
          totalCount={tasksData?.total}
          searchActive={!!filters.search?.trim()}
        />
      </div>

      {/* 任务表单对话框 */}
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setSelectedTask(null);
            setParentId(null);
            setInheritedProjectId(undefined);
            setInheritedTaskType(undefined);
          }
        }}
        task={selectedTask}
        projectId={projectId || inheritedProjectId}
        parentId={parentId}
        wbsLevel={wbsLevel}
        inheritedTaskType={inheritedTaskType}
        isSubtask={!!parentId}
        projects={projects}
        tasks={tasksData?.items || []}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        data-testid="task-dialog-delete-confirm"
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setSelectedTask(null);
            setDeletePreview(null);
          }
        }}
        title="删除任务"
        description={
          deletePreview && deletePreview.descendantCount > 0
            ? `确定要删除任务 "${selectedTask?.description}" 吗？此操作将同时删除 ${deletePreview.descendantCount} 个子任务，无法撤销。`
            : `确定要删除任务 "${selectedTask?.description}" 吗？此操作无法撤销。`
        }
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />

      {/* 批量删除确认对话框 */}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(open) => {
          setBatchDeleteOpen(open);
          if (!open) setSelectedTaskIds([]);
        }}
        title={`删除 ${selectedTaskIds.length} 个任务`}
        description={
          `删除后，这些任务及其子任务将被永久移除，无法恢复。确定要继续吗？`
        }
        confirmText="确认删除"
        onConfirm={handleConfirmBatchDelete}
        loading={batchDeleteLoading}
        variant="destructive"
      />

      {/* 任务详情弹窗 */}
      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedTask(null);
        }}
        task={selectedTask}
        defaultTab={detailDefaultTab}
      />

      {/* 行内更新变更原因弹窗 */}
      <ChangeReasonDialog
        open={reasonDialogOpen}
        onOpenChange={(open) => {
          setReasonDialogOpen(open);
          if (!open) setPendingFieldUpdate(null);
        }}
        changes={pendingFieldUpdate?.changes ?? []}
        onConfirm={handleReasonConfirm}
      />
    </div>
  );
}
