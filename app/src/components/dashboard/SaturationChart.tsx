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
  // 使用对象存储动画值，避免数组索引越界问题
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    // 动画效果
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
    if (value <= 60) return 'bg-green-500';
    if (value <= 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSaturationStatus = (value: number) => {
    if (value <= 60) return { label: '健康', color: 'bg-green-500/20 text-green-400' };
    if (value <= 85) return { label: '适中', color: 'bg-yellow-500/20 text-yellow-400' };
    return { label: '过载', color: 'bg-red-500/20 text-red-400' };
  };

  const getStatusDot = (status: Member['status']) => {
    switch (status) {
      case 'online':
        return <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />;
      case 'busy':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case 'offline':
        return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">团队工作饱和度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member, index) => {
          const saturation = getSaturationStatus(member.saturation);
          return (
            <div 
              key={member.id} 
              className="group flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            >
              {/* 头像 */}
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {member.name.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5">
                  {getStatusDot(member.status)}
                </div>
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {member.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {member.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", saturation.color)}
                    >
                      {saturation.label}
                    </Badge>
                    <span className="text-sm font-semibold text-white w-10 text-right">
                      {animatedValues[member.id] || 0}%
                    </span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out",
                      getSaturationColor(member.saturation)
                    )}
                    style={{
                      width: `${animatedValues[member.id] || 0}%`,
                      transitionDelay: `${index * 100}ms`
                    }}
                  />
                </div>

                {/* 任务数 */}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span>当前任务: {member.currentTasks}个</span>
                  <span>已完成: {member.completedTasks}个</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
