/**
 * 数据表格组件
 * 支持排序、分页
 */

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableColumn, Pagination } from '../../types';

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn[];
  data: T[];
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  renderCell?: (item: T, column: TableColumn) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
  renderCell,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 排序处理
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'zh-CN')
        : bStr.localeCompare(aStr, 'zh-CN');
    });
  }, [data, sortKey, sortDirection]);

  // 渲染排序图标
  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;

    if (sortKey !== column.key) {
      return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }

    if (sortDirection === 'asc') {
      return <ChevronUp className="h-3 w-3 text-primary" />;
    }

    return <ChevronDown className="h-3 w-3 text-primary" />;
  };

  // 默认单元格渲染
  const defaultRenderCell = (item: T, column: TableColumn): React.ReactNode => {
    const value = item[column.key];

    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    // 进度类型
    if (column.type === 'progress') {
      const numVal = Number(value);
      const colorClass =
        numVal >= 80 ? 'bg-green-500' :
        numVal >= 60 ? 'bg-yellow-500' :
        numVal >= 40 ? 'bg-orange-500' : 'bg-red-500';

      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex-1 min-w-[24px] h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', colorClass)}
              style={{ width: `${Math.min(100, Math.max(0, numVal))}%` }}
            />
          </div>
          <span className="text-xs font-mono text-right shrink-0">{numVal}%</span>
        </div>
      );
    }

    // 日期类型
    if (column.type === 'date') {
      return new Date(value as string).toLocaleDateString('zh-CN');
    }

    // 枚举类型（状态）
    if (column.type === 'enum') {
      const enumValue = String(value);
      const colorMap: Record<string, string> = {
        // 任务状态
        not_started: 'bg-slate-100 text-slate-700',
        in_progress: 'bg-blue-100 text-blue-700',
        completed: 'bg-green-100 text-green-700',
        delayed: 'bg-red-100 text-red-700',
        pending_review: 'bg-orange-100 text-orange-700',
        review_rejected: 'bg-red-100 text-red-700',
        waiting: 'bg-slate-100 text-slate-700',
        suspended: 'bg-slate-100 text-slate-700',
        cancelled: 'bg-slate-100 text-slate-700',
        // 里程碑状态
        pending: 'bg-slate-100 text-slate-700',
        overdue: 'bg-red-100 text-red-700',
        // 延期类型
        delay_warning: 'bg-orange-100 text-orange-700',
        overdue_completed: 'bg-slate-100 text-slate-700',
        // 风险等级
        high: 'bg-red-100 text-red-700',
        medium: 'bg-orange-100 text-orange-700',
        low: 'bg-green-100 text-green-700',
        // 效能等级
      };

      const labelMap: Record<string, string> = {
        not_started: '未开始',
        in_progress: '进行中',
        completed: '已完成',
        delayed: '已延期',
        pending_review: '待审核',
        review_rejected: '审核驳回',
        waiting: '等待中',
        suspended: '已暂停',
        cancelled: '已取消',
        pending: '待处理',
        overdue: '已逾期',
        delay_warning: '延期预警',
        overdue_completed: '超期完成',
        high: '高',
        medium: '中',
        low: '低',
      };

      return (
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colorMap[enumValue] || 'bg-muted')}>
          {labelMap[enumValue] || enumValue}
        </span>
      );
    }

    // 数字类型
    if (column.type === 'number') {
      return <span className="font-mono">{Number(value).toLocaleString()}</span>;
    }

    // 默认字符串
    return String(value);
  };

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(
                    'text-xs font-semibold',
                    column.sortable && 'cursor-pointer select-none hover:bg-muted'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    {renderSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className="text-sm">
                      {renderCell
                        ? renderCell(item, column)
                        : defaultRenderCell(item, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              共 {pagination.total} 条，每页
              <select
                value={pagination.pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="mx-1 px-2 py-0.5 border rounded bg-background"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              条
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm">
              {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
