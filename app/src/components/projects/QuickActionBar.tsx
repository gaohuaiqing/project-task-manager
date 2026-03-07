/**
 * 快速操作按钮栏
 *
 * 提供常用的快捷操作按钮
 * @module components/projects/QuickActionBar
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickActionBarProps {
  /** 是否禁用所有按钮 */
  disabled?: boolean;
  /** 添加里程碑回调 */
  onAddMilestone?: () => void;
  /** 添加任务回调 */
  onAddTask?: () => void;
  /** 自动排列回调 */
  onAutoArrange?: () => void;
  /** 重置更改回调 */
  onReset?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 显示的操作按钮 */
  actions?: Array<'addMilestone' | 'addTask' | 'autoArrange' | 'reset'>;
}

/**
 * 操作按钮配置
 */
const ACTION_BUTTONS = {
  addMilestone: {
    icon: Plus,
    label: '添加里程碑',
    variant: 'default' as const,
    description: '在时间线中间位置添加里程碑',
  },
  addTask: {
    icon: Calendar,
    label: '添加任务',
    variant: 'default' as const,
    description: '创建新的WBS任务',
  },
  autoArrange: {
    icon: CheckCircle2,
    label: '自动排列',
    variant: 'outline' as const,
    description: '自动调整节点日期使其均匀分布',
  },
  reset: {
    icon: XCircle,
    label: '重置更改',
    variant: 'ghost' as const,
    description: '撤销所有未保存的更改',
  },
};

/**
 * 快速操作按钮栏组件
 */
export function QuickActionBar({
  disabled = false,
  onAddMilestone,
  onAddTask,
  onAutoArrange,
  onReset,
  className,
  actions = ['addMilestone', 'addTask', 'autoArrange', 'reset'],
}: QuickActionBarProps) {
  const handleButtonClick = (action: keyof typeof ACTION_BUTTONS) => {
    if (disabled) return;

    switch (action) {
      case 'addMilestone':
        onAddMilestone?.();
        break;
      case 'addTask':
        onAddTask?.();
        break;
      case 'autoArrange':
        onAutoArrange?.();
        break;
      case 'reset':
        onReset?.();
        break;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg",
      className
    )}>
      <span className="text-xs text-muted-foreground px-2">快捷操作：</span>
      {actions.map((action) => {
        const config = ACTION_BUTTONS[action];
        const Icon = config.icon;

        return (
          <Button
            key={action}
            variant={config.variant}
            size="sm"
            onClick={() => handleButtonClick(action as keyof typeof ACTION_BUTTONS)}
            disabled={disabled}
            className="h-8 text-xs"
            title={config.description}
          >
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * 默认导出
 */
export default QuickActionBar;
