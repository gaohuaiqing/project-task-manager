/**
 * 操作按钮组组件
 *
 * 功能：
 * 1. 标准化操作按钮布局
 * 2. 支持主要、次要、危险操作
 * 3. 支持按钮禁用状态
 *
 * @module components/common/ActionButtons
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionButton {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'outline' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

export interface ActionButtonsProps {
  /** 按钮列表 */
  actions: ActionButton[];
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 按钮间距 */
  gap?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 获取按钮样式
 */
function getButtonVariant(variant: ActionButton['variant']) {
  switch (variant) {
    case 'danger':
      return 'border-red-600 text-red-400 hover:bg-red-600/20';
    case 'success':
      return 'bg-green-600 hover:bg-green-700 text-white';
    default:
      return 'border-slate-600 text-slate-300 hover:bg-slate-700';
  }
}

/**
 * 获取间距类名
 */
function getGapClass(gap: 'sm' | 'md' | 'lg') {
  switch (gap) {
    case 'sm':
      return 'gap-1';
    case 'lg':
      return 'gap-3';
    default:
      return 'gap-2';
  }
}

/**
 * 操作按钮组组件
 *
 * @example
 * ```tsx
 * <ActionButtons
 *   actions={[
 *     {
 *       id: 'export',
 *       label: '导出JSON',
 *       icon: Download,
 *       onClick: handleExportJSON,
 *       variant: 'outline'
 *     },
 *     {
 *       id: 'delete',
 *       label: '清除',
 *       icon: Trash2,
 *       onClick: handleClear,
 *       variant: 'danger'
 *     }
 *   ]}
 *   align="right"
 * />
 * ```
 */
export function ActionButtons({
  actions,
  align = 'left',
  gap = 'md',
  className
}: ActionButtonsProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <div className={cn("flex items-center", alignClass, getGapClass(gap), className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const baseVariant = action.variant === 'default' ? 'outline' : action.variant;

        return (
          <Button
            key={action.id}
            variant={baseVariant === 'outline' || baseVariant === 'danger' ? 'outline' : 'default'}
            className={cn(
              baseVariant === 'default' && "bg-primary hover:bg-primary/90 text-white",
              baseVariant !== 'default' && getButtonVariant(baseVariant)
            )}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
          >
            {action.loading ? (
              <span className="w-4 h-4 mr-2 animate-spin" />
            ) : Icon ? (
              <Icon className="w-4 h-4 mr-2" />
            ) : null}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * 快捷操作按钮组件
 */
export interface QuickActionsProps {
  /** 主要操作 */
  primary?: ActionButton;
  /** 次要操作列表 */
  secondary?: ActionButton[];
  /** 自定义类名 */
  className?: string;
}

/**
 * 快捷操作按钮组件
 *
 * @example
 * ```tsx
 * <QuickActions
 *   primary={{
 *     id: 'refresh',
 *     label: '刷新',
 *     icon: RefreshCw,
 *     onClick: handleRefresh
 *   }}
 *   secondary={[
 *     { id: 'export', label: '导出', onClick: handleExport }
 *   ]}
 * />
 * ```
 */
export function QuickActions({
  primary,
  secondary = [],
  className
}: QuickActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {secondary.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {action.label}
          </Button>
        );
      })}
      {primary && (
        <Button
          onClick={primary.onClick}
          disabled={primary.disabled || primary.loading}
          className="bg-primary hover:bg-primary/90"
        >
          {primary.loading ? (
            <span className="w-4 h-4 mr-2 animate-spin" />
          ) : primary.icon ? (
            <primary.icon className="w-4 h-4 mr-2" />
          ) : null}
          {primary.label}
        </Button>
      )}
    </div>
  );
}

export default ActionButtons;
