/**
 * 项目里程碑管理组件
 *
 * 功能：
 * - 里程碑列表展示
 * - 添加/编辑/删除里程碑
 * - 里程碑状态更新
 * - 日期验证
 *
 * @module components/projects/ProjectMilestones
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit3, Calendar, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectMilestone } from '@/types/project';

interface ProjectMilestonesProps {
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** 里程碑变更回调 */
  onChange: (milestones: ProjectMilestone[]) => void;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 是否显示描述字段 */
  showDescription?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface MilestoneFormData {
  name: string;
  plannedDate: string;
  description: string;
}

/**
 * 获取里程碑状态配置
 */
function getMilestoneStatusConfig(status: ProjectMilestone['status']) {
  switch (status) {
    case 'pending':
      return { label: '待开始', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock };
    case 'in_progress':
      return { label: '进行中', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle };
    case 'completed':
      return { label: '已完成', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 };
    case 'delayed':
      return { label: '已延期', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle };
    case 'cancelled':
      return { label: '已取消', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: null };
  }
}

/**
 * 格式化日期显示
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 计算与今天的距离
 */
function getDaysFromToday(dateStr: string): { text: string; variant: 'default' | 'warning' | 'danger' } {
  if (!dateStr) return { text: '', variant: 'default' };

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `逾期 ${Math.abs(diffDays)} 天`, variant: 'danger' };
  } else if (diffDays === 0) {
    return { text: '今天', variant: 'default' };
  } else if (diffDays <= 3) {
    return { text: `${diffDays} 天后`, variant: 'warning' };
  } else if (diffDays <= 7) {
    return { text: `${diffDays} 天后`, variant: 'default' };
  } else {
    return { text: formatDate(dateStr), variant: 'default' };
  }
}

/**
 * 单个里程碑项组件
 */
interface MilestoneItemProps {
  milestone: ProjectMilestone;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  readonly?: boolean;
  showDescription?: boolean;
}

