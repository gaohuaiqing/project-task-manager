/**
 * 工程师仪表板组件
 * 纯个人数据 - 只看自己的任务和项目
 *
 * 布局结构:
 * 1. 我的预警卡片（逾期/即将到期/本周到期）
 * 2. 我的待办任务列表（按优先级排序）
 * 3. 需要更新的任务（超过7天未更新进展）
 * 4. 我的核心指标卡片（4个）
 * 5. 图表区：任务趋势 + 任务状态分布
 * 6. 参与项目进度
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, ListTodo, RefreshCw } from 'lucide-react';

// 共享常量
import { DEFAULT_CHART_COLORS } from '../../shared/constants';

// 共享组件
import { StatsCard, TrendChart, PieChart } from '../../shared/components';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 仪表板组件
import {
  DashboardSection,
  StatsCardGrid,
  AlertCardsRow,
  ChartGrid,
} from '../components';

// 复用现有组件
import { TodoTaskList } from '../components/TodoTaskList';
import { ProjectProgressList } from '../components/ProjectProgressList';

// 数据 Hook
import { useEngineerDashboard } from '../hooks';

// 类型
import type { AlertData, TodoTask } from '../types';

export interface EngineerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击更新任务 */
  onUpdateTask?: (task: TodoTask) => void;
}

/**
 * 工程师仪表板组件
 */
export function EngineerDashboard({
  projectId,
  className,
  onAlertActionClick,
  onUpdateTask,
}: EngineerDashboardProps) {
  const { data, isLoading, error } = useEngineerDashboard(projectId);

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
    <div data-testid="engineer-dashboard-container" className={cn('space-y-6', className)}>
      {/* 我的预警卡片 */}
      <DashboardSection
        title="我的预警"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        data-testid="alert-section"
      >
        <AlertCardsRow
          alerts={data.alerts || []}
          onActionClick={onAlertActionClick}
        />
      </DashboardSection>

      {/* 我的待办任务列表 */}
      <DashboardSection
        title="我的待办任务"
        icon={<ListTodo className="h-4 w-4 text-blue-500" />}
        action={<span className="text-xs text-gray-500">按优先级排序</span>}
        data-testid="todo-section"
      >
        {data.todoTasks && data.todoTasks.length > 0 ? (
          <TodoTaskList tasks={data.todoTasks} />
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">暂无待办任务</p>
        )}
      </DashboardSection>

      {/* 需要更新的任务 */}
      <DashboardSection
        title="需要更新的任务"
        icon={<RefreshCw className="h-4 w-4 text-amber-500" />}
        action={<span className="text-xs text-gray-500">超过7天未更新进展</span>}
        data-testid="update-section"
      >
        {data.needUpdateTasks && data.needUpdateTasks.length > 0 ? (
          <TodoTaskList
            tasks={data.needUpdateTasks}
            showUpdateButton
            onUpdateClick={onUpdateTask}
          />
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">所有任务进展均已在7日内更新</p>
        )}
      </DashboardSection>

      {/* 我的核心指标卡片（4个） */}
      {data.metrics && data.metrics.length > 0 && (
        <DashboardSection title="我的核心指标" data-testid="metrics-section">
          <StatsCardGrid metrics={data.metrics} columns={4} />
        </DashboardSection>
      )}

      {/* 图表区：任务趋势 + 任务状态分布 */}
      <DashboardSection title="图表分析" data-testid="charts-section">
        <ChartGrid
          charts={[
            {
              title: '我的任务趋势',
              chart: (
                <TrendChart
                  data={data.trends || []}
                  height={280}
                  series={[
                    { dataKey: 'created', name: '新建', color: DEFAULT_CHART_COLORS[0] },
                    { dataKey: 'completed', name: '完成', color: DEFAULT_CHART_COLORS[1] },
                    { dataKey: 'delayed', name: '延期', color: DEFAULT_CHART_COLORS[3] },
                  ]}
                />
              ),
            },
            {
              title: '我的任务状态分布',
              subtitle: data.taskStatusDistribution?.length
                ? `共 ${data.taskStatusDistribution.reduce((s, i) => s + i.value, 0)} 个任务`
                : undefined,
              chart: (
                <PieChart
                  data={data.taskStatusDistribution || []}
                  height={280}
                />
              ),
            },
          ]}
        />
      </DashboardSection>

      {/* 参与项目进度 */}
      {data.projectProgress && data.projectProgress.length > 0 && (
        <DashboardSection title="参与项目进度" data-testid="progress-section">
          <ProjectProgressList projects={data.projectProgress} />
        </DashboardSection>
      )}
    </div>
  );
}

export default EngineerDashboard;
