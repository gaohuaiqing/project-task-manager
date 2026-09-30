/**
 * v3 统计总览（置顶）：范围行 / 结论行 / 支撑行 三层重设计
 *
 * - 范围行：角色范围（admin=全部/dept_manager=本部门/tech_manager=本组）+ 项目/团队/任务数
 *           + FilterBar 生效筛选镜像（时间段/项目/延期类型——仅镜像后端真正消费的筛选；
 *           任务类型/负责人筛选本报表不消费，不镜像以免误导）
 * - 结论行（前端生成）：三态合计 = 已延期 + 逾期未开始 + 延期预警（直接用状态名表述，
 *           不引入"风险任务"统称）；占比 = 合计/任务总数；无风险显示 ✅；有风险突出
 *           最严重类别 + 细节（逾期未开始=涉及人数/最长天数，已延期=平均超期天数，
 *           延期预警=平均剩余天数）；占比>10% 用 ⚠，≤10% 用 🟡「少量」
 * - 结论行增强（v3）：🔥 风险最高团队（teamComparison 三态合计 Top1，无组数据隐藏）/
 *           👤 风险最高个人（后端 riskMember，null 隐藏）/ 📈 较上期（后端 riskTrend，
 *           仅时间段视角非 null，当前视角隐藏）；无风险时整组不追加；
 *           行卡片结构（标签+名称+合计+三态徽章+行尾占比），徽章色与支撑行三色卡一致
 * - 支撑行：三状态数字卡（色与仪表板一致：红/深橙/黄）可点击 → 联动切明细区对应 Tab 并滚动；
 *           下行小字：累计延期次数 · 计划变更次数（statsOverview.team 提供）
 */
import { ChartContainer } from '../shared';
import { useProjectsForReport } from '../../data';
import { DELAY_TYPE_OPTIONS } from '../../config';
import type {
  ReportFilters,
  StatsOverviewData,
  OverdueStartOverviewData,
  ScopeStatsData,
  DepartmentDelayData,
  RiskMemberData,
  RiskTrendData,
} from '../../types';

/** 支撑行数字卡对应的明细 Tab（与 DelayDetailSection 三状态 Tab 对齐） */
export type RiskStatTab = 'delayed' | 'delay_warning' | 'overdue_start';

export interface StatsOverviewSectionProps {
  /** statsOverview（支撑行小字用 team.totalDelayCount/planChangeCount） */
  data: StatsOverviewData;
  /** 逾期未开始总览（仅当前口径） */
  overdueStart: OverdueStartOverviewData;
  /** 已延期任务数（当前实时口径） */
  delayedCount: number;
  /** 延期预警任务数（当前实时口径） */
  warningCount: number;
  /** 已延期任务平均超期天数（结论行细节） */
  delayedAvgDays: number;
  /** 延期预警任务平均剩余天数（结论行细节） */
  warningAvgDays: number;
  /** 范围统计（范围行项目/团队/任务数） */
  scopeStats: ScopeStatsData;
  /** 组对比（结论行「🔥 风险最高团队」前端算三态合计 Top1；tech_manager/engineer 为空数组隐藏该行） */
  teamComparison: DepartmentDelayData[];
  /** 风险最高个人（结论行「👤」；null 隐藏该行） */
  riskMember: RiskMemberData | null;
  /** 整体较上期趋势（结论行「📈」；仅时间段视角非 null，null 隐藏该行） */
  riskTrend: RiskTrendData | null;
  /** FilterBar 当前筛选（镜像显示） */
  filters: ReportFilters;
  /** 当前用户角色（范围行角色文案） */
  role: 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';
  /** 点击支撑行数字卡 → 联动切明细 Tab 并滚动 */
  onStatClick: (tab: RiskStatTab) => void;
}

/** 角色范围文案（engineer 不可见本报表，仅兜底） */
const ROLE_SCOPE_LABELS: Record<StatsOverviewSectionProps['role'], string> = {
  admin: '全部',
  dept_manager: '本部门',
  tech_manager: '本组',
  engineer: '个人',
};

/** 三态分项徽章项（色与支撑行三色卡一致：红=已延期/深橙=逾期未开始/琥珀=预警） */
interface TriStateItem {
  label: string;
  count: number;
  className: string;
}

/** 三态分项徽章数据：只列非零项；合计>0 保证至少一项非零 */
function triStateItems(delayed: number, overdueStart: number, warning: number): TriStateItem[] {
  return [
    { label: '已延期', count: delayed, className: 'bg-red-500/10 text-red-600' },
    { label: '逾期未开始', count: overdueStart, className: 'bg-orange-600/10 text-orange-600' },
    { label: '预警', count: warning, className: 'bg-amber-400/20 text-amber-600' },
  ].filter((i) => i.count > 0);
}

