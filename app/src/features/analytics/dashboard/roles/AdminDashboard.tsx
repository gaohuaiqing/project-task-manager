/**
 * 系统管理员仪表板组件
 * 全局汇总 + 部门对比 + 资源调配建议
 *
 * @module analytics/dashboard/roles/AdminDashboard
 * @see REQ_07a_dashboard.md §4.1
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// 共享组件
import { StatsCard, TrendChart, TaskTypeChart } from '../../shared/components';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 仪表板组件
import {
  DashboardSection,
  StatsCardGrid,
  AlertCardsRow,
  HighRiskProjectCard,
  EfficiencyTable,
  ChartGrid,
  AllocationSuggestionGrid,
} from '../components';

// 数据 Hook
import { useAdminDashboard } from '../hooks';

// 类型
import type {
  AlertData,
  DepartmentEfficiency,
  AllocationSuggestion,
  HighRiskProject,
} from '../types';

export interface AdminDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击部门 */
  onDepartmentClick?: (dept: DepartmentEfficiency) => void;
  /** 点击建议 */
  onSuggestionClick?: (suggestion: AllocationSuggestion) => void;
  /** 点击高风险项目 */
  onHighRiskProjectClick?: (project: HighRiskProject) => void;
}

/**
 * 系统管理员仪表板组件
 *
 * 布局结构:
 * 1. 风险预警区（置顶）- 4个预警卡片 + 高风险项目
 * 2. 核心指标卡片（8个，4x2网格）
 * 3. 部门效能对比表格
 * 4. 图表分析区（2x2网格）
 * 5. 资源调配建议
 */
export function AdminDashboard({
  projectId,
  className,
  onAlertActionClick,
  onDepartmentClick,
  onSuggestionClick,
  onHighRiskProjectClick,
}: AdminDashboardProps) {
  const { data, isLoading, error } = useAdminDashboard(projectId);

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

  // 转换部门效能数据为表格组件所需格式
  const efficiencyItems = data.departmentEfficiency?.map((dept) => ({
    id: dept.id,
    name: dept.name,
    completionRate: dept.completionRate,
    delayRate: dept.delayRate,
    utilizationRate: dept.utilizationRate,
    activity: dept.activity,
    trend: dept.trend,
    status: dept.status,
  })) || [];

  return (
    <div data-testid="admin-dashboard-container" className={cn('space-y-6', className)}>
      {/* 风险预警区 */}
      <DashboardSection
        title="风险预警"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        data-testid="alert-section"
      >
        <div className="space-y-4">
          {/* 预警卡片行 */}
          {data.alerts && data.alerts.length > 0 && (
            <AlertCardsRow
              alerts={data.alerts}
              onActionClick={onAlertActionClick}
            />
          )}

          {/* 高风险项目卡片 */}
          {data.highRiskProjects && data.highRiskProjects.length > 0 && (
            <HighRiskProjectCard
              projects={data.highRiskProjects}
              onProjectClick={onHighRiskProjectClick}
            />
          )}
        </div>
      </DashboardSection>

      {/* 核心指标卡片（4x2网格） */}
      {data.metrics && data.metrics.length > 0 && (
        <DashboardSection title="核心指标" data-testid="metrics-section">
          <StatsCardGrid metrics={data.metrics} columns={4} />
        </DashboardSection>
      )}

      {/* 部门效能对比表格 */}
      {efficiencyItems.length > 0 && (
        <DashboardSection title="部门效能对比" data-testid="efficiency-section">
          <EfficiencyTable
            items={efficiencyItems}
            type="department"
          />
        </DashboardSection>
      )}

      {/* 图表分析区（2x2网格） */}
      <DashboardSection title="图表分析" data-testid="charts-section">
        <ChartGrid
          charts={[
            {
              title: '全局任务趋势',
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
              title: '部门延期率趋势',
              chart: (
                <TrendChart
                  data={data.departmentDelayTrends || []}
                  height={280}
                  series={[
                    { dataKey: '研发一部', name: '研发一部', color: '#0EA5E9' },
                    { dataKey: '研发二部', name: '研发二部', color: '#10B981' },
                    { dataKey: '测试部', name: '测试部', color: '#F59E0B' },
                    { dataKey: '产品部', name: '产品部', color: '#EF4444' },
                  ]}
                />
              ),
            },
            {
              title: '资源利用率变化趋势',
              chart: (
                <TrendChart
                  data={data.utilizationTrends || []}
                  height={280}
                  series={[
                    { dataKey: 'utilization', name: '利用率', color: '#0EA5E9' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DashboardSection>

      {/* 资源调配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <DashboardSection title="资源调配建议" data-testid="suggestion-section">
          <AllocationSuggestionGrid
            suggestions={data.allocationSuggestions}
            onMemberClick={onSuggestionClick}
          />
        </DashboardSection>
      )}
    </div>
  );
}

export default AdminDashboard;
