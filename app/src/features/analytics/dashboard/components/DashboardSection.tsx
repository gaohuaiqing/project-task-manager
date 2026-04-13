/**
 * 仪表板区块容器组件
 *
 * @module analytics/dashboard/components/DashboardSection
 * @description 统一的仪表板区块容器，处理标题、间距、卡片样式
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DashboardSectionProps {
  /** 区块标题 */
  title?: string;
  /** 标题图标 */
  icon?: React.ReactNode;
  /** 标题右侧操作区 */
  action?: React.ReactNode;
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否使用卡片容器 */
  asCard?: boolean;
  /** 测试ID */
  'data-testid'?: string;
}

/**
 * 仪表板区块容器
 *
 * 设计规范:
 * - 统一的区块间距 (space-y-6)
 * - 可选的卡片容器
 * - 支持标题和操作区
 */
export function DashboardSection({
  title,
  icon,
  action,
  children,
  className,
  asCard = false,
  'data-testid': testId,
}: DashboardSectionProps) {
  const content = (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );

  if (asCard) {
    return (
      <Card className="rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
                {title}
              </div>
              {action}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  return content;
}

export default DashboardSection;
