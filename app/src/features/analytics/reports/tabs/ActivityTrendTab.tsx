/**
 * 活跃度分析Tab
 * 展示团队/个人的维护活动时间曲线（横轴=周起始日 MM-DD）：
 * - 团队活跃度（各部门本周被维护任务占比%，跨组可比）
 * - 个人活跃度（各责任人本周被维护任务占比%，Top 6 对比）
 */

import { ChartContainer, ChartGroup } from '../components/shared';
import { LineChart } from '../components/charts';
import { useActivityTrendData } from '../data';
import type { ReportFilters } from '../types';
import { Activity } from 'lucide-react';

export interface ActivityTrendTabProps {
  filters: ReportFilters;
}

export function ActivityTrendTab({ filters }: ActivityTrendTabProps) {
  const { data, isLoading, error } = useActivityTrendData(filters);

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

  const hasNoData =
    data.teamRatio.datasets.length === 0
    && data.memberRatio.datasets.length === 0;

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Activity className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">暂无活跃度数据</p>
        <p className="text-xs mt-1">所选时间范围内没有任务更新</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 团队 + 个人活跃度 并排对比 */}
      <ChartGroup>
        <ChartContainer
          title="团队活跃度趋势"
          subtitle="各部门本周被维护任务占比（按周，跨组可比）"
        >
          <LineChart data={data.teamRatio} strokeWidth={1.5} yAxisLabel="活跃任务占比 (%)" />
        </ChartContainer>

        <ChartContainer
          title="个人活跃度趋势"
          subtitle="各责任人本周被维护任务占比（Top 6，对比可见）"
        >
          <LineChart data={data.memberRatio} strokeWidth={1.5} yAxisLabel="活跃任务占比 (%)" />
        </ChartContainer>
      </ChartGroup>
    </div>
  );
}
