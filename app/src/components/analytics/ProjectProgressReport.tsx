/**
 * 项目进度报表组件
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
import { ProjectSelector, LoadingState, ErrorState, StatCard } from './shared/ReportComponents';
import { useReportData, ChartDataItem } from './hooks/useReportData';

import { STATUS_COLORS, PRIORITY_COLORS, PIE_COLORS } from './chart-config';

// ==================== 类型定义 ====================

interface ProjectStats {
  id: string;
  name: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  delayed_tasks: number;
}

interface ProjectProgressData {
  stats: ProjectStats;
  charts: {
    status_distribution: ChartDataItem[];
    priority_distribution: ChartDataItem[];
  };
}

const ProjectProgressReport: React.FC = () => {
  const { projectId, projects, data, loading, error, setProjectId } =
    useReportData<ProjectProgressData>({ endpoint: '/reports/project-progress' });

  return (
    <div className="space-y-4">
      <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
      <LoadingState loading={loading} />
      <ErrorState error={error} />

      {data && !loading && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard variant="blue" value={`${data.stats.progress}%`} label="总体进度" />
            <StatCard variant="green" value={data.stats.completed_tasks} label="已完成任务" />
            <StatCard variant="orange" value={data.stats.in_progress_tasks} label="进行中任务" />
            <StatCard variant="red" value={data.stats.delayed_tasks} label="延期任务" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <StatusDistributionChart data={data.charts.status_distribution} colors={STATUS_COLORS} />
            <PriorityDistributionChart data={data.charts.priority_distribution} colors={PRIORITY_COLORS} />
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

export default ProjectProgressReport;
