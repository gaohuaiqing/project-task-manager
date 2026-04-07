/**
 * 紧急任务提醒卡片组件
 * 符合需求文档：红色边框 + 浅红背景，显示紧急任务数量和快速跳转
 *
 * 设计规范:
 * - 轻量边框，融入整体设计
 * - 紧凑间距
 */
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UrgentTaskAlertProps {
  /** 延期任务数量 */
  overdueCount: number;
  /** 延期预警数量 */
  warningCount?: number;
  /** 点击跳转回调 */
  onJump?: (type: 'overdue' | 'warning') => void;
  /** 自定义类名 */
  className?: string;
}

export function UrgentTaskAlert({
  overdueCount,
  warningCount = 0,
  onJump,
  className,
}: UrgentTaskAlertProps) {
  // 如果没有紧急任务，不显示
  if (overdueCount === 0 && warningCount === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        // 圆角和边框
        'rounded-2xl border border-red-200/50 dark:border-red-900/30',
        // 红色背景，更柔和
        'bg-red-50/50 dark:bg-red-950/20',
        // 左侧强调线
        'border-l-2 border-l-red-500',
        // 轻微阴影
        'shadow-sm',
        className
      )}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="font-medium text-sm text-red-700 dark:text-red-400">紧急任务提醒</span>

            <div className="flex items-center gap-3 text-xs">
              {overdueCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-red-600 dark:text-red-400 font-semibold font-mono tabular-nums">{overdueCount}</span>
                  <span className="text-gray-500 dark:text-gray-400">已延期</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono tabular-nums">{warningCount}</span>
                  <span className="text-gray-500 dark:text-gray-400">即将到期</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => onJump?.('overdue')}
              >
                查看延期
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
            {warningCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
                onClick={() => onJump?.('warning')}
              >
                查看预警
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
