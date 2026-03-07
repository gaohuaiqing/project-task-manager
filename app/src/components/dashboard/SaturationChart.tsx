import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Member } from '@/types';

interface SaturationChartProps {
  members: Member[];
}

export function SaturationChart({ members }: SaturationChartProps) {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const valuesMap: Record<string, number> = {};
      members.forEach(m => {
        valuesMap[m.id] = m.saturation;
      });
      setAnimatedValues(valuesMap);
    }, 300);
    return () => clearTimeout(timer);
  }, [members]);

  const getSaturationColor = (value: number) => {
    if (value <= 60) return 'hsl(142, 69%, 58%)'; // system-green
    if (value <= 85) return 'hsl(48, 98%, 60%)'; // system-yellow
    return 'hsl(0, 84%, 60%)'; // system-red
  };

  const getSaturationStatus = (value: number) => {
    if (value <= 60) return {
      label: '健康',
      bg: 'bg-system-green/10',
      text: 'text-system-green',
      border: 'border-system-green/20'
    };
    if (value <= 85) return {
      label: '适中',
      bg: 'bg-system-yellow/10',
      text: 'text-system-yellow',
      border: 'border-system-yellow/20'
    };
    return {
      label: '过载',
      bg: 'bg-system-red/10',
      text: 'text-system-red',
      border: 'border-system-red/20'
    };
  };

  const getStatusDot = (status: Member['status']) => {
    switch (status) {
      case 'online':
        return <div className="w-2.5 h-2.5 rounded-full bg-system-green shadow-[0_0_8px_hsl(142,69%,58%)] animate-pulse" />;
      case 'busy':
        return <div className="w-2.5 h-2.5 rounded-full bg-system-yellow shadow-[0_0_8px_hsl(48,98%,60%)]" />;
      case 'offline':
        return <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />;
    }
  };

  return (
    <Card className="h-full bg-gradient-to-br from-primary/5 to-primary/[0.02] backdrop-blur-xl border border-border/50 rounded-apple-card overflow-hidden">
      {/* 卡片头部 */}
      <CardHeader className="pb-4 relative">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        <CardTitle className="text-lg font-semibold text-foreground tracking-tight">
          团队工作饱和度
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {members.map((member, index) => {
          const saturation = getSaturationStatus(member.saturation);
          const accentColor = getSaturationColor(member.saturation);

          return (
            <div
              key={member.id}
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
                  background: `radial-gradient(circle at 50% 50%, ${accentColor}10, transparent 70%)`,
                }}
              />

              <div className="relative p-4">
                <div className="flex items-center gap-4">
                  {/* 头像区域 */}
                  <div className="relative flex-shrink-0">
                    <div className="relative">
                      {/* 头像发光效果 */}
                      <div
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: accentColor,
                          filter: 'blur(8px)',
                        }}
                      />
                      <Avatar className="relative h-12 w-12 border-2 border-border/50">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-secondary/10 to-secondary/5 text-foreground text-sm font-medium backdrop-blur-sm">
                          {member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* 在线状态指示器 */}
                    <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
                      {getStatusDot(member.status)}
                    </div>
                  </div>

                  {/* 信息区域 */}
                  <div className="flex-1 min-w-0">
                    {/* 名称和角色 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {member.name}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {member.role}
                        </span>
                      </div>

                      {/* 状态标签和百分比 */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-medium px-2.5 py-0.5 rounded-full",
                            "backdrop-blur-sm border",
                            saturation.bg, saturation.text, saturation.border
                          )}
                        >
                          {saturation.label}
                        </Badge>
                        <span className="text-lg font-bold text-foreground tabular-nums w-12 text-right">
                          {animatedValues[member.id] || 0}%
                        </span>
                      </div>
                    </div>

                    {/* 饱和度进度条 */}
                    <div className="relative h-2.5 bg-secondary/30 rounded-full overflow-hidden border border-border/30">
                      {/* 背景光效 */}
                      <div
                        className="absolute inset-0 opacity-50"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${accentColor}20, transparent)`,
                        }}
                      />

                      {/* 进度条 */}
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-apple-out"
                        style={{
                          width: `${animatedValues[member.id] || 0}%`,
                          background: `linear-gradient(90deg, ${accentColor}CC, ${accentColor})`,
                          boxShadow: `0 0 12px ${accentColor}60`,
                          transitionDelay: `${index * 100}ms`
                        }}
                      />

                      {/* 进度条动画效果 */}
                      <div
                        className="absolute top-0 left-0 h-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          width: `${animatedValues[member.id] || 0}%`,
                          background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s infinite',
                        }}
                      />
                    </div>

                    {/* 任务统计 */}
                    <div className="flex items-center gap-4 mt-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>进行中: <span className="text-foreground font-medium">{member.currentTasks}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-system-green" />
                        <span>已完成: <span className="text-foreground font-medium">{member.completedTasks}</span></span>
                      </div>
                    </div>
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
