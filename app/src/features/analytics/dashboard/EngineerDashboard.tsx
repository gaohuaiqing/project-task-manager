/**
 * 工程师仪表板组件
 * 纯个人数据视图
 *
 * @module analytics/dashboard/EngineerDashboard
 * @see REQ_07a_dashboard.md §4.4
 *
 * 布局结构:
 * 1. 🚨 我的紧急任务区（置顶）- 3个卡片
 * 2. 📋 我的待办任务列表（紧随置顶区）
 * 3. 🔄 需要更新的任务
 * 4. 核心指标卡片（4个，带趋势）
 * 5. 图表区域（趋势图 + 分布 + 项目进度）
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatsCard, TrendChart, PieChart } from '../shared/components';
import { AlertCards } from './components/AlertCard';
import { TodoTaskList } from './components/TodoTaskList';
import { ProjectProgressList } from './components/ProjectProgressList';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useEngineerDashboardData } from './hooks/useDashboardData';
import type { AlertData, TodoTask, ProjectProgress } from './types';

export interface EngineerDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警卡片 */
  onAlertClick?: (alert: AlertData) => void;
  /** 点击预警操作按钮 */
  onAlertActionClick?: (alert: AlertData) => void;
  /** 点击任务 */
  onTaskClick?: (task: TodoTask) => void;
  /** 点击项目 */
  onProjectClick?: (project: ProjectProgress) => void;
  /** 更新任务 */
  onUpdateTask?: (task: TodoTask) => void;
}

/**
 * 工程师仪表板组件
 */
export function EngineerDashboard({
  projectId,
  className,
  onAlertClick,
  onAlertActionClick,
  onTaskClick,
  onProjectClick,
  onUpdateTask,
}: EngineerDashboardProps) {
  const { data, isLoading, error } = useEngineerDashboardData(projectId);

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
      {/* 1. 紧急任务预警区（置顶） */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          🚨 我的紧急任务
        </h2>
        <AlertCards
          alerts={data.alerts}
          onAlertClick={onAlertClick}
          onAlertActionClick={onAlertActionClick}
        />
      </section>

      {/* 2. 待办任务列表（紧随置顶区） */}
      <section>
        <TodoTaskList
          title="📋 我的待办任务"
          tasks={data.todoTasks}
          maxItems={5}
          isLoading={isLoading}
          onTaskClick={onTaskClick}
        />
      </section>

      {/* 3. 需要更新的任务 */}
      {data.needUpdateTasks && data.needUpdateTasks.length > 0 && (
        <section>
          <TodoTaskList
            title="🔄 需要更新的任务"
            subtitle="超过7天未更新进展的任务"
            tasks={data.needUpdateTasks}
            maxItems={3}
            isLoading={isLoading}
            showUpdateButton
            onTaskClick={onTaskClick}
            onUpdateTask={onUpdateTask}
          />
        </section>
      )}

      {/* 4. 核心指标卡片 */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.metrics.map((metric, index) => (
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
      </section>

      {/* 5. 图表区域 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5.1 任务趋势图 */}
        <TrendChart
          title="我的任务趋势（30天）"
          data={data.trends || []}
          isLoading={isLoading}
          series={[
            { dataKey: 'completed', name: '完成', color: '#10B981' },
            { dataKey: 'created', name: '新建', color: '#0EA5E9' },
            { dataKey: 'delayed', name: '延期', color: '#EF4444' },
          ]}
        />

        {/* 5.2 任务状态分布 + 参与项目进度 */}
        <div className="space-y-6">
          <PieChart
            title="我的任务状态分布"
            data={data.taskStatusDistribution || []}
            isLoading={isLoading}
            donut
            showPercentage
            height={200}
          />

          <ProjectProgressList
            title="参与项目进度"
            projects={data.projectProgress || []}
            maxItems={3}
            isLoading={isLoading}
            onProjectClick={onProjectClick}
          />
        </div>
      </section>
    </div>
  );
}

export default EngineerDashboard;
