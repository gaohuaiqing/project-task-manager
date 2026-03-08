import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Flag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  FileText,
  Code,
  User,
  Tag,
  Bell,
  BellRing,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import type { WbsTask } from '@/types/wbs';
import type { Project, Member } from '@/types';

interface EngineerDashboardProps {
  member: Member;
  projects: Project[];
  allTasks: WbsTask[];
  onNavigateToTask?: (taskId: string) => void;
}

export function EngineerDashboard({ member, projects, allTasks, onNavigateToTask }: EngineerDashboardProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [selectedStatsType, setSelectedStatsType] = useState<'total' | 'inProgress' | 'nearDeadline' | 'projects' | null>(null);

  const handleTaskClick = (task: WbsTask) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const handleNavigateToTask = (task: WbsTask) => {
    if (onNavigateToTask) {
      onNavigateToTask(task.id);
    } else {
      handleTaskClick(task);
    }
  };

  const handleStatsClick = (type: 'total' | 'inProgress' | 'nearDeadline' | 'projects') => {
    setSelectedStatsType(type);
    setIsStatsDialogOpen(true);
  };

  const memberTasks = useMemo(() => {
    return allTasks.filter(task => task.memberId === member.id);
  }, [allTasks, member.id]);

  // 获取待办任务（未开始和进行中的任务）
  const pendingTasks = useMemo(() => {
    return memberTasks.filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const today = new Date();
        // 安全解析日期，如果日期无效则返回最大值，排在最后
        const dateA = a.plannedEndDate ? parseISO(a.plannedEndDate) : null;
        const dateB = b.plannedEndDate ? parseISO(b.plannedEndDate) : null;
        const daysRemainingA = dateA && !isNaN(dateA.getTime()) ? differenceInDays(dateA, today) : Number.MAX_SAFE_INTEGER;
        const daysRemainingB = dateB && !isNaN(dateB.getTime()) ? differenceInDays(dateB, today) : Number.MAX_SAFE_INTEGER;
        return daysRemainingA - daysRemainingB;
      });
  }, [memberTasks]);

  // 获取紧急任务（即将到期或已延期）
  const urgentTasks = useMemo(() => {
    const today = new Date();
    return memberTasks.filter(task => {
      if (task.status === 'completed') return false;
      const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
      if (!endDate || isNaN(endDate.getTime())) return false;
      const daysRemaining = differenceInDays(endDate, today);
      return daysRemaining <= 3;
    });
  }, [memberTasks]);

  const memberProjects = useMemo(() => {
    const projectIds = [...new Set(memberTasks.map(t => t.projectId))];
    return projects.filter(p => projectIds.includes(p.id));
  }, [memberTasks, projects]);

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const getProjectTimeline = (project: Project) => {
    // 安全解析日期，如果日期无效则返回默认值
    const startDate = project.startDate ? parseISO(project.startDate) : null;
    const endDate = project.deadline ? parseISO(project.deadline) : null;

    // 如果日期无效，返回默认值
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { totalDays: 1, phases: [] };
    }

    const totalDays = differenceInDays(endDate, startDate) + 1;

    const phases = [
      {
        name: '项目启动与规划',
        progress: project.progress < 30 ? project.progress : 30,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(addDays(startDate, Math.floor(totalDays * 0.2)), 'yyyy-MM-dd'),
      },
      {
        name: '核心开发',
        progress: project.progress >= 30 && project.progress < 70 ? project.progress - 30 : project.progress >= 70 ? 40 : 0,
        startDate: format(addDays(startDate, Math.floor(totalDays * 0.2)), 'yyyy-MM-dd'),
        endDate: format(addDays(startDate, Math.floor(totalDays * 0.7)), 'yyyy-MM-dd'),
      },
      {
        name: '测试与交付',
        progress: project.progress >= 70 ? project.progress - 70 : 0,
        startDate: format(addDays(startDate, Math.floor(totalDays * 0.7)), 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }
    ];

    return { totalDays, phases };
  };

  const getTaskStatus = (task: WbsTask) => {
    const today = new Date();
    const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;

    // 如果日期无效，返回默认状态
    if (!endDate || isNaN(endDate.getTime())) {
      return { label: '进行中', color: 'bg-blue-500/20 text-blue-400', icon: <TrendingUp className="w-4 h-4" /> };
    }

    const daysRemaining = differenceInDays(endDate, today);

    if (task.status === 'completed') {
      return { label: '已完成', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="w-4 h-4" /> };
    } else if (daysRemaining < 0) {
      return { label: '已延期', color: 'bg-red-500/20 text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
    } else if (daysRemaining <= 3) {
      return { label: '即将到期', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-4 h-4" /> };
    } else {
      return { label: '进行中', color: 'bg-blue-500/20 text-blue-400', icon: <TrendingUp className="w-4 h-4" /> };
    }
  };

  const getPriorityColor = (priority: WbsTask['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-blue-500/20 text-blue-400';
    }
  };

  const renderProjectTimeline = (project: Project) => {
    const { totalDays, phases } = getProjectTimeline(project);

    return (
      <div className="space-y-3">
        {/* 项目周期信息 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b border-border">
          <Calendar className="w-4 h-4" />
          <span>{project.startDate} ~ {project.deadline}</span>
          <span className="ml-auto">共 {totalDays} 天</span>
        </div>

        {/* 时间计划列表 - 只读展示 */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">时间计划</div>
          {phases.map((phase, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50 hover:bg-background/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  phase.progress === 100 ? "bg-green-500" : "bg-blue-500"
                )} />
                <span className="text-sm text-foreground">{phase.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{phase.startDate} ~ {phase.endDate}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded",
                  phase.progress === 100
                    ? "bg-green-500/20 text-green-400"
                    : "bg-blue-500/20 text-blue-400"
                )}>
                  {phase.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 里程碑列表 */}
        {(project.timeline?.filter(t => t.type === 'milestone').length ?? 0) > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground font-medium">里程碑</div>
            <div className="space-y-1">
              {project.timeline?.filter(t => t.type === 'milestone').map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-background/30 rounded border-l-2 border-yellow-500/50"
                >
                  <span className="text-xs text-muted-foreground w-20">{milestone.date}</span>
                  <span className="text-sm text-foreground flex-1">{milestone.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProjectTasks = (tasks: WbsTask[]) => {
    const sortedTasks = [...tasks].sort((a, b) => 
      parseISO(a.plannedStartDate || '').getTime() - parseISO(b.plannedStartDate || '').getTime()
    );

    return (
      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const status = getTaskStatus(task);
          const priorityColor = getPriorityColor(task.priority);

          return (
            <Card 
              key={task.id} 
              className="bg-card/50 border-border cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => handleTaskClick(task)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {task.wbsCode}
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs border", priorityColor)}>
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium text-white mt-1">{task.title}</h4>
                  </div>
                  <Badge variant="outline" className={cn("gap-1.5 border flex-shrink-0", status.color)}>
                    {status.icon}
                    {status.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 bg-background/50 rounded">
                    <p className="text-xs text-muted-foreground mb-1">计划开始</p>
                    <p className="text-sm font-medium text-white">{task.plannedStartDate}</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded">
                    <p className="text-xs text-muted-foreground mb-1">计划结束</p>
                    <p className="text-sm font-medium text-white">{task.plannedEndDate}</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded">
                    <p className="text-xs text-muted-foreground mb-1">工期</p>
                    <p className="text-sm font-medium text-white">{task.plannedDays}天</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">任务进度</span>
                    <span className="text-sm font-medium text-white">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1.5" />
                </div>

                {task.isOnCriticalPath && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/30">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400">关键路径任务</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 待办任务提醒 - 突出显示 */}
      {urgentTasks.length > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 animate-pulse-slow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-red-400 animate-bounce" />
                <h3 className="text-lg font-semibold text-red-400">紧急待办任务</h3>
                <Badge className="bg-red-500 text-white">{urgentTasks.length}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              {urgentTasks.slice(0, 3).map((task) => {
                const today = new Date();
                const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
                const daysRemaining = endDate && !isNaN(endDate.getTime()) ? differenceInDays(endDate, today) : 0;
                const isOverdue = endDate && !isNaN(endDate.getTime()) && differenceInDays(endDate, today) < 0;
                
                return (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]",
                      isOverdue ? "bg-red-500/20 border border-red-500/50" : "bg-yellow-500/20 border border-yellow-500/50"
                    )}
                    onClick={() => handleNavigateToTask(task)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isOverdue ? "bg-red-500" : "bg-yellow-500"
                      )} />
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.wbsCode} · {task.plannedEndDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        isOverdue ? "bg-red-500/30 text-red-300" : "bg-yellow-500/30 text-yellow-300"
                      )}>
                        {isOverdue ? `已延期${Math.abs(daysRemaining)}天` : `剩余${daysRemaining}天`}
                      </Badge>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {urgentTasks.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  还有 {urgentTasks.length - 3} 个紧急任务...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 待办任务列表 */}
      {pendingTasks.length > 0 && urgentTasks.length === 0 && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-blue-400">待办任务</h3>
                <Badge className="bg-blue-500 text-white">{pendingTasks.length}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              {pendingTasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-all"
                  onClick={() => handleNavigateToTask(task)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.wbsCode} · {task.plannedStartDate} ~ {task.plannedEndDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/30 text-blue-300">
                      {task.status === 'in_progress' ? '进行中' : '未开始'}
                    </Badge>
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingTasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  还有 {pendingTasks.length - 5} 个待办任务...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="bg-card/50 border-border cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => handleStatsClick('total')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">我的任务</p>
                <p className="text-2xl font-bold text-white mt-1">{memberTasks.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => handleStatsClick('inProgress')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">进行中</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {memberTasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => handleStatsClick('nearDeadline')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">即将到期</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {memberTasks.filter(t => {
                    const endDate = t.plannedEndDate ? parseISO(t.plannedEndDate) : null;
                    if (!endDate || isNaN(endDate.getTime())) return false;
                    const daysRemaining = differenceInDays(endDate, new Date());
                    return daysRemaining <= 3 && daysRemaining >= 0 && t.status !== 'completed';
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border cursor-pointer hover:bg-card/80 transition-colors"
          onClick={() => handleStatsClick('projects')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">参与项目</p>
                <p className="text-2xl font-bold text-white mt-1">{memberProjects.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">我的项目</h2>
        </div>

        <div className="space-y-3">
          {memberProjects.map((project) => {
            const projectTasks = memberTasks.filter(t => t.projectId === project.id);
            const isExpanded = expandedProjects.has(project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'completed').length;

            return (
              <Card key={project.id} className="bg-card/50 border-border">
                <CardHeader 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleProjectExpand(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base text-foreground">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{project.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">任务进度</p>
                        <p className="text-sm font-medium text-white">
                          {completedTasks}/{projectTasks.length}
                        </p>
                      </div>
                      <Progress value={projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0} className="w-20 h-2" />
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          项目计划
                        </h3>
                        {renderProjectTimeline(project)}
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <List className="w-4 h-4 text-muted-foreground" />
                          我的任务
                        </h3>
                        {renderProjectTasks(projectTasks)}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* 任务详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
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
                      <Code className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">WBS编码</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.wbsCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Flag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">优先级</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'medium' ? '中' : '低'}优先级
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">计划开始</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedStartDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">计划结束</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedEndDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">工期</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedDays} 天
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
                          {member.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">任务状态</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.status === 'completed' ? '已完成' :
                           selectedTask.status === 'in_progress' ? '进行中' :
                           selectedTask.status === 'not_started' ? '待处理' : selectedTask.status}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">任务进度</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.progress}%
                        </p>
                      </div>
                    </div>
                    
                    {selectedTask.isOnCriticalPath && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">关键路径</p>
                          <p className="text-sm font-medium text-red-400">
                            是关键路径任务
                          </p>
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

      {/* 统计详情对话框 */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedStatsType === 'total' && '我的任务详情'}
              {selectedStatsType === 'inProgress' && '进行中任务详情'}
              {selectedStatsType === 'nearDeadline' && '即将到期任务详情'}
              {selectedStatsType === 'projects' && '参与项目详情'}
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedStatsType && (
            <div className="space-y-6 pt-4">
              {selectedStatsType === 'total' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{memberTasks.length}</p>
                    <p className="text-sm text-muted-foreground">我的任务总数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">任务状态分布</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">已完成</span>
                        <span className="text-sm font-semibold text-white">{memberTasks.filter(t => t.status === 'completed').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">进行中</span>
                        <span className="text-sm font-semibold text-white">{memberTasks.filter(t => t.status === 'in_progress').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">待处理</span>
                        <span className="text-sm font-semibold text-white">{memberTasks.filter(t => t.status === 'not_started').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedStatsType === 'inProgress' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{memberTasks.filter(t => t.status === 'in_progress').length}</p>
                    <p className="text-sm text-muted-foreground">进行中任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">进行中任务</h3>
                    <div className="space-y-2">
                      {memberTasks.filter(t => t.status === 'in_progress').map((task) => (
                        <div key={task.id} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={() => {
                          setSelectedTask(task);
                          setIsStatsDialogOpen(false);
                          setIsDetailDialogOpen(true);
                        }}>
                          <p className="text-sm font-medium text-white truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            WBS编码: {task.wbsCode} | 进度: {task.progress}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedStatsType === 'nearDeadline' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{memberTasks.filter(t => {
                      const endDate = t.plannedEndDate ? parseISO(t.plannedEndDate) : null;
                      if (!endDate || isNaN(endDate.getTime())) return false;
                      const daysRemaining = differenceInDays(endDate, new Date());
                      return daysRemaining <= 3 && daysRemaining >= 0 && t.status !== 'completed';
                    }).length}</p>
                    <p className="text-sm text-muted-foreground">即将到期任务数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">即将到期任务</h3>
                    <div className="space-y-2">
                      {memberTasks.filter(t => {
                        const endDate = t.plannedEndDate ? parseISO(t.plannedEndDate) : null;
                        if (!endDate || isNaN(endDate.getTime())) return false;
                        const daysRemaining = differenceInDays(endDate, new Date());
                        return daysRemaining <= 3 && daysRemaining >= 0 && t.status !== 'completed';
                      }).map((task) => {
                        const daysRemaining = differenceInDays(parseISO(task.plannedEndDate || ''), new Date());
                        return (
                          <div key={task.id} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors" onClick={() => {
                            setSelectedTask(task);
                            setIsStatsDialogOpen(false);
                            setIsDetailDialogOpen(true);
                          }}>
                            <p className="text-sm font-medium text-white truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              到期时间: {task.plannedEndDate || '未设置'} | 剩余天数: {daysRemaining}天
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {selectedStatsType === 'projects' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{memberProjects.length}</p>
                    <p className="text-sm text-muted-foreground">参与项目数</p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">参与项目</h3>
                    <div className="space-y-2">
                      {memberProjects.map((project) => {
                        const projectTaskCount = memberTasks.filter(t => t.projectId === project.id).length;
                        const completedTasks = memberTasks.filter(t => t.projectId === project.id && t.status === 'completed').length;
                        return (
                          <div key={project.id} className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <p className="text-sm font-medium text-white">{project.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              任务数: {completedTasks}/{projectTaskCount} | 进度: {(completedTasks / projectTaskCount) * 100}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 使用 React.memo 优化组件渲染，只在 props 变化时重新渲染
export default React.memo(EngineerDashboard, (prevProps, nextProps) => {
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.projects === nextProps.projects &&
    prevProps.allTasks === nextProps.allTasks &&
    prevProps.onNavigateToTask === nextProps.onNavigateToTask
  );
});
