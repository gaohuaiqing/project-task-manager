/**
 * 任务管理页面
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WbsTable } from './components/WbsTable';
import { TaskForm } from './components/TaskForm';
import { TaskFilterBar } from './components/TaskFilterBar';
import { TaskDetailDialog } from './components/TaskDetailDialog';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useTasks } from './hooks/useTasks';
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from './hooks/useTaskMutations';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { getMembers } from '@/lib/api/org.api';
import { taskApi } from '@/lib/api/task.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { WBSTaskListItem, CreateTaskRequest, UpdateTaskRequest, TaskQueryParams } from './types';

interface TasksPageProps {
  projectId?: string;
}

export default function TasksPage({ projectId }: TasksPageProps) {
  const queryClient = useQueryClient();

  // 筛选状态
  const [filters, setFilters] = useState<TaskQueryParams>({
    projectId,
    pageSize: 100, // 减小默认页面大小，提升性能
  });

  // 对话框状态
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WBSTaskListItem | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [wbsLevel, setWbsLevel] = useState<number>(1);
  const [inheritedProjectId, setInheritedProjectId] = useState<string | undefined>(undefined);
  const [inheritedTaskType, setInheritedTaskType] = useState<string | undefined>(undefined);
  const [detailDefaultTab, setDetailDefaultTab] = useState<'progress' | 'delays' | 'changes'>('progress');

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: TaskQueryParams) => {
    setFilters((prev) => ({
      ...newFilters,
      projectId: projectId || newFilters.projectId, // 项目详情页保持项目ID
      pageSize: 100, // 保持较小的页面大小
    }));
  }, [projectId]);

  // 查询任务列表（使用筛选参数）
  const { data: tasksData, isLoading: tasksLoading } = useTasks(filters);

  // 查询项目列表（用于下拉选择）
  const { data: projectsData } = useProjects({ pageSize: 1000 });

  // 查询成员列表（用于负责人下拉）
  const { data: membersData } = useQuery({
    queryKey: queryKeys.org.members,
    queryFn: () => getMembers({ pageSize: 1000, status: 'active' }),
    staleTime: 5 * 60 * 1000, // 5 分钟
  });

  // Mutations
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();
  const updateMutation = useUpdateTask(); // 不传参数，在调用时传递 { id, data }

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

  // 处理删除任务
  const handleDeleteTask = (task: WBSTaskListItem) => {
    setSelectedTask(task);
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

  // 行内更新任务（字段级别）
  const handleUpdateTaskField = useCallback(async (taskId: string, field: string, value: unknown) => {
    const task = tasksData?.items.find(t => t.id === taskId);
    if (!task) return;

    const updateData: UpdateTaskRequest = {
      [field]: value,
      version: task.version,
    } as UpdateTaskRequest;

    // 直接调用 API
    await taskApi.updateTask(taskId, updateData);

    // 刷新任务列表
    queryClient.invalidateQueries({ queryKey: queryKeys.task.lists() });
  }, [tasksData, queryClient]);

  // 计算任务树（添加 hasChildren 和 depth）
  // 展平嵌套的 children 结构
  const tasksWithMeta = useMemo(() => {
    if (!tasksData?.items) return [];

    const taskMap = new Map<string, WBSTaskListItem & { hasChildren: boolean; depth: number }>();

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

    flattenTasks(tasksData.items);

    return Array.from(taskMap.values());
  }, [tasksData]);

  // 成员列表（简化格式）
  const members = useMemo(() => {
    return membersData?.items.map(m => ({ id: m.id, name: m.name })) ?? [];
  }, [membersData]);

  // 项目列表（简化格式）
  const projects = useMemo(() => {
    return projectsData?.items.map(p => ({ id: String(p.id), name: p.name })) ?? [];
  }, [projectsData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">任务管理</h1>
          <p className="text-muted-foreground">管理项目任务和 WBS 结构</p>
        </div>
        <Button onClick={() => handleCreateTask()}>
          <Plus className="h-4 w-4 mr-2" />
          新建任务
        </Button>
      </div>

      {/* 筛选器 */}
      <TaskFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects}
        members={members}
        showProjectFilter={!projectId}
      />

      {/* WBS 表格 */}
      <WbsTable
        tasks={tasksWithMeta}
        members={members}
        projects={projects}
        isLoading={tasksLoading}
        onCreateTask={handleCreateTask}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onViewProgress={handleViewProgress}
        onViewDelayHistory={handleViewDelayHistory}
        onViewPlanChanges={handleViewPlanChanges}
        onUpdateTask={handleUpdateTaskField}
      />

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
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedTask(null);
        }}
        title="删除任务"
        description={`确定要删除任务 "${selectedTask?.description}" 吗？此操作将同时删除所有子任务，无法撤销。`}
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
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
    </div>
  );
}
