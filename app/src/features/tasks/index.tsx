/**
 * 任务管理页面
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WbsTable } from './components/WbsTable';
import { TaskForm } from './components/TaskForm';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from './hooks/useTaskMutations';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from './types';

interface TasksPageProps {
  projectId?: string;
}

export default function TasksPage({ projectId }: TasksPageProps) {
  // 对话框状态
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask(selectedTask?.id ?? '');
  const deleteMutation = useDeleteTask();

  // 处理创建任务
  const handleCreateTask = (parentTaskId?: string) => {
    setSelectedTask(null);
    setParentId(parentTaskId ?? null);
    setFormOpen(true);
  };

  // 处理编辑任务
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setParentId(task.parentId);
    setFormOpen(true);
  };

  // 处理删除任务
  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task);
    setDeleteOpen(true);
  };

  // 提交表单
  const handleFormSubmit = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    if (selectedTask) {
      await updateMutation.mutateAsync(data as UpdateTaskRequest);
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

      {/* WBS 表格 */}
      <WbsTable
        projectId={projectId}
        onCreateTask={handleCreateTask}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* 任务表单对话框 */}
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setSelectedTask(null);
            setParentId(null);
          }
        }}
        task={selectedTask}
        projectId={projectId || ''}
        parentId={parentId}
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
        description={`确定要删除任务 "${selectedTask?.name}" 吗？此操作将同时删除所有子任务，无法撤销。`}
        confirmText="删除"
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
