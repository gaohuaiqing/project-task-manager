/**
 * WBS任务表单组件
 */
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { PredecessorSelector } from './PredecessorSelector';
import { DependencyTypeSelector } from './DependencyTypeSelector';
import { useMembers } from '@/features/org/hooks/useOrg';
import { useAssigneeRecommendation, getMatchLevelStyle } from '@/features/assignment/hooks/useAssigneeRecommendation';
import { Sparkles, Star, Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WBSTask, CreateTaskRequest, UpdateTaskRequest, DependencyType } from '../types';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  type TaskStatus,
  type TaskPriority,
  type TaskType,
} from '@/shared/constants';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: WBSTask | null;
  /** 项目ID，可选（任务管理页面需要选择项目） */
  projectId?: string;
  parentId?: string | null;
  wbsLevel?: number;
  /** 可选的项目列表，用于下拉选择 */
  projects?: { id: string; name: string }[];
  /** 可选的任务列表，用于前置任务选择 */
  tasks?: WBSTask[];
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  isLoading?: boolean;
}

export function TaskForm({
  open,
  onOpenChange,
  task,
  projectId,
  parentId,
  wbsLevel = 1,
  projects = [],
  tasks = [],
  onSubmit,
  isLoading,
}: TaskFormProps) {
  const isEdit = !!task;
  // 新建任务时，如果没有指定项目，需要显示项目选择（项目是必填项）
  const needSelectProject = !projectId;

  // 成员列表查询
  const { data: membersData } = useMembers({ pageSize: 500, status: 'active' });
  const allMembers = membersData?.items || [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTaskRequest>({
    defaultValues: {
      projectId: projectId || '',
      parentId: parentId || null,
      wbsLevel,
      description: '',
      status: 'not_started',
      priority: 'medium',
      taskType: 'other',
      assigneeId: null,
      startDate: null,
      duration: null,
      isSixDayWeek: false,
      warningDays: 3,
      predecessorId: null,
      dependencyType: 'FS' as DependencyType,
      lagDays: null,
      redmineLink: null,
      fullTimeRatio: 100,
    },
  });

  // 项目选择：当需要选择项目时，确保项目列表已加载
  const hasProjects = projects.length > 0;

  // 智能推荐状态
  const [showRecommendations, setShowRecommendations] = useState(false);
  const currentTaskType = watch('taskType');
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: fetchRecommendations } =
    useAssigneeRecommendation(currentTaskType, showRecommendations);

  // 表单提交时的额外验证
  const validateForm = (data: CreateTaskRequest): boolean => {
    // 新建任务时，项目是必填项
    if (needSelectProject) {
      if (!data.projectId) {
        setError('请选择所属项目');
        return false;
      }
      if (!hasProjects) {
        setError('暂无可用项目，请先创建项目');
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (task) {
      reset({
        projectId: task.projectId,
        parentId: task.parentId,
        wbsLevel: task.wbsLevel,
        description: task.description,
        taskType: task.taskType,
        priority: task.priority,
        assigneeId: task.assigneeId,
        startDate: task.startDate,
        duration: task.duration,
        isSixDayWeek: task.isSixDayWeek,
        warningDays: task.warningDays,
        predecessorId: task.predecessorId,
        dependencyType: task.dependencyType || 'FS',
        lagDays: task.lagDays,
        redmineLink: task.redmineLink,
        fullTimeRatio: task.fullTimeRatio,
      });
    } else {
      reset({
        projectId: projectId || '',
        parentId: parentId || null,
        wbsLevel,
        description: '',
        taskType: 'other',
        priority: 'medium',
        assigneeId: null,
        startDate: null,
        duration: null,
        isSixDayWeek: false,
        warningDays: 3,
        predecessorId: null,
        dependencyType: 'FS' as DependencyType,
        lagDays: null,
        redmineLink: null,
        fullTimeRatio: 100,
      });
    }
  }, [task, projectId, parentId, wbsLevel, reset]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: CreateTaskRequest) => {
    // 验证项目ID
    if (!validateForm(data)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(data);
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error('TaskForm submit error:', err);
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑任务' : '新建任务'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* 可滚动的表单内容区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 项目选择 - 当没有指定项目时显示（必填） */}
          {needSelectProject && (
            <div className="space-y-2">
              <Label htmlFor="projectId">所属项目 *</Label>
              {hasProjects ? (
                <Select
                  value={watch('projectId') || ''}
                  onValueChange={(value) => setValue('projectId', value)}
                >
                  <SelectTrigger className={!watch('projectId') ? 'border-destructive' : ''}>
                    <SelectValue placeholder="请选择项目（必填）" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-2 border rounded bg-muted/30">
                  暂无可用项目，请先创建项目
                </div>
              )}
              {errors.projectId && (
                <p className="text-xs text-destructive">{errors.projectId.message}</p>
              )}
            </div>
          )}

          {/* 任务描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述 *</Label>
            <Textarea
              id="description"
              {...register('description', { required: '请输入任务描述' })}
              placeholder="请输入任务描述"
              rows={2}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* 状态、优先级、类型 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>任务类型</Label>
              <Select
                value={watch('taskType') || 'other'}
                onValueChange={(value) => setValue('taskType', value as TaskType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((opt) => (
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
                value={watch('priority') || 'medium'}
                onValueChange={(value) => setValue('priority', value as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>预警天数</Label>
              <Input
                type="number"
                min="0"
                max="30"
                {...register('warningDays', { valueAsNumber: true })}
                placeholder="3"
              />
            </div>
          </div>

          {/* 负责人选择 + 智能推荐 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>负责人</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary"
                onClick={() => {
                  setShowRecommendations(!showRecommendations);
                  if (!showRecommendations) {
                    fetchRecommendations();
                  }
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                智能推荐
                {showRecommendations ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-1" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                )}
              </Button>
            </div>
            <Select
              value={watch('assigneeId')?.toString() || 'none'}
              onValueChange={(value) => setValue('assigneeId', value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未指定</SelectItem>
                {allMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                        <AvatarFallback className="text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      {member.departmentName && (
                        <span className="text-xs text-muted-foreground">({member.departmentName})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 智能推荐面板 */}
            {showRecommendations && (
              <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>基于任务类型 "{TASK_TYPE_OPTIONS.find(o => o.value === currentTaskType)?.label || '未知'}" 的智能推荐</span>
                </div>

                {isLoadingRecommendations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">正在分析...</span>
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => {
                      const matchStyle = getMatchLevelStyle(rec.match_level);
                      return (
                        <div
                          key={rec.user_id}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                            watch('assigneeId') === rec.user_id && 'border-primary bg-primary/5'
                          )}
                          onClick={() => setValue('assigneeId', rec.user_id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                              {index + 1}
                            </div>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.real_name}`} />
                              <AvatarFallback>{rec.real_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{rec.real_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {rec.department_name || '未分配部门'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-3 w-3',
                                      i < Math.round(rec.overall_score / 20)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    )}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rec.model_name} · {rec.current_tasks} 个任务进行中
                              </p>
                            </div>
                            <Badge className={cn(matchStyle.color, matchStyle.bgColor, 'text-xs')}>
                              {matchStyle.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无推荐数据</p>
                    <p className="text-xs mt-1">请确保已配置任务类型对应的能力模型映射</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 日期和工期 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">工期（工作日）</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                {...register('duration', { valueAsNumber: true })}
                placeholder="自动计算结束日期"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullTimeRatio">全职比 (%)</Label>
              <Input
                id="fullTimeRatio"
                type="number"
                min="0"
                max="100"
                step="1"
                {...register('fullTimeRatio', { valueAsNumber: true })}
                placeholder="100"
              />
            </div>
          </div>

          {/* 前置任务选择器 */}
          <div className="space-y-2">
            <Label>前置任务</Label>
            <PredecessorSelector
              projectId={projectId}
              value={watch('predecessorId') || null}
              onChange={(id, task) => {
                setValue('predecessorId', id);
              }}
              tasks={tasks}
              currentTaskId={task?.id}
              placeholder="输入WBS编码或选择前置任务"
            />
          </div>

          {/* 依赖类型和滞后天数 */}
          <div className="grid grid-cols-2 gap-4">
            <DependencyTypeSelector
              value={watch('dependencyType') || 'FS'}
              onChange={(value) => setValue('dependencyType', value)}
            />
            <div className="space-y-2">
              <Label htmlFor="lagDays">提前/落后天数</Label>
              <Input
                id="lagDays"
                type="number"
                {...register('lagDays', { valueAsNumber: true })}
                placeholder="负数为提前"
              />
            </div>
          </div>

          {/* Redmine链接 */}
          <div className="space-y-2">
            <Label htmlFor="redmineLink">Redmine链接</Label>
            <Input
              id="redmineLink"
              {...register('redmineLink')}
              placeholder="https://redmine.example.com/issues/xxx"
            />
          </div>

          {/* 工作制 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isSixDayWeek"
              className="h-4 w-4"
              {...register('isSixDayWeek')}
            />
            <Label htmlFor="isSixDayWeek" className="cursor-pointer">
              六天工作制（周六算工作日）
            </Label>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
              {error}
            </div>
          )}
          </div>

          {/* 固定在底部的按钮区域 */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading || isSubmitting}>
              {isLoading || isSubmitting ? '保存中...' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
