/**
 * 项目详情页主容器
 *
 * @module features/projects/components/ProjectDetail
 * @description 项目详情页，包含时间线、里程碑、成员等 Tab 视图
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject, useProjectTimelines, useProjectMembers, useProjectMilestones } from '../hooks/useProjects';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import {
  useCreateTimeline,
  useUpdateTimeline,
  useDeleteTimeline,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '../hooks/useProjectMutations';
import { ProjectHeader } from './ProjectHeader';
import { EnhancedTimelineView } from './EnhancedTimelineView';
import { projectApi } from '@/lib/api/project.api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { TimelineTask, Holiday } from '@/types/timeline';
import type { Timeline } from '../types';
import { Plus } from 'lucide-react';

// ============ Props 定义 ============

export interface ProjectDetailProps {
  /** 项目 ID */
  projectId: string;
  /** 编辑回调 */
  onEdit?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
}

// ============ 主组件 ============

export function ProjectDetail({
  projectId,
  onEdit,
  onDelete,
}: ProjectDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tab 状态
  const [activeTab, setActiveTab] = useState('timelines');

  // 创建时间线对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTimeline, setNewTimeline] = useState({
    name: '',
    type: 'development',
    startDate: '',
    endDate: '',
  });

  // 数据查询
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: timelines, isLoading: isTimelinesLoading } = useProjectTimelines(projectId);
  const { data: members, isLoading: isMembersLoading } = useProjectMembers(projectId);
  const { data: milestones, isLoading: isMilestonesLoading } = useProjectMilestones(projectId);

  // 时间线 mutations
  const createTimelineMutation = useCreateTimeline(projectId);
  const updateTimelineMutation = useUpdateTimeline(projectId);
  const deleteTimelineMutation = useDeleteTimeline(projectId);

  // 里程碑 mutations
  const createMilestoneMutation = useCreateMilestone(projectId);
  const updateMilestoneMutation = useUpdateMilestone(projectId);
  const deleteMilestoneMutation = useDeleteMilestone(projectId);

  // 获取节假日（当前年份）
  const currentYear = new Date().getFullYear();
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // 加载节假日数据
  useEffect(() => {
    projectApi.getHolidays(currentYear).then((data) => {
      setHolidays(data);
    }).catch((error) => {
      console.error('Failed to load holidays:', error);
    });
  }, [currentYear]);

  // 总体加载状态
  const isLoading = isProjectLoading || isTimelinesLoading;

  // 处理任务变更
  const handleTaskChange = async (
    timelineId: string,
    taskId: string,
    updates: { startDate: string; endDate: string }
  ) => {
    try {
      await projectApi.updateTimelineTask(taskId, {
        startDate: updates.startDate,
        endDate: updates.endDate,
      });

      // 刷新时间线任务数据
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks', timelineId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      toast({
        title: '成功',
        description: '任务时间已更新',
      });
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
      throw error; // 向上抛出，让调用方处理回滚
    }
  };

  // 处理任务创建
  const handleTaskCreate = async (timelineId: string, task: Partial<TimelineTask>) => {
    try {
      // 调用创建任务 API
      await projectApi.createTimelineTask(timelineId, {
        title: task.title || '新任务',
        description: task.description || undefined,
        startDate: task.startDate || new Date().toISOString().split('T')[0],
        endDate: task.endDate || new Date().toISOString().split('T')[0],
        priority: task.priority,
        assigneeId: task.assigneeId,
      });

      // 刷新任务数据
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks', timelineId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      toast({
        title: '成功',
        description: '任务已创建',
      });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理任务删除
  const handleTaskDelete = async (timelineId: string, taskId: string) => {
    try {
      await projectApi.deleteTimelineTask(taskId);

      // 刷新时间线任务数据
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks', timelineId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      toast({
        title: '成功',
        description: '任务已删除',
      });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
      throw error; // 向上抛出，让调用方处理
    }
  };

  // 处理创建时间线
  const handleCreateTimeline = async () => {
    if (!newTimeline.name.trim()) {
      toast({
        title: '请输入时间线名称',
        variant: 'destructive',
      });
      return;
    }
    if (!newTimeline.startDate || !newTimeline.endDate) {
      toast({
        title: '请选择开始和结束日期',
        variant: 'destructive',
      });
      return;
    }
    if (new Date(newTimeline.endDate) < new Date(newTimeline.startDate)) {
      toast({
        title: '结束日期不能早于开始日期',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTimelineMutation.mutateAsync({
        name: newTimeline.name,
        type: newTimeline.type,
        startDate: newTimeline.startDate,
        endDate: newTimeline.endDate,
      });
      toast({
        title: '成功',
        description: '时间线已创建',
      });
      setIsCreateDialogOpen(false);
      setNewTimeline({ name: '', type: 'development', startDate: '', endDate: '' });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理从时间线视图创建时间线
  const handleTimelineCreate = async (data: { name: string; type: string; startDate: string; endDate: string }) => {
    try {
      await createTimelineMutation.mutateAsync({
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      toast({
        title: '成功',
        description: '时间线已创建',
      });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理更新时间线
  const handleTimelineUpdate = async (timelineId: string, data: Partial<Timeline>) => {
    try {
      // 格式化日期为 YYYY-MM-DD 格式
      const formattedData = { ...data };
      if (formattedData.startDate) {
        formattedData.startDate = formattedData.startDate.split('T')[0];
      }
      if (formattedData.endDate) {
        formattedData.endDate = formattedData.endDate.split('T')[0];
      }
      await updateTimelineMutation.mutateAsync({ id: timelineId, data: formattedData });
      toast({
        title: '成功',
        description: '时间线已更新',
      });
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理删除时间线
  const handleTimelineDelete = async (timelineId: string) => {
    try {
      await deleteTimelineMutation.mutateAsync(timelineId);
      toast({
        title: '成功',
        description: '时间线已删除',
      });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理创建里程碑
  const handleMilestoneCreate = async (data: { name: string; targetDate: string }) => {
    try {
      await createMilestoneMutation.mutateAsync({
        name: data.name,
        targetDate: data.targetDate,
      });
      toast({
        title: '成功',
        description: '里程碑已创建',
      });
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理更新里程碑
  const handleMilestoneUpdate = async (milestoneId: string, data: Partial<{ name: string; targetDate: string; completionPercentage: number }>) => {
    try {
      await updateMilestoneMutation.mutateAsync({
        id: milestoneId,
        data: {
          name: data.name,
          targetDate: data.targetDate,
          completionPercentage: data.completionPercentage,
        },
      });
      toast({
        title: '成功',
        description: '里程碑已更新',
      });
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 处理删除里程碑
  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await deleteMilestoneMutation.mutateAsync(milestoneId);
      toast({
        title: '成功',
        description: '里程碑已删除',
      });
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '操作失败，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 加载状态骨架
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-4">
          <Skeleton className="h-9 w-32" />
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部 */}
      <ProjectHeader
        project={project}
        isLoading={isProjectLoading}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Tab 导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger data-testid="detail-tab-overview" value="overview">基本信息</TabsTrigger>
          <TabsTrigger data-testid="detail-tab-members" value="members">成员</TabsTrigger>
          <TabsTrigger data-testid="detail-tab-milestones" value="milestones">里程碑</TabsTrigger>
          <TabsTrigger data-testid="detail-tab-timelines" value="timelines">时间线</TabsTrigger>
        </TabsList>

        {/* 基本信息 Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">项目描述</h3>
            <p className="text-muted-foreground">
              {project?.description || '暂无描述'}
            </p>
          </div>
        </TabsContent>

        {/* 成员 Tab */}
        <TabsContent value="members" className="mt-4">
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">项目成员</h3>
            {isMembersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => {
                  // 响应拦截器已自动转换 snake_case -> camelCase
                  const displayName = member.realName || member.name || member.username || '未知成员';
                  // 后端 role 为 owner/manager/member/viewer，需要映射显示
                  const roleDisplay = member.role === 'owner' ? '负责人' :
                                      member.role === 'manager' ? '管理员' :
                                      member.role === 'pm' ? '项目经理' :
                                      member.role === 'tech_lead' ? '技术负责人' : '成员';
                  return (
                    <div
                      key={member.id || member.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {roleDisplay}
                          {member.departmentName && ` · ${member.departmentName}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">暂无成员</p>
            )}
          </div>
        </TabsContent>

        {/* 里程碑 Tab */}
        <TabsContent value="milestones" className="mt-4">
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">里程碑</h3>
            {isMilestonesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : milestones && milestones.length > 0 ? (
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{milestone.name}</div>
                      <div className="text-sm text-muted-foreground">
                        目标日期: {(() => {
                          try {
                            const date = milestone.targetDate?.includes('T')
                              ? parseISO(milestone.targetDate)
                              : new Date(milestone.targetDate);
                            return format(date, 'yyyy年M月d日', { locale: zhCN });
                          } catch {
                            return milestone.targetDate || '-';
                          }
                        })()}
                      </div>
                    </div>
                    <div className="text-sm">
                      {milestone.completionPercentage}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">暂无里程碑</p>
            )}
          </div>
        </TabsContent>

        {/* 时间线 Tab */}
        <TabsContent value="timelines" className="mt-4">
          {isTimelinesLoading ? (
            <div className="h-96 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : timelines && timelines.length > 0 ? (
            <div data-testid="detail-timeline-view" className="h-[600px]">
              <EnhancedTimelineView
                projectId={projectId}
                timelines={timelines as Timeline[]}
                holidays={holidays}
                milestones={milestones?.map(m => ({
                  id: m.id,
                  name: m.name,
                  targetDate: m.targetDate,
                  status: m.status,
                  completionPercentage: m.completionPercentage,
                }))}
                projectRange={project ? {
                  startDate: project.startDate || '',
                  endDate: project.deadline || '',
                } : undefined}
                onTimelineCreate={handleTimelineCreate}
                onTimelineUpdate={handleTimelineUpdate}
                onTimelineDelete={handleTimelineDelete}
                onMilestoneCreate={handleMilestoneCreate}
                onMilestoneUpdate={handleMilestoneUpdate}
                onMilestoneDelete={handleMilestoneDelete}
                onMilestoneClick={(milestone) => {
                  // 切换到里程碑标签页
                  setActiveTab('milestones');
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">暂无时间线</p>
                <p className="text-sm text-muted-foreground mb-4">
                  请先创建时间线
                </p>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="detail-btn-add-timeline">
                      <Plus className="mr-2 h-4 w-4" />
                      创建时间线
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>创建时间线</DialogTitle>
                      <DialogDescription>
                        为项目创建一条新的时间线，用于规划和管理任务。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="timeline-name">时间线名称</Label>
                        <Input
                          id="timeline-name"
                          placeholder="例如：开发阶段"
                          value={newTimeline.name}
                          onChange={(e) => setNewTimeline({ ...newTimeline, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="timeline-type">时间线类型</Label>
                        <Select
                          value={newTimeline.type}
                          onValueChange={(value) => setNewTimeline({ ...newTimeline, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="development">开发</SelectItem>
                            <SelectItem value="testing">测试</SelectItem>
                            <SelectItem value="design">设计</SelectItem>
                            <SelectItem value="deployment">部署</SelectItem>
                            <SelectItem value="other">其他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="timeline-start">开始日期</Label>
                          <Input
                            id="timeline-start"
                            type="date"
                            value={newTimeline.startDate}
                            onChange={(e) => setNewTimeline({ ...newTimeline, startDate: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="timeline-end">结束日期</Label>
                          <Input
                            id="timeline-end"
                            type="date"
                            value={newTimeline.endDate}
                            onChange={(e) => setNewTimeline({ ...newTimeline, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateTimeline} disabled={createTimelineMutation.isPending}>
                        {createTimelineMutation.isPending ? '创建中...' : '创建'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
