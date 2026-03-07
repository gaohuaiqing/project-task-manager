/**
 * 过滤栏组件
 *
 * 功能：
 * 1. 标准化过滤条件布局
 * 2. 支持多种过滤控件
 * 3. 响应式布局
 *
 * @module components/common/FilterBar
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FilterItem {
  id: string;
  label: string;
  control: React.ReactNode;
  span?: number; // 列跨度 (1-5)
}

export interface FilterBarProps {
  /** 过滤项列表 */
  filters: FilterItem[];
  /** 额外操作区域 */
  actions?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 过滤栏组件
 *
 * @example
 * ```tsx
 * <FilterBar
 *   filters={[
 *     {
 *       id: 'level',
 *       label: '日志级别',
 *       control: <Select value={level} onValueChange={setLevel}>...</Select>
 *     },
 *     {
 *       id: 'search',
 *       label: '搜索',
 *       span: 2,
 *       control: <Input placeholder="搜索..." />
 *     }
 *   ]}
 *   actions={<Checkbox>自动刷新</Checkbox>}
 * />
 * ```
 */
export function FilterBar({
  filters,
  actions,
  className
}: FilterBarProps) {
  return (
    <Card className={cn("bg-slate-800 border-slate-700 p-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {filters.map((filter) => (
          <div key={filter.id} className={filter.span ? `md:col-span-${filter.span}` : ''}>
            <Label className="text-slate-300 text-sm mb-1.5">{filter.label}</Label>
            {filter.control}
          </div>
        ))}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-3">
          {actions}
        </div>
      )}
    </Card>
  );
}

export default FilterBar;
