/**
 * 任务筛选器组件
 * 支持搜索、项目、负责人、状态、优先级多选筛选
 */
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import type { TaskQueryParams, TaskStatus, TaskPriority, TaskType } from '../types';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
} from '../types';

interface Member {
  id: number | string;
  name: string;
}

interface Project {
  id: number | string;
  name: string;
}

interface TaskFilterBarProps {
  /** 当前筛选参数 */
  filters: TaskQueryParams;
  /** 筛选参数变化回调 */
  onFiltersChange: (filters: TaskQueryParams) => void;
  /** 项目列表 */
  projects?: Project[];
  /** 成员列表 */
  members?: Member[];
  /** 是否显示项目筛选（在项目详情页时隐藏） */
  showProjectFilter?: boolean;
}

/** 所有状态选项 */
const STATUS_OPTIONS: MultiSelectOption[] = [
  { value: 'not_started', label: TASK_STATUS_LABELS.not_started },
  { value: 'in_progress', label: TASK_STATUS_LABELS.in_progress },
  { value: 'delay_warning', label: TASK_STATUS_LABELS.delay_warning },
  { value: 'delayed', label: TASK_STATUS_LABELS.delayed },
  { value: 'early_completed', label: TASK_STATUS_LABELS.early_completed },
  { value: 'on_time_completed', label: TASK_STATUS_LABELS.on_time_completed },
  { value: 'overdue_completed', label: TASK_STATUS_LABELS.overdue_completed },
  { value: 'pending_approval', label: TASK_STATUS_LABELS.pending_approval },
  { value: 'rejected', label: TASK_STATUS_LABELS.rejected },
];

/** 所有优先级选项 */
const PRIORITY_OPTIONS: MultiSelectOption[] = [
  { value: 'urgent', label: TASK_PRIORITY_LABELS.urgent },
  { value: 'high', label: TASK_PRIORITY_LABELS.high },
  { value: 'medium', label: TASK_PRIORITY_LABELS.medium },
  { value: 'low', label: TASK_PRIORITY_LABELS.low },
];

/** 所有任务类型选项 */
const TASK_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: 'firmware', label: TASK_TYPE_LABELS.firmware },
  { value: 'board', label: TASK_TYPE_LABELS.board },
  { value: 'driver', label: TASK_TYPE_LABELS.driver },
  { value: 'interface', label: TASK_TYPE_LABELS.interface },
  { value: 'hw_recovery', label: TASK_TYPE_LABELS.hw_recovery },
  { value: 'material_import', label: TASK_TYPE_LABELS.material_import },
  { value: 'material_sub', label: TASK_TYPE_LABELS.material_sub },
  { value: 'sys_design', label: TASK_TYPE_LABELS.sys_design },
  { value: 'core_risk', label: TASK_TYPE_LABELS.core_risk },
  { value: 'contact', label: TASK_TYPE_LABELS.contact },
  { value: 'func_task', label: TASK_TYPE_LABELS.func_task },
  { value: 'other', label: TASK_TYPE_LABELS.other },
];

/** 辅助函数：确保值为数组格式 */
function ensureArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function TaskFilterBar({
  filters,
  onFiltersChange,
  projects = [],
  members = [],
  showProjectFilter = true,
}: TaskFilterBarProps) {
  // 项目选项
  const projectOptions: MultiSelectOption[] = useMemo(
    () => projects.map((p) => ({ value: String(p.id), label: p.name })),
    [projects]
  );

  // 成员选项
  const memberOptions: MultiSelectOption[] = useMemo(
    () => members.map((m) => ({ value: String(m.id), label: m.name })),
    [members]
  );

  // 检查是否有活跃的筛选条件
  const hasActiveFilters = useMemo(() => {
    const arrLen = (v: any) => (Array.isArray(v) ? v.length : v ? 1 : 0);
    return !!(
      filters.search ||
      arrLen(filters.projectId) ||
      arrLen(filters.assigneeId) ||
      arrLen(filters.status) ||
      arrLen(filters.priority) ||
      arrLen(filters.taskType)
    );
  }, [filters]);

  // 更新单值筛选字段
  const updateFilter = <K extends keyof TaskQueryParams>(
    key: K,
    value: TaskQueryParams[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  // 更新多选筛选字段
  const updateMultiFilter = (key: 'projectId' | 'assigneeId' | 'status' | 'priority' | 'taskType', value: string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value.length > 0 ? value : undefined,
    });
  };

  // 清除所有筛选
  const clearFilters = () => {
    onFiltersChange({
      // 保留项目筛选（如果是项目详情页且原来有值）
      ...(showProjectFilter ? {} : { projectId: filters.projectId }),
    });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* 搜索输入框 */}
      <div className="relative">
        <Input
          placeholder="搜索任务..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-64"
        />
      </div>

      {/* 项目筛选 - 多选 */}
      {showProjectFilter && (
        <MultiSelect
          options={projectOptions}
          value={ensureArray(filters.projectId)}
          onChange={(value) => updateMultiFilter('projectId', value)}
          placeholder="项目"
          triggerClassName="w-40"
        />
      )}

      {/* 负责人筛选 - 多选 */}
      <MultiSelect
        options={memberOptions}
        value={ensureArray(filters.assigneeId?.toString ?
          (Array.isArray(filters.assigneeId)
            ? filters.assigneeId.map(String)
            : [String(filters.assigneeId)])
          : [])}
        onChange={(value) => updateMultiFilter('assigneeId', value.map(Number))}
        placeholder="负责人"
        triggerClassName="w-32"
      />

      {/* 状态筛选 - 多选 */}
      <MultiSelect
        options={STATUS_OPTIONS}
        value={ensureArray(filters.status as any)}
        onChange={(value) => updateMultiFilter('status', value)}
        placeholder="状态"
        triggerClassName="w-32"
      />

      {/* 优先级筛选 - 多选 */}
      <MultiSelect
        options={PRIORITY_OPTIONS}
        value={ensureArray(filters.priority as any)}
        onChange={(value) => updateMultiFilter('priority', value)}
        placeholder="优先级"
        triggerClassName="w-28"
      />

      {/* 任务类型筛选 - 多选 */}
      <MultiSelect
        options={TASK_TYPE_OPTIONS}
        value={ensureArray(filters.taskType as any)}
        onChange={(value) => updateMultiFilter('taskType', value)}
        placeholder="任务类型"
        triggerClassName="w-32"
      />

      {/* 清除筛选按钮 */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          清除筛选
        </Button>
      )}
    </div>
  );
}
