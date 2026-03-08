import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AlertTriangle, Clock, CheckCircle2, FileText, User, Calendar, Code, Tag, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskTypes, priorities } from '@/data/mockData';
import type { Task } from '@/types';

interface TaskStatsProps {
  tasks: Task[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const [mounted, setMounted] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedProgressType, setSelectedProgressType] = useState<string | null>(null);
  const [isTaskListDialogOpen, setIsTaskListDialogOpen] = useState(false);
  const [selectedTaskListType, setSelectedTaskListType] = useState<'nearDeadline' | 'delayed' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 计算延期任务
  const delayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nearDeadline = tasks.filter(task => {
      if (task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 3;
    });
    
    const delayed = tasks.filter(task => {
      if (task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < 0;
    });

    return {
      nearDeadline,
      delayed
    };
  }, [tasks]);

  // 计算项目进度
  const projectProgress = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    
    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [tasks]);

  // 按任务类型统计
  const typeStats = useMemo(() => {
    return taskTypes.map(type => ({
      name: type.label,
      value: tasks.filter(t => t.type === type.value).length,
      color: type.color
    }));
  }, [tasks]);

  // 按优先级统计
  const priorityStats = useMemo(() => {
    return priorities.map(p => ({
      name: p.label,
      value: tasks.filter(t => t.priority === p.value).length,
      color: p.color
    }));
  }, [tasks]);

  // 按状态统计
  const statusStats = useMemo(() => [
    { name: '待处理', value: tasks.filter(t => t.status === 'pending').length, color: '#facc15' },
    { name: '进行中', value: tasks.filter(t => t.status === 'in_progress').length, color: '#60a5fa' },
    { name: '已完成', value: tasks.filter(t => t.status === 'completed').length, color: '#4ade80' }
  ], [tasks]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-muted-foreground text-xs mt-1">
            任务数: <span className="text-white font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const handleProgressClick = (type: string) => {
    setSelectedProgressType(type);
    setIsProgressDialogOpen(true);
  };

  const handleTaskListClick = (type: 'nearDeadline' | 'delayed') => {
    setSelectedTaskListType(type);
    setIsTaskListDialogOpen(true);
  };

  const getTaskTypeLabel = (type: string) => {
    const taskType = taskTypes.find(t => t.value === type);
    return taskType?.label || type;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return priorityConfig?.label || priority;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* 延期任务提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 即将延期任务 */}
        <Card className="bg-card border-border shadow-sm relative hover-lift cursor-pointer transition-all duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgb(245, 158, 11)' }}></div>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">即将延期任务</p>
                <div className="flex items-baseline gap-1">
                  <span 
                    className="text-3xl font-bold text-white"
                    onClick={() => handleTaskListClick('nearDeadline')}
                  >
                    {delayStats.nearDeadline.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">点击数字查看详细信息</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.125)' }}>
                <div style={{ color: 'rgb(245, 158, 11)' }}>
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 已延期任务 */}
        <Card className="bg-card border-border shadow-sm relative hover-lift cursor-pointer transition-all duration-500 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">已延期任务</p>
                <div className="flex items-baseline gap-1">
                  <span 
                    className="text-3xl font-bold text-white"
                    onClick={() => handleTaskListClick('delayed')}
                  >
                    {delayStats.delayed.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">点击数字查看详细信息</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.125)' }}>
                <div style={{ color: 'rgb(239, 68, 68)' }}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 项目进度 */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">项目进度概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div 
              className="p-4 bg-primary/10 rounded-lg border border-primary/30 cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => handleProgressClick('total')}
            >
              <p className="text-xs text-muted-foreground mb-1">总任务数</p>
              <p className="text-2xl font-bold text-white">{projectProgress.total}</p>
            </div>
            <div 
              className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
              onClick={() => handleProgressClick('inProgress')}
            >
              <p className="text-xs text-muted-foreground mb-1">进行中</p>
              <p className="text-2xl font-bold text-white">{projectProgress.inProgress}</p>
            </div>
            <div 
              className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 cursor-pointer hover:bg-green-500/20 transition-colors"
              onClick={() => handleProgressClick('completed')}
            >
              <p className="text-xs text-muted-foreground mb-1">已完成</p>
              <p className="text-2xl font-bold text-white">{projectProgress.completed}</p>
            </div>
            <div 
              className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-colors"
              onClick={() => handleProgressClick('completionRate')}
            >
              <p className="text-xs text-muted-foreground mb-1">完成率</p>
              <p className="text-2xl font-bold text-white">{projectProgress.completionRate}%</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">整体完成进度</span>
              <span className="text-sm text-white">{projectProgress.completionRate}%</span>
            </div>
            <Progress value={projectProgress.completionRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 任务分布统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 任务类型分布 */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">任务类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#3a4047" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#888" 
                  fontSize={11}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {typeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 优先级分布 */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={priorityStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a4047" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 任务状态分布 */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">任务状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {statusStats.map((stat, index) => (
                <div key={stat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{stat.name}</span>
                    <span className="text-sm font-semibold text-white">{stat.value}</span>
                  </div>
                  <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        backgroundColor: stat.color,
                        width: `${(stat.value / tasks.length) * 100}%`,
                        transitionDelay: `${index * 100}ms`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 任务详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              任务详情
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h3>
                  {selectedTask.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedTask.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">任务类型</p>
                        <p className="text-sm font-medium text-white">
                          {getTaskTypeLabel(selectedTask.type)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Flag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">优先级</p>
                        <p className="text-sm font-medium text-white">
                          {getPriorityLabel(selectedTask.priority)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">截止日期</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.deadline}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Code className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">预计工时</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.estimatedHours} 小时
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">负责人</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.assignee ? `ID: ${selectedTask.assignee}` : '未分配'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">创建日期</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.createdAt}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Flag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">状态</p>
                        <p className="text-sm font-medium text-white">
                          {getStatusLabel(selectedTask.status)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedTask.requiredSkills && selectedTask.requiredSkills.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Code className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">所需技能</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedTask.requiredSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-muted-foreground border-border">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 项目进度详情对话框 */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedProgressType === 'total' && '总任务数详情'}
              {selectedProgressType === 'inProgress' && '进行中任务详情'}
              {selectedProgressType === 'completed' && '已完成任务详情'}
              {selectedProgressType === 'completionRate' && '完成率详情'}
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedProgressType && (
            <div className="space-y-6 pt-4">
              {selectedProgressType === 'total' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{projectProgress.total}</p>
                    <p className="text-sm text-muted-foreground">总任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">任务状态分布</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">待处理</span>
                        <span className="text-sm font-semibold text-white">{tasks.filter(t => t.status === 'pending').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">进行中</span>
                        <span className="text-sm font-semibold text-white">{projectProgress.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">已完成</span>
                        <span className="text-sm font-semibold text-white">{projectProgress.completed}</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-white mt-4">任务类型分布</h3>
                    <div className="space-y-2">
                      {taskTypes.map(type => (
                        <div key={type.value} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{type.label}</span>
                          <span className="text-sm font-semibold text-white">{tasks.filter(t => t.type === type.value).length}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedProgressType === 'inProgress' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{projectProgress.inProgress}</p>
                    <p className="text-sm text-muted-foreground">进行中任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">进行中任务</h3>
                    <div className="space-y-2">
                      {tasks.filter(t => t.status === 'in_progress').map((task, index) => (
                        <div key={task.id} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <p className="text-sm font-medium text-white truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            截止日期: {task.deadline} | 优先级: {getPriorityLabel(task.priority)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedProgressType === 'completed' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{projectProgress.completed}</p>
                    <p className="text-sm text-muted-foreground">已完成任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">已完成任务</h3>
                    <div className="space-y-2">
                      {tasks.filter(t => t.status === 'completed').map((task, index) => (
                        <div key={task.id} className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                          <p className="text-sm font-medium text-white truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            截止日期: {task.deadline} | 优先级: {getPriorityLabel(task.priority)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedProgressType === 'completionRate' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{projectProgress.completionRate}%</p>
                    <p className="text-sm text-muted-foreground">任务完成率</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">完成率详情</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">总任务数</span>
                        <span className="text-sm font-semibold text-white">{projectProgress.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">已完成任务</span>
                        <span className="text-sm font-semibold text-white">{projectProgress.completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">进行中任务</span>
                        <span className="text-sm font-semibold text-white">{projectProgress.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">待处理任务</span>
                        <span className="text-sm font-semibold text-white">{tasks.filter(t => t.status === 'pending').length}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-white mb-2">完成率趋势</h3>
                      <div className="p-4 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground text-center">
                          基于当前任务状态计算
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 任务列表详情对话框 */}
      <Dialog open={isTaskListDialogOpen} onOpenChange={setIsTaskListDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedTaskListType === 'nearDeadline' && (
                <>
                  <Clock className="w-5 h-5 text-yellow-400" />
                  即将延期任务详情
                </>
              )}
              {selectedTaskListType === 'delayed' && (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  已延期任务详情
                </>
              )}
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedTaskListType && (
            <div className="space-y-6 pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {selectedTaskListType === 'nearDeadline' ? delayStats.nearDeadline.length : delayStats.delayed.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTaskListType === 'nearDeadline' ? '即将延期任务数' : '已延期任务数'}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">
                  {selectedTaskListType === 'nearDeadline' ? '即将延期任务' : '已延期任务'}
                </h3>
                <div className="space-y-2">
                  {(selectedTaskListType === 'nearDeadline' ? delayStats.nearDeadline : delayStats.delayed).map((task, index) => {
                    const deadline = new Date(task.deadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const daysText = selectedTaskListType === 'nearDeadline' ? `剩${daysDiff}天` : `已延期${Math.abs(daysDiff)}天`;
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`p-3 rounded-lg border cursor-pointer hover:opacity-90 transition-colors ${
                          selectedTaskListType === 'nearDeadline' 
                            ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                            : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        }`}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskListDialogOpen(false);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        <p className="text-sm font-medium text-white truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          截止日期: {task.deadline} | {daysText} | 优先级: {getPriorityLabel(task.priority)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            负责人: {task.assignee ? `ID: ${task.assignee}` : '未分配'}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
