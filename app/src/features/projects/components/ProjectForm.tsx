/**
 * 项目表单组件
 * 符合需求规格：REQ_03_project.md
 * - 4种项目类型
 * - 日期必填验证
 * - 日期先后验证
 * - 成员管理分组（树形选择器）
 * - 里程碑分组（动态增减）
 */
import { useForm, useFieldArray } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Separator } from '@/components/ui/separator';
import { DatePickerField } from '@/components/ui/date-picker';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_CONFIG } from '@/shared/constants';
import { MemberTreeSelector } from '@/components/member-tree-selector';
import type { Project, CreateProjectRequest, UpdateProjectRequest, ProjectType, Milestone } from '../types';
import { Plus, X, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { projectApi } from '@/lib/api/project.api';
import { queryKeys } from '@/lib/api/query-keys';

// 里程碑表单字段
interface MilestoneFormData {
  id?: string;
  name: string;
  targetDate: string;
  description: string;
  completionPercentage: number;
}

// 表单数据类型
interface ProjectFormData {
  code: string;
  name: string;
  description: string;
  projectType: ProjectType;
  startDate: string | undefined;
  deadline: string | undefined;
  memberIds: number[];
  milestones: MilestoneFormData[];
}

// 空数组常量，避免每次渲染创建新引用
const EMPTY_MILESTONES: Milestone[] = [];

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  existingMilestones?: Milestone[];
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<string | boolean>;
  isLoading?: boolean;
}

