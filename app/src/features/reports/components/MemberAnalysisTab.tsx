/**
 * 成员任务分析报表 Tab
 * 显示工程师的任务负载、完成趋势、能力匹配度
 * 符合需求文档 REQ_07_analytics.md 2.5节要求
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/features/dashboard/components/StatsCard';
import { TrendChart } from '@/features/dashboard/components/TrendChart';
import { StatusPieChart } from '@/features/dashboard/components/ProgressPieChart';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useMemberAnalysisReport, useMembersForReport } from '../hooks/useReportData';
import { ReportTrendSection } from './ReportTrendSection';
import { REPORT_TERMS } from '../constants/termDefinitions';
import type { ReportFilters } from '../types';

interface MemberAnalysisTabProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
}

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

export function MemberAnalysisTab({ filters, onFiltersChange }: MemberAnalysisTabProps) {
  const navigate = useNavigate();
  const { data: membersData, isLoading: membersLoading } = useMembersForReport();
  const { data: reportData, isLoading: reportLoading } = useMemberAnalysisReport(filters.memberId);

  const isLoading = membersLoading || reportLoading;

  // 任务负载分布数据（需求文档要求：成员任务负载柱状图）
  const taskLoadData = useMemo(() => {
    if (!reportData?.taskList) return [];
    const projectTaskCount: Record<string, number> = {};
    reportData.taskList.forEach(task => {
      const projectName = task.projectName || task.project_name || '未分配';
      projectTaskCount[projectName] = (projectTaskCount[projectName] || 0) + 1;
    });
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];
    return Object.entries(projectTaskCount).map(([name, count], index) => ({
      status: name,
      label: name,
      count,
      color: colors[index % colors.length],
    }));
  }, [reportData?.taskList]);

  // 状态分布数据
  const statusDistribution = useMemo(() => {
    if (!reportData?.taskList) return [];
    const statusCount: Record<string, number> = {};
    reportData.taskList.forEach(task => {
      statusCount[task.status] = (statusCount[task.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count,
      color: STATUS_COLORS[status] || '#9ca3af',
    }));
  }, [reportData?.taskList]);

  // 处理成员选择
  const handleMemberChange = (memberId: string) => {
    onFiltersChange({
      ...filters,
      memberId: memberId === 'all' ? undefined : parseInt(memberId, 10),
    });
  };

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 成员选择器 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">选择成员：</span>
            <Select
              value={filters.memberId?.toString() || ''}
              onValueChange={handleMemberChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="请选择要分析的成员" />
              </SelectTrigger>
              <SelectContent>
                {membersData?.map((member: any) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 未选择成员时显示提示 */}
      {!filters.memberId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
            <p className="text-lg mb-2">请选择要分析的成员</p>
            <p className="text-sm">选择成员后查看其任务情况</p>
          </CardContent>
        </Card>
      )}

      {/* 已选择成员时显示报表 */}
      {filters.memberId && reportLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {filters.memberId && !reportLoading && reportData && (
        <>
          {/* 成员信息标题 */}
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">{reportData.memberName || reportData.member_name}</h3>
            <Badge variant="outline">
              当前任务：{reportData.currentTasks || reportData.current_tasks || 0}个
            </Badge>
          </div>

          {/* 统计卡片（符合需求文档REQ_07 2.5节） */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="当前任务数"
              value={Number(reportData.currentTasks ?? reportData.current_tasks ?? 0)}
              suffix="个"
            />
            <StatsCard
              title="全职比总和"
              value={Number(reportData.totalFullTimeRatio ?? reportData.total_full_time_ratio ?? 0).toFixed(1)}
              suffix="人天"
              titleTermDefinition={REPORT_TERMS.totalFullTimeRatio}
            />
            <StatsCard
              title="平均完成率"
              value={Number(reportData.avgCompletionRate ?? reportData.avg_completion_rate ?? 0).toFixed(1)}
              suffix="%"
              titleTermDefinition={REPORT_TERMS.avgCompletionRate}
            />
            <StatsCard
              title="预估准确性"
              value={reportData.estimationAccuracy?.avgAccuracy != null
                ? (Number(reportData.estimationAccuracy.avgAccuracy) * 100).toFixed(0)
                : (reportData.capabilityMatch != null ? Number(reportData.capabilityMatch).toFixed(0) : '-')}
              suffix={reportData.estimationAccuracy?.avgAccuracy != null || reportData.capabilityMatch != null ? '%' : ''}
              titleTermDefinition={REPORT_TERMS.estimationAccuracy}
            />
          </div>

          {/* 动态维度趋势 */}
          <ReportTrendSection
            metric="tasks_completed"
            title="成员任务完成趋势"
            color="#8b5cf6"
          />

          {/* 图表区域（符合需求文档REQ_07 2.5节：成员任务负载柱状图 + 任务完成趋势折线图） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>成员任务负载</CardTitle>
              </CardHeader>
              <CardContent>
                {taskLoadData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无任务数据</p>
                ) : (
                  <>
                    {/* 任务负载柱状图（需求文档要求） */}
                    <div className="space-y-3">
                      {taskLoadData.map((item) => {
                        const total = reportData.taskList?.length || 0;
                        return (
                          <div key={item.status} className="flex items-center gap-2">
                            <div className="w-24 text-sm text-right truncate">{item.label}</div>
                            <div className="flex-1 h-8 bg-muted rounded overflow-hidden relative">
                              <div
                                className="h-full transition-all duration-300 flex items-center justify-end pr-2"
                                style={{
                                  width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                                  backgroundColor: item.color,
                                  minWidth: item.count > 0 ? '40px' : '0',
                                }}
                              >
                                <span className="text-white text-sm font-medium">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>任务完成趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={[]}
                  isLoading={false}
                  title="近30天任务完成情况"
                />
              </CardContent>
            </Card>
          </div>

          {/* 任务状态分布（补充信息，单独展示） */}
          {statusDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>任务状态分布</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPieChart data={statusDistribution} />
              </CardContent>
            </Card>
          )}

          {/* 预估准确性分布图（v1.2 新增，需求文档REQ_07 2.5节要求） */}
          {reportData.estimationAccuracy && (
            <Card>
              <CardHeader>
                <CardTitle>预估准确性分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 分布统计 */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="text-2xl font-bold text-green-600">{reportData.estimationAccuracy.accurateCount}</div>
                      <div className="text-xs text-muted-foreground">精准 (±10%)</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <div className="text-2xl font-bold text-blue-600">{reportData.estimationAccuracy.slightDeviationCount}</div>
                      <div className="text-xs text-muted-foreground">轻微偏差 (±10-30%)</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                      <div className="text-2xl font-bold text-orange-600">{reportData.estimationAccuracy.obviousDeviationCount}</div>
                      <div className="text-xs text-muted-foreground">明显偏差 (±30-50%)</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
                      <div className="text-2xl font-bold text-red-600">{reportData.estimationAccuracy.seriousDeviationCount}</div>
                      <div className="text-xs text-muted-foreground">严重偏差 (&gt;±50%)</div>
                    </div>
                  </div>
                  {/* 可视化柱状图 */}
                  <div className="flex gap-1 h-6 rounded overflow-hidden">
                    {reportData.estimationAccuracy.accurateCount > 0 && (
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(reportData.estimationAccuracy.accurateCount / (reportData.taskList?.length || 1)) * 100}%`,
                        }}
                      />
                    )}
                    {reportData.estimationAccuracy.slightDeviationCount > 0 && (
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(reportData.estimationAccuracy.slightDeviationCount / (reportData.taskList?.length || 1)) * 100}%`,
                        }}
                      />
                    )}
                    {reportData.estimationAccuracy.obviousDeviationCount > 0 && (
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: `${(reportData.estimationAccuracy.obviousDeviationCount / (reportData.taskList?.length || 1)) * 100}%`,
                        }}
                      />
                    )}
                    {reportData.estimationAccuracy.seriousDeviationCount > 0 && (
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${(reportData.estimationAccuracy.seriousDeviationCount / (reportData.taskList?.length || 1)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  {/* 图例 */}
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" />精准</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" />轻微偏差</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" />明显偏差</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" />严重偏差</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 能力模型展示（需求文档REQ_07 2.5节要求：能力模型得分展示） */}
          {(reportData.capabilities || reportData.capabilityMatch) && (
            <Card>
              <CardHeader>
                <CardTitle>能力模型</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.capabilities && reportData.capabilities.length > 0 ? (
                  <div className="space-y-4">
                    {reportData.capabilities.map((capability, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">{capability.modelName || capability.model_name}</span>
                          <Badge variant="outline">总分：{(capability.overallScore || capability.overall_score || 0).toFixed(0)}</Badge>
                        </div>
                        <div className="space-y-2">
                          {/* 能力维度展示（格式：模型名称: 维度1:分数 | 维度2:分数 | 维度3:分数） */}
                          {(capability.dimensionScores || capability.dimension_scores || '').split('|').map((dim, i) => {
                            const parts = dim.trim().split(':');
                            if (parts.length !== 2) return null;
                            const [dimName, scoreStr] = parts;
                            const score = parseFloat(scoreStr) || 0;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-24 text-sm text-muted-foreground">{dimName.trim()}</div>
                                <Progress value={score} className="flex-1 h-2" />
                                <div className="w-10 text-sm text-right">{score.toFixed(0)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reportData.capabilityMatch ? (
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {Number(reportData.capabilityMatch).toFixed(0)}%
                    </div>
                    <p className="text-muted-foreground">综合能力匹配度</p>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">暂无能力评估数据</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 任务明细表格（需求文档要求：成员任务明细表格，含预估准确性列） */}
          <Card>
            <CardHeader>
              <CardTitle>任务明细</CardTitle>
            </CardHeader>
            <CardContent>
              {!reportData.taskList || reportData.taskList.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无任务</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>任务描述</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">进度</TableHead>
                      <TableHead className="text-right">全职比</TableHead>
                      <TableHead className="text-right">预估准确性</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>计划结束</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.taskList.map((task) => {
                      const statusColor = STATUS_COLORS[task.status] || '#9ca3af';
                      const statusLabel = STATUS_LABELS[task.status] || task.status;
                      const priorityColor = PRIORITY_COLORS[task.priority] || '#9ca3af';
                      const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;
                      const projectName = task.projectName || task.project_name || '未分配';
                      const fullTimeRatio = task.fullTimeRatio ?? task.full_time_ratio;
                      const plannedEndDate = task.plannedEndDate || task.planned_end_date;
                      const estimationAccuracy = task.estimationAccuracy ?? task.estimation_accuracy;
                      // 预估准确性等级
                      const getAccuracyDisplay = (accuracy: number | undefined) => {
                        if (accuracy === undefined || accuracy === null) return { label: '-', color: '#9ca3af' };
                        const pct = accuracy * 100;
                        if (accuracy >= 0.9) return { label: `${pct.toFixed(0)}%`, color: '#22c55e' };
                        if (accuracy >= 0.7) return { label: `${pct.toFixed(0)}%`, color: '#3b82f6' };
                        if (accuracy >= 0.5) return { label: `${pct.toFixed(0)}%`, color: '#f59e0b' };
                        return { label: `${pct.toFixed(0)}%`, color: '#ef4444' };
                      };
                      const accuracyDisplay = getAccuracyDisplay(estimationAccuracy);
                      return (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {task.description}
                          </TableCell>
                          <TableCell>{projectName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{ borderColor: statusColor, color: statusColor }}
                            >
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{task.progress}%</TableCell>
                          <TableCell className="text-right">
                            {typeof fullTimeRatio === 'number' && fullTimeRatio > 0 ? `${Number(fullTimeRatio).toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span style={{ color: accuracyDisplay.color, fontWeight: 500 }}>
                              {accuracyDisplay.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{ borderColor: priorityColor, color: priorityColor }}
                            >
                              {priorityLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {plannedEndDate
                              ? new Date(plannedEndDate).toLocaleDateString('zh-CN')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
