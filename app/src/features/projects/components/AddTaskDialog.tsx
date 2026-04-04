/**
 * 添加任务对话框组件
 *
 * @module features/projects/components/AddTaskDialog
 * @description 用于在时间线上创建新任务的对话框
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
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
import { Textarea } from '@/components/ui/textarea';
import type { Timeline, TimelineTaskPriority } from '@/types/timeline';

// ============ Props 定义 ============

export interface AddTaskDialogProps {
  /** 是否打开对话框 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: (data: AddTaskFormData) => void;
  /** 时间线列表 */
  timelines: Timeline[];
  /** 默认时间线ID */
  defaultTimelineId?: string;
  /** 默认开始日期 */
  defaultStartDate?: string;
  /** 默认结束日期 */
  defaultEndDate?: string;
  /** 是否正在提交 */
  isSubmitting?: boolean;
}

// ============ 表单数据类型 ============

export interface AddTaskFormData {
  timelineId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: TimelineTaskPriority;
  assigneeId?: number;
}

// ============ 组件实现 ============

export function AddTaskDialog({
  open,
  onClose,
  onSubmit,
  timelines,
  defaultTimelineId,
  defaultStartDate,
  defaultEndDate,
  isSubmitting = false,
}: AddTaskDialogProps) {
  // 表单状态
  const [formData, setFormData] = useState<AddTaskFormData>({
    timelineId: defaultTimelineId || '',
    title: '',
    description: '',
    startDate: defaultStartDate || new Date().toISOString().split('T')[0],
    endDate: defaultEndDate || new Date().toISOString().split('T')[0],
    priority: 'medium',
  });

  // 表单错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当默认值变化时更新表单
  useEffect(() => {
    if (open) {
      setFormData({
        timelineId: defaultTimelineId || timelines[0]?.id || '',
        title: '',
        description: '',
        startDate: defaultStartDate || new Date().toISOString().split('T')[0],
        endDate: defaultEndDate || new Date().toISOString().split('T')[0],
        priority: 'medium',
      });
      setErrors({});
    }
  }, [open, defaultTimelineId, defaultStartDate, defaultEndDate, timelines]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.timelineId) {
      newErrors.timelineId = '请选择时间轴';
    }

    if (!formData.title.trim()) {
      newErrors.title = '请输入任务名称';
    } else if (formData.title.length > 100) {
      newErrors.title = '任务名称不能超过100个字符';
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

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  // 处理关闭
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加任务</DialogTitle>
          <DialogDescription>
            在时间线上创建新任务，设置任务名称、时间和优先级。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 时间轴选择 */}
          <div className="space-y-2">
            <Label htmlFor="timeline">
              时间轴 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.timelineId}
              onValueChange={(value) => setFormData({ ...formData, timelineId: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="timeline" className={errors.timelineId ? 'border-red-500' : ''}>
                <SelectValue placeholder="选择时间轴" />
              </SelectTrigger>
              <SelectContent>
                {timelines.map((timeline) => (
                  <SelectItem key={timeline.id} value={timeline.id}>
                    {timeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timelineId && (
              <p className="text-sm text-red-500">{errors.timelineId}</p>
            )}
          </div>

          {/* 任务名称 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              任务名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="例如：完成功能开发"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isSubmitting}
              className={errors.title ? 'border-red-500' : ''}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* 任务描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              placeholder="描述任务的具体内容..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                开始日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isSubmitting}
                className={errors.startDate ? 'border-red-500' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                结束日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={isSubmitting}
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* 优先级 */}
          <div className="space-y-2">
            <Label htmlFor="priority">优先级</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TimelineTaskPriority) =>
                setFormData({ ...formData, priority: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="选择优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">🔴 紧急</SelectItem>
                <SelectItem value="high">🟠 高</SelectItem>
                <SelectItem value="medium">🟡 中</SelectItem>
                <SelectItem value="low">🟢 低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建任务'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
