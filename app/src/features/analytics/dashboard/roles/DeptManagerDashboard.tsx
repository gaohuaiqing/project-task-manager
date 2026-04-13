/**
 * 部门经理仪表板组件
 * 部门汇总 + 组/人员对比 + 资源调配建议
 *
 * @module analytics/dashboard/roles/DeptManagerDashboard
 * @see REQ_07a_dashboard.md §4.2
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// 共享组件
import { StatsCard, TrendChart, TaskTypeChart, ScatterChart } from '../../shared/components';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 仪表板组件
import {
  DashboardSection,
  StatsCardGrid,
  AlertCardsRow,
  EfficiencyTable,
  ChartGrid,
  AllocationSuggestionGrid,
} from '../components';

// 数据 Hook
import { useDeptManagerDashboard } from '../hooks';

// 类型
import type {
  AlertData,
  GroupEfficiency,
  AllocationSuggestion,
} from '../types';

export interface DeptManagerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击组 */
  onGroupClick?: (group: GroupEfficiency) => void;
  /** 点击建议 */
  onSuggestionClick?: (suggestion: AllocationSuggestion) => void;
}

/**
 * 部门经理仪表板组件
 *
 * 布局结构:
 * 1. 部门风险预警区（3个卡片）
 * 2. 部门核心指标卡片（8个）
 * 3. 组效能对比表格
 * 4. 图表分析区（2x2网格）
 * 5. 人员调配建议
 */
export function DeptManagerDashboard({
  projectId,
  className,
  onAlertActionClick,
  onGroupClick,
  onSuggestionClick,
}: DeptManagerDashboardProps) {
  const { data, isLoading, error } = useDeptManagerDashboard(projectId);

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

  // 转换组效能数据为表格组件所需格式
  const efficiencyItems = data.groupEfficiency?.map((group) => ({
    id: group.id,
    name: group.name,
    completionRate: group.completionRate,
    delayRate: group.delayRate,
    loadRate: group.loadRate,
    activity: group.activity,
    memberCount: group.memberCount,
    trend: group.trend,
    status: group.status,
  })) || [];

  // 成员负载分布数据（散点图）
  const memberLoadData = data.memberStatus?.map((member) => ({
    name: member.name,
    x: member.inProgress + member.completed,
    y: member.loadRate,
  })) || [];

  return (
    <div data-testid="dept-manager-dashboard-container" className={cn('space-y-6', className)}>
      {/* 部门风险预警区 */}
      <DashboardSection
        title="部门风险预警"
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        data-testid="alert-section"
      >
        {data.alerts && data.alerts.length > 0 && (
          <AlertCardsRow
            alerts={data.alerts}
            onActionClick={onAlertActionClick}
          />
        )}
      </DashboardSection>

      {/* 部门核心指标卡片（4x2网格） */}
      {data.metrics && data.metrics.length > 0 && (
        <DashboardSection title="部门核心指标" data-testid="metrics-section">
          <StatsCardGrid metrics={data.metrics} columns={4} />
        </DashboardSection>
      )}

      {/* 组效能对比表格 */}
      {efficiencyItems.length > 0 && (
        <DashboardSection title="组效能对比" data-testid="efficiency-section">
          <EfficiencyTable
            items={efficiencyItems}
            type="group"
          />
        </DashboardSection>
      )}

      {/* 图表分析区（2x2网格） */}
      <DashboardSection title="图表分析" data-testid="charts-section">
        <ChartGrid
          charts={[
            {
              title: '部门任务趋势（30天）',
              chart: (
                <TrendChart
                  data={data.trends || []}
                  height={280}
                  series={[
                    { dataKey: 'created', name: '新建', color: '#0EA5E9' },
                    { dataKey: 'completed', name: '完成', color: '#10B981' },
                    { dataKey: 'delayed', name: '延期', color: '#EF4444' },
                  ]}
                />
              ),
            },
            {
              title: '任务类型分布（12类）',
              chart: (
                <TaskTypeChart
                  data={data.taskTypeDistribution || []}
                  height={280}
                />
              ),
            },
            {
              title: '成员负载分布',
              subtitle: 'X轴: 任务数 | Y轴: 负载率',
              chart: (
                <ScatterChart
                  data={memberLoadData}
                  height={280}
                  xAxisConfig={{ key: 'x', label: '任务数', domain: [0, 120] }}
                  yAxisConfig={{ key: 'y', label: '负载率', domain: [0, 150] }}
                  showQuadrant
                  quadrantConfig={{
                    centerX: 50,
                    centerY: 100,
                    quadrantLabels: {
                      topLeft: '低任务高负载',
                      topRight: '高任务高负载',
                      bottomLeft: '低任务低负载',
                      bottomRight: '高任务低负载',
                    },
                  }}
                />
              ),
            },
            {
              title: '组活跃度趋势',
              chart: (
                <TrendChart
                  data={data.groupActivityTrends || []}
                  height={280}
                  series={[
                    { dataKey: '前端组', name: '前端组', color: '#0EA5E9' },
                    { dataKey: '后端组', name: '后端组', color: '#10B981' },
                    { dataKey: '测试组', name: '测试组', color: '#F59E0B' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DashboardSection>

      {/* 人员调配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <DashboardSection title="人员调配建议" data-testid="suggestion-section">
          <AllocationSuggestionGrid
            suggestions={data.allocationSuggestions}
            onMemberClick={onSuggestionClick}
          />
        </DashboardSection>
      )}
    </div>
  );
}

export default DeptManagerDashboard;
