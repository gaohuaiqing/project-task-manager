/**
 * 延期分析报表组件
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useReportData, ChartDataItem, from './shared/ReportComponents';

// ==================== 类型定义 ====================

interface DelayStats {
  total_delayed: number;
}

interface DelayAnalysisData {
  stats: DelayStats;
  charts: {
    reason_distribution: ChartDataItem[];
    trend: ChartDataItem[];
    assignee_delay_stats: ChartDataItem[];
  }
}

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const DelayAnalysisReport: React.FC = () => {
  const { projectId, projects, data, loading, error, setProjectId } =
    useReportData<DelayAnalysisData>({ endpoint: '/reports/delay-analysis' });
  return (
    <div className="space-y-4">
      <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
      <LoadingState loading={loading} />
      <ErrorState error={error} />

      {data && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard value={data.stats.total_delayed} label="延期任务总数" variant="red" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ReasonDistributionChart data={data.charts.reason_distribution} colors={PIE_COLORS} />
            <AssigneeDelayChart data={data.charts.assignee_delay_stats} colors={PIE_COLORS} />
            <TrendChart data={data.charts.trend} />
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

export default DelayAnalysisReport;