function MilestoneItem({
  milestone,
  index,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  readonly = false,
  showDescription = false,
}: MilestoneItemProps) {
  const statusConfig = getMilestoneStatusConfig(milestone.status);
  const daysInfo = getDaysFromToday(milestone.plannedDate);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="border border-border rounded-lg p-3 hover:border-muted-foreground/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* 序号 */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
          {index + 1}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate flex-1">
              {milestone.name || `里程碑 ${index + 1}`}
            </h4>
            <Badge variant="outline" className={cn("text-xs flex-shrink-0", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* 日期和状态 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-foreground" />
              <span>{formatDate(milestone.plannedDate)}</span>
            </div>
            {daysInfo.text && (
              <span className={cn(
                "px-1.5 py-0.5 rounded",
                daysInfo.variant === 'danger' && "bg-red-500/20 text-red-400",
                daysInfo.variant === 'warning' && "bg-yellow-500/20 text-yellow-400",
                daysInfo.variant === 'default' && "bg-muted text-muted-foreground"
              )}>
                {daysInfo.text}
              </span>
            )}
            {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
          </div>

          {/* 描述（可展开） */}
          {showDescription && milestone.description && (
            <>
              {isExpanded ? (
                <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {milestone.description}
                </div>
              ) : null}
              {milestone.description && milestone.description.length > 50 && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  {isExpanded ? '收起' : '展开详情'}
                </button>
              )}
            </>
          )}
        </div>

        {/* 操作按钮 */}
        {!readonly && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
              onClick={() => onEdit(index)}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
              onClick={() => onDelete(index)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 添加/编辑里程碑表单
 */
interface MilestoneFormProps {
  /** 表单数据 */
  data: MilestoneFormData;
  /** 编辑的索引（null 表示新增） */
  editIndex: number | null;
  /** 验证错误 */
  errors: Record<string, string>;
  /** 数据变更回调 */
  onChange: (data: MilestoneFormData) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 提交回调 */
  onSubmit: () => void;
}

function MilestoneForm({
  data,
  editIndex,
  errors,
  onChange,
  onCancel,
  onSubmit,
}: MilestoneFormProps) {
  const handleChange = (field: keyof MilestoneFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
      <h4 className="text-sm font-medium text-white">
        {editIndex !== null ? '编辑里程碑' : '添加里程碑'}
      </h4>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-name" className="text-xs">名称 *</Label>
        <Input
          id="milestone-name"
          value={data.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="例如：需求评审完成"
          className="h-8 text-sm"
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-date" className="text-xs">计划日期 *</Label>
        <Input
          id="milestone-date"
          type="date"
          value={data.plannedDate}
          onChange={(e) => handleChange('plannedDate', e.target.value)}
          className="h-8 text-sm"
        />
        {errors.plannedDate && <p className="text-xs text-red-400">{errors.plannedDate}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-desc" className="text-xs">描述</Label>
        <Textarea
          id="milestone-desc"
          value={data.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="里程碑的详细说明..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onSubmit} className="flex-1">
          {editIndex !== null ? '保存' : '添加'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">
          取消
        </Button>
      </div>
    </div>
  );
}

/**
 * 项目里程碑管理组件
 */
export function ProjectMilestones({
  milestones,
  onChange,
  readonly = false,
  showDescription = true,
  className,
}: ProjectMilestonesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<MilestoneFormData>({
    name: '',
    plannedDate: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '里程碑名称不能为空';
    }

    if (!formData.plannedDate) {
      newErrors.plannedDate = '请选择计划日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 开始添加
  const handleStartAdd = () => {
    setFormData({ name: '', plannedDate: '', description: '' });
    setErrors({});
    setEditIndex(null);
    setIsAdding(true);
  };

  // 开始编辑
  const handleStartEdit = (index: number) => {
    const milestone = milestones[index];
    setFormData({
      name: milestone.name,
      plannedDate: milestone.plannedDate,
      description: milestone.description || '',
    });
    setErrors({});
    setEditIndex(index);
    setIsAdding(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditIndex(null);
    setFormData({ name: '', plannedDate: '', description: '' });
    setErrors({});
  };

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return;

    const newMilestone: ProjectMilestone = {
      id: editIndex !== null ? milestones[editIndex].id : `temp-${Date.now()}`,
      name: formData.name.trim(),
      plannedDate: formData.plannedDate,
      description: formData.description.trim(),
      status: 'pending',
      sortOrder: editIndex !== null ? milestones[editIndex].sortOrder : milestones.length,
      projectId: 0, // 临时值，会在保存时被替换
      createdAt: editIndex !== null ? milestones[editIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let newMilestones: ProjectMilestone[];
    if (editIndex !== null) {
      newMilestones = [...milestones];
      newMilestones[editIndex] = newMilestone;
    } else {
      newMilestones = [...milestones, newMilestone];
    }

    onChange(newMilestones);
    handleCancelEdit();
  };

  // 删除里程碑
  const handleDelete = (index: number) => {
    const newMilestones = milestones.filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, sortOrder: i }));
    onChange(newMilestones);
  };

  // 切换展开状态
  const toggleExpand = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* 里程碑列表 */}
      <div className="space-y-2">
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            暂无里程碑
          </div>
        ) : (
          milestones.map((milestone, index) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              index={index}
              isExpanded={expandedItems.has(index)}
              onToggleExpand={() => toggleExpand(index)}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              readonly={readonly}
              showDescription={showDescription}
            />
          ))
        )}
      </div>

      {/* 添加/编辑表单 */}
      {isAdding && !readonly && (
        <MilestoneForm
          data={formData}
          editIndex={editIndex}
          errors={errors}
          onChange={setFormData}
          onCancel={handleCancelEdit}
          onSubmit={handleSubmit}
        />
      )}

      {/* 添加按钮 */}
      {!readonly && !isAdding && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartAdd}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加里程碑
        </Button>
      )}
    </div>
  );
}

/**
 * 简化的里程碑展示组件（只读）
 */
export interface MilestonesTimelineProps {
  /** 里程碑列表 */
  milestones: ProjectMilestone[];
  /** 自定义类名 */
  className?: string;
}

/**
 * 里程碑时间轴组件
 */
export function MilestonesTimeline({ milestones, className }: MilestonesTimelineProps) {
  if (milestones.length === 0) {
    return null;
  }

  // 按日期排序
  const sortedMilestones = [...milestones].sort((a, b) =>
    new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
  );

  return (
    <div className={cn("relative", className)}>
      {/* 时间轴线条 */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

      {/* 里程碑节点 */}
      <div className="space-y-4">
        {sortedMilestones.map((milestone, index) => {
          const statusConfig = getMilestoneStatusConfig(milestone.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div key={milestone.id} className="relative flex items-start gap-4">
              {/* 时间轴节点 */}
              <div className={cn(
                "relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2",
                milestone.status === 'completed' && "bg-green-500 border-green-500",
                milestone.status === 'in_progress' && "bg-blue-500 border-blue-500",
                milestone.status === 'delayed' && "bg-red-500 border-red-500",
                milestone.status === 'pending' && "bg-card border-border"
              )}>
                {StatusIcon && <StatusIcon className="w-3 h-3 text-white" />}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {milestone.name}
                  </h4>
                  <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 text-foreground" />
                  <span>{formatDate(milestone.plannedDate)}</span>
                </div>
                {milestone.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {milestone.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
