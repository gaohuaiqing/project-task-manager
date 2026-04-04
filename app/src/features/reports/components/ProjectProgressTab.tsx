/**
 * 项目进度报表 Tab
 * 显示项目整体进度、里程碑完成情况
 * 符合需求文档 REQ_07_analytics.md 2.2节要求
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { StatsCard } from '@/features/dashboard/components/StatsCard';
import { StatusPieChart } from '@/features/dashboard/components/ProgressPieChart';
import { TrendChart } from '@/features/dashboard/components/TrendChart';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useProjectProgressReport, useProjectsForReport } from '../hooks/useReportData';
import { ReportTrendSection } from './ReportTrendSection';
import type { ReportFilters } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProjectProgressTabProps {
  filters: ReportFilters;
}

// 里程碑状态映射
const MILESTONE_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待处理', variant: 'secondary' },
  in_progress: { label: '进行中', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
  overdue: { label: '已逾期', variant: 'destructive' },
};

// 任务状态颜色和标签映射（符合需求文档）
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started: { label: '未开始', color: '#9ca3af' },
  in_progress: { label: '进行中', color: '#3b82f6' },
  delay_warning: { label: '延期预警', color: '#f59e0b' },
  delayed: { label: '已延期', color: '#ef4444' },
  early_completed: { label: '提前完成', color: '#22c55e' },
  on_time_completed: { label: '按时完成', color: '#22c55e' },
  overdue_completed: { label: '超期完成', color: '#f97316' },
};

export function ProjectProgressTab({ filters }: ProjectProgressTabProps) {
  const navigate = useNavigate();
  const { data: projectsData, isLoading: projectsLoading } = useProjectsForReport();
  const { data: reportData, isLoading: reportLoading } = useProjectProgressReport(filters.projectId);

  const isLoading = projectsLoading || reportLoading;

  // 任务状态分布饼图数据（需求文档要求：任务状态分布饼图）
  const statusChartData = useMemo(() => {
    if (!reportData?.statusDistribution) return [];
    return reportData.statusDistribution.map(item => {
      const config = STATUS_CONFIG[item.status] || { label: item.status, color: '#9ca3af' };
      return {
        status: item.status,
        label: config.label,
        count: item.count,
        color: config.color,
      };
    });
  }, [reportData?.statusDistribution]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!filters.projectId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <p className="text-lg mb-2">请选择一个项目</p>
          <p className="text-sm">选择项目后查看项目进度报表</p>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <p>暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 需求文档要求的统计卡片：总体进度%、已完成任务数、进行中任务数、里程碑完成数
  const completedMilestones = reportData.milestones.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* 统计卡片（符合需求文档REQ_07 2.2节） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总体进度"
          value={reportData.progress}
          suffix="%"
          onClick={() => navigate(`/projects/${filters.projectId}`)}
        />
        <StatsCard
          title="已完成任务"
          value={reportData.completedTasks}
          suffix="个"
        />
        <StatsCard
          title="进行中任务"
          value={reportData.inProgressTasks}
          suffix="个"
        />
        <StatsCard
          title="里程碑完成"
          value={completedMilestones}
          suffix={`/${reportData.milestones.length}个`}
        />
      </div>

      {/* 动态维度趋势（符合需求文档REQ_07 双维度规范） */}
      <ReportTrendSection
        metric="project_progress"
        title="项目进度趋势"
        projectId={filters.projectId}
        color="#3b82f6"
      />

      {/* 图表区域（符合需求文档REQ_07 2.2节） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>进度趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={[]} isLoading={false} title="近30天进度趋势" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>任务状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无任务数据</p>
            ) : (
              <StatusPieChart data={statusChartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 里程碑列表 */}
      <Card>
        <CardHeader>
          <CardTitle>里程碑列表</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.milestones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无里程碑</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>里程碑名称</TableHead>
                  <TableHead>目标日期</TableHead>
                  <TableHead>完成进度</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.milestones.map((milestone) => {
                  const statusInfo = MILESTONE_STATUS_MAP[milestone.status] || MILESTONE_STATUS_MAP.pending;
                  return (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium">{milestone.name}</TableCell>
                      <TableCell>
                        {format(new Date(milestone.targetDate), 'yyyy-MM-dd', { locale: zhCN })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={milestone.completionPercentage} className="w-24" />
                          <span className="text-sm text-muted-foreground">
                            {milestone.completionPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
