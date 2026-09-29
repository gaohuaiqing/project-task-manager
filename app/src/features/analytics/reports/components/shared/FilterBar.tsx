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
import { useTaskTypeOptions } from '@/features/org/hooks/useOrg';
import type { ReportFilters, TimeRange, ReportType, DelayType } from '../../types';
import { TIME_RANGE_OPTIONS, DELAY_TYPE_OPTIONS, TASK_TYPE_OPTIONS as DEFAULT_TASK_TYPE_OPTIONS, getPresetDateRange } from '../../config';

// getPresetDateRange 已提取至 config/report-configs.ts（FilterBar 与 ReportsPage 共用单一源头）

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

  // 任务类型选项：使用 {value, label} 格式，value=英文枚举值(发后端), label=中文名(显示)
  const { options: taskTypeOptionsFromApi, hasApiData } = useTaskTypeOptions();
  const taskTypeOptions: Array<{ value: string; label: string }> = hasApiData
    ? taskTypeOptionsFromApi
    : DEFAULT_TASK_TYPE_OPTIONS.map(label => {
        // 后备映射：中文 → 英文枚举值
        const reverseMap: Record<string, string> = {
          '固件': 'firmware', '板卡': 'board', '结构': 'structure',
          '测试': 'test', '采购': 'procurement', '其他': 'other',
        };
        return { value: reverseMap[label] || label, label };
      });

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // 根据报表类型显示不同的筛选器
  const showProjectFilter = ['project-progress', 'task-statistics', 'delay-analysis', 'activity-trend'].includes(activeTab);
  const showAssigneeFilter = ['task-statistics', 'member-analysis', 'activity-trend'].includes(activeTab);
  // 任务类型筛选仅 task-statistics 消费；延期报表 API 不接收 taskType，提供下拉会"选了没反应"
  const showTaskTypeFilter = activeTab === 'task-statistics';
  const showDelayTypeFilter = activeTab === 'delay-analysis';
  const showDepartmentFilter = activeTab === 'resource-efficiency';
  const showEstimationAccuracyFilter = activeTab === 'member-analysis';
  // 项目进度是当前状态快照，不支持时间范围筛选
  const showTimeRangeFilter = activeTab !== 'project-progress';

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

        {/* 时间范围（项目进度TAB不显示，因为是当前状态快照） */}
        {showTimeRangeFilter && (
        <Select
          value={filters.timeRange || '30d'}
          onValueChange={(v) => {
            const range = getPresetDateRange(v as TimeRange);
            // 同步 timeRange + 计算好的 startDate/endDate
            // - current/30d/3m/6m/1y: range 包含 startDate/endDate（current 时为 undefined，清空时间范围）
            // - custom: range 为空对象，保留现有 startDate/endDate 由日历选择器覆盖
            onFiltersChange({
              ...filters,
              timeRange: v as TimeRange,
              ...range,
            });
          }}
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
        )}

        {/* 自定义日期 */}
        {showTimeRangeFilter && filters.timeRange === 'custom' && (
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
              {taskTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 延期类型筛选 */}
        {showDelayTypeFilter && (
          <Select
            value={filters.delayType || 'all'}
            onValueChange={(v) => updateFilter('delayType', v === 'all' ? undefined : v as DelayType)}
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
            onValueChange={(v) => updateFilter('estimationAccuracyRange', v === 'all' ? undefined : v as ReportFilters['estimationAccuracyRange'])}
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
