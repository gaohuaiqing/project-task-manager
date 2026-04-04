/**
 * 添加时间线对话框组件
 *
 * @module features/projects/components/AddTimelineDialog
 * @description 用于创建新时间线行的对话框
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============ Props 定义 ============

export interface AddTimelineDialogProps {
  /** 是否打开对话框 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: (data: AddTimelineFormData) => void;
  /** 项目开始日期（作为默认值） */
  projectStartDate?: string;
  /** 项目结束日期（作为默认值） */
  projectEndDate?: string;
  /** 是否正在提交 */
  isSubmitting?: boolean;
}

// ============ 表单数据类型 ============

export interface AddTimelineFormData {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
}

// ============ 组件实现 ============

export function AddTimelineDialog({
  open,
  onClose,
  onSubmit,
  projectStartDate,
  projectEndDate,
  isSubmitting = false,
}: AddTimelineDialogProps) {
  // 表单状态
  const [formData, setFormData] = useState<AddTimelineFormData>({
    name: '',
    type: 'custom',
    startDate: projectStartDate || new Date().toISOString().split('T')[0],
    endDate: projectEndDate || new Date().toISOString().split('T')[0],
  });

  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 重置表单
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        type: 'custom',
        startDate: projectStartDate || new Date().toISOString().split('T')[0],
        endDate: projectEndDate || new Date().toISOString().split('T')[0],
      });
      setErrors({});
    }
  }, [open, projectStartDate, projectEndDate]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入时间线名称';
    }

    if (!formData.startDate) {
      newErrors.startDate = '请选择开始日期';
    }

    if (!formData.endDate) {
      newErrors.endDate = '请选择结束日期';
    }

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = '结束日期不能早于开始日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加时间线</DialogTitle>
          <DialogDescription>
            创建新的时间线行，用于规划和跟踪任务。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          {/* 时间线名称 */}
          <div className="grid gap-2">
            <Label htmlFor="timeline-name">
              时间线名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="timeline-name"
              placeholder="例如：设计组、运维组"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 时间线类型 */}
          <div className="grid gap-2">
            <Label htmlFor="timeline-type">时间线类型</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tech_stack">技术栈</SelectItem>
                <SelectItem value="team">团队</SelectItem>
                <SelectItem value="phase">阶段</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="timeline-start">
                开始日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="timeline-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeline-end">
                结束日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="timeline-end"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
