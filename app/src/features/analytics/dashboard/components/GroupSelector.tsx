/**
 * 组切换下拉框组件
 *
 * @module analytics/dashboard/components/GroupSelector
 * @description 技术经理仪表板的组切换功能
 */

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface GroupOption {
  id: number;
  name: string;
}

export interface GroupSelectorProps {
  /** 可选的组列表 */
  groups: GroupOption[];
  /** 当前选中的组ID */
  currentGroupId: number;
  /** 切换组回调 */
  onGroupChange: (groupId: number) => void;
  /** 自定义类名 */
  className?: string;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 组切换下拉框
 *
 * 设计规范:
 * - 紧凑的下拉选择器
 * - 显示当前组名称
 * - 支持快速切换
 */
export function GroupSelector({
  groups,
  currentGroupId,
  onGroupChange,
  className,
  'data-testid': testId,
}: GroupSelectorProps) {
  // 如果只有一个组，不显示选择器
  if (groups.length <= 1) {
    return null;
  }

  return (
    <Select
      value={String(currentGroupId)}
      onValueChange={(value) => onGroupChange(Number(value))}
    >
      <SelectTrigger
        className={cn('w-[140px] h-8 text-sm', className)}
        data-testid={testId}
      >
        <SelectValue placeholder="选择组" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectItem key={group.id} value={String(group.id)}>
            {group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// 需要导入 cn
import { cn } from '@/lib/utils';

export default GroupSelector;
