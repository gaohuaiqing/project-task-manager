/**
 * 成员能力详情组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useMemberCapabilities } from '../hooks/useCapabilities';
import {
  CAPABILITY_DIMENSIONS_CONFIG,
  CAPABILITY_LEVELS_CONFIG,
  getCapabilityLevel,
  type CapabilityDimension,
} from '../types';
import { cn } from '@/lib/utils';
import { Radar, TrendingUp, Award } from 'lucide-react';

interface MemberCapabilitiesProps {
  memberId: number;
  className?: string;
  showHistory?: boolean;
}

export function MemberCapabilities({
  memberId,
  className,
  showHistory = false,
}: MemberCapabilitiesProps) {
  const { data: profile, isLoading } = useMemberCapabilities(memberId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>暂无能力数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dimensions = Object.keys(CAPABILITY_DIMENSIONS_CONFIG) as CapabilityDimension[];
  const overallLevel = getCapabilityLevel(profile.overallScore);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            能力档案
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">综合评分:</span>
            <Badge
              className={cn(
                'text-base px-3 py-1',
                overallLevel.color === 'emerald' && 'bg-emerald-500',
                overallLevel.color === 'blue' && 'bg-blue-500',
                overallLevel.color === 'cyan' && 'bg-cyan-500',
                overallLevel.color === 'yellow' && 'bg-yellow-500',
                overallLevel.color === 'orange' && 'bg-orange-500'
              )}
            >
              {overallLevel.label} ({profile.overallScore.toFixed(1)})
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 能力概览雷达图（简化为列表形式） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dim) => {
            const score = profile.capabilities[dim] || 0;
            const level = getCapabilityLevel(score);
            const config = CAPABILITY_DIMENSIONS_CONFIG[dim];

            return (
              <div
                key={dim}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{config.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{score}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        level.color === 'emerald' && 'border-emerald-500 text-emerald-600',
                        level.color === 'blue' && 'border-blue-500 text-blue-600',
                        level.color === 'cyan' && 'border-cyan-500 text-cyan-600',
                        level.color === 'yellow' && 'border-yellow-500 text-yellow-600',
                        level.color === 'orange' && 'border-orange-500 text-orange-600'
                      )}
                    >
                      {level.label}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>能力等级</span>
                    <span>{score}/10</span>
                  </div>
                  <Progress value={score * 10} className="h-2" />
                </div>

                <p className="text-xs text-muted-foreground">
                  {level.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* 最后评估时间 */}
        {profile.lastAssessmentDate && (
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
            <span>最后评估时间</span>
            <span>{new Date(profile.lastAssessmentDate).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
