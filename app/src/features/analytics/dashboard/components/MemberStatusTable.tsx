/**
 * 成员任务状态表格组件
 * 用于技术经理仪表板显示组内成员状态
 *
 * @module analytics/dashboard/components/MemberStatusTable
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MemberTaskStatus } from '../types';

export interface MemberStatusTableProps {
  /** 成员数据 */
  members: MemberTaskStatus[];
  /** 标题 */
  title?: string;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 点击成员 */
  onMemberClick?: (member: MemberTaskStatus) => void;
  /** 时间范围选择 */
  timeRangeSelector?: React.ReactNode;
}

/**
 * 状态配置
 */
const STATUS_CONFIG = {
  healthy: {
    label: '正常',
    icon: '🟢',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    label: '过载',
    icon: '🟡',
    color: 'text-amber-600 dark:text-amber-400',
  },
  risk: {
    label: '风险',
    icon: '🔴',
    color: 'text-red-600 dark:text-red-400',
  },
  idle: {
    label: '空闲',
    icon: '🔵',
    color: 'text-sky-600 dark:text-sky-400',
  },
};

/**
 * 成员任务状态表格组件
 *
 * 设计规范:
 * - 紧凑的表格布局
 * - 显示成员任务数量、负载率、活跃度
 * - 支持排序和点击
 */
export function MemberStatusTable({
  members,
  title = '成员任务状态',
  isLoading,
  className,
  onMemberClick,
  timeRangeSelector,
}: MemberStatusTableProps) {
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
            {timeRangeSelector}
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
  if (!members || members.length === 0) {
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
            {timeRangeSelector}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            暂无成员数据
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="dashboard-card-member-status"
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
          {timeRangeSelector}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-testid="dashboard-table-member-status">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400">
                成员
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                进行中
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                已完成
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                延期
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                负载率
              </TableHead>
              <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                活跃度
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
            {members.map((member) => {
              const statusConfig = STATUS_CONFIG[member.status];

              return (
                <TableRow
                  key={member.id}
                  className={cn(
                    'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30',
                    'transition-colors'
                  )}
                  onClick={() => onMemberClick?.(member)}
                >
                  {/* 成员信息 */}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {member.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* 进行中 */}
                  <TableCell className="py-2 text-center">
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {member.inProgress}
                    </span>
                  </TableCell>

                  {/* 已完成 */}
                  <TableCell className="py-2 text-center">
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {member.completed}
                    </span>
                  </TableCell>

                  {/* 延期 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        member.delayed > 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {member.delayed}
                    </span>
                  </TableCell>

                  {/* 负载率 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        member.loadRate > 100
                          ? 'text-red-500'
                          : member.loadRate > 80
                            ? 'text-amber-500'
                            : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {member.loadRate}%
                    </span>
                  </TableCell>

                  {/* 活跃度 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-sm font-mono',
                        member.activity >= 80
                          ? 'text-emerald-500'
                          : member.activity >= 60
                            ? 'text-amber-500'
                            : 'text-red-500'
                      )}
                    >
                      {member.activity}%
                    </span>
                  </TableCell>

                  {/* 趋势 */}
                  <TableCell className="py-2 text-center">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        member.trend > 0
                          ? 'text-emerald-500'
                          : member.trend < 0
                            ? 'text-red-500'
                            : 'text-gray-400'
                      )}
                    >
                      {member.trend > 0 ? '↑' : member.trend < 0 ? '↓' : '→'}
                      {member.trend !== 0 && `${Math.abs(member.trend)}%`}
                    </span>
                  </TableCell>

                  {/* 状态 */}
                  <TableCell className="py-2 text-center">
                    <span className={cn('text-xs', statusConfig.color)}>
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

export default MemberStatusTable;
