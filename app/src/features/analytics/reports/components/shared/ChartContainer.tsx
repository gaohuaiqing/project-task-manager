/**
 * 图表容器组件
 * 统一图表样式和布局
 */

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { HelpCircle } from 'lucide-react';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  height?: number;
  action?: ReactNode;
  /** 图表含义说明：传值后标题旁显示 ❓ 图标，点击查看 */
  help?: ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className,
  height = 300,
  action,
  help,
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
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1">
            {title}
            {help && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary align-middle">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-xs leading-relaxed" side="top">
                  {help}
                </PopoverContent>
              </Popover>
            )}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* 图表区域 */}
      <div style={{ minHeight: height }}>
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
