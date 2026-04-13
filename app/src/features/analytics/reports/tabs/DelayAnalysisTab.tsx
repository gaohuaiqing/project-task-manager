/**
 * 延期分析报表Tab
 */

import { useState } from 'react';
import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { PieChart, BarChart, LineChart, ScatterChart } from '../components/charts';
import { DELAY_TASK_COLUMNS, MEMBER_DELAY_COLUMNS } from '../config';
import { useDelayAnalysisData } from '../data';
import type { ReportFilters, DelayTaskItem, MemberDelayItem, ScatterPoint } from '../types';

export interface DelayAnalysisTabProps {
  filters: ReportFilters;
}

export function DelayAnalysisTab({ filters }: DelayAnalysisTabProps) {
  const { data, isLoading, error } = useDelayAnalysisData(filters);
  const [activeTable, setActiveTable] = useState<'tasks' | 'members'>('tasks');

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

  const handlePointClick = (point: ScatterPoint) => {
    console.log('点击成员:', point.label);
    // TODO: 跳转到该成员的延期任务列表
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCardGroup stats={data.stats} />

      {/* 图表区域 - 第一行 */}
      <ChartGroup>
        <ChartContainer title="延期类型分布" subtitle="预警/已延迟/超期完成">
          <PieChart data={data.delayTypeChart} innerRadius={50} />
        </ChartContainer>

        <ChartContainer title="延期原因分类" subtitle="按原因统计">
          <BarChart data={data.delayReasonChart} layout="vertical" height={280} yAxisLabel="原因" />
        </ChartContainer>
      </ChartGroup>

      {/* 图表区域 - 第二行：趋势 */}
      <ChartGroup>
        <ChartContainer title="延期趋势" subtitle="延期任务数变化">
          <LineChart data={data.delayTrend} yAxisLabel="延期任务数" />
        </ChartContainer>

        <ChartContainer title="延期收敛/扩散趋势" subtitle="新增vs已解决">
          <LineChart data={data.delayResolvedTrend} yAxisLabel="任务数" />
        </ChartContainer>
      </ChartGroup>

      {/* 图表区域 - 第三行：散点图（成员维度） */}
      {data.workloadVsDelay && (
        <ChartGroup>
          <ChartContainer title="成员延期×负荷分布" subtitle="点击查看详情">
            <ScatterChart
              data={data.workloadVsDelay}
              onPointClick={handlePointClick}
            />
          </ChartContainer>

          {data.activityVsDelay && (
            <ChartContainer title="成员活跃度×延期率分布" subtitle="点击查看详情">
              <ScatterChart
                data={data.activityVsDelay}
                onPointClick={handlePointClick}
              />
            </ChartContainer>
          )}
        </ChartGroup>
      )}

      {/* 数据表格 - Tab切换 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-sm font-semibold">数据明细</h3>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTable === 'tasks'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              onClick={() => setActiveTable('tasks')}
            >
              延期任务列表
            </button>
            {data.memberDelayStats && (
              <button
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTable === 'members'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => setActiveTable('members')}
              >
                成员延期统计
              </button>
            )}
          </div>
        </div>

        {activeTable === 'tasks' ? (
          <DataTable
            columns={DELAY_TASK_COLUMNS}
            data={data.delayTasks}
            pagination={{ page: 1, pageSize: 10, total: data.delayTasks.length }}
          />
        ) : data.memberDelayStats ? (
          <DataTable
            columns={MEMBER_DELAY_COLUMNS}
            data={data.memberDelayStats}
            pagination={{ page: 1, pageSize: 10, total: data.memberDelayStats.length }}
          />
        ) : null}
      </div>
    </div>
  );
}
