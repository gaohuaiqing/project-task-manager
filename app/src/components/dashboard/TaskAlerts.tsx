import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  FileCheck,
  ArrowRight,
  FileText,
  Code,
  User,
  Tag,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import type { WbsTask } from '@/types/wbs';
import type { Member } from '@/types';

interface TaskAlertsProps {
  tasks: WbsTask[];
  members: Member[];
}

export function TaskAlerts({ tasks, members }: TaskAlertsProps) {
  const [selectedTask, setSelectedTask] = useState<WbsTask | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleTaskClick = (task: WbsTask) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const alerts = useMemo(() => {
    const today = new Date();

    const pendingApproval = tasks.filter(task =>
      task.status === 'not_started' && task.approvalStatus === 'pending'
    );
    
    const nearDeadline = tasks.filter(task => {
      if (task.status === 'completed') return false;
      const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
      if (!endDate || isNaN(endDate.getTime())) return false;
      const daysRemaining = differenceInDays(endDate, today);
      return daysRemaining >= 0 && daysRemaining <= 3;
    });
    
    const delayed = tasks.filter(task => {
      if (task.status === 'completed') return false;
      const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
      if (!endDate || isNaN(endDate.getTime())) return false;
      const daysRemaining = differenceInDays(endDate, today);
      return daysRemaining < 0;
    });

    return {
      pendingApproval,
      nearDeadline,
      delayed
    };
  }, [tasks]);

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || '未分配';
  };

  const totalAlerts = alerts.pendingApproval.length + alerts.nearDeadline.length + alerts.delayed.length;

  if (totalAlerts === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">暂无任务提醒</h3>
            <p className="text-sm text-muted-foreground">
              所有任务状态正常，无需特别关注
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">任务提醒</CardTitle>
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              {totalAlerts} 项提醒
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.pendingApproval.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="w-5 h-5 text-blue-400" />
                <h4 className="text-base font-semibold text-white">待审批任务</h4>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-auto">
                  {alerts.pendingApproval.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {alerts.pendingApproval.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {task.wbsCode}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            task.priority === 'high' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            task.priority === 'medium' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          )}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-white truncate">
                          {task.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs flex-shrink-0">
                        {task.status === 'not_started' ? '待审批' : task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>负责人: {getMemberName(task.memberId)}</span>
                      <span>计划工期: {task.plannedDays}天</span>
                    </div>
                  </div>
                ))}
                {alerts.pendingApproval.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    查看全部 {alerts.pendingApproval.length} 个待审批任务
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {alerts.nearDeadline.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <h4 className="text-base font-semibold text-white">即将延期任务</h4>
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-auto">
                  {alerts.nearDeadline.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {alerts.nearDeadline.slice(0, 5).map(task => {
                  const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
                  const daysRemaining = endDate && !isNaN(endDate.getTime()) ? differenceInDays(endDate, new Date()) : 0;
                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {task.wbsCode}
                            </Badge>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              task.priority === 'high' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              task.priority === 'medium' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            )}>
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-white truncate">
                            {task.title}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-xs flex-shrink-0",
                          daysRemaining === 0 ? "bg-red-500/20 text-red-400 border-red-500/30" :
                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        )}>
                          {daysRemaining === 0 ? '今天到期' : `剩${daysRemaining}天`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>负责人: {getMemberName(task.memberId)}</span>
                        <span>计划结束: {task.plannedEndDate}</span>
                      </div>
                    </div>
                  );
                })}
                {alerts.nearDeadline.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                  >
                    查看全部 {alerts.nearDeadline.length} 个即将到期任务
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {alerts.delayed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h4 className="text-base font-semibold text-white">已延期任务</h4>
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 ml-auto">
                  {alerts.delayed.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {alerts.delayed.slice(0, 5).map(task => {
                  const endDate = task.plannedEndDate ? parseISO(task.plannedEndDate) : null;
                  const daysOverdue = endDate && !isNaN(endDate.getTime()) ? Math.abs(differenceInDays(endDate, new Date())) : 0;
                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {task.wbsCode}
                            </Badge>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              task.priority === 'high' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              task.priority === 'medium' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            )}>
                              {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-white truncate">
                            {task.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs flex-shrink-0">
                          已延期 {daysOverdue} 天
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>负责人: {getMemberName(task.memberId)}</span>
                        <span>计划结束: {task.plannedEndDate}</span>
                      </div>
                    </div>
                  );
                })}
                {alerts.delayed.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    查看全部 {alerts.delayed.length} 个已延期任务
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 任务详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              任务详情
            </DialogTitle>
            <DialogClose className="text-muted-foreground hover:text-white" />
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h3>
                  {selectedTask.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedTask.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Code className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">WBS编码</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.wbsCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">优先级</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'medium' ? '中' : '低'}优先级
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">计划开始</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedStartDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">计划结束</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedEndDate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">计划工期</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.plannedDays} 天
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">负责人</p>
                        <p className="text-sm font-medium text-white">
                          {getMemberName(selectedTask.memberId)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">任务状态</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.status === 'completed' ? '已完成' : 
                           selectedTask.status === 'in_progress' ? '进行中' : 
                           selectedTask.status === 'not_started' ? '待处理' : selectedTask.status}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <FileCheck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">审批状态</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.approvalStatus === 'pending' ? '待审批' : 
                           selectedTask.approvalStatus === 'approved' ? '已审批' : 
                           selectedTask.approvalStatus === 'rejected' ? '已拒绝' : selectedTask.approvalStatus}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">任务进度</p>
                        <p className="text-sm font-medium text-white">
                          {selectedTask.progress}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
