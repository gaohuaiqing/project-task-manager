/**
 * 紧急任务提醒卡片组件
 * 符合需求文档：红色边框 + 浅红背景，显示紧急任务数量和快速跳转
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
        'border-l-4 border-l-destructive bg-destructive/5',
        className
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">紧急任务提醒</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              {overdueCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-destructive font-medium">{overdueCount}</span>
                  <span className="text-muted-foreground">个任务已延期</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-600 font-medium">{warningCount}</span>
                  <span className="text-muted-foreground">个任务即将到期</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onJump?.('overdue')}
              >
                查看延期任务
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            {warningCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onJump?.('warning')}
              >
                查看预警任务
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
