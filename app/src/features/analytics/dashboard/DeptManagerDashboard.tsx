/**
 * 部门经理仪表板组件
 * 部门汇总 + 组/人员对比 + 资源调配建议
 *
 * @module analytics/dashboard/DeptManagerDashboard
 * @see REQ_07a_dashboard.md §4.2
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatsCard, TrendChart, PieChart, BarChart, ScatterChart, TaskTypeChart } from '../shared/components';
import { AlertCards } from './components/AlertCard';
import { GroupEfficiencyTable } from './components/GroupEfficiencyTable';
import { MemberStatusTable } from './components/MemberStatusTable';
import { AllocationSuggestionCards } from './components/AllocationSuggestion';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useDeptManagerDashboardData } from './hooks/useDashboardData';
import type {
  AlertData,
  GroupEfficiency,
  MemberTaskStatus,
  AllocationSuggestion,
} from './types';

export interface DeptManagerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警卡片 */
  onAlertClick?: (alert: AlertData) => void;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击组 */
  onGroupClick?: (group: GroupEfficiency) => void;
  /** 点击成员 */
  onMemberClick?: (member: MemberTaskStatus) => void;
  /** 点击建议 */
  onSuggestionClick?: (suggestion: AllocationSuggestion) => void;
  /** 时间范围变更 */
  onTimeRangeChange?: (range: string) => void;
}

/**
 * 部门经理仪表板组件
 *
 * 布局结构:
 * 1. 部门风险预警区（置顶）
 * 2. 部门核心指标卡片（8个）
 * 3. 组效能对比表格
 * 4. 图表分析区（2x2网格）
 * 5. 人员调配建议
 */
export function DeptManagerDashboard({
  projectId,
  className,
  onAlertClick,
  onAlertActionClick,
  onGroupClick,
  onMemberClick,
  onSuggestionClick,
  onTimeRangeChange,
}: DeptManagerDashboardProps) {
  const { data, isLoading, error } = useDeptManagerDashboardData(projectId);

  // 组活跃度趋势数据（从 data 中读取）
  const groupActivityTrends = data?.groupActivityTrends || [];

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">加载失败: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 部门风险预警区 */}
      {data.alerts && data.alerts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            🚨 部门风险预警
          </h2>
          <AlertCards
            alerts={data.alerts}
            onAlertClick={onAlertClick}
            onAlertActionClick={onAlertActionClick}
          />
        </section>
      )}

      {/* 部门核心指标卡片 */}
      {data.metrics && data.metrics.length > 0 && (
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.metrics.slice(0, 4).map((metric, index) => (
              <StatsCard
                key={index}
                title={metric.label}
                value={metric.value}
                displayValue={metric.displayValue}
                description={metric.description}
                trend={metric.trend}
                trendText={metric.trendText}
                isLoading={isLoading}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {data.metrics.slice(4, 8).map((metric, index) => (
              <StatsCard
                key={index + 4}
                title={metric.label}
                value={metric.value}
                displayValue={metric.displayValue}
                description={metric.description}
                trend={metric.trend}
                trendText={metric.trendText}
                isLoading={isLoading}
              />
            ))}
          </div>
        </section>
      )}

      {/* 组效能对比表格 */}
      {data.groupEfficiency && data.groupEfficiency.length > 0 && (
        <section>
          <GroupEfficiencyTable
            title="组效能对比"
            groups={data.groupEfficiency}
            isLoading={isLoading}
            onGroupClick={onGroupClick}
            onTimeRangeChange={onTimeRangeChange}
          />
        </section>
      )}

      {/* 图表分析区（2x2网格） */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左上: 部门任务趋势 */}
        <TrendChart
          title="部门任务趋势（30天）"
          data={data.trends || []}
          isLoading={isLoading}
          series={[
            { dataKey: 'created', name: '新建', color: '#0EA5E9' },
            { dataKey: 'completed', name: '完成', color: '#10B981' },
            { dataKey: 'delayed', name: '延期', color: '#EF4444' },
          ]}
        />

        {/* 右上: 任务类型分布（按分组着色的横向柱状图） */}
        <TaskTypeChart
          title="任务类型分布（12类）"
          data={data.taskTypeDistribution || []}
          isLoading={isLoading}
        />

        {/* 左下: 成员负载分布 */}
        <ScatterChart
          title="成员负载分布"
          data={data.memberStatus?.map((member) => ({
            name: member.name,
            x: member.inProgress + member.completed,
            y: member.completed / (member.inProgress + member.completed + member.delayed) * 100,
            size: member.loadRate,
            riskLevel: member.status === 'risk' ? 'high' : member.status === 'warning' ? 'medium' : 'low',
          })) || []}
          isLoading={isLoading}
          xAxisConfig={{ key: 'x', label: '任务数', domain: [0, 'auto'] }}
          yAxisConfig={{ key: 'y', label: '完成率', domain: [0, 100] }}
          showSize
          showQuadrant
          quadrantConfig={{
            centerX: 10,
            centerY: 70,
            quadrantLabels: {
              topLeft: '高效低载',
              topRight: '高效高载',
              bottomLeft: '低效低载',
              bottomRight: '低效高载',
            },
          }}
        />

        {/* 右下: 组活跃度趋势图 */}
        {groupActivityTrends.length > 0 ? (
          <TrendChart
            title="组活跃度趋势"
            data={groupActivityTrends}
            isLoading={isLoading}
            showTimeRangeSelector={false}
            series={[
              { dataKey: '前端组', name: '前端组', color: '#0EA5E9' },
              { dataKey: '后端组', name: '后端组', color: '#10B981' },
              { dataKey: '测试组', name: '测试组', color: '#F59E0B' },
            ]}
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-400">暂无组活跃度趋势数据</p>
          </div>
        )}
      </section>

      {/* 人员调配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <section>
          <AllocationSuggestionCards
            title="人员调配建议"
            suggestions={data.allocationSuggestions}
            isLoading={isLoading}
            onMemberClick={onSuggestionClick}
          />
        </section>
      )}
    </div>
  );
}

export default DeptManagerDashboard;
