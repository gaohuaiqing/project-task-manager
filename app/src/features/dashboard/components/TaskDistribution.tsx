/**
 * 任务分布组件 - 专业仪表盘风格
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskDistribution } from '../types';

interface TaskDistributionProps {
  distribution: TaskDistribution | undefined;
  className?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-gray-400" />,
  in_progress: <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  delayed: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  urgent: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

export function TaskDistribution({ distribution, className }: TaskDistributionProps) {
  if (!distribution) {
    return (
      <Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <ListTodo className="h-4 w-4 text-gray-400" />
            任务分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <ListTodo className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-xs">暂无任务数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const byStatus = distribution.byStatus || {};
  const byPriority = distribution.byPriority || {};
  const byAssignee = distribution.byAssignee || [];
  const totalByStatus = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const totalByPriority = Object.values(byPriority).reduce((a, b) => a + b, 0);

  return (
    <Card className={cn('rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <ListTodo className="h-4 w-4 text-gray-400" />
          任务分布
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 按状态分布 */}
        <div>
          <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">按状态</h4>
          <div className="space-y-1.5">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                {statusIcons[status] || <Clock className="h-3.5 w-3.5" />}
                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300">{statusLabels[status] || status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(count / totalByStatus) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium font-mono tabular-nums w-5 text-right text-gray-600 dark:text-gray-400">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按优先级分布 */}
        <div>
          <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">按优先级</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(byPriority).map(([priority, count]) => (
              <div
                key={priority}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-medium',
                  priorityColors[priority] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                )}
              >
                {priorityLabels[priority] || priority}: {count}
              </div>
            ))}
          </div>
        </div>

        {/* 按成员分布 */}
        {byAssignee.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">按成员</h4>
            <div className="space-y-1">
              {byAssignee.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                  <span className="font-medium font-mono tabular-nums text-gray-500 dark:text-gray-400">{item.count} 个任务</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
