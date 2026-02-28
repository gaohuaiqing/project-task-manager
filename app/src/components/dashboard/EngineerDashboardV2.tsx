/**
 * 工程师仪表盘组件 V2
 *
 * 使用统一的项目类型定义和类型适配层
 *
 * @module components/dashboard/EngineerDashboardV2
 */

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import type { WbsTask } from '@/types/wbs';
import type { Member } from '@/types/member';
import type { Project as NewProject } from '@/types/project';
import { LegacyProject } from '@/types';
import {
  isNewProject,
  isLegacyProject,
  toLegacyProject,
  isProjectIdEqual,
  type AnyProject
} from '@/utils/projectAdapters';

interface EngineerDashboardV2Props {
  /** 当前成员 */
  member: Member;
  /** 项目列表（支持新旧类型） */
  projects: AnyProject[];
  /** 所有任务 */
  allTasks: WbsTask[];
  /** 导航到任务回调 */
  onNavigateToTask?: (taskId: string) => void;
}

/**
 * 统一的项目类型（用于组件内部）
 * 将新旧类型都转换为兼容格式
 */
interface CompatibleProject {
  id: string; // 统一使用 string 类型
  code: string;
  name: string;
  description?: string;
  progress: number;
  status: string;
  startDate: string; // 规范化的开始日期
  deadline: string; // 规范化的结束日期
  plannedStartDate?: string;
  plannedEndDate?: string;
  timeline: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'milestone' | 'task' | 'note';
  }>;
  taskCount: number;
  completedTaskCount: number;
}

/**
 * 将新旧项目类型转换为兼容格式
 */
function toCompatibleProject(project: AnyProject): CompatibleProject {
  // 新版项目
  if (isNewProject(project)) {
    return {
      id: String(project.id),
      code: project.code,
      name: project.name,
      description: project.description,
      progress: project.progress,
      status: project.status,
      startDate: project.plannedStartDate || project.actualStartDate || '',
      deadline: project.plannedEndDate || project.actualEndDate || '',
      plannedStartDate: project.plannedStartDate,
      plannedEndDate: project.plannedEndDate,
      timeline: [], // 新类型没有 timeline，可以从 milestones 转换
      taskCount: project.taskCount,
      completedTaskCount: project.completedTaskCount,
    };
  }

  // 旧版项目（已经是兼容格式）
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    description: project.description,
    progress: project.progress,
    status: project.status,
    startDate: project.startDate,
    deadline: project.deadline,
    plannedStartDate: project.projectPlan?.plannedStartDate || project.startDate,
    plannedEndDate: project.projectPlan?.plannedEndDate || project.deadline,
    timeline: project.timeline || [],
    taskCount: project.taskCount || 0,
    completedTaskCount: project.completedTaskCount || 0,
  };
}

/**
 * 工程师仪表盘 V2 组件
 */
export function EngineerDashboardV2({
  member,
  projects,
  allTasks,
  onNavigateToTask
}: EngineerDashboardV2Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // 将项目列表转换为兼容格式
  const compatibleProjects = useMemo(() => {
    return projects.map(toCompatibleProject);
  }, [projects]);

  // 获取成员的任务（根据 memberId 匹配）
  const memberTasks = useMemo(() => {
    return allTasks.filter(task => {
      // WbsTask.memberId 可能是 string 或 number
      return isProjectIdEqual(task.memberId || '', member.id);
    });
  }, [allTasks, member.id]);

  // 获取待办任务（未完成）
  const pendingTasks = useMemo(() => {
    return memberTasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const today = new Date();
        const dateA = a.plannedEndDate ? parseISO(a.plannedEndDate) : null;
        const dateB = b.plannedEndDate ? parseISO(b.plannedEndDate) : null;
        const daysRemainingA = dateA && !isNaN(dateA.getTime()) ? differenceInDays(dateA, today) : Number.MAX_SAFE_INTEGER;
        const daysRemainingB = dateB && !isNaN(dateB.getTime()) ? differenceInDays(dateB, today) : Number.MAX_SAFE_INTEGER;
        return daysRemainingA - daysRemainingB;
      });
  }, [memberTasks]);

  // 获取紧急任务（3天内到期或已延期）
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

  // 获取成员相关的项目
  const memberProjects = useMemo(() => {
    const projectIds = [...new Set(memberTasks.map(t => String(t.projectId)))];
    return compatibleProjects.filter(p => projectIds.includes(p.id));
  }, [memberTasks, compatibleProjects]);

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

  const getProjectTimeline = (project: CompatibleProject) => {
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

  const renderProjectTimeline = (project: CompatibleProject) => {
    const { totalDays, phases } = getProjectTimeline(project);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>项目周期: {project.startDate} ~ {project.deadline}</span>
          </div>
          <span className="text-muted-foreground">总工期: {totalDays} 天</span>
        </div>

        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{phase.name}</span>
                <span className="text-xs text-muted-foreground">{phase.startDate} ~ {phase.endDate}</span>
              </div>
              <div className="space-y-1">
                <Progress value={phase.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>进度: {phase.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {project.timeline.filter(t => t.type === 'milestone').length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white">里程碑</span>
            </div>
            <div className="space-y-2">
              {project.timeline.filter(t => t.type === 'milestone').map((milestone, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                  <span className="text-xs text-muted-foreground">{milestone.date}</span>
                  <span className="text-sm text-white">{milestone.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 成员欢迎信息 */}
      <Card>
        <CardHeader>
          <CardTitle>欢迎回来，{member.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{memberTasks.length}</p>
              <p className="text-sm text-muted-foreground">总任务数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{pendingTasks.length}</p>
              <p className="text-sm text-muted-foreground">待办任务</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{urgentTasks.length}</p>
              <p className="text-sm text-muted-foreground">紧急任务</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{memberProjects.length}</p>
              <p className="text-sm text-muted-foreground">参与项目</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 紧急任务提醒 */}
      {urgentTasks.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              紧急任务提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentTasks.map(task => {
                const status = getTaskStatus(task);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg cursor-pointer hover:bg-card/80"
                    onClick={() => handleNavigateToTask(task)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.plannedEndDate}</p>
                    </div>
                    <Badge variant="outline" className={cn("gap-1.5 border", status.color)}>
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 参与项目 */}
      {memberProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>参与的项目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {memberProjects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                return (
                  <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-card/80"
                      onClick={() => toggleProjectExpand(project.id)}
                    >
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{project.code}</p>
                        <h3 className="text-sm font-medium text-white mt-1">{project.name}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">进度</p>
                          <p className="text-sm font-medium text-white">{project.progress}%</p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-muted/30">
                        {renderProjectTimeline(project)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * 任务详情对话框
 */
interface TaskDetailDialogProps {
  task: WbsTask | null;
  open: boolean;
  onClose: () => void;
}

function TaskDetailDialog({ task, open, onClose }: TaskDetailDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>任务详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">任务编码</p>
            <p className="text-white font-mono">{task.wbsCode}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">任务名称</p>
            <p className="text-white">{task.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">描述</p>
            <p className="text-white">{task.description || '无描述'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
