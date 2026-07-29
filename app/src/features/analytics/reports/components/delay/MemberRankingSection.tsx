/**
 * v2 成员排名：拆 3 专项柱图（延期次数 / 计划变更 / 改善之星）
 * - 延期次数排行：by totalDelayCount DESC
 * - 计划变更排行：by planChangeCount DESC
 * - 改善之星排行：by improvementDelta ASC（负值=本期比上期延期更少，置顶）
 * - 各柱图独立、showValues 标柱数值
 * - 保留 v1 部门下钻：dept_manager 点组后只显示该组成员
 */
import { BarChart } from '../charts';
import { ChartContainer, ChartGroup } from '../shared';
import type { BarChartData, MemberRankingData } from '../../types';

export interface MemberRankingSectionProps {
  data: MemberRankingData[];
  selectedDeptName?: string | null;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时只展示该部门成员 */
  selectedDeptId?: number | null;
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

  // 3 专项各自排序（不可变拷贝，避免污染入参）
  const byDelayCount = [...filtered].sort((a, b) => b.totalDelayCount - a.totalDelayCount);
  const byChangeCount = [...filtered].sort((a, b) => b.planChangeCount - a.planChangeCount);
  // improvementDelta = 本期延期数 − 上期延期数；越小（负）改善越多 → ASC 置顶
  const byImprovement = [...filtered].sort((a, b) => a.improvementDelta - b.improvementDelta);

  const delayChart = buildSingleMetricChart(
    byDelayCount,
    '累计延期次数',
    (m) => m.totalDelayCount,
    '#ef4444',
  );
  const changeChart = buildSingleMetricChart(
    byChangeCount,
    '计划变更次数',
    (m) => m.planChangeCount,
    '#3b82f6',
  );
  const starChart = buildSingleMetricChart(
    byImprovement,
    '本期vs上期改善',
    (m) => m.improvementDelta,
    '#10b981',
  );

  // 高度按成员数动态调整（每成员 32px，最小 200）
  const heightFor = (rows: MemberRankingData[]) => Math.max(200, rows.length * 32);

  return (
    <ChartGroup>
      <ChartContainer
        title="延期次数排行"
        subtitle={`${subtitle} · 累计延期次数（由高到低）`}
      >
        <BarChart
          data={delayChart}
          layout="vertical"
          showValues
          showLegend={false}
          height={heightFor(byDelayCount)}
          yAxisLabel="成员"
        />
      </ChartContainer>

      <ChartContainer
        title="计划变更排行"
        subtitle={`${subtitle} · 计划变更次数（由高到低）`}
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
        subtitle={`${subtitle} · 本期 vs 上期（负值=改善，置顶）`}
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
    </ChartGroup>
  );
}
