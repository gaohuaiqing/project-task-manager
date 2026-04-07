/**
 * 任务列表面板组件
 * 显示当前用户的近期任务
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListTodo, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/shared/constants';
import { cn } from '@/lib/utils';

interface TaskItem {
  id: string;
  description: string;
  projectName: string;
  status: string;
  priority: string;
  endDate: string;
  progress: number;
}

interface TaskListResponse {
  success: boolean;
  data: {
    items: TaskItem[];
    total: number;
  };
}

export function TaskListPanel() {
  const navigate = useNavigate();

  const { data: response, isLoading } = useQuery({
    queryKey: ['dashboard', 'my-tasks'],
    queryFn: async () => {
      const result = await apiClient.get<TaskListResponse>('/tasks', {
        params: { limit: 5, sort: 'end_date', order: 'asc' }
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const tasks = response?.data?.items ?? [];

  const getPriorityStyle = (priority: string) => {
    const config = TASK_PRIORITY_CONFIG[priority as keyof typeof TASK_PRIORITY_CONFIG];
    if (config) {
      return `${config.bgColor} ${config.textColor}`;
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  };

  const getPriorityLabel = (priority: string) => {
    const config = TASK_PRIORITY_CONFIG[priority as keyof typeof TASK_PRIORITY_CONFIG];
    return config?.label ?? priority;
  };

  const getStatusLabel = (status: string) => {
    const config = TASK_STATUS_CONFIG[status as keyof typeof TASK_STATUS_CONFIG];
    return config?.label ?? status;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="rounded-2xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          <ListTodo className="h-4 w-4 text-gray-400" />
          我的任务
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={() => navigate('/tasks')}>
          查看全部
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-gray-400 text-xs">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">暂无任务</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700/30 bg-gray-50/50 dark:bg-slate-900/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{task.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{task.projectName}</span>
                    {task.endDate && (
                      <span className="text-gray-400 dark:text-gray-500">截止: {formatDate(task.endDate)}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={cn(getPriorityStyle(task.priority), 'text-[10px] px-1.5 py-0 rounded-md')}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400">
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
