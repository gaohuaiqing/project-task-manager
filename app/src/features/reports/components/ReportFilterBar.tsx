/**
 * 报表筛选栏组件
 * 根据当前Tab显示不同的筛选条件
 * 符合需求文档 REQ_07_analytics.md 2.1节规范
 */
import { useState, useMemo } from 'react';
import { format, subDays, startOfQuarter, endOfQuarter } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ReportFilters, ReportTab } from '../types';

interface ReportFilterBarProps {
  activeTab: ReportTab;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  isLoading?: boolean;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: number; name: string }>;
}

const DELAY_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'delay_warning', label: '延期预警' },
  { value: 'delayed', label: '已延期' },
  { value: 'overdue_completed', label: '超期完成' },
];

// 时间范围预设选项（符合REQ_07规范）
const TIME_RANGE_PRESETS = [
  { value: 'last_7_days', label: '过去7天' },
  { value: 'last_30_days', label: '过去30天' },
  { value: 'this_quarter', label: '本季度' },
  { value: 'custom', label: '自定义' },
] as const;

type TimeRangePreset = typeof TIME_RANGE_PRESETS[number]['value'];

export function ReportFilterBar({
  activeTab,
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
  projects,
  members,
}: ReportFilterBarProps) {
  // 时间范围预设选择状态
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('last_30_days');

  // 根据Tab类型确定显示哪些筛选器
  const showProjectFilter = activeTab !== 'member-analysis';
  const showMemberFilter = activeTab === 'task-statistics' || activeTab === 'member-analysis';
  const showDelayTypeFilter = activeTab === 'delay-analysis';
  const showDateFilter = true; // 所有Tab都显示时间范围

  // 处理时间范围预设选择
  const handleTimeRangePresetChange = (value: TimeRangePreset) => {
    setTimeRangePreset(value);
    const today = new Date();

    switch (value) {
      case 'last_7_days':
        onFiltersChange({
          ...filters,
          startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'last_30_days':
        onFiltersChange({
          ...filters,
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'this_quarter':
        onFiltersChange({
          ...filters,
          startDate: format(startOfQuarter(today), 'yyyy-MM-dd'),
          endDate: format(endOfQuarter(today), 'yyyy-MM-dd'),
        });
        break;
      case 'custom':
        // 自定义时保持当前选择或清空
        break;
    }
  };

  const handleDateSelect = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    if (date) {
      setTimeRangePreset('custom'); // 手动选择日期时切换到自定义模式
      onFiltersChange({
        ...filters,
        [field]: format(date, 'yyyy-MM-dd'),
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
      {/* 项目筛选 */}
      {showProjectFilter && (
        <Select
          value={filters.projectId || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, projectId: value === 'all' ? undefined : value })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择项目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 成员筛选 */}
      {showMemberFilter && (
        <Select
          value={filters.memberId?.toString() || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              memberId: value === 'all' ? undefined : parseInt(value, 10),
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={activeTab === 'member-analysis' ? '选择成员' : '选择负责人'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{activeTab === 'member-analysis' ? '全部成员' : '全部负责人'}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 延期类型筛选 */}
      {showDelayTypeFilter && (
        <Select
          value={filters.delayType || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              delayType: value === 'all' ? undefined : (value as ReportFilters['delayType']),
            })
          }
          disabled={isLoading}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="延期类型" />
          </SelectTrigger>
          <SelectContent>
            {DELAY_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 时间范围（符合REQ_07规范：预设选项 + 自定义日期） */}
      {showDateFilter && (
        <>
          {/* 时间范围预设选项 */}
          <Select
            value={timeRangePreset}
            onValueChange={(value) => handleTimeRangePresetChange(value as TimeRangePreset)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_PRESETS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 自定义日期选择器（预设为custom时显示） */}
          {timeRangePreset === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !filters.startDate && 'text-muted-foreground'
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(new Date(filters.startDate), 'MM/dd') : '开始日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate ? new Date(filters.startDate) : undefined}
                    onSelect={(date) => handleDateSelect('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">至</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[140px] justify-start text-left font-normal',
                      !filters.endDate && 'text-muted-foreground'
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(new Date(filters.endDate), 'MM/dd') : '结束日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate ? new Date(filters.endDate) : undefined}
                    onSelect={(date) => handleDateSelect('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* 非自定义模式时显示当前日期范围 */}
          {timeRangePreset !== 'custom' && filters.startDate && filters.endDate && (
            <span className="text-sm text-muted-foreground">
              ({format(new Date(filters.startDate), 'MM/dd')} - {format(new Date(filters.endDate), 'MM/dd')})
            </span>
          )}
        </>
      )}

      {/* 操作按钮 */}
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
          刷新
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} disabled={isLoading}>
          <Download className="h-4 w-4 mr-1" />
          导出Excel
        </Button>
      </div>
    </div>
  );
}
