/**
 * 页面头部组件
 *
 * 功能：
 * 1. 标准化页面标题和描述
 * 2. 支持操作按钮
 * 3. 支持状态指示器
 *
 * @module components/common/PageHeader
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 图标 */
  icon?: LucideIcon;
  /** 额外操作按钮 */
  actions?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 页面头部组件
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="事件日志"
 *   description="系统运行日志和用户操作日志"
 *   icon={FileText}
 *   actions={<Button>导出</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 text-blue-400" />}
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        {description && (
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