/** 时间段预设文案映射（范围行镜像显示用） */
const TIME_RANGE_LABELS: Record<string, string> = {
  current: '当前视角',
  '30d': '近30天',
  '3m': '近3个月',
  '6m': '近半年',
  '1y': '近1年',
};

export function StatsOverviewSection({
  data,
  overdueStart,
  delayedCount,
  warningCount,
  delayedAvgDays,
  warningAvgDays,
  scopeStats,
  teamComparison,
  riskMember,
  riskTrend,
  filters,
  role,
  onStatClick,
}: StatsOverviewSectionProps) {
  // 项目名映射（与 FilterBar 同源缓存，无额外请求负担）
  const { data: projects } = useProjectsForReport();

  // ========== 范围行：生效筛选镜像（有值才显示；只镜像后端真正消费的筛选） ==========
  // 注：taskType/assigneeId 不被延期报表 API 消费（getDelayAnalysisReport 仅收
  // project_id/delay_type/start_date/end_date），镜像会误导，故不显示
  const filterChips: string[] = [];
  if (filters.timeRange) {
    filterChips.push(
      filters.timeRange === 'custom' && filters.startDate && filters.endDate
        ? `${filters.startDate} ~ ${filters.endDate}`
        : TIME_RANGE_LABELS[filters.timeRange] ?? filters.timeRange,
    );
  }
  if (filters.projectId) {
    filterChips.push(projects.find((p) => p.id === filters.projectId)?.name ?? `项目 ${filters.projectId}`);
  }
  if (filters.delayType) {
    filterChips.push(DELAY_TYPE_OPTIONS.find((o) => o.value === filters.delayType)?.label ?? filters.delayType);
  }

  // ========== 结论行（前端生成） ==========
  const riskTotal = delayedCount + overdueStart.total + warningCount;
  const ratio = scopeStats.taskCount > 0 ? (riskTotal / scopeStats.taskCount) * 100 : 0;
  const ratioText = `${Math.round(ratio * 10) / 10}%`;
  // 最突出类别（数量最大者；并列取先者，顺序：逾期未开始 > 已延期 > 延期预警）
  const riskCats: Array<{ key: RiskStatTab; label: string; count: number }> = [
    { key: 'overdue_start', label: '逾期未开始', count: overdueStart.total },
    { key: 'delayed', label: '已延期', count: delayedCount },
    { key: 'delay_warning', label: '延期预警', count: warningCount },
  ];
  const topCat = riskCats.reduce((a, b) => (b.count > a.count ? b : a), riskCats[0]);
  // 各类别细节：逾期未开始=涉及人数/最长天数；已延期=平均超期；预警=平均剩余
  // （人数/最长天数用后端不截断聚合 assigneeCount/maxOverdueDays——memberRanking LIMIT 10 会低估）
  const topDetail =
    topCat.key === 'overdue_start'
      ? `涉及 ${overdueStart.assigneeCount} 人，最长 ${overdueStart.maxOverdueDays} 天`
      : topCat.key === 'delayed'
        ? `平均超期 ${delayedAvgDays} 天`
        : `平均剩余 ${warningAvgDays} 天`;

  // ========== 结论行增强（v3：风险最高团队 / 风险最高个人 / 较上期趋势） ==========
  // 风险最高团队：组对比每行三态合计（已延期 + 逾期未开始 + 延期预警）降序 Top1；
  // teamComparison 为空（tech_manager/engineer 无组对比数据）时该行隐藏；
  // 保留三态分项计数供行内拆开展示
  const topRiskDept = teamComparison
    .map((d) => ({
      deptName: d.deptName,
      riskTotal: d.delayedCount + d.overdueStartCount + d.warningCount,
      delayedCount: d.delayedCount,
      overdueStartCount: d.overdueStartCount,
      warningCount: d.warningCount,
      totalTasks: d.totalTasks,
    }))
    .filter((d) => d.riskTotal > 0)
    .sort((a, b) => b.riskTotal - a.riskTotal)[0];
  const topRiskDeptRate =
    topRiskDept && topRiskDept.totalTasks > 0
      ? `${Math.round((topRiskDept.riskTotal / topRiskDept.totalTasks) * 1000) / 10}%`
      : null;
  // 较上期趋势文案：delta 正=恶化（N=delta），负=改善（N=|delta|），0=持平；色随方向
  const riskTrendText =
    riskTrend?.direction === 'worsening'
      ? `↑ 恶化 ${riskTrend.delta} 个`
      : riskTrend?.direction === 'improving'
        ? `↓ 改善 ${Math.abs(riskTrend.delta)} 个`
        : '→ 持平';
  const riskTrendColor =
    riskTrend?.direction === 'worsening'
      ? 'text-red-600'
      : riskTrend?.direction === 'improving'
        ? 'text-emerald-600'
        : 'text-muted-foreground';

  return (
    <ChartContainer title="统计总览" subtitle="范围 · 结论 · 支撑（点击数字卡查看对应明细）">
      <div className="space-y-3">
        {/* 范围行：角色范围 + 项目/团队/任务数 + 生效筛选镜像 */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            范围：{ROLE_SCOPE_LABELS[role]} · {scopeStats.projectCount} 个项目 · {scopeStats.teamCount} 个团队 ·{' '}
            {scopeStats.taskCount} 个任务
          </span>
          {filterChips.map((chip) => (
            <span key={chip} className="px-1.5 py-0.5 rounded bg-muted">
              {chip}
            </span>
          ))}
        </div>

        {/* 结论行：风险结论（前端生成） */}
        <div className={`text-sm leading-relaxed ${riskTotal > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          {riskTotal === 0 ? (
            <>✅ 当前无已延期/逾期未开始/预警任务</>
          ) : ratio > 10 ? (
            <>
              ⚠ <span className="font-semibold">{riskTotal}</span> 个任务已延期/逾期未开始/处于预警（占{' '}
              <span className="font-semibold">{ratioText}</span>）——最突出「{topCat.label}」
              <span className="font-semibold">{topCat.count}</span> 个，{topDetail}
            </>
          ) : (
            <>
              🟡 少量任务已延期/逾期未开始/处于预警：<span className="font-semibold">{riskTotal}</span> 个（占{' '}
              <span className="font-semibold">{ratioText}</span>）——最突出「{topCat.label}」
              <span className="font-semibold">{topCat.count}</span> 个，{topDetail}
            </>
          )}
        </div>

        {/* 结论行增强（v3）：风险最高团队 / 风险最高个人 / 较上期趋势
            （结构化行卡片：标签+名称+合计+三态徽章；无风险时不追加；各子行数据缺失时单独隐藏） */}
        {riskTotal > 0 && (topRiskDept || riskMember || riskTrend) && (
          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 space-y-2.5">
            {topRiskDept && topRiskDeptRate && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-xs text-muted-foreground shrink-0">🔥 风险最高团队</span>
                <span className="text-sm font-medium">{topRiskDept.deptName}</span>
                <span className="text-sm">
                  <span className="text-lg font-bold font-mono">{topRiskDept.riskTotal}</span> 个
                </span>
                {triStateItems(topRiskDept.delayedCount, topRiskDept.overdueStartCount, topRiskDept.warningCount).map(
                  (b) => (
                    <span
                      key={b.label}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${b.className}`}
                    >
                      {b.label} {b.count}
                    </span>
                  ),
                )}
                <span className="text-xs text-muted-foreground ml-auto">占该组任务数 {topRiskDeptRate}</span>
              </div>
            )}
            {riskMember && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-xs text-muted-foreground shrink-0">👤 风险最高个人</span>
                <span className="text-sm font-medium">{riskMember.name}</span>
                <span className="text-sm">
                  <span className="text-lg font-bold font-mono">{riskMember.count}</span> 个
                </span>
                {triStateItems(
                  riskMember.delayedCount ?? 0,
                  riskMember.overdueStartCount ?? 0,
                  riskMember.warningCount ?? 0,
                ).map((b) => (
                  <span key={b.label} className={`px-1.5 py-0.5 rounded text-xs font-medium ${b.className}`}>
                    {b.label} {b.count}
                  </span>
                ))}
              </div>
            )}
            {riskTrend && (
              <div className="flex flex-wrap items-center gap-x-2.5">
                <span className="text-xs text-muted-foreground shrink-0">📈 较上期</span>
                <span className={`text-sm font-medium ${riskTrendColor}`}>{riskTrendText}</span>
              </div>
            )}
          </div>
        )}

        {/* 支撑行：三状态数字卡（可点击联动明细 Tab）+ 累计/变更小字 */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RiskCard
              dotClass="bg-red-500"
              valueClass="text-red-600"
              label="已延期"
              value={delayedCount}
              onClick={() => onStatClick('delayed')}
            />
            <RiskCard
              dotClass="bg-orange-600"
              valueClass="text-orange-600"
              label="逾期未开始"
              value={overdueStart.total}
              onClick={() => onStatClick('overdue_start')}
            />
            <RiskCard
              dotClass="bg-amber-400"
              valueClass="text-amber-600"
              label="延期预警"
              value={warningCount}
              onClick={() => onStatClick('delay_warning')}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            累计延期 {data.team.totalDelayCount.current} 次 · 计划变更 {data.team.planChangeCount.current} 次
          </div>
        </div>
      </div>
    </ChartContainer>
  );
}

/** 支撑行数字卡：色点 + 标签 + 数值，点击联动明细区 Tab */
function RiskCard({
  dotClass,
  valueClass,
  label,
  value,
  onClick,
}: {
  dotClass: string;
  valueClass: string;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/50 bg-card text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      aria-label={`查看${label}明细`}
    >
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`ml-auto text-xl font-bold font-mono ${valueClass}`}>{value}</span>
    </button>
  );
}
