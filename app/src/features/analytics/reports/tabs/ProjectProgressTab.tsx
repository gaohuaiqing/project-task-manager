/**
 * 项目进度报表Tab
 */

import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { PieChart, BarChart, LineChart } from '../components/charts';
import { MILESTONE_COLUMNS } from '../config';
import { useProjectProgressData } from '../data';
import type { ReportFilters, MilestoneItem } from '../types';

export interface ProjectProgressTabProps {
  filters: ReportFilters;
}

export function ProjectProgressTab({ filters }: ProjectProgressTabProps) {
  const { data, isLoading, error } = useProjectProgressData(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">加载失败: {error?.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCardGroup stats={data.stats} />

      {/* 图表区域 */}
      <ChartGroup>
        <ChartContainer title="任务状态分布" subtitle="当前各状态任务数量">
          <PieChart data={data.taskStatusChart} innerRadius={50} />
        </ChartContainer>

        <ChartContainer title="进度趋势" subtitle="近30天完成率变化">
          <LineChart data={data.progressTrend} yAxisLabel="完成率 (%)" />
        </ChartContainer>
      </ChartGroup>

      <ChartGroup>
        <ChartContainer title="里程碑完成情况">
          <BarChart data={data.milestoneChart} yAxisLabel="完成百分比 (%)" />
        </ChartContainer>

        <ChartContainer title="进度变化速度" subtitle="每周进度增量">
          <LineChart data={data.progressSpeedChart} yAxisLabel="进度增量 (%)" />
        </ChartContainer>
      </ChartGroup>

      {/* 里程碑列表 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">里程碑列表</h3>
        <DataTable
          columns={MILESTONE_COLUMNS}
          data={data.milestones}
          pagination={{ page: 1, pageSize: 10, total: data.milestones.length }}
        />
      </div>
    </div>
  );
}
