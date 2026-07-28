/**
 * T4 + P2：延期原因 Top N + 原因×责任人交叉
 */
import { BarChart } from '../charts';
import { ChartContainer, ChartGroup } from '../shared';
import type { BarChartData, ReasonMemberCellData } from '../../types';

export interface ReasonSectionProps {
  reasonChart: BarChartData;
  matrix: ReasonMemberCellData[];
}

export function ReasonSection({ reasonChart, matrix }: ReasonSectionProps) {
  // P2：透视成 每个原因 → 各责任人 count（Top 6 原因）
  const topReasons = Array.from(new Set(matrix.map((c) => c.reason))).slice(0, 6);
  const members = Array.from(new Set(matrix.filter((c) => topReasons.includes(c.reason)).map((c) => c.assigneeName))).slice(0, 8);
  const crossData: BarChartData = {
    labels: topReasons,
    datasets: members.map((m, i) => ({
      label: m,
      values: topReasons.map((r) => matrix.find((c) => c.reason === r && c.assigneeName === m)?.count ?? 0),
      color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'][i % 8],
    })),
  };

  return (
    <ChartGroup>
      <ChartContainer title="延期原因 Top N" subtitle="团队层面原因排行">
        <BarChart data={reasonChart} layout="vertical" height={280} yAxisLabel="原因" />
      </ChartContainer>
      <ChartContainer title="原因×责任人交叉" subtitle="每个成员的延期主因">
        {matrix.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无原因数据</div>
        ) : (
          <BarChart data={crossData} layout="vertical" height={320} showLegend yAxisLabel="原因" />
        )}
      </ChartContainer>
    </ChartGroup>
  );
}
