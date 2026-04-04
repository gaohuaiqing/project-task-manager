/**
 * 延期分析报表 Tab
 * 显示延期原因统计、延期趋势、延期任务列表
 * 符合需求文档 REQ_07_analytics.md 2.4节要求
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatsCard } from '@/features/dashboard/components/StatsCard';
import { TrendChart } from '@/features/dashboard/components/TrendChart';
import { StatusPieChart } from '@/features/dashboard/components/ProgressPieChart';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useDelayAnalysisReport } from '../hooks/useReportData';
import { ReportTrendSection } from './ReportTrendSection';
import type { ReportFilters } from '../types';

interface DelayAnalysisTabProps {
  filters: ReportFilters;
}

// 延期类型标签映射
const DELAY_TYPE_LABELS: Record<string, string> = {
  delay_warning: '延期预警',
  delayed: '已延期',
  overdue_completed: '超期完成',
};

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  not_started: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  delayed: '#ef4444',
  delay_warning: '#f59e0b',
};

// 状态标签映射
const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  delay_warning: '延期预警',
};

export function DelayAnalysisTab({ filters }: DelayAnalysisTabProps) {
  const navigate = useNavigate();
  const { data: reportData, isLoading } = useDelayAnalysisReport(filters);

  // 延期原因柱状图数据（需求文档要求：延期原因分类统计柱状图）
  const reasonChartData = useMemo(() => {
    if (!reportData?.delayReasons) return [];
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#22c55e', '#6b7280'];
    return reportData.delayReasons.map((item, index) => ({
      status: item.reason,
      label: item.reason,
      count: item.count,
      color: colors[index % colors.length],
    }));
  }, [reportData?.delayReasons]);

  // 延期类型分布数据
  const typeDistribution = useMemo(() => {
    if (!reportData) return [];
    return [
      {
        status: 'delay_warning',
        label: '延期预警',
        count: reportData.warningCount,
        color: '#f59e0b',
      },
      {
        status: 'delayed',
        label: '已延期',
        count: reportData.delayedCount,
        color: '#ef4444',
      },
      {
        status: 'overdue_completed',
        label: '超期完成',
        count: reportData.overdueCompletedCount,
        color: '#22c55e',
      },
    ];
  }, [reportData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <p>暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片（符合需求文档REQ_07 2.4节） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="延期任务总数"
          value={reportData.totalDelayed}
          suffix="个"
          onClick={() => navigate('/tasks?status=delayed')}
        />
        <StatsCard
          title="延期预警"
          value={reportData.warningCount}
          suffix="个"
          onClick={() => navigate('/tasks?status=warning')}
        />
        <StatsCard
          title="已延期"
          value={reportData.delayedCount}
          suffix="个"
        />
        <StatsCard
          title="超期完成"
          value={reportData.overdueCompletedCount}
          suffix="个"
        />
      </div>

      {/* 动态维度趋势（符合需求文档REQ_07 双维度规范） */}
      <ReportTrendSection
        metric="tasks_delayed"
        title="延期趋势"
        projectId={filters.projectId}
        color="#ef4444"
      />

      {/* 图表区域（符合需求文档REQ_07 2.4节：延期原因分类统计柱状图 + 延期趋势折线图） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>延期原因分布</CardTitle>
          </CardHeader>
          <CardContent>
            {reasonChartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无延期原因数据</p>
            ) : (
              <>
                <StatusPieChart data={reasonChartData} />
                {/* 延期原因柱状图展示（需求文档要求） */}
                <div className="mt-4 space-y-2">
                  {reasonChartData.map((item) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <div className="w-20 text-sm text-right truncate">{item.label}</div>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${reportData.totalDelayed > 0 ? (item.count / reportData.totalDelayed) * 100 : 0}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <div className="w-12 text-sm text-muted-foreground">{item.count}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>延期趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={reportData.delayTrend.map(t => ({
                date: t.date,
                created: 0,
                completed: 0,
                delayed: t.value,
              }))}
              isLoading={false}
              title="近30天延期趋势"
            />
          </CardContent>
        </Card>
      </div>

      {/* 延期类型分布（补充信息，单独展示） */}
      {typeDistribution.some(d => d.count > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>延期类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={typeDistribution} />
          </CardContent>
        </Card>
      )}

      {/* 延期任务列表（需求文档要求：延期任务列表表格） */}
      <Card>
        <CardHeader>
          <CardTitle>延期任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          {!reportData.delayedTasks || reportData.delayedTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无延期任务</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务描述</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>延期类型</TableHead>
                  <TableHead className="text-right">延期天数</TableHead>
                  <TableHead>延期原因</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.delayedTasks.slice(0, 20).map((task) => {
                  const statusColor = STATUS_COLORS[task.status] || '#9ca3af';
                  const statusLabel = STATUS_LABELS[task.status] || task.status;
                  const delayTypeLabel = DELAY_TYPE_LABELS[task.delayType] || task.delayType;
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {task.description}
                      </TableCell>
                      <TableCell>{task.projectName}</TableCell>
                      <TableCell>{task.assigneeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{delayTypeLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={task.delayDays > 7 ? 'text-destructive font-semibold' : ''}>
                          {task.delayDays}天
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{task.reason || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: statusColor, color: statusColor }}
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {reportData.delayedTasks && reportData.delayedTasks.length > 20 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              显示前20条，共 {reportData.delayedTasks.length} 条记录
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
