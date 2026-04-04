/**
 * 编辑时间线对话框组件
 *
 * @module features/projects/components/EditTimelineDialog
 * @description 编辑或删除时间线的对话框
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
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import type { Timeline } from '@/types/timeline';

// ============ Props 定义 ============

export interface EditTimelineDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调 */
  onSubmit: (data: Partial<Timeline>) => void;
  /** 删除回调 */
  onDelete: () => void;
  /** 当前时间线 */
  timeline: Timeline | null;
  /** 项目开始日期 */
  projectStartDate?: string;
  /** 项目结束日期 */
  projectEndDate?: string;
}

// ============ 组件实现 ============

export function EditTimelineDialog({
  open,
  onClose,
  onSubmit,
  onDelete,
  timeline,
  projectStartDate,
  projectEndDate,
}: EditTimelineDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 格式化日期为 YYYY-MM-DD 格式
  const formatDateForInput = (date: string | undefined): string => {
    if (!date) return '';
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // 否则从 ISO 格式中提取日期部分
    return date.split('T')[0];
  };

  // 初始化表单
  useEffect(() => {
    if (timeline) {
      setName(timeline.name);
      setStartDate(formatDateForInput(timeline.startDate));
      setEndDate(formatDateForInput(timeline.endDate));
      setProgress(timeline.progress || 0);
    }
  }, [timeline]);

  // 重置
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  // 验证并提交
  const handleSubmit = () => {
    if (!name.trim()) {
      setError('请输入时间线名称');
      return;
    }

    if (!startDate || !endDate) {
      setError('请选择开始和结束日期');
      return;
    }

    if (endDate < startDate) {
      setError('结束日期不能早于开始日期');
      return;
    }

    onSubmit({
      name: name.trim(),
      startDate,
      endDate,
      progress,
    });
  };

  if (!timeline) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑时间线</DialogTitle>
          <DialogDescription>
            修改时间线信息或删除此时间线。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          {/* 名称 */}
          <div className="grid gap-2">
            <Label htmlFor="timeline-name">时间线名称 *</Label>
            <Input
              id="timeline-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">开始日期 *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError(null);
                }}
                min={projectStartDate}
                max={projectEndDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">结束日期 *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError(null);
                }}
                min={projectStartDate}
                max={projectEndDate}
              />
            </div>
          </div>

          {/* 进度 */}
          <div className="grid gap-2">
            <Label htmlFor="progress">进度 (%)</Label>
            <Input
              id="progress"
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
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
