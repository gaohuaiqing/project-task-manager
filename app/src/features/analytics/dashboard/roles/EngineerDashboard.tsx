/**
 * 工程师仪表板组件
 * 纯个人数据 - 只看自己的任务和项目
 *
 * @module analytics/dashboard/roles/EngineerDashboard
 * @see REQ_07a_dashboard.md §4.4
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

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
 *
 * 布局结构:
 * 1. 我的紧急任务区（置顶）- 3个卡片
 * 2. 我的待办任务列表
 * 3. 需要更新的任务（超过7天未更新进展）
 * 4. 我的核心指标卡片（4个）
 * 5. 我的任务趋势图
 * 6. 任务分布 & 参与项目进度
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
      {/* 我的紧急任务区 */}
      <DashboardSection
        title="我的紧急任务"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        data-testid="alert-section"
      >
        {data.alerts && data.alerts.length > 0 && (
          <AlertCardsRow
            alerts={data.alerts}
            onActionClick={onAlertActionClick}
          />
        )}
      </DashboardSection>

      {/* 我的待办任务列表 */}
      {data.todoTasks && data.todoTasks.length > 0 && (
        <DashboardSection title="我的待办任务" data-testid="todo-section">
          <TodoTaskList tasks={data.todoTasks} />
        </DashboardSection>
      )}

      {/* 需要更新的任务 */}
      {data.needUpdateTasks && data.needUpdateTasks.length > 0 && (
        <DashboardSection
          title="需要更新的任务"
          icon={<RefreshCw className="h-4 w-4 text-amber-500" />}
          action={<span className="text-xs text-gray-500">超过7天未更新进展</span>}
          data-testid="update-section"
        >
          <TodoTaskList
            tasks={data.needUpdateTasks}
            showUpdateButton
            onUpdateClick={onUpdateTask}
          />
        </DashboardSection>
      )}

      {/* 我的核心指标卡片（4个） */}
      {data.metrics && data.metrics.length > 0 && (
        <DashboardSection title="我的核心指标" data-testid="metrics-section">
          <StatsCardGrid metrics={data.metrics} columns={4} />
        </DashboardSection>
      )}

      {/* 我的任务趋势图 */}
      {data.trends && data.trends.length > 0 && (
        <DashboardSection title="我的任务趋势" data-testid="trend-section">
          <div className="rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm p-4">
            <TrendChart
              data={data.trends}
              height={280}
              series={[
                { dataKey: 'created', name: '新建', color: '#0EA5E9' },
                { dataKey: 'completed', name: '完成', color: '#10B981' },
                { dataKey: 'delayed', name: '延期', color: '#EF4444' },
              ]}
            />
          </div>
        </DashboardSection>
      )}

      {/* 任务分布 & 参与项目进度 */}
      <DashboardSection title="任务分布 & 参与项目进度" data-testid="distribution-section">
        <ChartGrid
          charts={[
            {
              title: '我的任务状态分布',
              chart: (
                <PieChart
                  data={data.taskStatusDistribution || []}
                  height={280}
                />
              ),
            },
            {
              title: '参与项目进度',
              chart: (
                <ProjectProgressList projects={data.projectProgress || []} />
              ),
            },
          ]}
        />
      </DashboardSection>
    </div>
  );
}

export default EngineerDashboard;
