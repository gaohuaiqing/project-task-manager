/**
 * v2 成员排名：4 专项柱图（延期次数 / 计划变更 / 改善之星 / 落后排行）
 * - 延期次数排行：by totalDelayCount DESC
 * - 计划变更排行：by planChangeCount DESC
 * - 改善之星排行：by improvementDelta ASC（负值=本期比上期延期更少，置顶）
 * - 落后排行：by improvementDelta DESC（正值=本期比上期延期更多，置顶）
 * - 改善/落后标准：delta = 本期延期任务数 − 上期（需选定时间段；无时间段走近30天vs前30天兜底）
 * - 各柱图独立、showValues 标柱数值
 * - 保留部门下钻：dept_manager 点组后只显示该组成员；提供显眼"返回全部"按钮
 */
import { BarChart } from '../charts';
import { ChartContainer, ChartGroup } from '../shared';
import type { BarChartData, MemberRankingData, DelayDetailQuery } from '../../types';

export interface MemberRankingSectionProps {
  data: MemberRankingData[];
  selectedDeptName?: string | null;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时只展示该部门成员 */
  selectedDeptId?: number | null;
  /** v2 交互增强：点击"延期次数排行"柱子下钻该成员延期任务明细 */
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
  selectedDeptName,
  selectedDeptId,
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
  const byImprovement = [...filtered].sort((a, b) => a.improvementDelta - b.improvementDelta); // ASC 改善置顶
  const byWorsening = [...filtered].sort((a, b) => b.improvementDelta - a.improvementDelta);    // DESC 恶化置顶

  const delayChart = buildSingleMetricChart(byDelayCount, '延期次数', (m) => m.totalDelayCount, '#ef4444');
  const changeChart = buildSingleMetricChart(byChangeCount, '计划变更次数', (m) => m.planChangeCount, '#3b82f6');
  const starChart = buildSingleMetricChart(byImprovement, '本期vs上期改善', (m) => m.improvementDelta, '#10b981');
  const worseChart = buildSingleMetricChart(byWorsening, '本期vs上期恶化', (m) => m.improvementDelta, '#f97316');

  // 高度按成员数动态调整（每成员 32px，最小 200）
  const heightFor = (rows: MemberRankingData[]) => Math.max(200, rows.length * 32);

  return (
    <div className="space-y-3">
      {/* 顶部：改善/落后标准说明 + 组筛选时的返回全部按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          改善之星/落后排行基于「本期 vs 上期」延期任务数变化（delta = 本期 − 上期，<span className="text-green-600 font-medium">负=改善</span>、<span className="text-red-600 font-medium">正=恶化</span>），需选定时间段
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
          subtitle={`${subtitle} · 延期次数（时间段内，由高到低${onDrillDown ? '，点击柱子查看明细' : ''}）`}
        >
          <BarChart
            data={delayChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byDelayCount)}
            yAxisLabel="成员"
            onBarClick={onDrillDown ? ({ index }) => {
              const m = byDelayCount[index];
              if (m?.assigneeId) onDrillDown({ assignee_id: m.assigneeId }, `${m.assigneeName} 的延期任务`);
            } : undefined}
          />
        </ChartContainer>

        <ChartContainer
          title="计划变更排行"
          subtitle={`${subtitle} · 计划变更次数（时间段内，由高到低）`}
        >
          <BarChart
            data={changeChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byChangeCount)}
            yAxisLabel="成员"
          />
        </ChartContainer>

        <ChartContainer
          title="改善之星排行"
          subtitle={`${subtitle} · 本期比上期延期减少最多（delta 最负置顶）`}
        >
          <BarChart
            data={starChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byImprovement)}
            yAxisLabel="成员"
          />
        </ChartContainer>

        <ChartContainer
          title="落后排行"
          subtitle={`${subtitle} · 本期比上期延期增加最多（delta 最正置顶）`}
        >
          <BarChart
            data={worseChart}
            layout="vertical"
            showValues
            showLegend={false}
            height={heightFor(byWorsening)}
            yAxisLabel="成员"
          />
        </ChartContainer>
      </ChartGroup>
    </div>
  );
}
