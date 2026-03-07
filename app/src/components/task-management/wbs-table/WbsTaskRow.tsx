/**
 * WBS 任务行组件
 *
 * 职责：
 * - 显示单行任务数据
 * - 展开/折叠子任务
 * - 行内编辑
 * - 选择/取消选择
 */

import { useMemo } from 'react';
import { ChevronRight, ChevronDown, Edit3, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WbsTask } from '@/types/wbs';
import { isNearDeadline } from '@/utils/wbsCalculator';

export interface WbsTaskRowProps {
  task: WbsTask;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  isEditing: boolean;
  hasChildren: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  holidayDates: string[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  delayed: 'bg-red-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-slate-500',
};

export function WbsTaskRow({
  task,
  level,
  isExpanded,
  isSelected,
  isEditing,
  hasChildren,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  holidayDates,
}: WbsTaskRowProps) {
  const nearDeadline = useMemo(() => {
    return task.plannedEndDate ? isNearDeadline(task.plannedEndDate, holidayDates) : false;
  }, [task.plannedEndDate, holidayDates]);

  const statusColor = STATUS_COLORS[task.status] || 'bg-slate-500';
  const priorityColor = PRIORITY_COLORS[task.priority] || 'bg-slate-500';

  return (
    <tr
      className={cn(
        'border-b border-border/50 hover:bg-accent/50 transition-colors',
        isSelected && 'bg-primary/10',
        isEditing && 'bg-accent'
      )}
    >
      {/* 展开/折叠 */}
      <td className="p-2">
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        ) : (
          <div className="w-6 h-6" />
        )}
      </td>

      {/* 选择框 */}
      <td className="p-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded"
        />
      </td>

      {/* WBS 编码 */}
      <td className="p-2">
        <span
          className="text-sm font-mono"
          style={{ paddingLeft: `${level * 16}px` }}
        >
          {task.wbsCode}
        </span>
      </td>

      {/* 任务名称 */}
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{task.title}</span>
          {nearDeadline && !task.completed && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
        </div>
      </td>

      {/* 状态 */}
      <td className="p-2">
        <Badge className={cn('text-white', statusColor)}>
          {task.status === 'pending' && '待处理'}
          {task.status === 'in_progress' && '进行中'}
          {task.status === 'completed' && '已完成'}
          {task.status === 'delayed' && '已延期'}
        </Badge>
      </td>

      {/* 优先级 */}
      <td className="p-2">
        <div className="flex items-center gap-1">
          <div className={cn('w-2 h-2 rounded-full', priorityColor)} />
          <span className="text-xs text-muted-foreground">
            {task.priority === 'critical' && '紧急'}
            {task.priority === 'high' && '高'}
            {task.priority === 'medium' && '中'}
            {task.priority === 'low' && '低'}
          </span>
        </div>
      </td>

      {/* 负责人 */}
      <td className="p-2">
        <span className="text-sm">{task.assigneeName || '-'}</span>
      </td>

      {/* 计划工期 */}
      <td className="p-2">
        <span className="text-sm text-muted-foreground">{task.plannedDays || '-'} 天</span>
      </td>

      {/* 操作 */}
      <td className="p-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
