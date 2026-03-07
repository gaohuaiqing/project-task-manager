/**
 * 数据表格组件
 *
 * 功能：
 * 1. 标准化数据表格布局
 * 2. 支持分页
 * 3. 支持加载状态
 * 4. 支持空状态
 *
 * @module components/common/DataTable
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  id: string;
  header: string;
  cell: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  /** 数据列表 */
  data: T[];
  /** 列配置 */
  columns: Column<T>[];
  /** 数据唯一标识键 */
  rowKey: keyof T | ((item: T) => string);
  /** 是否加载中 */
  loading?: boolean;
  /** 空状态提示 */
  emptyText?: string;
  /** 分页信息 */
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  /** 自定义类名 */
  className?: string;
  /** 行样式 */
  rowClassName?: string | ((item: T, index: number) => string);
}

/**
 * 获取行唯一标识
 */
function getRowKey<T>(item: T, key: keyof T | ((item: T) => string)): string {
  if (typeof key === 'function') {
    return key(item);
  }
  return String(item[key]);
}

/**
 * 数据表格组件
 *
 * @example
 * ```tsx
 * <DataTable
 *   data={logs}
 *   rowKey="id"
 *   columns={[
 *     { id: 'time', header: '时间', cell: (log) => log.created_at },
 *     { id: 'level', header: '级别', cell: (log) => log.log_level },
 *   ]}
 *   loading={isLoading}
 *   emptyText="暂无日志"
 *   pagination={{
 *     total: 100,
 *     page: 0,
 *     pageSize: 20,
 *     onPageChange: setPage
 *   }}
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  pagination,
  className,
  rowClassName,
}: DataTableProps<T>) {
  /**
   * 渲染表格内容
   */
  const renderContent = () => {
    if (loading && data.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mr-2" />
          <span className="text-slate-400">加载中...</span>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400">
          {emptyText}
        </div>
      );
    }

    return (
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  "px-4 py-2 text-left text-sm font-medium text-slate-300",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const key = getRowKey(item, rowKey);
            const rowClass = typeof rowClassName === 'function'
              ? rowClassName(item, index)
              : rowClassName;

            return (
              <tr
                key={key}
                className={cn(
                  "border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors",
                  rowClass
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn("px-4 py-2 text-sm text-slate-200", column.className)}
                  >
                    {column.cell(item, index)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <Card className={cn("bg-slate-900 border-slate-700", className)}>
      {renderContent()}

      {/* 分页 */}
      {pagination && pagination.total > 0 && (
        <div className="p-3 border-t border-slate-700 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>
              显示 {Math.min((pagination.page + 1) * pagination.pageSize, pagination.total)} / {pagination.total} 条
            </span>
            {pagination.total > pagination.pageSize && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 0}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                >
                  上一页
                </Button>
                <span>第 {pagination.page + 1} 页</span>
                <Button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={(pagination.page + 1) * pagination.pageSize >= pagination.total}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                >
                  下一页
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default DataTable;
