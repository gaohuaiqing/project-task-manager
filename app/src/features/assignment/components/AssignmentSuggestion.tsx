/**
 * 分配建议组件
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useAssignmentSuggestions } from '../hooks/useCapabilities';
import type { Task, CandidateScore } from '../types';
import { CheckCircle2, UserPlus, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarUrl } from '@/utils/avatar';

interface AssignmentSuggestionProps {
  tasks: Task[];
  className?: string;
  onAssign?: (taskId: string, memberId: number) => void;
}

export function AssignmentSuggestion({ tasks, className, onAssign }: AssignmentSuggestionProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    tasks[0]?.id
  );

  const { data: suggestion, isLoading } = useAssignmentSuggestions({
    taskId: selectedTaskId,
    enabled: !!selectedTaskId,
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            智能分配建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
            <p>请先选择需要分配的任务</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="assignment-suggest-container" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            智能分配建议
          </CardTitle>
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择任务" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTask && (
          <p className="text-sm text-muted-foreground">
            为任务 "{selectedTask.name}" 寻找最佳分配人选
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : suggestion ? (
          <div className="space-y-6">
            {/* 推荐理由 */}
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm">{suggestion.reasoning}</p>
            </div>

            {/* 推荐候选人 */}
            {suggestion.recommendedCandidate && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">推荐人选</h4>
                <CandidateCard
                  candidate={suggestion.recommendedCandidate}
                  isRecommended
                  onAssign={() => onAssign?.(suggestion.taskId, suggestion.recommendedCandidate!.memberId)}
                />
              </div>
            )}

            {/* 其他候选人 */}
            {suggestion.candidates.length > 1 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  其他候选人 ({suggestion.candidates.filter((c) => c.memberId !== suggestion.recommendedCandidate?.memberId).length})
                </h4>
                <div className="space-y-2">
                  {suggestion.candidates
                    .filter((c) => c.memberId !== suggestion.recommendedCandidate?.memberId)
                    .map((candidate) => (
                      <CandidateCard
                        key={candidate.memberId}
                        candidate={candidate}
                        onAssign={() => onAssign?.(suggestion.taskId, candidate.memberId)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>暂无分配建议</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 候选人卡片组件
function CandidateCard({
  candidate,
  isRecommended = false,
  onAssign,
}: {
  candidate: CandidateScore;
  isRecommended?: boolean;
  onAssign?: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all',
        isRecommended
          ? 'border-primary bg-primary/5'
          : 'hover:border-muted-foreground/50'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={getAvatarUrl(candidate.memberName, candidate.memberGender)} />
            <AvatarFallback>{candidate.memberName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{candidate.memberName}</span>
              {isRecommended && (
                <Badge className="bg-primary text-primary-foreground">
                  推荐
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                综合评分: {candidate.score}
              </span>
              <span>当前负载: {candidate.currentLoad}%</span>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={onAssign}>
          分配
        </Button>
      </div>

      {/* 评分详情 */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">技能匹配</span>
            <span className="font-medium">{candidate.skillMatch}%</span>
          </div>
          <Progress value={candidate.skillMatch} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">可用性</span>
            <span className="font-medium">{candidate.availability}%</span>
          </div>
          <Progress value={candidate.availability} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">经验相关性</span>
            <span className="font-medium">{candidate.experience}%</span>
          </div>
          <Progress value={candidate.experience} className="h-1.5" />
        </div>
      </div>

      {/* 详细说明 */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {candidate.breakdown.skillMatchDetails.map((detail, i) => (
          <p key={i}>• {detail}</p>
        ))}
      </div>
    </div>
  );
}
