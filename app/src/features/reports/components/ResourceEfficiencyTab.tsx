/**
 * 资源效能分析报表 Tab
 * 显示成员产能、预估准确性、返工率等效能指标
 * 符合需求文档 REQ_07_analytics.md 2.6节要求
 */
import { useMemo } from 'react';
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
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { useResourceEfficiencyReport } from '../hooks/useReportData';
import { REPORT_TERMS } from '../constants/termDefinitions';
import type { ReportFilters } from '../types';
import { useNavigate } from 'react-router-dom';

interface ResourceEfficiencyTabProps {
  filters: ReportFilters;
}

// 效能等级颜色
const getProductivityColor = (productivity: number): string => {
  if (productivity >= 1.5) return '#22c55e'; // 高产能
  if (productivity >= 1.0) return '#3b82f6'; // 正常
  if (productivity >= 0.5) return '#f59e0b'; // 低产能
  return '#ef4444'; // 需要关注
};

// 预估准确性等级
const getAccuracyLevel = (accuracy: number): { label: string; color: string } => {
  if (accuracy >= 0.9) return { label: '精准', color: '#22c55e' };
  if (accuracy >= 0.7) return { label: '良好', color: '#3b82f6' };
  if (accuracy >= 0.5) return { label: '偏差', color: '#f59e0b' };
  return { label: '严重偏差', color: '#ef4444' };
};

// 返工率等级
const getReworkLevel = (reworkRate: number): { label: string; color: string } => {
  if (reworkRate <= 10) return { label: '优秀', color: '#22c55e' };
  if (reworkRate <= 20) return { label: '良好', color: '#3b82f6' };
  if (reworkRate <= 30) return { label: '一般', color: '#f59e0b' };
  return { label: '需改进', color: '#ef4444' };
};

