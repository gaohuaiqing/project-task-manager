/**
 * 添加里程碑对话框组件
 *
 * @module features/projects/components/AddMilestoneDialog
 * @description 创建新里程碑的对话框
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
import { Flag } from 'lucide-react';

// ============ Props 定义 ============

export interface AddMilestoneDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: (data: { name: string; targetDate: string }) => void;
  /** 项目开始日期 */
  projectStartDate?: string;
  /** 项目结束日期 */
  projectEndDate?: string;
}

// ============ 组件实现 ============

export function AddMilestoneDialog({
  open,
  onClose,
  onSubmit,
  projectStartDate,
  projectEndDate,
}: AddMilestoneDialogProps) {
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 重置表单
  useEffect(() => {
    if (!open) {
      setName('');
      setTargetDate('');
      setError(null);
    }
  }, [open]);

  // 设置默认日期为项目结束日期
  useEffect(() => {
    if (open && !targetDate && projectEndDate) {
      setTargetDate(projectEndDate);
    }
  }, [open, targetDate, projectEndDate]);

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

    // 验证日期范围
    if (projectStartDate && targetDate < projectStartDate) {
      setError('目标日期不能早于项目开始日期');
      return;
    }

    if (projectEndDate && targetDate > projectEndDate) {
      setError('目标日期不能晚于项目结束日期');
      return;
    }

    onSubmit({ name: name.trim(), targetDate });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-blue-500" />
            添加里程碑
          </DialogTitle>
          <DialogDescription>
            为项目添加一个里程碑，标记重要的检查点或交付物。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          {/* 里程碑名称 */}
          <div className="grid gap-2">
            <Label htmlFor="milestone-name">里程碑名称 *</Label>
            <Input
              id="milestone-name"
              placeholder="例如：需求评审、上线发布"
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
            {projectStartDate && projectEndDate && (
              <p className="text-xs text-muted-foreground">
                日期范围: {projectStartDate} ~ {projectEndDate}
              </p>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            添加里程碑
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
