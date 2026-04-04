/**
 * 任务分布组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskDistribution } from '../types';

interface TaskDistributionProps {
  distribution: TaskDistribution | undefined;
  className?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-gray-500" />,
  in_progress: <ListTodo className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  delayed: <AlertCircle className="h-4 w-4 text-red-500" />,
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
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export function TaskDistribution({ distribution, className }: TaskDistributionProps) {
  if (!distribution) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            任务分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无任务数据</p>
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          任务分布
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 按状态分布 */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">按状态</h4>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                {statusIcons[status] || <Clock className="h-4 w-4" />}
                <span className="flex-1 text-sm">{statusLabels[status] || status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(count / totalByStatus) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 按优先级分布 */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">按优先级</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byPriority).map(([priority, count]) => (
              <div
                key={priority}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  priorityColors[priority] || 'bg-gray-100 text-gray-700'
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
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">按成员</h4>
            <div className="space-y-2">
              {byAssignee.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <span className="font-medium">{item.count} 个任务</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
