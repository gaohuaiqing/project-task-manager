/**
 * 成员任务分析Tab
 * 视角：成员维度 — 关注负载、能力、活跃度
 * 调配建议聚焦"任务分配"（区别于资源效能Tab的"效能改进"）
 * 布局原则：左静右动（左侧静态分布图，右侧动态趋势图）
 */

import { StatsCardGroup, ChartContainer, ChartGroup, DataTable } from '../components/shared';
import { PieChart, BarChart, LineChart } from '../components/charts';
import { MEMBER_TASK_COLUMNS } from '../config';
import { useMemberAnalysisData } from '../data';
import type { ReportFilters, AllocationSuggestion, MemberCapabilitySummary } from '../types';
import { AlertTriangle, CheckCircle, UserPlus, AlertCircle, TrendingUp, Target, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemberAnalysisTabProps {
  filters: ReportFilters;
}

export function MemberAnalysisTab({ filters }: MemberAnalysisTabProps) {
  const { data, isLoading, error } = useMemberAnalysisData(filters);

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

  const getSuggestionIcon = (type: AllocationSuggestion['type']) => {
    switch (type) {
      case 'overload':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'idle':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'low_activity':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'can_take_more':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSuggestionLabel = (type: AllocationSuggestion['type']) => {
    switch (type) {
      case 'overload':
        return '过载';
      case 'idle':
        return '闲置';
      case 'low_activity':
        return '低活跃';
      case 'can_take_more':
        return '可承担更多';
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (accuracy >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatsCardGroup stats={data.stats} />

      {/* 图表区域 - 左静右动布局 */}
      {/* 第一行：静态分布图 */}
      <ChartGroup>
        <ChartContainer title="成员任务负载分布" subtitle="各成员任务状态">
          <BarChart data={data.workloadChart} stacked height={320} yAxisLabel="任务数量" />
        </ChartContainer>

        <ChartContainer title="任务状态分布" subtitle="整体状态占比">
          <PieChart data={data.taskStatusChart} innerRadius={50} />
        </ChartContainer>
      </ChartGroup>

      {/* 第二行：静态分析 + 动态趋势 */}
      <ChartGroup>
        <ChartContainer title="预估准确性分布" subtitle="偏差率统计">
          <BarChart data={data.estimationChart} yAxisLabel="成员数" />
        </ChartContainer>

        <ChartContainer title="负载变化趋势" subtitle="各成员负载动态变化">
          <LineChart data={data.workloadTrend} yAxisLabel="任务数量" />
        </ChartContainer>
      </ChartGroup>

      {/* 第三行：动态趋势图 */}
      <ChartGroup>
        <ChartContainer title="任务完成趋势" subtitle="各成员完成数量变化">
          <LineChart data={data.completionTrend} yAxisLabel="完成任务数" />
        </ChartContainer>

        <ChartContainer title="预估准确性变化趋势" subtitle="各成员准确性动态变化">
          <LineChart data={data.estimationTrend} yAxisLabel="准确率 (%)" />
        </ChartContainer>
      </ChartGroup>

      {/* 任务分配建议 — 聚焦负载调整和任务分摊 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">任务分配建议</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.allocationSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  suggestion.type === 'overload' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
                  suggestion.type === 'idle' && 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20',
                  suggestion.type === 'low_activity' && 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20',
                  suggestion.type === 'can_take_more' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
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

      {/* 成员任务明细 - 已包含活跃度列 */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">成员任务明细</h3>
        <DataTable
          columns={MEMBER_TASK_COLUMNS}
          data={data.memberTasks}
          pagination={{ page: 1, pageSize: 10, total: data.memberTasks.length }}
        />
      </div>

      {/* 成员能力概览 - 简洁版本，放到最后 */}
      {data.memberCapabilities && data.memberCapabilities.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">成员能力概览</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.memberCapabilities.map((member) => (
              <MemberCapabilityCard key={member.memberId} member={member} getAccuracyColor={getAccuracyColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 成员能力卡片组件 - 简洁版 */
function MemberCapabilityCard({
  member,
  getAccuracyColor,
}: {
  member: MemberCapabilitySummary;
  getAccuracyColor: (accuracy: number) => string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
      {/* 成员头部信息 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{member.memberName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('text-xs font-medium', getAccuracyColor(member.avgEstimationAccuracy))}>
            {member.avgEstimationAccuracy}%
          </span>
        </div>
      </div>

      {/* 核心指标 - 简化为一行 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span>任务: <span className="font-medium text-foreground">{member.totalTasks}</span></span>
        <span>完成: <span className="font-medium text-green-600 dark:text-green-400">{member.completedTasks}</span></span>
        <span>活跃: <span className="font-medium text-foreground">{member.activityRate}%</span></span>
      </div>

      {/* 能力维度 - 简洁展示 */}
      {member.capability && (
        <div className="text-xs text-muted-foreground">
          {member.capability.modelName}: {member.capability.dimensions.map(d => `${d.name}:${d.score}`).join(' | ')}
        </div>
      )}
    </div>
  );
}
