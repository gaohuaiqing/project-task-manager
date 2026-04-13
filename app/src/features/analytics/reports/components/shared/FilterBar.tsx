/**
 * 筛选栏组件
 * 提供项目、时间范围、负责人等筛选条件
 */

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RefreshCw, Download, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ReportFilters, TimeRange, ReportType } from '../../types';
import { TIME_RANGE_OPTIONS, DELAY_TYPE_OPTIONS, TASK_TYPE_OPTIONS } from '../../config';

/** 预估准确性范围选项 */
const ESTIMATION_ACCURACY_OPTIONS = [
  { value: '±20%', label: '精准 (±20%)' },
  { value: '±50%', label: '正常 (±50%)' },
  { value: '±100%', label: '宽松 (±100%)' },
];

export interface FilterBarProps {
  activeTab: ReportType;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  isLoading?: boolean;
  projects?: Array<{ id: string; name: string }>;
  members?: Array<{ id: string; name: string }>;
  departments?: Array<{ id: string; name: string }>;
  techGroups?: Array<{ id: string; name: string }>;
}

export function FilterBar({
  activeTab,
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading,
  projects = [],
  members = [],
  departments = [],
  techGroups = [],
}: FilterBarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // 根据报表类型显示不同的筛选器
  const showProjectFilter = ['project-progress', 'task-statistics', 'delay-analysis'].includes(activeTab);
  const showAssigneeFilter = ['task-statistics', 'member-analysis'].includes(activeTab);
  const showTaskTypeFilter = ['task-statistics', 'delay-analysis'].includes(activeTab);
  const showDelayTypeFilter = activeTab === 'delay-analysis';
  const showDepartmentFilter = activeTab === 'resource-efficiency';
  const showEstimationAccuracyFilter = activeTab === 'member-analysis';

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 项目筛选 */}
        {showProjectFilter && (
          <Select
            value={filters.projectId || 'all'}
            onValueChange={(v) => updateFilter('projectId', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 时间范围 */}
        <Select
          value={filters.timeRange || '30d'}
          onValueChange={(v) => updateFilter('timeRange', v as TimeRange)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 自定义日期 */}
        {filters.timeRange === 'custom' && (
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate && filters.endDate ? (
                  <>
                    {format(new Date(filters.startDate), 'yyyy/MM/dd', { locale: zhCN })} -{' '}
                    {format(new Date(filters.endDate), 'yyyy/MM/dd', { locale: zhCN })}
                  </>
                ) : (
                  <span className="text-muted-foreground">选择日期范围</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.startDate ? new Date(filters.startDate) : undefined,
                  to: filters.endDate ? new Date(filters.endDate) : undefined,
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    updateFilter('startDate', format(range.from, 'yyyy-MM-dd'));
                    updateFilter('endDate', format(range.to, 'yyyy-MM-dd'));
                    setDatePickerOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* 负责人筛选 */}
        {showAssigneeFilter && (
          <Select
            value={filters.assigneeId || 'all'}
            onValueChange={(v) => updateFilter('assigneeId', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="负责人" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部成员</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 任务类型筛选 */}
        {showTaskTypeFilter && (
          <Select
            value={filters.taskType || 'all'}
            onValueChange={(v) => updateFilter('taskType', v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="任务类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {TASK_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 延期类型筛选 */}
        {showDelayTypeFilter && (
          <Select
            value={filters.delayType || 'all'}
            onValueChange={(v) => updateFilter('delayType', v === 'all' ? undefined : v as any)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="延期类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {DELAY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 预估准确性范围筛选 */}
        {showEstimationAccuracyFilter && (
          <Select
            value={filters.estimationAccuracyRange || 'all'}
            onValueChange={(v) => updateFilter('estimationAccuracyRange', v === 'all' ? undefined : v as any)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="预估准确性" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部范围</SelectItem>
              {ESTIMATION_ACCURACY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
            刷新
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onExport}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-1" />
            导出Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
