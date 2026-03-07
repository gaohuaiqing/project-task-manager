/**
 * WBS 任务表格筛选组件
 *
 * 职责：
 * - 搜索功能
 * - 项目筛选
 * - 成员筛选
 * - 状态筛选
 * - 优先级筛选
 */

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface WbsTaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterProject: string[];
  onProjectFilterChange: (projectIds: string[]) => void;
  filterMember: string[];
  onMemberFilterChange: (memberIds: string[]) => void;
  filterStatus: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  filterPriority: string[];
  onPriorityFilterChange: (priorities: string[]) => void;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  activeFilterCount: number;
  onClearFilters: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export function WbsTaskFilters({
  searchQuery,
  onSearchChange,
  filterProject,
  onProjectFilterChange,
  filterMember,
  onMemberFilterChange,
  filterStatus,
  onStatusFilterChange,
  filterPriority,
  onPriorityFilterChange,
  projects,
  members,
  activeFilterCount,
  onClearFilters,
}: WbsTaskFiltersProps) {
  return (
    <div className="space-y-4 p-4 bg-card/50 rounded-lg border border-border/50">
      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务名称、WBS 编码..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            清除筛选 ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* 筛选器组 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 项目筛选 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">项目</label>
          <Select
            value={filterProject[0] || 'all'}
            onValueChange={(value) =>
              onProjectFilterChange(value === 'all' ? ['all'] : [value])
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="所有项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有项目</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 成员筛选 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">负责人</label>
          <Select
            value={filterMember[0] || 'all'}
            onValueChange={(value) =>
              onMemberFilterChange(value === 'all' ? ['all'] : [value])
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="所有成员" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有成员</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态筛选 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">状态</label>
          <Select
            value={filterStatus[0] || 'all'}
            onValueChange={(value) =>
              onStatusFilterChange(value === 'all' ? ['all'] : [value])
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="所有状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 优先级筛选 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">优先级</label>
          <Select
            value={filterPriority[0] || 'all'}
            onValueChange={(value) =>
              onPriorityFilterChange(value === 'all' ? ['all'] : [value])
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="所有优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有优先级</SelectItem>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
