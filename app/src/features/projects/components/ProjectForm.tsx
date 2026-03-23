/**
 * 项目表单组件
 * 符合需求规格：REQ_03_project.md
 * - 4种项目类型
 * - 日期必填验证
 * - 日期先后验证
 * - 成员管理分组
 * - 里程碑分组（动态增减）
 */
import { useForm, useFieldArray } from 'react-hook-form';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { DatePickerField } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_CONFIG } from '@/shared/constants';
import { getMembers, type Member } from '@/lib/api/org.api';
import type { Project, CreateProjectRequest, UpdateProjectRequest, ProjectType, Milestone } from '../types';
import { Plus, X, ChevronDown, Users } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
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
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

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

  // 加载成员列表
  useEffect(() => {
    if (open) {
      setMembersLoading(true);
      getMembers({ status: 'active', pageSize: 100 })
        .then((res) => setMembers(res.items))
        .catch(console.error)
        .finally(() => setMembersLoading(false));
    }
  }, [open]);

  // 编辑模式：填充表单数据
  useEffect(() => {
    if (project) {
      reset({
        code: project.code,
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        startDate: project.startDate || undefined,
        deadline: project.deadline || undefined,
        memberIds: [],
        milestones: existingMilestones.map((m) => ({
          id: m.id,
          name: m.name,
          targetDate: m.targetDate,
          description: m.description,
          completionPercentage: m.completionPercentage ?? 0,
        })),
      });
    } else {
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
  }, [project, existingMilestones, reset]);

  // 切换成员选择
  const toggleMember = (memberId: number) => {
    const current = selectedMemberIds;
    if (current.includes(memberId)) {
      setValue(
        'memberIds',
        current.filter((id) => id !== memberId)
      );
    } else {
      setValue('memberIds', [...current, memberId]);
    }
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

  const handleFormSubmit = async (data: ProjectFormData) => {
    // 日期验证
    const dateError = validateDates(data);
    if (dateError) {
      alert(dateError);
      return;
    }

    const submitData: CreateProjectRequest = {
      code: data.code,
      name: data.name,
      description: data.description,
      projectType: data.projectType,
      startDate: data.startDate,
      deadline: data.deadline,
      memberIds: data.memberIds.length > 0 ? data.memberIds : undefined,
      // 里程碑在创建后单独处理
    };

    await onSubmit(submitData);
    onOpenChange(false);
    reset();
  };

  // 获取选中成员的显示名称
  const getSelectedMemberNames = () => {
    const selected = members.filter((m) => selectedMemberIds.includes(m.id));
    if (selected.length === 0) return '选择项目成员';
    if (selected.length <= 3) {
      return selected.map((m) => m.name).join('、');
    }
    return `${selected.slice(0, 3).map((m) => m.name).join('、')} 等${selected.length}人`;
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
                  disabled={isEdit}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    disabled={membersLoading}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {getSelectedMemberNames()}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          暂无可选成员
                        </p>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => toggleMember(member.id)}
                          >
                            <Checkbox
                              checked={selectedMemberIds.includes(member.id)}
                              onCheckedChange={() => toggleMember(member.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.departmentName || '未分配部门'}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {members
                    .filter((m) => selectedMemberIds.includes(m.id))
                    .map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="gap-1"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
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
