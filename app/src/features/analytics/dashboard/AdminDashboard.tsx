/**
 * 系统管理员仪表板组件
 * 全局汇总 + 部门对比 + 资源调配建议
 *
 * @module analytics/dashboard/AdminDashboard
 * @see REQ_07a_dashboard.md §4.1
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatsCard, TrendChart, BarChart, TaskTypeChart } from '../shared/components';
import { AlertCards } from './components/AlertCard';
import { AllocationSuggestionCards } from './components/AllocationSuggestion';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useAdminDashboardData } from './hooks/useDashboardData';
import type {
  AlertData,
  DepartmentEfficiency,
  AllocationSuggestion,
  HighRiskProject,
} from './types';

export interface AdminDashboardProps {
  /** 可选的项目ID筛选 */
  projectId?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击预警卡片 */
  onAlertClick?: (alert: AlertData) => void;
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
 * 部门状态配置
 */
const DEPT_STATUS_CONFIG = {
  healthy: {
    label: '健康',
    icon: '🟢',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  warning: {
    label: '警告',
    icon: '🟡',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  risk: {
    label: '风险',
    icon: '🔴',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
};

/**
 * 高风险项目卡片组件
 */
function HighRiskProjectCard({
  project,
  onClick,
}: {
  project: HighRiskProject;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 cursor-pointer',
        'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30',
        'hover:shadow-md transition-all'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {project.name}
        </span>
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
          高风险
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {project.riskFactors.map((factor, index) => (
          <span
            key={index}
            className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          >
            {factor}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>完成率: {project.completionRate}%</span>
        <span>延期: {project.delayedTasks}个</span>
        <span>负责人: {project.manager}</span>
      </div>
    </div>
  );
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
  onAlertClick,
  onAlertActionClick,
  onDepartmentClick,
  onSuggestionClick,
  onHighRiskProjectClick,
}: AdminDashboardProps) {
  const { data, isLoading, error } = useAdminDashboardData(projectId);
  const [isHighRiskExpanded, setIsHighRiskExpanded] = React.useState(true);

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
    <div data-testid="admin-dashboard-container" className={cn('space-y-6', className)}>
      {/* 风险预警区 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          🚨 风险预警
        </h2>
        <div className="space-y-3">
          {/* 预警卡片行 */}
          {data.alerts && data.alerts.length > 0 && (
            <AlertCards
              alerts={data.alerts}
              onAlertClick={onAlertClick}
              onAlertActionClick={onAlertActionClick}
            />
          )}
          {/* 高风险项目卡片 */}
          {data.highRiskProjects && data.highRiskProjects.length > 0 && (
            <div
              className={cn(
                'rounded-xl border border-red-100 dark:border-red-900/30',
                'bg-white dark:bg-slate-800/50 shadow-sm p-4'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  🏗️ 高风险项目
                  <span className="text-xs text-red-600 dark:text-red-400">
                    ({data.highRiskProjects.length})
                  </span>
                </h3>
                <button
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                  onClick={() => setIsHighRiskExpanded(!isHighRiskExpanded)}
                >
                  {isHighRiskExpanded ? '收起详情 ▲' : '展开详情 ▼'}
                </button>
              </div>
              {isHighRiskExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.highRiskProjects.map((project) => (
                    <HighRiskProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => onHighRiskProjectClick?.(project)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 核心指标卡片（4x2网格） */}
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

      {/* 部门效能对比表格 */}
      {data.departmentEfficiency && data.departmentEfficiency.length > 0 && (
        <section>
          <div
            className={cn(
              'rounded-xl border border-gray-100 dark:border-slate-700/50',
              'bg-white dark:bg-slate-800/50 shadow-sm'
            )}
          >
            <div className="p-4 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                部门效能对比
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400">
                    部门
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    完成率
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    延期率
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    利用率
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    趋势
                  </TableHead>
                  <TableHead className="h-8 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                    状态
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departmentEfficiency.map((dept) => {
                  const statusConfig = DEPT_STATUS_CONFIG[dept.status];
                  return (
                    <TableRow
                      key={dept.id}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30',
                        'transition-colors'
                      )}
                      onClick={() => onDepartmentClick?.(dept)}
                    >
                      <TableCell className="py-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {dept.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span
                          className={cn(
                            'text-sm font-mono',
                            dept.completionRate >= 80
                              ? 'text-emerald-500'
                              : dept.completionRate >= 60
                                ? 'text-amber-500'
                                : 'text-red-500'
                          )}
                        >
                          {dept.completionRate}%
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span
                          className={cn(
                            'text-sm font-mono',
                            dept.delayRate <= 10
                              ? 'text-emerald-500'
                              : dept.delayRate <= 20
                                ? 'text-amber-500'
                                : 'text-red-500'
                          )}
                        >
                          {dept.delayRate}%
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span
                          className={cn(
                            'text-sm font-mono',
                            dept.utilizationRate >= 80
                              ? 'text-emerald-500'
                              : dept.utilizationRate >= 60
                                ? 'text-amber-500'
                                : 'text-red-500'
                          )}
                        >
                          {dept.utilizationRate}%
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            dept.trend > 0
                              ? 'text-emerald-500'
                              : dept.trend < 0
                                ? 'text-red-500'
                                : 'text-gray-400'
                          )}
                        >
                          {dept.trend > 0 ? '↑' : dept.trend < 0 ? '↓' : '→'}
                          {dept.trend !== 0 && `${Math.abs(dept.trend)}%`}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            statusConfig.color,
                            statusConfig.bg
                          )}
                        >
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* 图表分析区（2x2网格） */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左上: 全局任务趋势 */}
        <TrendChart
          title="全局任务趋势"
          data={data.trends || []}
          isLoading={isLoading}
          series={[
            { dataKey: 'created', name: '新建', color: '#0EA5E9' },
            { dataKey: 'completed', name: '完成', color: '#10B981' },
            { dataKey: 'delayed', name: '延期', color: '#EF4444' },
          ]}
        />

        {/* 右上: 任务类型分布（12类，按分组着色的横向柱状图） */}
        <TaskTypeChart
          title="任务类型分布（12类）"
          data={data.taskTypeDistribution || []}
          isLoading={isLoading}
        />

        {/* 左下: 部门延期率趋势 */}
        <TrendChart
          title="部门延期率趋势"
          data={data.departmentDelayTrends || []}
          isLoading={isLoading}
          showTimeRangeSelector={false}
          series={[
            { dataKey: '研发一部', name: '研发一部', color: '#0EA5E9' },
            { dataKey: '研发二部', name: '研发二部', color: '#10B981' },
            { dataKey: '测试部', name: '测试部', color: '#F59E0B' },
            { dataKey: '产品部', name: '产品部', color: '#EF4444' },
          ]}
        />

        {/* 右下: 资源利用率变化趋势 */}
        <TrendChart
          title="资源利用率变化趋势"
          data={data.utilizationTrends || []}
          isLoading={isLoading}
          showTimeRangeSelector={false}
          series={[
            { dataKey: 'utilization', name: '利用率', color: '#0EA5E9' },
          ]}
        />
      </section>

      {/* 资源调配建议 */}
      {data.allocationSuggestions && data.allocationSuggestions.length > 0 && (
        <section>
          <AllocationSuggestionCards
            title="资源调配建议"
            suggestions={data.allocationSuggestions}
            isLoading={isLoading}
            onMemberClick={onSuggestionClick}
          />
        </section>
      )}
    </div>
  );
}

export default AdminDashboard;
