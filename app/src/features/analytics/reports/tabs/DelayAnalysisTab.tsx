/**
 * 延期分析报表 Tab —— 容器组件
 * 按角色差异化组合三视角（团队/个人/任务），支持下钻：
 *   点组  → selectedDeptId   → MemberRanking/DelayDetail 按部门筛选
 *   点成员 → selectedMemberName → DelayDetail 任务列表按成员筛选
 *
 * 子组件层级（来自 Task 7-11）：
 *   L0 团队:  TeamSection（admin/dept_manager→DeptComparisonView, tech_manager→本组总览）
 *   L0 个人:  MemberRankingSection（成员延期排名）
 *   L0 任务:  ProblemTaskSection（反复延期 + 频繁变更 + 超长延期天数）
 *   L1 静态:  StatsOverviewSection + EstimationDeviationView
 *             + ProjectDelayView + TaskTypeDelayView + ReasonSection
 *   L2 趋势:  TrendSection
 *   L3 明细:  DelayDetailSection（任务列表 ↔ 成员统计，Tab 切换）
 */
import { useState } from 'react';
import { ChartGroup } from '../components/shared';
import { useDelayAnalysisData } from '../data';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ReportFilters } from '../types';
import { TeamSection } from '../components/delay/TeamSection';
import { StatsOverviewSection } from '../components/delay/StatsOverviewSection';
import { MemberRankingSection } from '../components/delay/MemberRankingSection';
import { ProblemTaskSection } from '../components/delay/ProblemTaskSection';
import { ProjectDelayView } from '../components/delay/ProjectDelayView';
import { TaskTypeDelayView } from '../components/delay/TaskTypeDelayView';
import { EstimationDeviationView } from '../components/delay/EstimationDeviationView';
import { ReasonSection } from '../components/delay/ReasonSection';
import { TrendSection } from '../components/delay/TrendSection';
import { DelayDetailSection } from '../components/delay/DelayDetailSection';

export interface DelayAnalysisTabProps {
  filters: ReportFilters;
}

export function DelayAnalysisTab({ filters }: DelayAnalysisTabProps) {
  const { data, isLoading, error } = useDelayAnalysisData(filters);
  const { user } = useAuth();
  // 兜底为 engineer（非 admin/dept_manager/tech_manager 的角色不进入 TeamSection 的差异化分支）
  const role = (user?.role || 'engineer') as 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';

  // 下钻状态：选中部门 → 筛成员；选中成员 → 筛任务
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        加载失败: {error?.message}
      </div>
    );
  }

  const handleSelectDept = (deptId: number | null) => {
    setSelectedDeptId(deptId);
    setSelectedMemberName(null);
    const dept = data.teamComparison.find((d) => d.deptId === deptId);
    setSelectedDeptName(dept?.deptName ?? null);
  };

  return (
    <div className="space-y-6">
      {/* L0·角色差异化总览 */}
      <TeamSection data={data} role={role} onSelectDept={handleSelectDept} />
      <MemberRankingSection
        data={data.memberRanking}
        selectedDeptName={selectedDeptName}
        selectedDeptId={selectedDeptId}
      />
      <ProblemTaskSection
        repeatDelayTasks={data.repeatDelayTasks}
        frequentChangeTasks={data.frequentChangeTasks}
        longestDelayTasks={data.longestDelayTasks}
      />

      {/* L1·静态维度 */}
      <StatsOverviewSection data={data.statsOverview} />
      <EstimationDeviationView data={data.estimationDeviation} />
      <ChartGroup>
        <ProjectDelayView data={data.projectDelayStats} />
        <TaskTypeDelayView data={data.taskTypeDelayStats} />
      </ChartGroup>
      <ReasonSection reasonChart={data.delayReasonChart} matrix={data.reasonMemberMatrix} />

      {/* L2·动态趋势 */}
      <TrendSection
        delayTrend={data.delayTrend}
        delayResolvedTrend={data.delayResolvedTrend}
        improvement={data.improvementTrend}
        memberTrends={data.memberTrends}
      />

      {/* L3·明细（支持下钻：成员名筛选任务列表 + 选组筛选成员统计） */}
      <DelayDetailSection
        delayTasks={data.delayTasks}
        memberRanking={data.memberRanking}
        selectedMemberName={selectedMemberName}
        onSelectMember={setSelectedMemberName}
        selectedDeptId={selectedDeptId}
      />

      {/* 当前下钻上下文展示（用户可见当前筛选状态） */}
      {(selectedDeptName || selectedMemberName) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>当前下钻：</span>
          {selectedDeptName && (
            <span className="px-2 py-0.5 rounded bg-muted">
              组：{selectedDeptName}
              <button
                className="ml-2 underline hover:text-primary"
                onClick={() => handleSelectDept(null)}
              >
                清除
              </button>
            </span>
          )}
          {selectedMemberName && (
            <span className="px-2 py-0.5 rounded bg-muted">
              成员：{selectedMemberName}
              <button
                className="ml-2 underline hover:text-primary"
                onClick={() => setSelectedMemberName(null)}
              >
                清除
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
