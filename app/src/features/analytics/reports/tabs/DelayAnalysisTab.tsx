/**
 * 延期分析报表 Tab —— 容器组件
 * 按角色差异化组合三视角（团队/个人/任务），支持下钻：
 *   点组  → selectedDeptId   → MemberRanking/DelayDetail 按部门筛选
 *   点成员 → selectedMemberName → DelayDetail 任务列表按成员筛选
 *
 * v3 总-分重排：统计总览（范围/结论/支撑三层）置顶 → 各分析区 → 明细（收口）：
 *   统计总览 StatsOverviewSection（新三层设计，支撑卡可点击联动明细 Tab）
 *   L0 团队:  TeamSection（admin/dept_manager→DeptComparisonView, tech_manager→本组总览）
 *   L0 个人:  MemberRankingSection（成员延期排名）
 *   L0 任务:  ProblemTaskSection（反复延期 + 频繁变更 + 超长延期天数）
 *   L1 静态:  EstimationDeviationView + ProjectDelayView + TaskTypeDelayView + ReasonSection
 *   L2 趋势:  TrendSection
 *   L3 明细:  DelayDetailSection（三状态任务 Tab ↔ 成员统计；activeTab 状态提升至此，
 *             供统计总览支撑卡点击联动切换 + anchor 滚动）
 */
import { useState } from 'react';
import { ChartGroup } from '../components/shared';
import { useDelayAnalysisData } from '../data';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ReportFilters, DelayDetailQuery, DelayDetailTab } from '../types';
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
import { DelayTaskDetailDialog } from '../components/delay/DelayTaskDetailDialog';

/** 明细区 anchor id（统计总览支撑卡点击后滚动定位） */
const DETAIL_ANCHOR_ID = 'delay-detail';

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

  // v3: 明细区 Tab 状态提升（统计总览支撑卡点击联动切换）
  const [detailTab, setDetailTab] = useState<DelayDetailTab>('delayed');

  // 统计总览支撑卡点击：切到对应明细 Tab 并平滑滚动到明细区
  const handleStatClick = (tab: DelayDetailTab) => {
    setDetailTab(tab);
    document.getElementById(DETAIL_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // v2 交互增强：延期明细下钻弹窗（点击柱子触发，合并当前时间段筛选保证同口径）
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; title: string; filters: DelayDetailQuery }>({
    open: false,
    title: '',
    filters: {},
  });
  const openDetail = (detailFilters: DelayDetailQuery, title: string) => {
    setDetailDialog({
      open: true,
      title,
      // 逾期未开始为实时口径不参与时间段统计，不合并当前时间段筛选（与主报表 overdue_start_overview 同规则）
      filters: detailFilters.overdue_start
        ? { ...detailFilters }
        : { ...detailFilters, start_date: filters.startDate, end_date: filters.endDate },
    });
  };

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
      {/* v3 统计总览（置顶）：范围行 + 结论行 + 支撑行（支撑卡点击联动明细 Tab） */}
      <StatsOverviewSection
        data={data.statsOverview}
        overdueStart={data.overdueStartOverview}
        delayedCount={data.delayedCount}
        warningCount={data.warningCount}
        delayedAvgDays={data.delayedAvgDays}
        warningAvgDays={data.warningAvgDays}
        scopeStats={data.scopeStats}
        teamComparison={data.teamComparison}
        riskMember={data.riskMember}
        riskTrend={data.riskTrend}
        filters={filters}
        role={role}
        onStatClick={handleStatClick}
      />

      {/* L0·角色差异化总览 */}
      <TeamSection data={data} role={role} onSelectDept={handleSelectDept} />
      <MemberRankingSection
        data={data.memberRanking}
        selectedDeptName={selectedDeptName}
        selectedDeptId={selectedDeptId}
        onDrillDown={openDetail}
        onClearDept={() => handleSelectDept(null)}
      />
      <ProblemTaskSection
        repeatDelayTasks={data.repeatDelayTasks}
        frequentChangeTasks={data.frequentChangeTasks}
        longestDelayTasks={data.longestDelayTasks}
        overdueStartRanking={data.overdueStartOverview.memberRanking}
        onOverdueStartDrillDown={(member) => {
          // 「未分配」聚合行无 assigneeId 不可下钻（卡片内部已禁用点击，此处双保险）
          if (member.assigneeId == null) return;
          openDetail(
            { assignee_id: member.assigneeId, overdue_start: true },
            `${member.name} 的逾期未开始任务`,
          );
        }}
      />

      {/* L1·静态维度 */}
      <EstimationDeviationView data={data.estimationDeviation} />
      <ChartGroup>
        <ProjectDelayView data={data.projectDelayStats} onDrillDown={openDetail} />
        <TaskTypeDelayView data={data.taskTypeDelayStats} onDrillDown={openDetail} />
      </ChartGroup>
      <ReasonSection reasonChart={data.delayReasonChart} matrix={data.reasonMemberMatrix} />

      {/* L2·动态趋势 */}
      <TrendSection
        delayTrend={data.delayTrend}
        delayResolvedTrend={data.delayResolvedTrend}
        improvement={data.improvementTrend}
        memberTrends={data.memberTrends}
      />

      {/* L3·明细（anchor 供统计总览支撑卡点击滚动定位；三状态 Tab + 成员统计，支持下钻筛选） */}
      <div id={DETAIL_ANCHOR_ID} className="scroll-mt-4">
        <DelayDetailSection
          delayTasks={data.delayTasks}
          memberRanking={data.memberRanking}
          selectedMemberName={selectedMemberName}
          onSelectMember={setSelectedMemberName}
          selectedDeptId={selectedDeptId}
          activeTab={detailTab}
          onChangeTab={setDetailTab}
        />
      </div>

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

      {/* v2 交互增强：延期明细下钻弹窗（点击成员/项目/类型柱子触发） */}
      <DelayTaskDetailDialog
        open={detailDialog.open}
        onOpenChange={(open) => setDetailDialog((s) => ({ ...s, open }))}
        title={detailDialog.title}
        filters={detailDialog.filters}
      />
    </div>
  );
}
