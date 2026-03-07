/**
 * 苹果风格表格组件
 * Apple Style Table Component
 *
 * 符合苹果设计规范的数据表格
 */

import React, { useState } from 'react';
import cn from 'classnames';

export interface AppleTableColumn<T = any> {
  /**
   * 列键名
   */
  key: string;

  /**
   * 列标题
   */
  title: string;

  /**
   * 列宽度
   */
  width?: string | number;

  /**
   * 是否可排序
   */
  sortable?: boolean;

  /**
   * 对齐方式
   */
  align?: 'left' | 'center' | 'right';

  /**
   * 自定义渲染函数
   */
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface AppleTableProps<T = any> {
  /**
   * 表格列定义
   */
  columns: AppleTableColumn<T>[];

  /**
   * 数据源
   */
  dataSource: T[];

  /**
   * 表格行 key
   */
  rowKey?: string | ((record: T) => string);

  /**
   * 是否显示边框
   */
  bordered?: boolean;

  /**
   * 表格大小
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否斑马纹
   */
  striped?: boolean;

  /**
   * 是否可悬停
   */
  hoverable?: boolean;

  /**
   * 行点击事件
   */
  onRowClick?: (record: T, index: number) => void;

  /**
   * 加载状态
   */
  loading?: boolean;

  /**
   * 空状态文本
   */
  emptyText?: string;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 自定义行类名
   */
  rowClassName?: string | ((record: T, index: number) => string);

  /**
   * 自定义行样式
   */
  rowStyle?: React.CSSProperties | ((record: T, index: number) => React.CSSProperties);
}

export type SortDirection = 'asc' | 'desc' | null;

/**
 * 苹果风格表格组件
 *
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', title: '姓名' },
 *   { key: 'age', title: '年龄', align: 'center' },
 * ];
 *
 * const data = [
 *   { id: '1', name: '张三', age: 25 },
 *   { id: '2', name: '李四', age: 30 },
 * ];
 *
 * <AppleTable columns={columns} dataSource={data} rowKey="id" />
 * ```
 */
export const AppleTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'id',
  bordered = false,
  size = 'medium',
  striped = true,
  hoverable = true,
  onRowClick,
  loading = false,
  emptyText = '暂无数据',
  className = '',
  rowClassName,
  rowStyle,
}: AppleTableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 获取行唯一标识
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 获取行类名
  const getRowClassName = (record: T, index: number): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(record, index);
    }
    return rowClassName || '';
  };

  // 获取行样式
  const getRowStyle = (record: T, index: number): React.CSSProperties => {
    if (typeof rowStyle === 'function') {
      return rowStyle(record, index);
    }
    return rowStyle || {};
  };

  // 处理排序
  const handleSort = (column: AppleTableColumn<T>) => {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      // 切换排序方向
      setSortDirection((prev) => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return null;
        return 'asc';
      });
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  // 排序数据
  const getSortedData = (): T[] => {
    if (!sortColumn || !sortDirection) return dataSource;

    const column = columns.find((col) => col.key === sortColumn);
    if (!column) return dataSource;

    return [...dataSource].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedData = getSortedData();

  // 尺寸样式
  const sizeClasses: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const paddingClasses: Record<string, string> = {
    small: 'px-3 py-2',
    medium: 'px-4 py-3',
    large: 'px-5 py-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full',
          'overflow-auto',
          'rounded-apple-card',
          bordered && 'border',
          'border-border'
        )}
      >
        <table
          className={cn(
            'w-full',
            'border-collapse',
            sizeClasses[size]
          )}
        >
          {/* 表头 */}
          <thead>
            <tr
              className={cn(
                'bg-muted',
                'border-b',
                'border-border',
                'text-muted-foreground',
                'font-semibold',
                'text-left'
              )}
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    paddingClasses[size],
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer hover:bg-muted-foreground/10',
                    'transition-colors',
                    'duration-fast',
                    'timing-apple-out',
                    'font-medium',
                    'select-none'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="flex flex-col">
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="none"
                          className={cn(
                            'transition-colors',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-system-blue'
                              : 'text-muted-foreground/50'
                          )}
                        >
                          <path
                            d="M4 1L7 6H1L4 1Z"
                            fill="currentColor"
                          />
                        </svg>
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="none"
                          className={cn(
                            '-mt-1',
                            'transition-colors',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-system-blue'
                              : 'text-muted-foreground/50'
                          )}
                        >
                          <path
                            d="M4 7L1 2H7L4 7Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(
                    paddingClasses[size],
                    'text-center',
                    'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-system-blue border-t-transparent rounded-full animate-spin" />
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn(
                    paddingClasses[size],
                    'text-center',
                    'text-muted-foreground'
                  )}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((record, rowIndex) => (
                <tr
                  key={getRowKey(record, rowIndex)}
                  className={cn(
                    'border-b',
                    'border-border',
                    'transition-colors',
                    'duration-fast',
                    'timing-apple-out',
                    striped && rowIndex % 2 === 0 && 'bg-muted/30',
                    hoverable && 'hover:bg-muted/50',
                    onRowClick && 'cursor-pointer',
                    getRowClassName(record, rowIndex)
                  )}
                  style={getRowStyle(record, rowIndex)}
                  onClick={() => onRowClick?.(record, rowIndex)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        paddingClasses[size],
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(record[column.key], record, rowIndex)
                        : record[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppleTable;
