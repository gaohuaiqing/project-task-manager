import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Member } from '@/types';

interface ProjectOverviewProps {
  projects: Project[];
  members: Member[];
}

export function ProjectOverview({ projects, members }: ProjectOverviewProps) {
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const progressMap: Record<string, number> = {};
      projects.forEach(p => {
        progressMap[p.id] = p.progress;
      });
      setAnimatedProgress(progressMap);
    }, 500);
    return () => clearTimeout(timer);
  }, [projects]);

  const getStatusConfig = (status: Project['status']) => {
    switch (status) {
      case 'planning':
        return {
          label: '规划中',
          bg: 'bg-gray-500/10',
          text: 'text-gray-400',
          border: 'border-gray-500/20',
          progress: 'from-gray-500 to-gray-400'
        };
      case 'in_progress':
        return {
          label: '进行中',
          bg: 'bg-system-blue/10',
          text: 'text-system-blue',
          border: 'border-system-blue/20',
          progress: 'from-system-blue to-system-green'
        };
      case 'completed':
        return {
          label: '已完成',
          bg: 'bg-system-green/10',
          text: 'text-system-green',
          border: 'border-system-green/20',
          progress: 'from-system-green to-emerald-400'
        };
      case 'delayed':
        return {
          label: '延期',
          bg: 'bg-system-red/10',
          text: 'text-system-red',
          border: 'border-system-red/20',
          progress: 'from-system-red to-orange-400'
        };
    }
  };

  const getMemberAvatar = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.avatar || '';
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || '';
  };

  return (
    <Card className="h-full bg-gradient-to-br from-primary/5 to-primary/[0.02] backdrop-blur-xl border border-border/50 rounded-apple-card overflow-hidden">
      {/* 卡片头部 */}
      <CardHeader className="pb-4 relative">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold text-foreground tracking-tight">
            项目进度概览
          </CardTitle>
          <Badge
            variant="secondary"
            className="bg-system-blue/10 text-system-blue border border-system-blue/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
          >
            {projects.filter(p => p.status === 'in_progress').length} 进行中
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {projects.slice(0, 4).map((project, index) => {
          const status = getStatusConfig(project.status);
          const accentColor = status.progress.split(' ')[0].replace('from-', '');
          const isCompleted = project.progress === 100;

          return (
            <div
              key={project.id}
              className={cn(
                "group relative overflow-hidden rounded-xl",
                "bg-secondary/30 backdrop-blur-sm border border-border/50",
                "hover:bg-secondary/50 transition-all duration-300 ease-apple-out",
                "hover:shadow-apple-floating hover:-translate-y-0.5 cursor-pointer"
              )}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* 悬停光效 */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 30%, ${isCompleted ? 'hsl(142, 69%, 58%)' : 'hsl(211, 98%, 52%)'}10, transparent 70%)`,
                }}
              />

              <div className="relative p-4">
                {/* 标题行 */}
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-system-blue transition-colors duration-300 truncate mb-1">
                      {project.name}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {project.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap",
                      "backdrop-blur-sm border",
                      status.bg, status.text, status.border
                    )}
                  >
                    {status.label}
                  </Badge>
                </div>

                {/* 进度条区域 */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">进度</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {animatedProgress[project.id] || 0}%
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-secondary/30 rounded-full overflow-hidden border border-border/30">
                    {/* 背景光效 */}
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${isCompleted ? 'hsl(142, 69%, 58%)' : 'hsl(211, 98%, 52%)'}20, transparent)`,
                      }}
                    />

                    {/* 进度条 */}
                    <div
                      className={cn(
                        "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-apple-out",
                        "bg-gradient-to-r",
                        status.progress
                      )}
                      style={{
                        width: `${animatedProgress[project.id] || 0}%`,
                        boxShadow: `0 0 12px ${isCompleted ? 'hsl(142, 69%, 58%)' : 'hsl(211, 98%, 52%)'}60`,
                        transitionDelay: `${index * 150}ms`
                      }}
                    />

                    {/* 进度条动画效果 */}
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        width: `${animatedProgress[project.id] || 0}%`,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s infinite',
                      }}
                    />
                  </div>
                </div>

                {/* 底部信息栏 */}
                <div className="flex items-center justify-between text-xs gap-3 flex-wrap">
                  {/* 左侧：成员和任务 */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* 成员头像组 */}
                    {project.members && project.members.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="flex -space-x-2">
                          {project.members.slice(0, 3).map((memberId, idx) => (
                            <Avatar
                              key={memberId}
                              className="w-7 h-7 border-2 border-background ring-2 ring-border/50 hover:ring-border transition-all hover:scale-110 hover:z-10"
                              title={getMemberName(memberId)}
                              style={{ zIndex: 3 - idx }}
                            >
                              <AvatarImage src={getMemberAvatar(memberId)} />
                              <AvatarFallback className="bg-secondary/10 text-foreground text-[10px] font-medium backdrop-blur-sm">
                                {getMemberName(memberId).slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project.members.length > 3 && (
                            <div
                              className="w-7 h-7 rounded-full bg-secondary/10 border-2 border-background ring-2 ring-border/50 flex items-center justify-center text-[10px] text-foreground font-medium backdrop-blur-sm"
                              style={{ zIndex: 0 }}
                            >
                              +{project.members.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 任务完成数 */}
                    {project.taskCount !== undefined && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          <span className="text-foreground font-medium">{project.completedTaskCount || 0}</span>
                          <span className="mx-0.5">/</span>
                          {project.taskCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 右侧：截止日期 */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-foreground font-medium">{project.deadline}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* 添加进度条动画样式 */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </Card>
  );
}
