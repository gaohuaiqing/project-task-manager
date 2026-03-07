/**
 * 统计详情对话框组件
 *
 * 职责：
 * - 显示各类统计数据的详细信息
 * - 支持多种统计类型（任务、项目、成员、饱和度）
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

export interface StatsData {
  title: string;
  data: any;
}

interface StatsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statsData: StatsData | null;
}

// 总任务数详情
function TotalTasksDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-white">{data.total}</p>
        <p className="text-sm text-muted-foreground">总任务数</p>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">任务状态分布</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">已完成</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.completed ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">进行中</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.inProgress ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">待处理</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.pending ?? 0}</span>
          </div>
        </div>
        {(data.tasks?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">最近任务</h3>
            <div className="space-y-2">
              {data.tasks.map((task: any) => (
                <div key={task.id} className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-medium text-white truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    状态: {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待处理'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 进行中项目详情
function InProgressProjectsDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-white">{data.total}</p>
        <p className="text-sm text-muted-foreground">进行中项目数</p>
      </div>
      {data.projects?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">进行中项目</h3>
          <div className="space-y-2">
            {data.projects.map((project: any) => (
              <div key={project.id} className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium text-white truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  开始日期: {project.startDate} | 截止日期: {project.deadline}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 团队成员详情
function TeamMembersDetail({ data }: { data: any }) {
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'engineer': '工程师',
      'tech_manager': '技术经理',
      'department_manager': '部门经理',
      'admin': '管理员'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-white">{data.total}</p>
        <p className="text-sm text-muted-foreground">团队成员数</p>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">角色分布</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">工程师</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.engineers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">技术经理</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.techManagers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">部门经理</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.departmentManagers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">管理员</span>
            <span className="text-sm font-semibold text-white">{data.breakdown?.admins ?? 0}</span>
          </div>
        </div>
        {data.members?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">团队成员</h3>
            <div className="space-y-2">
              {data.members.map((member: any) => (
                <div key={member.id} className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    角色: {getRoleLabel(member.role)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 平均饱和度详情
function AvgSaturationDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-white">{data.average}%</p>
        <p className="text-sm text-muted-foreground">平均饱和度</p>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">成员饱和度</h3>
        <div className="space-y-2">
          {data.breakdown?.map?.((member: any, index: number) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{member.name}</span>
                <span className="text-sm font-semibold text-white">{member.saturation}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${member.saturation}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 内容渲染器
function renderDetailContent(statsData: StatsData) {
  switch (statsData.title) {
    case '总任务数':
      return <TotalTasksDetail data={statsData.data} />;
    case '进行中项目':
      return <InProgressProjectsDetail data={statsData.data} />;
    case '团队成员':
      return <TeamMembersDetail data={statsData.data} />;
    case '平均饱和度':
      return <AvgSaturationDetail data={statsData.data} />;
    default:
      return <div className="text-center text-muted-foreground">暂无详情</div>;
  }
}

export function StatsDetailDialog({ open, onOpenChange, statsData }: StatsDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {statsData?.title}详情
          </DialogTitle>
          <DialogClose className="text-muted-foreground hover:text-white" />
        </DialogHeader>
        {statsData && (
          <div className="space-y-6 pt-4">
            {renderDetailContent(statsData)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
