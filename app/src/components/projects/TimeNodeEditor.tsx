/**
 * 时间节点悬浮编辑器
 *
 * 双击节点显示编辑卡片，点击外部自动保存
 * 支持里程碑和任务两种节点类型
 *
 * @module components/projects/TimeNodeEditor
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Save, X, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ProjectMilestone } from '@/types/project';
import type { WbsTask } from '@/types/wbs';

/**
 * 节点数据类型
 */
type TimeNodeData = Partial<ProjectMilestone | WbsTask>;

/**
 * 节点类型
 */
export type TimeNodeType = 'milestone' | 'task';

export interface TimeNodeEditorProps {
  /** 节点类型 */
  nodeType: TimeNodeType;
  /** 节点数据 */
  node: TimeNodeData;
  /** 节点变更回调 */
  onChange: (node: TimeNodeData) => void;
  /** 删除回调 */
  onDelete?: () => void;
  /** 是否只读 */
  readonly?: boolean;
  /** 触发元素 */
  trigger?: React.ReactNode;
  /** 是否打开 */
  open?: boolean;
  /** 打开状态变更回调 */
  onOpenChange?: (open: boolean) => void;
  /** 编辑器位置（绝对定位） */
  position?: { x: number; y: number };
}

/**
 * 里程碑状态选项
 */
const MILESTONE_STATUS_OPTIONS = [
  { value: 'pending', label: '待开始', color: 'bg-gray-500' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-500' },
  { value: 'completed', label: '已完成', color: 'bg-green-500' },
  { value: 'delayed', label: '已延期', color: 'bg-red-500' },
] as const;

/**
 * 任务状态选项
 */
const TASK_STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始', color: 'bg-gray-500' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-500' },
  { value: 'completed', label: '已完成', color: 'bg-green-500' },
  { value: 'on_hold', label: '暂停', color: 'bg-yellow-500' },
] as const;

/**
 * 任务优先级选项
 */
const PRIORITY_OPTIONS = [
  { value: 'low', label: '低', color: 'text-blue-500' },
  { value: 'medium', label: '中', color: 'text-yellow-500' },
  { value: 'high', label: '高', color: 'text-red-500' },
] as const;

/**
 * 格式化日期显示
 */
function formatDateDisplay(dateString?: string): string {
  if (!dateString) return '未设置';
  try {
    return format(parseISO(dateString), 'yyyy年MM月dd日', { locale: zhCN });
  } catch {
    return dateString;
  }
}

/**
 * 时间节点悬浮编辑器组件
 */
export function TimeNodeEditor({
  nodeType,
  node,
  onChange,
  onDelete,
  readonly = false,
  trigger,
  open: controlledOpen,
  onOpenChange,
  position,
}: TimeNodeEditorProps) {
  // ==================== 状态管理 ====================
  const [internalOpen, setInternalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<TimeNodeData>(node);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // 受控/非受控模式
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // ==================== 同步节点数据 ====================
  useEffect(() => {
    setEditingNode(node);
    setHasChanges(false);
  }, [node, isOpen]);

  // ==================== 点击外部自动保存 ====================
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        editorRef.current &&
        !editorRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.popover-ignore-click-outside')
      ) {
        if (hasChanges && !readonly) {
          handleSave();
        } else {
          setIsOpen(false);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setEditingNode(node); // 恢复原始值
      } else if (event.key === 'Enter' && !event.shiftKey) {
        // 在输入框中按 Enter 保存，但不阻止默认行为（允许换行）
        const target = event.target as HTMLTextAreaElement;
        if (target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          handleSave();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, hasChanges, editingNode, node, readonly, setIsOpen]);

  // ==================== 处理字段变更 ====================
  const handleFieldChange = useCallback(<K extends keyof TimeNodeData>(
    field: K,
    value: TimeNodeData[K]
  ) => {
    setEditingNode(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // ==================== 保存更改 ====================
  const handleSave = useCallback(() => {
    onChange(editingNode);
    setHasChanges(false);
    setIsOpen(false);
  }, [editingNode, onChange, setIsOpen]);

  // ==================== 删除节点 ====================
  const handleDelete = useCallback(() => {
    if (confirm('确定要删除这个节点吗？')) {
      onDelete?.();
      setIsOpen(false);
    }
  }, [onDelete, setIsOpen]);

  // ==================== 获取状态选项 ====================
  const statusOptions = nodeType === 'milestone'
    ? MILESTONE_STATUS_OPTIONS
    : TASK_STATUS_OPTIONS;

  // ==================== 渲染表单字段 ====================
  const renderForm = () => (
    <div className="space-y-4 popover-ignore-click-outside">
      {/* 节点名称 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {nodeType === 'milestone' ? '里程碑名称' : '任务名称'}
        </label>
        <Input
          value={editingNode.name || editingNode.title || ''}
          onChange={(e) => handleFieldChange(nodeType === 'milestone' ? 'name' : 'title', e.target.value)}
          placeholder={`输入${nodeType === 'milestone' ? '里程碑' : '任务'}名称`}
          disabled={readonly}
          className="h-9"
          autoFocus
        />
      </div>

      {/* 日期选择 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {nodeType === 'milestone' ? '计划日期' : '开始日期'}
        </label>
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9",
                !editingNode.plannedDate && !editingNode.plannedStartDate && "text-muted-foreground"
              )}
              disabled={readonly}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateDisplay(
                nodeType === 'milestone'
                  ? editingNode.plannedDate as string
                  : editingNode.plannedStartDate as string
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 popover-ignore-click-outside" align="start">
            <Calendar
              mode="single"
              selected={
                editingNode.plannedDate || editingNode.plannedStartDate
                  ? parseISO((editingNode.plannedDate || editingNode.plannedStartDate) as string)
                  : undefined
              }
              onSelect={(date) => {
                if (date) {
                  const dateString = date.toISOString().split('T')[0];
                  if (nodeType === 'milestone') {
                    handleFieldChange('plannedDate', dateString);
                  } else {
                    handleFieldChange('plannedStartDate', dateString);
                  }
                  setShowCalendar(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* 状态选择 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">状态</label>
        <Select
          value={editingNode.status as string}
          onValueChange={(value) => handleFieldChange('status', value)}
          disabled={readonly}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", option.color)} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 任务优先级（仅任务类型） */}
      {nodeType === 'task' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">优先级</label>
          <Select
            value={editingNode.priority as string}
            onValueChange={(value) => handleFieldChange('priority', value)}
            disabled={readonly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="选择优先级" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={cn(option.color)}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 描述（可选） */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">描述</label>
        <Textarea
          value={editingNode.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="添加描述..."
          disabled={readonly}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* 操作按钮 */}
      {!readonly && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1"
          >
            <Save className="w-3 h-3 mr-1" />
            保存
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              className="px-3"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* 快捷键提示 */}
      <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border">
        Enter 保存 · Esc 取消
      </div>
    </div>
  );

  // ==================== 绝对定位模式（用于双击编辑） ====================
  if (position) {
    if (!isOpen) return null;

    return (
      <div
        ref={editorRef}
        className="fixed z-50 w-80 bg-card border border-border rounded-lg shadow-xl p-4"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {renderForm()}
      </div>
    );
  }

  // ==================== Popover 模式（用于按钮触发） ====================
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <CalendarIcon className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        {renderForm()}
      </PopoverContent>
    </Popover>
  );
}

/**
 * 默认导出
 */
export default TimeNodeEditor;
