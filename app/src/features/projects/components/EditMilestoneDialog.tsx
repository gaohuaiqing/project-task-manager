/**
 * 编辑里程碑对话框组件
 *
 * @module features/projects/components/EditMilestoneDialog
 * @description 编辑或删除里程碑的对话框
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
import { Slider } from '@/components/ui/slider';
import { Trash2, Flag } from 'lucide-react';
import type { Milestone } from '@/types/timeline';

// ============ Props 定义 ============

export interface EditMilestoneDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: (data: Partial<Milestone>) => void;
  /** 删除回调 */
  onDelete: () => void;
  /** 当前里程碑 */
  milestone: Milestone | null;
  /** 项目开始日期 */
  projectStartDate?: string;
  /** 项目结束日期 */
  projectEndDate?: string;
}

// ============ 组件实现 ============

export function EditMilestoneDialog({
  open,
  onClose,
  onSubmit,
  onDelete,
  milestone,
  projectStartDate,
  projectEndDate,
}: EditMilestoneDialogProps) {
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 初始化表单
  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setTargetDate(milestone.targetDate);
      setCompletionPercentage(milestone.completionPercentage ?? 0);
    }
  }, [milestone]);

  // 重置
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  // 验证并提交
  const handleSubmit = () => {
    if (!name.trim()) {
      setError('请输入里程碑名称');
      return;
    }

    if (!targetDate) {
      setError('请选择目标日期');
      return;
    }

    onSubmit({
      name: name.trim(),
      targetDate,
      completionPercentage,
    });
  };

  if (!milestone) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-blue-500" />
            编辑里程碑
          </DialogTitle>
          <DialogDescription>
            修改里程碑信息或删除此里程碑。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          {/* 名称 */}
          <div className="grid gap-2">
            <Label htmlFor="milestone-name">里程碑名称 *</Label>
            <Input
              id="milestone-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>

          {/* 目标日期 */}
          <div className="grid gap-2">
            <Label htmlFor="target-date">目标日期 *</Label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
                setError(null);
              }}
              min={projectStartDate}
              max={projectEndDate}
            />
          </div>

          {/* 完成百分比 */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="completion-percentage">完成百分比</Label>
              <span className="text-sm text-muted-foreground">
                {completionPercentage}%
              </span>
            </div>
            <Slider
              id="completion-percentage"
              value={[completionPercentage]}
              onValueChange={(value) => setCompletionPercentage(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
        </DialogBody>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={onDelete}
            className="mr-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
