/**
 * v2 成员排名：5 专项柱图（延期次数 / 逾期未开始 / 计划变更 / 改善之星 / 落后排行）
 * - 延期次数排行：by totalDelayCount DESC（事件归属口径；双视角：点击柱子下钻该成员延期事件明细）
 * - 逾期未开始排行：by count DESC（实时口径，与下钻 API overdue_start:true 同口径；点击柱子下钻）
 * - 计划变更排行：by planChangeCount DESC
 * - 改善之星排行：仅收录 improvementDelta<0 成员，ASC 置顶（本期比上期延期减少最多）
 * - 落后排行：仅收录 improvementDelta>0 成员，DESC 置顶（本期比上期延期增加最多；反向柱会误导「增加最多」读数，故不混入改善者）
 * - 改善/落后标准：delta = 本期延期任务数 − 上期（需选定时间段；无时间段走近30天vs前30天兜底）
 * - 各柱图独立、showValues 标柱数值
 * - 保留部门下钻：dept_manager 点组后只显示该组成员；提供显眼"返回全部"按钮
 */
import { BarChart } from '../charts';
import { ChartContainer, ChartGroup } from '../shared';
import type { BarChartData, MemberRankingData, OverdueStartMemberRankingItem, DelayDetailQuery } from '../../types';

export interface MemberRankingSectionProps {
  data: MemberRankingData[];
  /** 第 5 专项数据源：逾期未开始成员排行（实时口径，来自 overdueStartOverview.memberRanking） */
  overdueStartRanking?: OverdueStartMemberRankingItem[];
  selectedDeptName?: string | null;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时只展示该部门成员 */
  selectedDeptId?: number | null;
  /** 双视角：点击"延期次数排行"柱子下钻该成员延期事件明细（事件归属口径，与柱值同口径） */
  onEventDrillDown?: (member: { assigneeId: number; name: string }) => void;
  /** v3 双视角：点击"计划变更排行"柱子下钻该成员计划变更事件明细（approved 批次事件口径，与柱值同口径） */
  onChangeEventDrillDown?: (member: { assigneeId: number; name: string }) => void;
  /** v2 交互增强：点击"逾期未开始排行"柱子下钻该成员逾期未开始任务明细 */
  onDrillDown?: (filters: DelayDetailQuery, title: string) => void;
  /** v2 修复：返回全部人员（清除组筛选） */
  onClearDept?: () => void;
}

/** 单专项柱图数据构造：按指定取值函数与排序生成 BarChartData */
function buildSingleMetricChart(
  sorted: MemberRankingData[],
  datasetLabel: string,
  valFn: (m: MemberRankingData) => number,
  color: string,
): BarChartData {
  return {
    labels: sorted.map((m) => m.assigneeName),
    datasets: [{ label: datasetLabel, values: sorted.map(valFn), color }],
  };
}

