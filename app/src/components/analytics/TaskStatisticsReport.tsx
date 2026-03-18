/**
 * 任务统计报表组件
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useReportData, ChartDataItem } from './hooks/useReportData';
import { ProjectSelector, LoadingState, ErrorState } from './shared/ReportComponents';

import { StatCard } from './shared/ReportComponents';

// ==================== 类型定义 ====================

interface TaskStats {
  total_tasks: number;
  completed_count: number;
  delayed_count: number;
  urgent_count: number;
  avg_completion_rate: number;
}

interface TaskStatisticsData {
  stats: TaskStats;
  charts: {
    priority_distribution: ChartDataItem[];
    assignee_distribution: ChartDataItem[];
  };
}

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const TaskStatisticsReport: React.FC = () => {
  const { projectId, projects, data, loading, error, setProjectId } =
    useReportData<TaskStatisticsData>({ endpoint: '/reports/task-statistics' });

  return (
    <div className="space-y-4">
      <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
      <LoadingState loading={loading} />
      <ErrorState error={error} />

      {data && !loading && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <StatCard value={data.stats.total_tasks} label="总任务数" />
            <StatCard value={data.stats.completed_count} label="已完成" variant="green" />
            <StatCard value={data.stats.delayed_count} label="延期任务" variant="red" />
            <StatCard value={data.stats.urgent_count} label="紧急任务" variant="orange" />
            <StatCard value={`${data.stats.avg_completion_rate}%`} label="平均完成率" variant="blue" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <PriorityDistributionChart data={data.charts.priority_distribution} colors={PIE_COLORS} />
            <AssigneeDistributionChart data={data.charts.assignee_distribution} />
          </div>
        </>
      )}

      {!projectId && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            请先选择一个项目查看报表
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskStatisticsReport;
