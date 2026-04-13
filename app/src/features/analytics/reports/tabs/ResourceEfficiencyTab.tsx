/**
 * 资源效能分析Tab
 * 视角：团队效能 — 聚焦产能、质量、返工率
 * 调配建议聚焦"效能改进"（区别于成员分析Tab的"任务分配"）
 */

import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { BarChart, LineChart, ScatterChart } from '../components/charts';
import { MEMBER_EFFICIENCY_COLUMNS } from '../config';
import { useResourceEfficiencyData } from '../data';
import type { ReportFilters, EfficiencySuggestion } from '../types';
import { TrendingUp, TrendingDown, Target, Award, AlertCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResourceEfficiencyTabProps {
  filters: ReportFilters;
}

export function ResourceEfficiencyTab({ filters }: ResourceEfficiencyTabProps) {
  const { data, isLoading, error } = useResourceEfficiencyData(filters);

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

  const getSuggestionIcon = (type: EfficiencySuggestion['type']) => {
    switch (type) {
      case 'low_productivity':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'low_accuracy':
        return <Target className="h-4 w-4 text-yellow-500" />;
      case 'high_rework':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high_potential':
        return <Award className="h-4 w-4 text-green-500" />;
    }
  };

  const getSuggestionLabel = (type: EfficiencySuggestion['type']) => {
    switch (type) {
      case 'low_productivity':
        return '产能待提升';
      case 'low_accuracy':
        return '预估偏差大';
      case 'high_rework':
        return '返工率高';
      case 'high_potential':
        return '高效能';
    }
  };

  const getSuggestionColor = (type: EfficiencySuggestion['type']) => {
    switch (type) {
      case 'low_productivity':
        return 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20';
      case 'low_accuracy':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20';
      case 'high_rework':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20';
      case 'high_potential':
        return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCardGroup stats={data.stats} />

      {/* 图表区域 */}
      <ChartGroup>
        <ChartContainer title="成员产能排名" subtitle="按产能降序排列">
          <BarChart data={data.productivityChart} yAxisLabel="产能" />
        </ChartContainer>

        {data.efficiencyChart && (
          <ChartContainer title="成员效能分布" subtitle="产能×预估准确性">
            <ScatterChart data={data.efficiencyChart} />
          </ChartContainer>
        )}
      </ChartGroup>

      <ChartGroup>
        <ChartContainer title="产能变化趋势" subtitle="平均产能与目标对比">
          <LineChart data={data.productivityTrend} yAxisLabel="产能" />
        </ChartContainer>

        {data.teamComparison && (
          <ChartContainer title="团队效能对比" subtitle="各团队产能趋势">
            <LineChart data={data.teamComparison} yAxisLabel="产能" />
          </ChartContainer>
        )}
      </ChartGroup>

      {/* 效能改进建议 — 聚焦效能改进 */}
      {data.efficiencySuggestions && data.efficiencySuggestions.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">效能改进建议</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.efficiencySuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  getSuggestionColor(suggestion.type)
                )}
              >
                {getSuggestionIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{suggestion.memberName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                      {getSuggestionLabel(suggestion.type)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 成员效能明细 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">成员效能明细</h3>
        <DataTable
          columns={MEMBER_EFFICIENCY_COLUMNS}
          data={data.memberEfficiency}
          pagination={{ page: 1, pageSize: 10, total: data.memberEfficiency.length }}
        />
      </div>
    </div>
  );
}
