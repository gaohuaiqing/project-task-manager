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
  // 使用对象存储动画值，避免数组索引越界问题
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
        return { label: '规划中', color: 'bg-gray-500/20 text-gray-400' };
      case 'in_progress':
        return { label: '进行中', color: 'bg-blue-500/20 text-blue-400' };
      case 'completed':
        return { label: '已完成', color: 'bg-green-500/20 text-green-400' };
      case 'delayed':
        return { label: '延期', color: 'bg-red-500/20 text-red-400' };
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
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">项目进度概览</CardTitle>
          <Badge variant="secondary" className="bg-primary text-white">
            {projects.filter(p => p.status === 'in_progress').length} 进行中
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.slice(0, 4).map((project, index) => {
          const status = getStatusConfig(project.status);
          return (
            <div 
              key={project.id}
              className="group p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-all cursor-pointer"
            >
              {/* 标题行 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {project.description}
                  </p>
                </div>
                <Badge variant="secondary" className={cn("text-xs", status.color)}>
                  {status.label}
                </Badge>
              </div>

              {/* 进度条 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">进度</span>
                  <span className="text-sm font-semibold text-white">
                    {animatedProgress[project.id] || 0}%
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out",
                      project.progress === 100
                        ? "bg-gradient-to-r from-green-500 to-green-400"
                        : "bg-gradient-to-r from-blue-500 to-green-400"
                    )}
                    style={{
                      width: `${animatedProgress[project.id] || 0}%`,
                      transitionDelay: `${index * 150}ms`
                    }}
                  />
                </div>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  {/* 成员头像组 */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((memberId) => (
                          <Avatar
                            key={memberId}
                            className="w-6 h-6 border-2 border-card"
                            title={getMemberName(memberId)}
                          >
                            <AvatarImage src={getMemberAvatar(memberId)} />
                            <AvatarFallback className="bg-primary text-white text-[10px]">
                              {getMemberName(memberId).slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {project.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] text-white">
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 任务完成数 */}
                  {project.taskCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{project.completedTaskCount || 0}/{project.taskCount}</span>
                    </div>
                  )}
                </div>

                {/* 截止日期 */}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{project.deadline}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
