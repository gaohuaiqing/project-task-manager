/**
 * 项目表单组件
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
import type { Project, CreateProjectRequest, UpdateProjectRequest, ProjectType } from '../types';

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  isLoading?: boolean;
}

const projectTypes: { value: ProjectType; label: string }[] = [
  { value: 'product_development', label: '产品开发' },
  { value: 'functional_management', label: '职能管理' },
];

export function ProjectForm({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
}: ProjectFormProps) {
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateProjectRequest>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      projectType: 'product_development',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        code: project.code,
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        startDate: project.startDate || undefined,
        deadline: project.deadline || undefined,
      });
    } else {
      reset({
        code: '',
        name: '',
        description: '',
        projectType: 'product_development',
      });
    }
  }, [project, reset]);

  const handleFormSubmit = async (data: CreateProjectRequest) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑项目' : '新建项目'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">项目编码</Label>
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
              <Label htmlFor="name">项目名称</Label>
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

          <div className="space-y-2">
            <Label htmlFor="projectType">项目类型</Label>
            <Select
              value={watch('projectType')}
              onValueChange={(value) => setValue('projectType', value as ProjectType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择项目类型" />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">截止日期</Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">项目描述</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="请输入项目描述"
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
