/**
 * 成员效能报表组件
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useReportData } from './hooks/useReportData';
import { StatCard, LoadingState, ErrorState } from './shared/ReportComponents';

import { PIE_COLORS } from './shared/ReportComponents';

// ==================== 类型定义 ====================

interface MemberPerformanceData {
  members: MemberData[];
}

interface MemberData {
  id: number;
  name: string;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  avg_progress: number;
  completion_rate: number;
}

const MemberPerformanceReport: React.FC = () => {
  const { projectId, projects, data, loading, error, setProjectId } =
    useReportData<MemberPerformanceData>({ endpoint: '/reports/member-performance' });

  // 计算汇总统计
  const summaryStats = data?.members
    ? {
        totalMembers: data.members.length,
        avgCompletionRate:
          data.members.length > 0
            ? Math.round(
                data.members.reduce((sum, m) => sum + m.completion_rate, 0) / data.members.length
              )
            : 0,
        totalTasks: data.members.reduce((sum, m) => sum + m.total_tasks, 0),
        totalDelayed: data.members.reduce((sum, m) => sum + m.delayed_tasks, 0)
      }
    : null;

  return (
    <div className="space-y-4">
      <ProjectSelector projects={projects} value={projectId} onChange={setProjectId} />
      <LoadingState loading={loading} />
      <ErrorState error={error} />

      {data && !loading && (
        <>
          {/* 汇总统计卡片 */}
          {summaryStats && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                value={summaryStats.totalMembers}
                label="参与成员"
                variant="blue"
              />
              <StatCard
                value={`${summaryStats.avgCompletionRate}%`}
                label="平均完成率"
                variant="green"
              />
              <StatCard value={summaryStats.totalTasks} label="总任务数" />
              <StatCard
                value={summaryStats.totalDelayed}
                label="延期任务"
                variant="red"
              />
            </div>
          )}

          {/* 图表区域 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 任务数量对比 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">成员任务数量对比</CardTitle>
              </CardContent>
              <ChartContainer data={data.members.slice(0, 10)} height={400}>
                <BarChart data={data.members.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_tasks" name="总任务" fill="#3b82f6" />
                  <Bar dataKey="completed_tasks" name="已完成" fill="#22c55e" />
                  <Bar dataKey="delayed_tasks" name="延期" fill="#ef4444" />
                </BarChart>
              </CardContent>
            </Card>

            {/* 完成率对比 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">成员完成率对比</CardTitle>
              </CardContent>
              <ChartContainer data={data.members.slice(0, 10)} height={400}>
                <BarChart data={data.members.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, '完成率']} />
                  <Bar dataKey="completion_rate" name="完成率" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </CardContent>
            </Card>
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

export default MemberPerformanceReport;
