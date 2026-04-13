/**
 * 技术经理仪表板组件
 * 组汇总 + 成员对比 + 任务分配建议
 *
 * @module analytics/dashboard/roles/TechManagerDashboard
 * @see REQ_07a_dashboard.md §4.3
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// 共享组件
import { StatsCard, TrendChart, TaskTypeChart, PieChart } from '../../shared/components';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 仪表板组件
import {
  DashboardSection,
  StatsCardGrid,
  AlertCardsRow,
  ChartGrid,
  AllocationSuggestionGrid,
  GroupSelector,
} from '../components';

// 复用现有组件
import { MemberStatusTable } from '../components/MemberStatusTable';

// 数据 Hook
import { useTechManagerDashboard } from '../hooks';

// 类型
import type {
  AlertData,
  AllocationSuggestion,
} from '../types';

export interface TechManagerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击建议 */
  onSuggestionClick?: (suggestion: AllocationSuggestion) => void;
}

/**
 * 技术经理仪表板组件
 *
 * 布局结构:
 * 1. 组内风险预警区（4个卡片）+ 组切换下拉框
 * 2. 组内核心指标卡片（8个）
 * 3. 成员任务状态表格
 * 4. 图表分析区（2x2网格）
 * 5. 任务分配建议
 */
export function TechManagerDashboard({
  projectId,
  className,
  onAlertActionClick,
  onSuggestionClick,
}: TechManagerDashboardProps) {
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | undefined>();
  const { data, isLoading, error } = useTechManagerDashboard(projectId, selectedGroupId);

  // 处理组切换
  const handleGroupChange = (groupId: number) => {
    setSelectedGroupId(groupId);
  };

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
    <div data-testid="tech-manager-dashboard-container" className={cn('space-y-6', className)}>
      {/* 组内风险预警区 */}
      <DashboardSection
        title="组内风险预警"
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        action={
          data.availableGroups && data.availableGroups.length > 1 && (
            <GroupSelector
              groups={data.availableGroups}
              currentGroupId={data.currentGroupId}
              onGroupChange={handleGroupChange}
            />
          )
        }
        data-testid="alert-section"
      >
        {data.alerts && data.alerts.length > 0 && (
          <AlertCardsRow
            alerts={data.alerts}
            onActionClick={onAlertActionClick}
          />
        )}
      </DashboardSection>

      {/* 组内核心指标卡片（4x2网格） */}
      {data.metrics && data.metrics.length > 0 && (
        <DashboardSection title="组内核心指标" data-testid="metrics-section">
          <StatsCardGrid metrics={data.metrics} columns={4} />
        </DashboardSection>
      )}

      {/* 成员任务状态表格 */}
      {data.memberStatus && data.memberStatus.length > 0 && (
        <DashboardSection title="成员任务状态一览" data-testid="member-section">
          <MemberStatusTable members={data.memberStatus} />
        </DashboardSection>
      )}

      {/* 图表分析区（2x2网格） */}
      <DashboardSection title="图表分析" data-testid="charts-section">
        <ChartGrid
          charts={[
            {
              title: '组任务趋势（30天）',
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
              title: '任务类型分布',
              chart: (
                <PieChart
                  data={data.taskTypeDistribution || []}
                  height={280}
                />
              ),
            },
            {
              title: '成员任务分布',
              chart: (
                <TaskTypeChart
                  data={data.memberStatus?.map((m) => ({
                    name: m.name,
                    value: m.inProgress + m.completed,
                    color: m.status === 'healthy' ? '#10B981' :
                           m.status === 'warning' ? '#F59E0B' : '#EF4444',
                  })) || []}
                  height={280}
                />
              ),
            },
            {
              title: '成员活跃度趋势',
              chart: (
                <TrendChart
                  data={data.memberActivityTrends || []}
                  height={280}
                  series={[
                    { dataKey: '张三', name: '张三', color: '#0EA5E9' },
                    { dataKey: '李四', name: '李四', color: '#10B981' },
                    { dataKey: '王五', name: '王五', color: '#F59E0B' },
                    { dataKey: '赵六', name: '赵六', color: '#EF4444' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DashboardSection>

      {/* 任务分配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <DashboardSection title="任务分配建议" data-testid="suggestion-section">
          <AllocationSuggestionGrid
            suggestions={data.allocationSuggestions}
            onMemberClick={onSuggestionClick}
          />
        </DashboardSection>
      )}
    </div>
  );
}

export default TechManagerDashboard;
