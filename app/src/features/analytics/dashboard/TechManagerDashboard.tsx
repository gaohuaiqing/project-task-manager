/**
 * 技术经理仪表板组件
 * 组汇总 + 成员对比 + 任务分配建议
 *
 * @module analytics/dashboard/TechManagerDashboard
 * @see REQ_07a_dashboard.md §4.3
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsCard, TrendChart, PieChart, BarChart, TaskTypeChart } from '../shared/components';
import { AlertCards } from './components/AlertCard';
import { MemberStatusTable } from './components/MemberStatusTable';
import { AllocationSuggestionCards } from './components/AllocationSuggestion';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useTechManagerDashboardData } from './hooks/useDashboardData';

import type { AlertData, MemberTaskStatus, AllocationSuggestion } from './types';

export interface TechManagerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警卡片 */
  onAlertClick?: (alert: AlertData) => void;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击成员 */
  onMemberClick?: (member: MemberTaskStatus) => void;
  /** 切换技术组 */
  onGroupChange?: (groupId: number) => void;
  /** 点击建议 */
  onSuggestionClick?: (suggestion: AllocationSuggestion) => void;
}

/**
 * 技术经理仪表板组件
 *
 * 布局结构:
 * 1. 风险预警区（置顶，含技术组切换）
 * 2. 核心指标卡片（8个）
 * 3. 成员任务状态表格
 * 4. 图表分析区（2x2网格）
 * 5. 任务分配建议
 */
export function TechManagerDashboard({
  projectId,
  className,
  onAlertClick,
  onAlertActionClick,
  onMemberClick,
  onGroupChange,
  onSuggestionClick,
}: TechManagerDashboardProps) {
  const { data, isLoading, error } = useTechManagerDashboardData(projectId);

  // 成员活跃度趋势数据（从接口获取，空时使用空数组）
  const memberActivityTrends = data?.memberActivityTrends || [];

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
      {/* 风险预警区 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🚨 组内风险预警
          </h2>
          {/* 技术组切换 */}
          {data.availableGroups && data.availableGroups.length > 1 && (
            <Select
              value={String(data.currentGroupId)}
              onValueChange={(value) => onGroupChange?.(parseInt(value))}
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.availableGroups.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <AlertCards
          alerts={data.alerts}
          onAlertClick={onAlertClick}
          onAlertActionClick={onAlertActionClick}
        />
      </section>

      {/* 核心指标卡片 */}
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

      {/* 成员任务状态表格 */}
      <section>
        <MemberStatusTable
          title="成员任务状态一览"
          members={data.memberStatus}
          isLoading={isLoading}
          onMemberClick={onMemberClick}
        />
      </section>

      {/* 图表分析区（2x2网格） */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左上: 组任务趋势（30天） */}
        <TrendChart
          title="组任务趋势（30天）"
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

        {/* 左下: 成员任务分布（堆叠柱状图） */}
        <BarChart
          title="成员任务分布"
          data={data.memberStatus?.map((member) => ({
            name: member.name,
            inProgress: member.inProgress,
            completed: member.completed,
            delayed: member.delayed,
          })) || []}
          isLoading={isLoading}
          dataKeys={[
            { key: 'inProgress', name: '进行中', color: '#0EA5E9' },
            { key: 'completed', name: '已完成', color: '#10B981' },
            { key: 'delayed', name: '延期', color: '#EF4444' },
          ]}
          stacked
          barSize={24}
          showLegend
        />

        {/* 右下: 成员活跃度趋势图 */}
        {memberActivityTrends.length > 0 ? (
          <TrendChart
            title="成员活跃度趋势"
            data={memberActivityTrends}
            isLoading={isLoading}
            showTimeRangeSelector={false}
            series={Object.keys(memberActivityTrends[0])
              .filter((key) => key !== 'date')
              .map((name, idx) => {
                const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
                return { dataKey: name, name, color: colors[idx % colors.length] };
              })}
          />
        ) : (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">成员活跃度趋势</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">暂无数据</p>
          </div>
        )}
      </section>

      {/* 任务分配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <section>
          <AllocationSuggestionCards
            suggestions={data.allocationSuggestions}
            isLoading={isLoading}
            onMemberClick={onSuggestionClick}
          />
        </section>
      )}
    </div>
  );
}

export default TechManagerDashboard;
