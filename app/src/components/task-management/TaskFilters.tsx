/**
 * 任务管理筛选组件
 *
 * 职责：
 * - 搜索任务
 * - 按项目筛选
 * - 按成员筛选
 * - 按状态筛选
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

export interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterProject: string;
  onProjectFilterChange: (projectId: string) => void;
  filterMember: string;
  onMemberFilterChange: (memberId: string) => void;
  filterStatus: string;
  onStatusFilterChange: (status: string) => void;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delayed', label: '已延期' },
];

export function TaskFilters({
  searchQuery,
  onSearchChange,
  filterProject,
  onProjectFilterChange,
  filterMember,
  onMemberFilterChange,
  filterStatus,
  onStatusFilterChange,
  projects,
  members,
}: TaskFiltersProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card/50 rounded-lg border border-border/50">
      {/* 搜索 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索任务名称、WBS 编码..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 项目筛选 */}
      <Select value={filterProject} onValueChange={onProjectFilterChange}>
        <SelectTrigger className="w-40">
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

      {/* 成员筛选 */}
      <Select value={filterMember} onValueChange={onMemberFilterChange}>
        <SelectTrigger className="w-40">
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

      {/* 状态筛选 */}
      <Select value={filterStatus} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