export function ResourceEfficiencyTab({ filters }: ResourceEfficiencyTabProps) {
  const navigate = useNavigate();
  const { data: reportData, isLoading } = useResourceEfficiencyReport(filters);

  // 产能排名前5
  const topProductivityMembers = useMemo(() => {
    if (!reportData?.memberEfficiencyList) return [];
    return [...reportData.memberEfficiencyList]
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 5);
  }, [reportData?.memberEfficiencyList]);

  // 预估准确性分布
  const accuracyDistribution = useMemo(() => {
    if (!reportData?.memberEfficiencyList) return { accurate: 0, good: 0, deviation: 0, serious: 0 };
    let accurate = 0, good = 0, deviation = 0, serious = 0;
    reportData.memberEfficiencyList.forEach(m => {
      if (m.estimationAccuracy >= 0.9) accurate++;
      else if (m.estimationAccuracy >= 0.7) good++;
      else if (m.estimationAccuracy >= 0.5) deviation++;
      else serious++;
    });
    return { accurate, good, deviation, serious };
  }, [reportData?.memberEfficiencyList]);

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
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="平均产能"
          value={reportData.avgProductivity.toFixed(2)}
          suffix=""
          titleTooltip={REPORT_TERMS.productivity?.fullDesc}
        />
        <StatsCard
          title="平均预估准确性"
          value={`${(reportData.avgEstimationAccuracy * 100).toFixed(1)}%`}
          titleTooltip={REPORT_TERMS.estimationAccuracy?.fullDesc}
        />
        <StatsCard
          title="平均返工率"
          value={`${reportData.avgReworkRate.toFixed(1)}%`}
          titleTooltip={REPORT_TERMS.reworkRate?.fullDesc}
          invertTrendColors
        />
        <StatsCard
          title="全职比利用率"
          value={`${reportData.avgFulltimeUtilization.toFixed(1)}%`}
          titleTooltip={REPORT_TERMS.fulltimeUtilization?.fullDesc}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 产能排名 Top5 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">产能排名 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProductivityMembers.map((member, index) => (
                <div key={member.memberId} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{member.memberName}</span>
                      <span className="text-sm text-muted-foreground">
                        {member.productivity.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(member.productivity / 2 * 100, 100)}%`,
                          backgroundColor: getProductivityColor(member.productivity),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {topProductivityMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">暂无数据</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 预估准确性分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">预估准确性分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                <span className="text-sm flex-1">精准 (≥90%)</span>
                <Badge variant="outline" style={{ color: '#22c55e', borderColor: '#22c55e' }}>
                  {accuracyDistribution.accurate}人
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-sm flex-1">良好 (70-90%)</span>
                <Badge variant="outline" style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                  {accuracyDistribution.good}人
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-sm flex-1">偏差 (50-70%)</span>
                <Badge variant="outline" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
                  {accuracyDistribution.deviation}人
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                <span className="text-sm flex-1">严重偏差 (&lt;50%)</span>
                <Badge variant="outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                  {accuracyDistribution.serious}人
                </Badge>
              </div>
            </div>

            {/* 可视化柱状图 */}
            <div className="mt-4 flex gap-1 h-8">
              {accuracyDistribution.accurate > 0 && (
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(accuracyDistribution.accurate / reportData.memberEfficiencyList.length) * 100}%`,
                    backgroundColor: '#22c55e',
                  }}
                />
              )}
              {accuracyDistribution.good > 0 && (
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(accuracyDistribution.good / reportData.memberEfficiencyList.length) * 100}%`,
                    backgroundColor: '#3b82f6',
                  }}
                />
              )}
              {accuracyDistribution.deviation > 0 && (
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(accuracyDistribution.deviation / reportData.memberEfficiencyList.length) * 100}%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
              )}
              {accuracyDistribution.serious > 0 && (
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(accuracyDistribution.serious / reportData.memberEfficiencyList.length) * 100}%`,
                    backgroundColor: '#ef4444',
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 产能趋势图 */}
      {reportData.productivityTrend && reportData.productivityTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">产能变化趋势（近12周）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {reportData.productivityTrend.map((item) => (
                <div key={item.period} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t transition-all duration-300"
                    style={{
                      height: `${Math.min(item.productivity / 2 * 100, 100)}%`,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{item.period}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 团队效能对比 */}
      {reportData.teamEfficiencyComparison && reportData.teamEfficiencyComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">团队效能对比</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>团队</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">人数</TableHead>
                  <TableHead className="text-right">平均产能</TableHead>
                  <TableHead className="text-right">预估准确性</TableHead>
                  <TableHead className="text-right">返工率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.teamEfficiencyComparison.map((team, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{team.teamName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {team.teamType === 'department' ? '部门' : '技术组'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{team.memberCount}</TableCell>
                    <TableCell className="text-right">{team.avgProductivity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {(team.avgEstimationAccuracy * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span style={{ color: team.avgReworkRate > 20 ? '#ef4444' : undefined }}>
                        {team.avgReworkRate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 成员效能明细表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成员效能明细</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.memberEfficiencyList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead className="text-right">完成任务</TableHead>
                  <TableHead className="text-right">产能</TableHead>
                  <TableHead className="text-right">预估准确性</TableHead>
                  <TableHead className="text-right">返工率</TableHead>
                  <TableHead className="text-right">全职比利用率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.memberEfficiencyList.slice(0, 20).map((member) => {
                  const accuracyLevel = getAccuracyLevel(member.estimationAccuracy);
                  const reworkLevel = getReworkLevel(member.reworkRate);
                  return (
                    <TableRow
                      key={member.memberId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/reports/member-analysis?member_id=${member.memberId}`)}
                    >
                      <TableCell className="font-medium">{member.memberName}</TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell className="text-right">{member.completedTasks}</TableCell>
                      <TableCell className="text-right">
                        <span style={{ color: getProductivityColor(member.productivity) }}>
                          {member.productivity.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          style={{ color: accuracyLevel.color, borderColor: accuracyLevel.color }}
                        >
                          {(member.estimationAccuracy * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span style={{ color: reworkLevel.color }}>
                          {member.reworkRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.fulltimeUtilization.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {reportData.memberEfficiencyList.length > 20 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              显示前20条，共 {reportData.memberEfficiencyList.length} 条记录
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