export function MemberRankingSection({
  data,
  overdueStartRanking,
  selectedDeptName,
  selectedDeptId,
  onEventDrillDown,
  onChangeEventDrillDown,
  onDrillDown,
  onClearDept,
}: MemberRankingSectionProps) {
  const subtitle = selectedDeptName ? `${selectedDeptName} 成员` : '当前范围内成员';

  // 部门下钻筛选：dept_manager 点组后只显示该组成员（dept_id=0 的未分配成员在选了具体组时排除）
  const filtered = selectedDeptId ? data.filter((m) => m.deptId === selectedDeptId) : data;

  if (!filtered || filtered.length === 0) {
    return (
      <ChartContainer title="成员专项排行" subtitle={subtitle}>
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          {selectedDeptName ? `${selectedDeptName} 暂无成员数据` : '暂无成员数据'}
        </div>
      </ChartContainer>
    );
  }

  // 4 专项各自排序（不可变拷贝，避免污染入参）
  const byDelayCount = [...filtered].sort((a, b) => b.totalDelayCount - a.totalDelayCount);
  const byChangeCount = [...filtered].sort((a, b) => b.planChangeCount - a.planChangeCount);
  // improvementDelta = 本期延期数 − 上期延期数
  // 按符号过滤入榜成员：改善榜只收 delta<0、落后榜只收 delta>0（delta=0 两榜均不进），
  // 避免榜内出现与榜单语义相反的反向柱（如落后榜里大幅改善者的超长负柱误导「增加最多」读数）
  const byImprovement = filtered.filter((m) => m.improvementDelta < 0).sort((a, b) => a.improvementDelta - b.improvementDelta); // ASC 改善最多置顶
  const byWorsening = filtered.filter((m) => m.improvementDelta > 0).sort((a, b) => b.improvementDelta - a.improvementDelta);    // DESC 恶化最多置顶

  const delayChart = buildSingleMetricChart(byDelayCount, '延期次数', (m) => m.totalDelayCount, '#ef4444');
  const changeChart = buildSingleMetricChart(byChangeCount, '计划变更次数', (m) => m.planChangeCount, '#3b82f6');
  const starChart = buildSingleMetricChart(byImprovement, '本期vs上期改善', (m) => m.improvementDelta, '#10b981');
  const worseChart = buildSingleMetricChart(byWorsening, '本期vs上期恶化', (m) => m.improvementDelta, '#f97316');

  // 第 5 专项：逾期未开始排行（实时口径；后端已按 count DESC 排序，前端只做部门过滤）
  const osFiltered = overdueStartRanking
    ? (selectedDeptId ? overdueStartRanking.filter((m) => m.deptId === selectedDeptId) : overdueStartRanking)
    : [];
  const osChart: BarChartData = {
    labels: osFiltered.map((m) => m.name),
    datasets: [{ label: '逾期未开始', values: osFiltered.map((m) => m.count), color: '#EA580C' }],
  };

  // 高度按成员数动态调整（每成员 32px，最小 200）
  const heightFor = (rows: MemberRankingData[]) => Math.max(200, rows.length * 32);

  return (
    <div className="space-y-3">
      {/* 顶部：改善/落后标准说明 + 组筛选时的返回全部按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          改善之星/落后排行基于「本期 vs 上期」延期任务数变化（delta = 本期 − 上期，<span className="text-green-600 font-medium">负=改善</span>、<span className="text-red-600 font-medium">正=恶化</span>），改善榜仅收录 delta&lt;0、落后榜仅收录 delta&gt;0 的成员，需选定时间段
        </div>
        {selectedDeptName && onClearDept && (
          <button
            type="button"
            onClick={onClearDept}
            className="px-3 py-1 rounded-md border border-border bg-background hover:bg-muted text-primary font-medium whitespace-nowrap"
          >
            ← 查看全部人员
          </button>
        )}
      </div>

      <ChartGroup className="grid-cols-1 md:grid-cols-2">
        <ChartContainer
          title="延期次数排行"
          subtitle={`${subtitle} · 延期次数（时间段内，由高到低${onEventDrillDown ? '，点击柱子查看延期事件' : ''}）`}
        >
          <BarChart
            data={delayChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byDelayCount)}
            yAxisLabel="成员"
            onBarClick={onEventDrillDown ? ({ index }) => {
              const m = byDelayCount[index];
              // 「未分配」聚合行 assigneeId=0（后端 assignee_id NULL 数字化），不可下钻（与逾期未开始排行同规则）
              if (m && m.assigneeId > 0) onEventDrillDown({ assigneeId: m.assigneeId, name: m.assigneeName });
            } : undefined}
          />
        </ChartContainer>

        <ChartContainer
          title="逾期未开始排行"
          subtitle={`${subtitle} · 当前逾期未开始任务数（实时口径，由高到低${onDrillDown ? '，点击柱子查看明细' : ''}）`}
        >
          {osFiltered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {selectedDeptName ? `${selectedDeptName} 暂无逾期未开始任务` : '暂无逾期未开始任务'}
            </div>
          ) : (
            <BarChart
              data={osChart}
              layout="vertical"
              showValues
              showLegend={false}
              height={Math.max(200, osFiltered.length * 32)}
              yAxisLabel="成员"
              onBarClick={onDrillDown ? ({ index }) => {
                const m = osFiltered[index];
                // "未分配"聚合行无 assigneeId，不可下钻
                if (m?.assigneeId) onDrillDown({ assignee_id: m.assigneeId, overdue_start: true }, `${m.name} 的逾期未开始任务`);
              } : undefined}
            />
          )}
        </ChartContainer>

        <ChartContainer
          title="计划变更排行"
          subtitle={`${subtitle} · 计划变更次数（时间段内，已生效口径，由高到低${onChangeEventDrillDown ? '，点击柱子查看变更事件' : ''}）`}
        >
          <BarChart
            data={changeChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byChangeCount)}
            yAxisLabel="成员"
            onBarClick={onChangeEventDrillDown ? ({ index }) => {
              const m = byChangeCount[index];
              // 「未分配」聚合行 assigneeId=0（后端 assignee_id NULL 数字化），不可下钻（与延期次数排行同规则）
              if (m && m.assigneeId > 0) onChangeEventDrillDown({ assigneeId: m.assigneeId, name: m.assigneeName });
            } : undefined}
          />
        </ChartContainer>

        <ChartContainer
          title="改善之星排行"
          subtitle={`${subtitle} · 本期比上期延期减少最多（仅收录改善成员 delta<0）`}
        >
          {byImprovement.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {selectedDeptName ? `${selectedDeptName} 本期无人延期减少` : '本期无人延期减少（delta 均 ≥ 0）'}
            </div>
          ) : (
            <BarChart
              data={starChart}
              layout="vertical"
              showValues
              showLegend={false}
              height={heightFor(byImprovement)}
              yAxisLabel="成员"
            />
          )}
        </ChartContainer>

        <ChartContainer
          title="落后排行"
          subtitle={`${subtitle} · 本期比上期延期增加最多（仅收录恶化成员 delta>0）`}
        >
          {byWorsening.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              {selectedDeptName ? `${selectedDeptName} 本期无人延期增加` : '本期无人延期增加（delta 均 ≤ 0）'}
            </div>
          ) : (
            <BarChart
              data={worseChart}
              layout="vertical"
              showValues
              showLegend={false}
              height={heightFor(byWorsening)}
              yAxisLabel="成员"
            />
          )}
        </ChartContainer>
      </ChartGroup>
    </div>
  );
}
