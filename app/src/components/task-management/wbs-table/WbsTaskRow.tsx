/**
 * WBS 任务行组件
 *
 * 职责：
 * - 显示单行任务数据
 * - 展开/折叠子任务
 * - 行内编辑
 * - 点击选中（非批量选择）
 */

import { useMemo } from 'react';
import { ChevronRight, ChevronDown, Edit3, Trash2, AlertTriangle, Clock, Plus, Activity, Check, X } from 'lucide-react';
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
  onSelect: () => void;  // 改为单选
  onEdit: () => void;
  onAddChild?: () => void;  // 添加子任务
  onProgress?: () => void;  // 维护进展
  onDelete: () => void;
  onSave?: () => void;  // 保存编辑
  onCancel?: () => void;  // 取消编辑
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
  onSelect,
  onEdit,
  onAddChild,
  onProgress,
  onDelete,
  onSave,
  onCancel,
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
      onClick={onSelect}
    >
      {/* 操作按钮列 */}
      <td className="p-2 sticky left-0 bg-slate-800 z-10">
        <div className="flex items-center gap-0.5">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20" onClick={(e) => { e.stopPropagation(); onSave?.(); }}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-300" onClick={(e) => { e.stopPropagation(); onCancel?.(); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="编辑任务">
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              {onAddChild && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20" onClick={(e) => { e.stopPropagation(); onAddChild(); }} title="添加子任务">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除任务">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              {onProgress && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20" onClick={(e) => { e.stopPropagation(); onProgress(); }} title="维护进展">
                  <Activity className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </td>

      {/* WBS 编码 + 展开/折叠 */}
      <td className="p-2">
        <div className="flex items-center" style={{ paddingLeft: `${level * 16}px` }}>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mr-1"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 h-6 mr-1" />
          )}
          <span className="text-sm font-mono">{task.wbsCode}</span>
        </div>
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
    </tr>
  );
}
