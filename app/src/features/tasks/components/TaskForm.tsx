/**
 * WBS任务表单组件
 */
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';

/**
 * 将日期转换为 HTML date input 所需的格式 (YYYY-MM-DD)
 * 使用本地时间避免时区问题
 */
function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // 使用本地时间避免时区偏移问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
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
import { useTaskPermissions, PLAN_FIELDS } from '../hooks/usePermissions';
import { Sparkles, Star, Loader2, ChevronDown, ChevronUp, Users, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/utils/avatar';
import type { WBSTask, CreateTaskRequest, UpdateTaskRequest, DependencyType } from '../types';

/** 表单数据类型（编辑时包含额外字段） */
interface TaskFormData extends Omit<CreateTaskRequest, 'status'> {
  status?: import('../types').TaskStatus;
  version?: number;
}
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
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
  /** 继承的任务类型（子任务继承父任务） */
  inheritedTaskType?: string;
  /** 是否是子任务（子任务不能选择项目） */
  isSubtask?: boolean;
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
  inheritedTaskType,
  isSubtask = false,
  projects = [],
  tasks = [],
  onSubmit,
  isLoading,
}: TaskFormProps) {
  const isEdit = !!task;
  // 子任务不需要选择项目（继承父任务项目），新建根任务时如果没有指定项目，需要显示项目选择
  const needSelectProject = !projectId && !isSubtask;

  // 获取权限
  const permissions = useTaskPermissions(task);

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
  } = useForm<TaskFormData>({
    defaultValues: {
      projectId: projectId || '',
      parentId: parentId || null,
      wbsLevel,
      description: '',
      status: 'not_started',
      priority: 'medium',
      taskType: inheritedTaskType || 'other',
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
      actualStartDate: null,
      actualEndDate: null,
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
  const validateForm = (data: TaskFormData): boolean => {
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
        status: task.status,
        taskType: task.taskType,
        priority: task.priority,
        assigneeId: task.assigneeId,
        startDate: formatDateForInput(task.startDate),
        duration: task.duration,
        isSixDayWeek: task.isSixDayWeek,
        warningDays: task.warningDays,
        predecessorId: task.predecessorId,
        dependencyType: task.dependencyType || 'FS',
        lagDays: task.lagDays,
        redmineLink: task.redmineLink,
        fullTimeRatio: task.fullTimeRatio,
        actualStartDate: formatDateForInput(task.actualStartDate),
        actualEndDate: formatDateForInput(task.actualEndDate),
        // 编辑时需要保留 version 字段用于乐观锁
        version: task.version,
      });
    } else {
      const resolvedTaskType = inheritedTaskType || 'other';
      reset({
        projectId: projectId || '',
        parentId: parentId || null,
        wbsLevel,
        description: '',
        status: 'not_started',
        taskType: resolvedTaskType,
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
        actualStartDate: null,
        actualEndDate: null,
      });
    }
  }, [task, projectId, parentId, wbsLevel, inheritedTaskType, reset]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: TaskFormData) => {
    // 验证项目ID
    if (!validateForm(data)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // 构造提交数据：编辑时包含 version 字段
      const submitData = isEdit
        ? {
            ...data,
            version: data.version || task?.version || 0,
          }
        : data;

      await onSubmit(submitData as CreateTaskRequest | UpdateTaskRequest);
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
    <Dialog data-testid="task-dialog-form" open={open} onOpenChange={onOpenChange}>
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
                  data-testid="task-select-project"
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

          {/* 编辑时显示所属项目（只读） */}
          {isEdit && !needSelectProject && (
            <div className="space-y-2">
              <Label>所属项目</Label>
              <div className="text-sm p-2 border rounded bg-muted/30">
                {task?.projectName || projects.find(p => p.id === task?.projectId)?.name || '未知项目'}
              </div>
            </div>
          )}

          {/* 任务描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述 *</Label>
            <Textarea
              data-testid="task-input-description"
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
                data-testid="task-select-type"
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
                data-testid="task-select-priority"
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
              <Label className="flex items-center gap-2">
                负责人
                {!permissions.canEditAssignee && (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Label>
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
              data-testid="task-select-assignee"
              value={watch('assigneeId')?.toString() || 'none'}
              onValueChange={(value) => setValue('assigneeId', value === 'none' ? null : parseInt(value))}
              disabled={!permissions.canEditAssignee}
            >
              <SelectTrigger className={!permissions.canEditAssignee ? 'opacity-60' : ''}>
                <SelectValue placeholder="选择负责人" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未指定</SelectItem>
                {allMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={getAvatarUrl(member.name, member.gender)} />
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
            {!permissions.canEditAssignee && (
              <p className="text-xs text-muted-foreground">负责人字段需要分配权限</p>
            )}

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
                      const matchStyle = getMatchLevelStyle(rec.matchLevel);
                      return (
                        <div
                          key={rec.userId}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
                            watch('assigneeId') === rec.userId && 'border-primary bg-primary/5'
                          )}
                          onClick={() => setValue('assigneeId', rec.userId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                              {index + 1}
                            </div>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getAvatarUrl(rec.realName, rec.gender)} />
                              <AvatarFallback>{rec.realName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{rec.realName}</p>
                              <p className="text-xs text-muted-foreground">
                                {rec.departmentName || '未分配部门'}
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
                                      i < Math.round(rec.overallScore / 20)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    )}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rec.modelName} · {rec.currentTasks} 个任务进行中
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

          {/* 日期和工期 - 计划字段，工程师编辑需审批 */}
          {permissions.needsApprovalForPlanChanges && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                修改日期、工期、前置任务等计划字段需要提交审批
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-1">
                开始日期
                {permissions.needsApprovalForPlanChanges && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    需审批
                  </Badge>
                )}
              </Label>
              <Input
                data-testid="task-input-start-date"
                id="startDate"
                type="date"
                {...register('startDate')}
                disabled={!permissions.canEditPlanFields && isEdit}
                className={!permissions.canEditPlanFields && isEdit ? 'opacity-60' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1">
                工期（工作日）
                {permissions.needsApprovalForPlanChanges && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    需审批
                  </Badge>
                )}
              </Label>
              <Input
                data-testid="task-input-estimated-days"
                id="duration"
                type="number"
                min="1"
                {...register('duration', { valueAsNumber: true })}
                placeholder="自动计算结束日期"
                disabled={!permissions.canEditPlanFields && isEdit}
                className={!permissions.canEditPlanFields && isEdit ? 'opacity-60' : ''}
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

          {/* 前置任务选择器 - 计划字段，工程师编辑需审批 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              前置任务
              {permissions.needsApprovalForPlanChanges && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  需审批
                </Badge>
              )}
            </Label>
            <PredecessorSelector
              projectId={projectId}
              value={watch('predecessorId') || null}
              onChange={(id, task) => {
                setValue('predecessorId', id);
              }}
              tasks={tasks}
              currentTaskId={task?.id}
              placeholder="输入WBS编码或选择前置任务"
              disabled={!permissions.canEditPlanFields && isEdit}
            />
          </div>

          {/* 依赖类型和滞后天数 - lagDays 是计划字段 */}
          <div className="grid grid-cols-2 gap-4">
            <DependencyTypeSelector
              value={watch('dependencyType') || 'FS'}
              onChange={(value) => setValue('dependencyType', value)}
            />
            <div className="space-y-2">
              <Label htmlFor="lagDays" className="flex items-center gap-1">
                提前/落后天数
                {permissions.needsApprovalForPlanChanges && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    需审批
                  </Badge>
                )}
              </Label>
              <Input
                id="lagDays"
                type="number"
                {...register('lagDays', { valueAsNumber: true })}
                placeholder="负数为提前"
                disabled={!permissions.canEditPlanFields && isEdit}
                className={!permissions.canEditPlanFields && isEdit ? 'opacity-60' : ''}
              />
            </div>
          </div>

          {/* Redmine链接 - 仅根任务可编辑 */}
          {!isSubtask && (
            <div className="space-y-2">
              <Label htmlFor="redmineLink">Redmine链接</Label>
              <Input
                id="redmineLink"
                {...register('redmineLink')}
                placeholder="https://redmine.example.com/issues/xxx"
              />
              <p className="text-xs text-muted-foreground">仅根任务可填写 Redmine 链接</p>
            </div>
          )}

          {/* 实际日期 - 非计划字段，所有用户可直接编辑 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actualStartDate">实际开始日期</Label>
              <Input
                data-testid="task-input-actual-start-date"
                id="actualStartDate"
                type="date"
                {...register('actualStartDate')}
              />
              <p className="text-xs text-muted-foreground">填写后任务状态会更新</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualEndDate">实际结束日期</Label>
              <Input
                data-testid="task-input-actual-end-date"
                id="actualEndDate"
                type="date"
                {...register('actualEndDate')}
              />
              <p className="text-xs text-muted-foreground">填写后状态变为已完成</p>
            </div>
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
              data-testid="task-btn-cancel"
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button data-testid="task-btn-submit" type="submit" disabled={isLoading || isSubmitting}>
              {isLoading || isSubmitting ? '保存中...' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
