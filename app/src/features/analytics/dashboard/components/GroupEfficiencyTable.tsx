/**
 * 组效能表格组件
 * 用于部门经理仪表板显示组效能对比
 *
 * @module analytics/dashboard/components/GroupEfficiencyTable
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroupEfficiency } from '../types';

export interface GroupEfficiencyTableProps {
  /** 组效能数据 */
  groups: GroupEfficiency[];
  /** 标题 */
  title?: string;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击组 */
  onGroupClick?: (group: GroupEfficiency) => void;
  /** 时间范围变更 */
  onTimeRangeChange?: (range: string) => void;
  /** 默认时间范围 */
  defaultTimeRange?: string;
}

/**
 * 状态配置
 */
const STATUS_CONFIG = {
  healthy: {
    label: '健康',
    icon: '🟢',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  warning: {
    label: '警告',
    icon: '🟡',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  risk: {
    label: '风险',
    icon: '🔴',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
};

const TIME_RANGES = [
  { value: 'this_month', label: '本月' },
  { value: 'last_month', label: '上月' },
  { value: 'this_quarter', label: '本季度' },
];

/**
 * 组效能表格组件
 *
 * 设计规范:
 * - 紧凑的表格布局
 * - 显示完成率、延期率、负载率、活跃度
 * - 支持时间范围选择
 */
export function GroupEfficiencyTable({
  groups,
  title = '组效能对比',
  isLoading,
  className,
  onGroupClick,
  onTimeRangeChange,
  defaultTimeRange = 'this_month',
}: GroupEfficiencyTableProps) {
  const [timeRange, setTimeRange] = React.useState(defaultTimeRange);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    onTimeRangeChange?.(value);
  };

  // 加载状态
  if (isLoading) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-slate-700/50 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 空状态
  if (!groups || groups.length === 0) {
    return (
      <Card
        className={cn(
          'rounded-xl border border-gray-100 dark:border-slate-700/50',
          'bg-white dark:bg-slate-800/50 shadow-sm',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </CardTitle>
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger className="h-7 w-[80px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            暂无组数据
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="dashboard-card-group-efficiency"
      className={cn(
        'rounded-xl border border-gray-100 dark:border-slate-700/50',
        'bg-white dark:bg-slate-800/50 shadow-sm',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
          {onTimeRangeChange && (
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-testid="dashboard-table-group-efficiency">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400">
                组别
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                完成率
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                延期率
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                负载率
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                活跃度
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                成员数
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                趋势
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                状态
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => {
              const statusConfig = STATUS_CONFIG[group.status];

              return (
                <TableRow
                  key={group.id}
                  className={cn(
                    'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30',
                    'transition-colors'
                  )}
                  onClick={() => onGroupClick?.(group)}
                >
                  {/* 组名 */}
                  <TableCell className="py-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {group.name}
                    </span>
                  </TableCell>

                  {/* 完成率 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        group.completionRate >= 80
                          ? 'text-emerald-500'
                          : group.completionRate >= 60
                            ? 'text-amber-500'
                            : 'text-red-500'
                      )}
                    >
                      {group.completionRate}%
                    </span>
                  </TableCell>

                  {/* 延期率 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        group.delayRate <= 10
                          ? 'text-emerald-500'
                          : group.delayRate <= 20
                            ? 'text-amber-500'
                            : 'text-red-500'
                      )}
                    >
                      {group.delayRate}%
                    </span>
                  </TableCell>

                  {/* 负载率 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        group.loadRate <= 100
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-red-500'
                      )}
                    >
                      {group.loadRate}%
                    </span>
                  </TableCell>

                  {/* 活跃度 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        group.activity >= 80
                          ? 'text-emerald-500'
                          : group.activity >= 60
                            ? 'text-amber-500'
                            : 'text-red-500'
                      )}
                    >
                      {group.activity}%
                    </span>
                  </TableCell>

                  {/* 成员数 */}
                  <TableCell className="py-2 text-center">
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {group.memberCount}
                    </span>
                  </TableCell>

                  {/* 趋势 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        group.trend > 0
                          ? 'text-emerald-500'
                          : group.trend < 0
                            ? 'text-red-500'
                            : 'text-gray-400'
                      )}
                    >
                      {group.trend > 0 ? '↑' : group.trend < 0 ? '↓' : '→'}
                      {group.trend !== 0 && `${Math.abs(group.trend)}%`}
                    </span>
                  </TableCell>

                  {/* 状态 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        statusConfig.color,
                        statusConfig.bg
                      )}
                    >
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default GroupEfficiencyTable;
