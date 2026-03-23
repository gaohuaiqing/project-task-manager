/**
 * 任务筛选器组件
 * 支持搜索、项目、负责人、状态、优先级筛选
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
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
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
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: TASK_PRIORITY_LABELS.urgent },
  { value: 'high', label: TASK_PRIORITY_LABELS.high },
  { value: 'medium', label: TASK_PRIORITY_LABELS.medium },
  { value: 'low', label: TASK_PRIORITY_LABELS.low },
];

/** 所有任务类型选项 */
const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
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

export function TaskFilterBar({
  filters,
  onFiltersChange,
  projects = [],
  members = [],
  showProjectFilter = true,
}: TaskFilterBarProps) {
  // 检查是否有活跃的筛选条件
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.projectId ||
      filters.assigneeId ||
      filters.status ||
      filters.priority ||
      filters.taskType
    );
  }, [filters]);

  // 更新单个筛选字段
  const updateFilter = <K extends keyof TaskQueryParams>(
    key: K,
    value: TaskQueryParams[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  // 清除所有筛选
  const clearFilters = () => {
    onFiltersChange({
      projectId: filters.projectId, // 保留项目筛选（如果是项目详情页）
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

      {/* 项目筛选 */}
      {showProjectFilter && (
        <Select
          value={filters.projectId || 'all'}
          onValueChange={(value) =>
            updateFilter('projectId', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全部项目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {projects.map((project) => (
              <SelectItem key={String(project.id)} value={String(project.id)}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 负责人筛选 */}
      <Select
        value={filters.assigneeId ? String(filters.assigneeId) : 'all'}
        onValueChange={(value) =>
          updateFilter('assigneeId', value === 'all' ? undefined : Number(value))
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="负责人" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部人员</SelectItem>
          {members.map((member) => (
            <SelectItem key={String(member.id)} value={String(member.id)}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 状态筛选 */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          updateFilter('status', value === 'all' ? undefined : (value as TaskStatus))
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 优先级筛选 */}
      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) =>
          updateFilter('priority', value === 'all' ? undefined : (value as TaskPriority))
        }
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="优先级" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 任务类型筛选 */}
      <Select
        value={filters.taskType || 'all'}
        onValueChange={(value) =>
          updateFilter('taskType', value === 'all' ? undefined : (value as TaskType))
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="任务类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          {TASK_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
