/**
 * 里程碑表格组件
 * 重构为表格形式，符合需求规格
 */
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MILESTONE_STATUS_CONFIG } from '@/shared/constants';
import type { Milestone, MilestoneDisplayStatus } from '../types';
import { getDisplayStatus, formatDateForDisplay } from '../utils/milestone';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (milestone: Milestone) => void;
  readOnly?: boolean;
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: MilestoneDisplayStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'delayed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
}

export function MilestoneTimeline({
  milestones,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  readOnly = false,
}: MilestoneTimelineProps) {
  // 按目标日期排序
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  // 计算每个里程碑的显示状态
  const enrichedMilestones = sortedMilestones.map((m) => ({
    ...m,
    displayStatus: getDisplayStatus(m),
  }));

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">状态</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="w-32">目标日期</TableHead>
              <TableHead className="w-28">完成进度</TableHead>
              <TableHead className="w-24">状态</TableHead>
              {!readOnly && <TableHead className="w-24 text-right">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedMilestones.map((milestone) => {
              const statusConfig = MILESTONE_STATUS_CONFIG[milestone.displayStatus];
              const completionPercentage = milestone.completionPercentage ?? 0;

              return (
                <TableRow
                  key={milestone.id}
                  className={cn(
                    'cursor-pointer',
                    !readOnly && 'hover:bg-accent'
                  )}
                  onClick={() => !readOnly && onEditMilestone?.(milestone)}
                >
                  {/* 状态图标 */}
                  <TableCell>
                    {getStatusIcon(milestone.displayStatus)}
                  </TableCell>

                  {/* 名称 */}
                  <TableCell>
                    <div>
                      <div className="font-medium">{milestone.name}</div>
                      {milestone.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {milestone.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* 目标日期 */}
                  <TableCell className="text-muted-foreground">
                    {formatDateForDisplay(milestone.targetDate)}
                  </TableCell>

                  {/* 完成进度 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={completionPercentage} className="h-2 w-12" />
                      <span className="text-xs text-muted-foreground w-8">
                        {completionPercentage}%
                      </span>
                    </div>
                  </TableCell>

                  {/* 状态标签 */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        statusConfig.bgColor,
                        statusConfig.textColor
                      )}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>

                  {/* 操作按钮 */}
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditMilestone?.(milestone);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMilestone?.(milestone);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
