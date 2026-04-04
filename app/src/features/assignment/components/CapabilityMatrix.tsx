/**
 * 能力矩阵组件
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useCapabilityMatrix } from '../hooks/useCapabilities';
import {
  CAPABILITY_DIMENSIONS_CONFIG,
  getCapabilityLevel,
  type MemberCapabilityProfile,
  type CapabilityDimension,
} from '../types';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/utils/avatar';

interface CapabilityMatrixProps {
  departmentId?: number;
  className?: string;
  onMemberClick?: (member: MemberCapabilityProfile) => void;
}

export function CapabilityMatrix({ departmentId, className, onMemberClick }: CapabilityMatrixProps) {
  const { data: profiles, isLoading } = useCapabilityMatrix(
    departmentId ? { departmentId } : {}
  );

  const dimensions = Object.keys(CAPABILITY_DIMENSIONS_CONFIG) as CapabilityDimension[];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>能力矩阵</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>暂无能力数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>能力矩阵</CardTitle>
        <p className="text-sm text-muted-foreground">
          显示 {profiles.length} 名成员的能力评估结果
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background w-[200px]">成员</TableHead>
                {dimensions.map((dim) => (
                  <TableHead key={dim} className="text-center min-w-[100px]">
                    {CAPABILITY_DIMENSIONS_CONFIG[dim].name}
                  </TableHead>
                ))}
                <TableHead className="text-center">综合评分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow
                  key={profile.memberId}
                  className={cn(onMemberClick && 'cursor-pointer hover:bg-muted/50')}
                  onClick={() => onMemberClick?.(profile)}
                >
                  <TableCell className="sticky left-0 bg-background">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(profile.memberName, profile.memberGender)} />
                        <AvatarFallback>
                          {profile.memberName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile.memberName}</p>
                        <p className="text-xs text-muted-foreground">
                          评分: {profile.overallScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  {dimensions.map((dim) => {
                    const score = profile.capabilities[dim] || 0;
                    const level = getCapabilityLevel(score);
                    return (
                      <TableCell key={dim} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{score}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
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
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <span className="text-lg font-bold">
                      {profile.overallScore.toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
