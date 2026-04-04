/**
 * 任务统计报表 Tab
 * 显示任务优先级分布、负责人分布等
 * 符合需求文档 REQ_07_analytics.md 2.3节要求
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
import { StatusPieChart } from '@/features/dashboard/components/ProgressPieChart';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useTaskStatisticsReport } from '../hooks/useReportData';
import { ReportTrendSection } from './ReportTrendSection';
import { REPORT_TERMS } from '../constants/termDefinitions';
import type { ReportFilters } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TaskStatisticsTabProps {
  filters: ReportFilters;
}

// 优先级颜色映射
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#9ca3af',
};

// 优先级标签映射
const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  not_started: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  delayed: '#ef4444',
  delay_warning: '#f59e0b',
  early_completed: '#22c55e',
  on_time_completed: '#22c55e',
  overdue_completed: '#f97316',
};

// 状态标签映射
const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  delay_warning: '延期预警',
  early_completed: '提前完成',
  on_time_completed: '按时完成',
  overdue_completed: '超期完成',
};

export function TaskStatisticsTab({ filters }: TaskStatisticsTabProps) {
  const navigate = useNavigate();
  const { data: reportData, isLoading } = useTaskStatisticsReport(filters);

  // 优先级分布柱状图数据（需求文档要求：优先级分布柱状图）
  const priorityChartData = useMemo(() => {
    if (!reportData?.priorityDistribution) return [];
    return Object.entries(reportData.priorityDistribution).map(([priority, count]) => ({
      status: priority,
      label: PRIORITY_LABELS[priority] || priority,
      count,
      color: PRIORITY_COLORS[priority] || '#9ca3af',
    }));
  }, [reportData?.priorityDistribution]);

  // 负责人分布饼图数据
  const assigneeChartData = useMemo(() => {
    if (!reportData?.assigneeDistribution) return [];
    return reportData.assigneeDistribution.map((item, index) => ({
      status: item.assigneeId.toString(),
      label: item.assigneeName,
      count: item.taskCount,
      color: `hsl(${(index * 45) % 360}, 70%, 50%)`,
    }));
  }, [reportData?.assigneeDistribution]);

  // 任务类型分布数据（v1.2 新增）
  const taskTypeChartData = useMemo(() => {
    if (!reportData?.taskTypeDistribution) return [];
    return reportData.taskTypeDistribution.map((item, index) => ({
      taskType: item.taskType,
      taskTypeName: item.taskTypeName,
      count: item.count,
      completedCount: item.completedCount,
      delayedCount: item.delayedCount,
      avgDuration: item.avgDuration,
    }));
  }, [reportData?.taskTypeDistribution]);

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
      {/* 统计卡片（符合需求文档REQ_07 2.3节） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总任务数"
          value={reportData.totalTasks}
          suffix="个"
        />
        <StatsCard
          title="平均完成率"
          value={reportData.avgCompletionRate.toFixed(1)}
          suffix="%"
          titleTooltip={REPORT_TERMS.avgCompletionRate?.fullDesc}
        />
        <StatsCard
          title="延期率"
          value={reportData.delayRate.toFixed(1)}
          suffix="%"
          titleTooltip={REPORT_TERMS.delayRate?.fullDesc}
          invertTrendColors
        />
        <StatsCard
          title="紧急任务"
          value={reportData.urgentCount}
          suffix="个"
          onClick={() => navigate('/tasks?priority=urgent')}
        />
      </div>

      {/* 动态维度趋势图（符合需求文档REQ_07 双维度规范） */}
      <ReportTrendSection
        metric="tasks_completed"
        title="任务完成趋势"
        projectId={filters.projectId}
        color="#22c55e"
      />

      {/* 图表区域（符合需求文档REQ_07 2.3节：优先级分布柱状图 + 负责人任务分布饼图） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 使用饼图模拟柱状图效果（后续可替换为真实柱状图组件） */}
            <StatusPieChart data={priorityChartData} />
            {/* 优先级柱状图展示 */}
            <div className="mt-4 space-y-2">
              {priorityChartData.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className="w-16 text-sm text-right">{item.label}</div>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${reportData.totalTasks > 0 ? (item.count / reportData.totalTasks) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <div className="w-12 text-sm text-muted-foreground">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>负责人任务分布</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={assigneeChartData} />
          </CardContent>
        </Card>
      </div>

      {/* 负责人统计表格 */}
      <Card>
        <CardHeader>
          <CardTitle>负责人任务统计</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.assigneeDistribution.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>负责人</TableHead>
                  <TableHead className="text-right">总任务数</TableHead>
                  <TableHead className="text-right">已完成</TableHead>
                  <TableHead className="text-right">延期数</TableHead>
                  <TableHead className="text-right">完成率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.assigneeDistribution.map((item) => {
                  const completionRate = item.taskCount > 0
                    ? ((item.completedCount / item.taskCount) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <TableRow key={item.assigneeId}>
                      <TableCell className="font-medium">{item.assigneeName}</TableCell>
                      <TableCell className="text-right">{item.taskCount}</TableCell>
                      <TableCell className="text-right">{item.completedCount}</TableCell>
                      <TableCell className="text-right">
                        {item.delayedCount > 0 ? (
                          <span className="text-destructive">{item.delayedCount}</span>
                        ) : (
                          item.delayedCount
                        )}
                      </TableCell>
                      <TableCell className="text-right">{completionRate}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 任务明细表格（需求文档要求：任务统计明细表格） */}
      <Card>
        <CardHeader>
          <CardTitle>任务明细</CardTitle>
        </CardHeader>
        <CardContent>
          {!reportData.taskList || reportData.taskList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务描述</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>任务类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead className="text-right">进度</TableHead>
                  <TableHead>计划结束</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.taskList.slice(0, 20).map((task) => {
                  const statusColor = STATUS_COLORS[task.status] || '#9ca3af';
                  const statusLabel = STATUS_LABELS[task.status] || task.status;
                  const priorityColor = PRIORITY_COLORS[task.priority] || '#9ca3af';
                  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
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
                        <Badge variant="outline">
                          {task.taskType || '其它'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: statusColor, color: statusColor }}
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: priorityColor, color: priorityColor }}
                        >
                          {priorityLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{task.progress}%</TableCell>
                      <TableCell>
                        {task.plannedEndDate
                          ? format(new Date(task.plannedEndDate), 'MM/dd', { locale: zhCN })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {reportData.taskList && reportData.taskList.length > 20 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              显示前20条，共 {reportData.taskList.length} 条记录
            </p>
          )}
        </CardContent>
      </Card>

      {/* 任务类型分布卡片（v1.2 新增） */}
      {taskTypeChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>任务类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskTypeChartData.map((item) => {
                const completionRate = item.count > 0
                  ? ((item.completedCount / item.count) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div key={item.taskType} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded">
                    <div className="w-24 text-sm font-medium">{item.taskTypeName}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full transition-all duration-300 bg-primary"
                            style={{
                              width: `${(item.count / (reportData?.totalTasks || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count}个</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600">完成: {item.completedCount}</span>
                        <span className="text-red-600">延期: {item.delayedCount}</span>
                        <span className="text-muted-foreground">平均工期: {item.avgDuration}天</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
