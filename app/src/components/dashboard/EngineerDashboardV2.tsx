/**
 * 工程师仪表盘组件 V2 - 苹果风格版本
 *
 * 使用统一的项目类型定义和类型适配层
 * 采用苹果 Human Interface Guidelines 设计风格
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
        color: 'from-system-blue to-cyan-400'
      },
      {
        name: '核心开发',
        progress: project.progress >= 30 && project.progress < 70 ? project.progress - 30 : project.progress >= 70 ? 40 : 0,
        startDate: format(addDays(startDate, Math.floor(totalDays * 0.2)), 'yyyy-MM-dd'),
        endDate: format(addDays(startDate, Math.floor(totalDays * 0.7)), 'yyyy-MM-dd'),
        color: 'from-system-purple to-pink-400'
      },
      {
        name: '测试与交付',
        progress: project.progress >= 70 ? project.progress - 70 : 0,
        startDate: format(addDays(startDate, Math.floor(totalDays * 0.7)), 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        color: 'from-system-green to-emerald-400'
      }
    ];

    return { totalDays, phases };
  };

  const getTaskStatus = (task: WbsTask) => {
    const today = new Date();
    const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;

    // 如果日期无效，返回默认状态
    if (!endDate || isNaN(endDate.getTime())) {
      return {
        label: '进行中',
        bg: 'bg-system-blue/10',
        text: 'text-system-blue',
        border: 'border-system-blue/20',
        icon: <TrendingUp className="w-4 h-4" />
      };
    }

    const daysRemaining = differenceInDays(endDate, today);

    if (task.status === 'completed') {
      return {
        label: '已完成',
        bg: 'bg-system-green/10',
        text: 'text-system-green',
        border: 'border-system-green/20',
        icon: <CheckCircle2 className="w-4 h-4" />
      };
    } else if (daysRemaining < 0) {
      return {
        label: '已延期',
        bg: 'bg-system-red/10',
        text: 'text-system-red',
        border: 'border-system-red/20',
        icon: <AlertTriangle className="w-4 h-4" />
      };
    } else if (daysRemaining <= 3) {
      return {
        label: '即将到期',
        bg: 'bg-system-yellow/10',
        text: 'text-system-yellow',
        border: 'border-system-yellow/20',
        icon: <Clock className="w-4 h-4" />
      };
    } else {
      return {
        label: '进行中',
        bg: 'bg-system-blue/10',
        text: 'text-system-blue',
        border: 'border-system-blue/20',
        icon: <TrendingUp className="w-4 h-4" />
      };
    }
  };

  const getPriorityColor = (priority: WbsTask['priority']) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-system-red/10',
          text: 'text-system-red',
          border: 'border-system-red/20'
        };
      case 'medium':
        return {
          bg: 'bg-system-yellow/10',
          text: 'text-system-yellow',
          border: 'border-system-yellow/20'
        };
      case 'low':
        return {
          bg: 'bg-system-blue/10',
          text: 'text-system-blue',
          border: 'border-system-blue/20'
        };
    }
  };

  const renderProjectTimeline = (project: CompatibleProject) => {
    const { totalDays, phases } = getProjectTimeline(project);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">项目周期: {project.startDate} ~ {project.deadline}</span>
          </div>
          <span className="text-xs text-gray-500">总工期: {totalDays} 天</span>
        </div>

        <div className="space-y-3">
          {phases.map((phase, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{phase.name}</span>
                <span className="text-xs text-gray-500">{phase.startDate} ~ {phase.endDate}</span>
              </div>
              <div className="space-y-1">
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-apple-out bg-gradient-to-r",
                      phase.color
                    )}
                    style={{
                      width: `${phase.progress}%`,
                      boxShadow: `0 0 12px ${phase.color.includes('blue') ? 'hsl(211, 98%, 52%)' : phase.color.includes('purple') ? 'hsl(266, 88%, 62%)' : 'hsl(142, 69%, 58%)'}60`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>进度: {phase.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {project.timeline.filter(t => t.type === 'milestone').length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-system-yellow" />
              <span className="text-sm font-medium text-white">里程碑</span>
            </div>
            <div className="space-y-2">
              {project.timeline.filter(t => t.type === 'milestone').map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm border border-system-yellow/20 rounded-xl"
                >
                  <span className="text-xs text-gray-500">{milestone.date}</span>
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
      {/* 成员欢迎信息 - 苹果风格 */}
      <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-apple-card overflow-hidden">
        {/* 顶部装饰线 */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-white tracking-tight">
            欢迎回来，{member.name}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '总任务数', value: memberTasks.length, color: 'text-system-blue' },
              { label: '待办任务', value: pendingTasks.length, color: 'text-system-yellow' },
              { label: '紧急任务', value: urgentTasks.length, color: 'text-system-red' },
              { label: '参与项目', value: memberProjects.length, color: 'text-system-green' }
            ].map((stat, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 text-center transition-all duration-300 ease-apple-out hover:bg-white/10 hover:shadow-apple-floating hover:-translate-y-0.5 cursor-pointer"
              >
                {/* 悬停光效 */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${stat.color.replace('text-', 'hsl(') + ', 0.1)'}, transparent 70%)`
                  }}
                />
                <p className={cn("text-3xl font-bold text-white mb-1 tabular-nums", stat.color)}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 紧急任务提醒 - 苹果风格 */}
      {urgentTasks.length > 0 && (
        <Card className="bg-gradient-to-br from-system-red/5 to-transparent backdrop-blur-xl border border-system-red/20 rounded-apple-card overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <AlertTriangle className="w-5 h-5 text-system-red" />
                <div className="absolute inset-0 text-system-red blur-sm opacity-50" />
              </div>
              <CardTitle className="text-lg font-semibold text-system-red tracking-tight">
                紧急任务提醒
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {urgentTasks.map(task => {
                const status = getTaskStatus(task);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl",
                      "bg-white/5 backdrop-blur-sm border border-white/10",
                      "hover:bg-white/10 transition-all duration-300 ease-apple-out",
                      "hover:shadow-apple-floating hover:-translate-y-0.5 cursor-pointer"
                    )}
                    onClick={() => handleNavigateToTask(task)}
                  >
                    {/* 悬停光效 */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 50% 50%, hsl(0, 84%, 60%, 0.1), transparent 70%)'
                      }}
                    />

                    <div className="relative p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{task.plannedEndDate}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-medium px-3 py-1 rounded-full",
                          "backdrop-blur-sm border flex items-center gap-1.5",
                          status.bg, status.text, status.border
                        )}
                      >
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 参与项目 - 苹果风格 */}
      {memberProjects.length > 0 && (
        <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-apple-card overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-white tracking-tight">
              参与的项目
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {memberProjects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                return (
                  <div
                    key={project.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border",
                      "bg-white/5 backdrop-blur-sm border-white/10",
                      "transition-all duration-300 ease-apple-out"
                    )}
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 transition-colors duration-200"
                      onClick={() => toggleProjectExpand(project.id)}
                    >
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">{project.code}</p>
                        <h3 className="text-sm font-semibold text-white mt-1 group-hover:text-system-blue transition-colors duration-200">
                          {project.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">进度</p>
                          <p className="text-sm font-bold text-white tabular-nums">{project.progress}%</p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 transition-transform duration-200" />
                        )}
                      </div>
                    </div>

                    {/* 展开内容 */}
                    {isExpanded && (
                      <div className="p-4 bg-white/5 border-t border-white/10">
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
 * 任务详情对话框 - 苹果风格
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
      <DialogContent className="max-w-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-apple-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white tracking-tight">
            任务详情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-500 mb-1">任务编码</p>
            <p className="text-white font-mono text-sm bg-black/30 p-2 rounded-lg">{task.wbsCode}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-500 mb-1">任务名称</p>
            <p className="text-white font-semibold">{task.title}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-500 mb-1">描述</p>
            <p className="text-white text-sm leading-relaxed">{task.description || '无描述'}</p>
          </div>

          {task.plannedEndDate && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 mb-1">计划完成日期</p>
              <p className="text-white font-medium">{task.plannedEndDate}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
