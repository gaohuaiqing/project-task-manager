/**
 * WBS 任务批量操作组件
 *
 * 职责：
 * - 批量删除
 * - 批量状态更新
 * - 批量分配
 * - 导出功能
 */

import { Trash2, Download, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface WbsTaskBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onBatchStatusUpdate: (status: string) => void;
  members: Array<{ id: string; name: string }>;
  onBatchAssign: (memberId: string) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
];

export function WbsTaskBulkActions({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onBatchStatusUpdate,
  members,
  onBatchAssign,
  disabled = false,
}: WbsTaskBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="px-3 py-1">
          已选择 {selectedCount} 项
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={disabled}
        >
          <X className="w-4 h-4 mr-1" />
          取消选择
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* 批量状态更新 */}
        <Select
          onValueChange={onBatchStatusUpdate}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="更新状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 批量分配 */}
        <Select
          onValueChange={onBatchAssign}
          disabled={disabled}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="分配给" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 批量导出 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExportSelected}
          disabled={disabled}
        >
          <Download className="w-4 h-4 mr-1" />
          导出
        </Button>

        {/* 批量删除 */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
          disabled={disabled}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          删除
        </Button>
      </div>
    </div>
  );
}