export function ProjectForm({
  open,
  onOpenChange,
  project,
  existingMilestones = EMPTY_MILESTONES,
  onSubmit,
  isLoading,
}: ProjectFormProps) {
  const isEdit = !!project;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      projectType: 'product_dev',
      startDate: undefined,
      deadline: undefined,
      memberIds: [],
      milestones: [],
    },
  });

  // 里程碑动态数组
  const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({
    control,
    name: 'milestones',
  });

  // 选中的成员ID列表
  const selectedMemberIds = watch('memberIds') || [];

  // 追踪项目 ID，只在项目切换时重置整个表单
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  // 追踪里程碑是否已初始化（用于区分首次加载和更新后的数据刷新）
  const milestonesInitializedRef = useRef(false);

  // 当项目 ID 变化时，重置整个表单
  useEffect(() => {
    const currentProjectId = project?.id;
    const isProjectChanged = prevProjectIdRef.current !== currentProjectId;

    if (project && isProjectChanged) {
      // 项目切换，重置整个表单
      prevProjectIdRef.current = currentProjectId;
      milestonesInitializedRef.current = false; // 重置里程碑初始化标记

      reset({
        code: project.code,
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        startDate: project.startDate || undefined,
        deadline: project.deadline || undefined,
        memberIds: project.memberIds || [],
        milestones: existingMilestones.map((m) => ({
          id: m.id,
          name: m.name,
          targetDate: m.targetDate,
          description: m.description,
          completionPercentage: m.completionPercentage ?? 0,
        })),
      });

      // 如果里程碑数据已存在，标记为已初始化
      if (existingMilestones.length > 0) {
        milestonesInitializedRef.current = true;
      }
    } else if (!project && prevProjectIdRef.current !== undefined) {
      // 关闭表单，清空数据
      prevProjectIdRef.current = undefined;
      milestonesInitializedRef.current = false;
      reset({
        code: '',
        name: '',
        description: '',
        projectType: 'product_dev',
        startDate: undefined,
        deadline: undefined,
        memberIds: [],
        milestones: [],
      });
    }
  }, [project?.id, reset]);

  // 当 existingMilestones 变化且里程碑未初始化时，更新里程碑字段
  // 这确保首次加载时能正确显示里程碑，但不会在里程碑更新后覆盖用户正在编辑的数据
  useEffect(() => {
    if (project && !milestonesInitializedRef.current && existingMilestones.length > 0) {
      milestonesInitializedRef.current = true;
      setValue('milestones', existingMilestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetDate: m.targetDate,
        description: m.description,
        completionPercentage: m.completionPercentage ?? 0,
      })));
    }
  }, [existingMilestones, project, setValue]);

  // 切换成员选择（由 MemberTreeSelector 内部处理）
  const handleMemberChange = (ids: number[]) => {
    setValue('memberIds', ids);
  };

  // 日期验证
  const validateDates = (data: ProjectFormData) => {
    if (data.startDate && data.deadline) {
      const start = new Date(data.startDate);
      const end = new Date(data.deadline);
      if (end < start) {
        return '截止日期不能早于开始日期';
      }
    }
    return null;
  };

  /**
   * 同步里程碑变更（编辑模式下使用）
   * 比较现有里程碑和表单里程碑，执行增删改操作
   */
  const syncMilestones = async (
    projectId: string,
    formMilestones: MilestoneFormData[],
    originalMilestones: Milestone[]
  ): Promise<boolean> => {
    const originalIds = new Set(originalMilestones.map((m) => m.id));
    const formIds = new Set(formMilestones.filter((m) => m.id).map((m) => m.id!));

    // 1. 找出需要删除的里程碑（原列表中有，表单中没有）
    const toDelete = originalMilestones.filter((m) => !formIds.has(m.id));

    // 2. 找出需要新增的里程碑（表单中没有 id 的）
    const toCreate = formMilestones.filter((m) => !m.id);

    // 3. 找出需要更新的里程碑（两边都有的）
    const toUpdate = formMilestones.filter((m) => m.id && originalIds.has(m.id));

    try {
      // 删除
      for (const milestone of toDelete) {
        await projectApi.deleteMilestone(milestone.id);
      }

      // 新增
      for (const milestone of toCreate) {
        await projectApi.createMilestone(projectId, {
          name: milestone.name,
          targetDate: milestone.targetDate,
          description: milestone.description,
          completionPercentage: milestone.completionPercentage,
        });
      }

      // 更新
      for (const formMilestone of toUpdate) {
        const original = originalMilestones.find((m) => m.id === formMilestone.id);
        // 只有当数据有变化时才更新
        if (
          original &&
          (original.name !== formMilestone.name ||
            original.targetDate !== formMilestone.targetDate ||
            original.description !== formMilestone.description ||
            original.completionPercentage !== formMilestone.completionPercentage)
        ) {
          await projectApi.updateMilestone(formMilestone.id!, {
            name: formMilestone.name,
            targetDate: formMilestone.targetDate,
            description: formMilestone.description,
            completionPercentage: formMilestone.completionPercentage,
          });
        }
      }

      return true;
    } catch (error) {
      console.error('同步里程碑失败:', error);
      return false;
    }
  };

  const handleFormSubmit = async (data: ProjectFormData) => {
    // 日期验证
    const dateError = validateDates(data);
    if (dateError) {
      alert(dateError);
      return;
    }

    let success = false;
    if (isEdit && project) {
      // 编辑模式：发送 UpdateProjectRequest
      const submitData: UpdateProjectRequest = {
        code: data.code,
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        startDate: data.startDate,
        deadline: data.deadline,
        memberIds: data.memberIds,
        version: project.version,
      };
      success = await onSubmit(submitData);

      // 项目更新成功后，同步里程碑
      if (success) {
        await syncMilestones(project.id, data.milestones, existingMilestones);
        // 失效里程碑查询缓存，确保页面显示最新数据
        queryClient.invalidateQueries({ queryKey: queryKeys.project.milestones(project.id) });
      }
    } else {
      // 创建模式：发送 CreateProjectRequest
      const submitData: CreateProjectRequest = {
        code: data.code,
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        startDate: data.startDate!,
        deadline: data.deadline!,
        memberIds: data.memberIds.length > 0 ? data.memberIds : undefined,
      };
      const result = await onSubmit(submitData);

      // 检查是否返回了新项目ID（字符串类型表示创建成功并返回ID）
      if (typeof result === 'string') {
        success = true;
        const newProjectId = result;

        // 创建项目成功后，创建里程碑（如果有的话）
        if (data.milestones && data.milestones.length > 0) {
          try {
            for (const milestone of data.milestones) {
              await projectApi.createMilestone(newProjectId, {
                name: milestone.name,
                targetDate: milestone.targetDate,
                description: milestone.description,
                completionPercentage: milestone.completionPercentage ?? 0,
              });
            }
            // 失效里程碑查询缓存
            queryClient.invalidateQueries({ queryKey: queryKeys.project.milestones(newProjectId) });
          } catch (error) {
            console.error('创建里程碑失败:', error);
            // 里程碑创建失败不影响项目创建成功的状态
          }
        }
      } else {
        success = result;
      }
    }

    // 只有提交成功才关闭对话框
    if (success) {
      onOpenChange(false);
      reset();
    }
  };

  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑项目' : '新建项目'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* 可滚动的表单内容区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">基本信息</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">项目编码 *</Label>
                <Input
                  id="code"
                  {...register('code', { required: '请输入项目编码' })}
                  placeholder="PRJ-001"
                />
                {errors.code && (
                  <p className="text-xs text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="name">项目名称 *</Label>
                <Input
                  id="name"
                  {...register('name', { required: '请输入项目名称' })}
                  placeholder="请输入项目名称"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectType">项目类型 *</Label>
                <Select
                  value={watch('projectType')}
                  onValueChange={(value) => setValue('projectType', value as ProjectType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {watch('projectType') && (
                  <p className="text-xs text-muted-foreground">
                    {PROJECT_TYPE_CONFIG[watch('projectType') as ProjectType]?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">项目描述</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="请输入项目描述"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 时间规划 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">时间规划</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期 *</Label>
                <DatePickerField
                  id="startDate"
                  placeholder="选择开始日期"
                  value={watch('startDate')}
                  onChange={(value) => setValue('startDate', value, { shouldValidate: true })}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>截止日期 *</Label>
                <DatePickerField
                  id="deadline"
                  placeholder="选择截止日期"
                  value={watch('deadline')}
                  onChange={(value) => setValue('deadline', value, { shouldValidate: true })}
                />
                {errors.deadline && (
                  <p className="text-xs text-destructive">{errors.deadline.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 成员管理 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">成员管理</h3>
            <div className="space-y-2">
              <Label>项目成员</Label>
              <MemberTreeSelector
                value={selectedMemberIds}
                onChange={handleMemberChange}
                width={500}
              />
            </div>
          </div>

          <Separator />

          {/* 里程碑 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">里程碑</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendMilestone({
                    name: '',
                    targetDate: '',
                    description: '',
                    completionPercentage: 0,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                添加里程碑
              </Button>
            </div>

            {milestoneFields.length > 0 ? (
              <div className="space-y-3">
                {milestoneFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">里程碑名称 *</Label>
                          <Input
                            {...register(`milestones.${index}.name`, {
                              required: '请输入里程碑名称',
                            })}
                            placeholder="如：需求确认"
                            className="h-8"
                          />
                          {errors.milestones?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {errors.milestones[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">目标日期 *</Label>
                          <DatePickerField
                            id={`milestone-${index}-date`}
                            placeholder="选择日期"
                            value={watch(`milestones.${index}.targetDate`)}
                            onChange={(value) =>
                              setValue(`milestones.${index}.targetDate`, value || '')
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeMilestone(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">描述</Label>
                      <Input
                        {...register(`milestones.${index}.description`)}
                        placeholder="里程碑描述（可选）"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">完成百分比</Label>
                        <span className="text-xs text-muted-foreground">
                          {watch(`milestones.${index}.completionPercentage`) || 0}%
                        </span>
                      </div>
                      <Slider
                        value={[watch(`milestones.${index}.completionPercentage`) || 0]}
                        onValueChange={(value) =>
                          setValue(`milestones.${index}.completionPercentage`, value[0])
                        }
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                暂无里程碑，点击上方按钮添加
              </p>
            )}
          </div>
          </div>

          {/* 固定在底部的按钮区域 */}
          <DialogFooter className="gap-2">
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
