/**
 * 里程碑时间线组件
 */
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Milestone } from '../types';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (milestone: Milestone) => void;
  readOnly?: boolean;
}

const statusConfig = {
  pending: { icon: Circle, label: '待开始', color: 'text-gray-500' },
  in_progress: { icon: Clock, label: '进行中', color: 'text-blue-500' },
  completed: { icon: CheckCircle2, label: '已完成', color: 'text-green-500' },
  delayed: { icon: AlertCircle, label: '已延期', color: 'text-red-500' },
};

export function MilestoneTimeline({
  milestones,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  readOnly = false,
}: MilestoneTimelineProps) {
  // 按计划日期排序
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
  );

  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>里程碑</CardTitle>
          {!readOnly && onAddMilestone && (
            <Button size="sm" variant="outline" onClick={onAddMilestone}>
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无里程碑</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>里程碑</CardTitle>
        {!readOnly && onAddMilestone && (
          <Button size="sm" variant="outline" onClick={onAddMilestone}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* 时间线 */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* 里程碑列表 */}
          <div className="space-y-6">
            {sortedMilestones.map((milestone, index) => {
              const config = statusConfig[milestone.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={milestone.id}
                  className="relative pl-10 group"
                >
                  {/* 节点 */}
                  <div
                    className={cn(
                      'absolute left-2 top-1 h-4 w-4 rounded-full bg-background border-2',
                      config.color
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                  </div>

                  {/* 内容 */}
                  <div
                    className={cn(
                      'p-3 rounded-lg border bg-card cursor-pointer transition-colors',
                      'hover:bg-accent'
                    )}
                    onClick={() => !readOnly && onEditMilestone?.(milestone)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{milestone.name}</h4>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          milestone.status === 'completed' && 'bg-green-100 text-green-700',
                          milestone.status === 'delayed' && 'bg-red-100 text-red-700',
                          milestone.status === 'in_progress' && 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>

                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {milestone.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>计划: {new Date(milestone.plannedDate).toLocaleDateString()}</span>
                      </div>
                      {milestone.actualDate && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>实际: {new Date(milestone.actualDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
