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
    return 'bg-muted text-muted-foreground';
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          我的任务
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          查看全部
          <ExternalLink className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">暂无任务</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.description}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{task.projectName}</span>
                    {task.endDate && (
                      <span className="text-xs">截止: {formatDate(task.endDate)}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={getPriorityStyle(task.priority)}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                  <Badge variant="outline">
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
