/**
 * 任务统计报表Tab
 * 视角：任务视角 — 每行是一个任务
 */

import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { PieChart, BarChart, LineChart } from '../components/charts';
import { TASK_STATISTIC_COLUMNS } from '../config';
import { useTaskStatisticsData } from '../data';
import type { ReportFilters } from '../types';

export interface TaskStatisticsTabProps {
  filters: ReportFilters;
}

export function TaskStatisticsTab({ filters }: TaskStatisticsTabProps) {
  const { data, isLoading, error } = useTaskStatisticsData(filters);

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

      {/* 图表区域 - 第一行：分布图 */}
      <ChartGroup>
        <ChartContainer title="优先级分布" subtitle="按优先级统计任务数量">
          <BarChart data={data.priorityChart} yAxisLabel="任务数量" />
        </ChartContainer>

        <ChartContainer title="任务状态分布" subtitle="各状态任务占比">
          <PieChart data={data.statusChart} innerRadius={50} />
        </ChartContainer>
      </ChartGroup>

      {/* 图表区域 - 第二行：类型与趋势 */}
      <ChartGroup>
        <ChartContainer title="任务类型分布" subtitle="12类任务类型统计">
          <BarChart data={data.taskTypeChart} layout="vertical" height={350} yAxisLabel="任务类型" />
        </ChartContainer>

        <ChartContainer title="任务趋势" subtitle="新增/完成/延期趋势">
          <LineChart data={data.taskTrend} yAxisLabel="任务数" />
        </ChartContainer>
      </ChartGroup>

      {/* 图表区域 - 第三行：对比与趋势 */}
      <ChartGroup>
        <ChartContainer title="优先级完成率趋势" subtitle="各优先级完成率变化">
          <LineChart data={data.priorityTrend} yAxisLabel="完成率 (%)" />
        </ChartContainer>

        <ChartContainer title="任务类型对比" subtitle="完成率与延期率">
          <BarChart data={data.taskTypeComparison} yAxisLabel="比率 (%)" />
        </ChartContainer>
      </ChartGroup>

      {/* 任务统计明细 — 任务视角 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">任务统计明细</h3>
        <DataTable
          columns={TASK_STATISTIC_COLUMNS}
          data={data.taskDetails}
          pagination={{ page: 1, pageSize: 10, total: data.taskDetails.length }}
        />
      </div>
    </div>
  );
}
