/**
 * 图表容器组件
 * 统一图表样式和布局
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  height?: number;
  action?: ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  height = 300,
  action,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card p-4',
        className
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* 图表区域 */}
      <div style={{ height }}>
        {children}
      </div>
    </div>
  );
}

/** 图表组 - 并排显示 */
export interface ChartGroupProps {
  children: ReactNode;
  className?: string;
}

export function ChartGroup({ children, className }: ChartGroupProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {children}
    </div>
  );
}
