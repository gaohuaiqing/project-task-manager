/**
 * 任务表单组件
 */
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskPriority, TaskType, TaskStatus } from '../types';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projectId: string;
  parentId?: string | null;
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  isLoading?: boolean;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const typeOptions: { value: TaskType; label: string }[] = [
  { value: 'frontend', label: '前端' },
  { value: 'backend', label: '后端' },
  { value: 'test', label: '测试' },
  { value: 'design', label: '设计' },
  { value: 'other', label: '其他' },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

export function TaskForm({
  open,
  onOpenChange,
  task,
  projectId,
  parentId,
  onSubmit,
  isLoading,
}: TaskFormProps) {
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTaskRequest>({
    defaultValues: {
      projectId,
      parentId: parentId || null,
      name: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      taskType: 'other',
      estimatedHours: undefined,
      plannedStartDate: undefined,
      plannedEndDate: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        projectId: task.projectId,
        parentId: task.parentId,
        name: task.name,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        taskType: task.taskType,
        estimatedHours: task.estimatedHours || undefined,
        plannedStartDate: task.plannedStartDate || undefined,
        plannedEndDate: task.plannedEndDate || undefined,
      });
    } else {
      reset({
        projectId,
        parentId: parentId || null,
        name: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        taskType: 'other',
        estimatedHours: undefined,
        plannedStartDate: undefined,
        plannedEndDate: undefined,
      });
    }
  }, [task, projectId, parentId, reset]);

  const handleFormSubmit = async (data: CreateTaskRequest) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑任务' : '新建任务'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">任务名称 *</Label>
            <Input
              id="name"
              {...register('name', { required: '请输入任务名称' })}
              placeholder="请输入任务名称"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>任务类型</Label>
              <Select
                value={watch('taskType')}
                onValueChange={(value) => setValue('taskType', value as TaskType)}
              >
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedStartDate">计划开始</Label>
              <Input
                id="plannedStartDate"
                type="date"
                {...register('plannedStartDate')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedEndDate">计划结束</Label>
              <Input
                id="plannedEndDate"
                type="date"
                {...register('plannedEndDate')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedHours">预估工时（小时）</Label>
            <Input
              id="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              {...register('estimatedHours')}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="请输入任务描述"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '保存中...' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
