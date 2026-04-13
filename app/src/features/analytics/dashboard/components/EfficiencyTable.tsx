/**
 * 效能对比表格组件
 *
 * @module analytics/dashboard/components/EfficiencyTable
 * @description 通用的效能对比表格，支持部门效能和组效能
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

/**
 * 效能数据项（通用）
 */
export interface EfficiencyItem {
  id: number;
  name: string;
  completionRate: number;
  delayRate: number;
  utilizationRate?: number;
  loadRate?: number;
  activity?: number;
  memberCount?: number;
  trend: number;
  status: 'healthy' | 'warning' | 'risk';
}

export interface EfficiencyTableProps {
  /** 表格标题 */
  title?: string;
  /** 数据项 */
  items: EfficiencyItem[];
  /** 表格类型：department（部门）或 group（组） */
  type?: 'department' | 'group';
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 状态配置
 */
const STATUS_CONFIG = {
  healthy: {
    label: '健康',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: '警告',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  risk: {
    label: '风险',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

/**
 * 效能对比表格
 *
 * 设计规范:
 * - 斑马纹背景
 * - 状态指示器
 * - 趋势箭头
 * - 响应式布局
 */
export function EfficiencyTable({
  title,
  items,
  type = 'department',
  className,
  'data-testid': testId,
}: EfficiencyTableProps) {
  return (
    <div className={cn('rounded-xl border border-gray-100 dark:border-slate-700/50 overflow-hidden', className)} data-testid={testId}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50">
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {type === 'department' ? '部门' : '组名'}
            </TableHead>
            {type === 'group' && (
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                成员数
              </TableHead>
            )}
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              完成率
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              延期率
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              {type === 'department' ? '利用率' : '负载率'}
            </TableHead>
            {type === 'group' && (
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                活跃度
              </TableHead>
            )}
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              趋势
            </TableHead>
            <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
              状态
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const statusConfig = STATUS_CONFIG[item.status];
            const utilizationOrLoad = type === 'department' ? item.utilizationRate : item.loadRate;

            return (
              <TableRow
                key={item.id}
                className={cn(
                  index % 2 === 0 ? 'bg-white dark:bg-slate-800/30' : 'bg-gray-50/50 dark:bg-slate-800/50',
                  'hover:bg-gray-100 dark:hover:bg-slate-700/30'
                )}
                data-testid={`efficiency-row-${item.id}`}
              >
                <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                  {item.name}
                </TableCell>
                {type === 'group' && (
                  <TableCell className="text-center text-gray-600 dark:text-gray-400">
                    {item.memberCount}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <span className={cn(
                    'font-mono tabular-nums',
                    item.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    item.completionRate >= 60 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>
                    {item.completionRate}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    'font-mono tabular-nums',
                    item.delayRate <= 10 ? 'text-emerald-600 dark:text-emerald-400' :
                    item.delayRate <= 20 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  )}>
                    {item.delayRate}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    'font-mono tabular-nums',
                    (utilizationOrLoad || 0) >= 80 && (utilizationOrLoad || 0) <= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                    (utilizationOrLoad || 0) > 100 ? 'text-red-600 dark:text-red-400' :
                    'text-amber-600 dark:text-amber-400'
                  )}>
                    {utilizationOrLoad}%
                  </span>
                </TableCell>
                {type === 'group' && (
                  <TableCell className="text-center">
                    <span className={cn(
                      'font-mono tabular-nums',
                      (item.activity || 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      (item.activity || 0) >= 60 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {item.activity}%
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <span className={cn(
                    'flex items-center justify-center gap-0.5 text-xs font-medium',
                    item.trend > 0 ? 'text-emerald-500' :
                    item.trend < 0 ? 'text-red-500' :
                    'text-gray-400'
                  )}>
                    {item.trend > 0 ? <ArrowUp className="h-3 w-3" /> :
                     item.trend < 0 ? <ArrowDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                    {Math.abs(item.trend)}%
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full mr-1', statusConfig.dot)} />
                    {statusConfig.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default EfficiencyTable;
