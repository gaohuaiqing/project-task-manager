/**
 * L2 动态趋势：T5 延期趋势 + 收敛扩散 + 改善环比 + P5 成员个人趋势
 */
import { LineChart } from '../charts';
import { ChartContainer, ChartGroup } from '../shared';
import type { ImprovementTrendData, LineChartData, MemberTrendData } from '../../types';

export interface TrendSectionProps {
  delayTrend: LineChartData;
  delayResolvedTrend: LineChartData;
  improvement: ImprovementTrendData;
  memberTrends: MemberTrendData[];
}

const DIR_COLOR: Record<ImprovementTrendData['direction'], string> = {
  improving: 'text-green-600',
  worsening: 'text-red-600',
  flat: 'text-muted-foreground',
};
const DIR_LABEL: Record<ImprovementTrendData['direction'], string> = {
  improving: '改善 ↓',
  worsening: '恶化 ↑',
  flat: '持平',
};

export function TrendSection({ delayTrend, delayResolvedTrend, improvement, memberTrends }: TrendSectionProps) {
  // P5：成员趋势透视成多系列折线
  const allDates = Array.from(new Set((memberTrends ?? []).flatMap((m) => (m.points ?? []).map((p) => p.date)))).sort();
  const dateLabels = allDates.map((d) => d.slice(5)); // MM-DD
  const memberTrendChart: LineChartData = {
    labels: dateLabels,
    datasets: (memberTrends ?? []).slice(0, 10).map((m, i) => ({
      label: m.assigneeName,
      values: allDates.map((d) => m.points.find((p) => p.date === d)?.delayed ?? 0),
      color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'][i % 10],
    })),
  };

  return (
    <div className="space-y-4">
      {/* 改善环比徽章 */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card text-sm">
        <span className="text-muted-foreground">改善环比（本周 vs 上周）：</span>
        <span>本周新增 <b className="text-red-600">{improvement.currentDelayed}</b></span>
        <span>上周 <b>{improvement.previousDelayed}</b></span>
        <span>差值 <b className={improvement.delta >= 0 ? 'text-red-600' : 'text-green-600'}>{improvement.delta >= 0 ? '+' : ''}{improvement.delta}</b></span>
        <span className={`font-medium ${DIR_COLOR[improvement.direction]}`}>{DIR_LABEL[improvement.direction]}</span>
      </div>

      <ChartGroup>
        <ChartContainer title="延期趋势" subtitle="新增/解决">
          <LineChart data={delayTrend} yAxisLabel="任务数" />
        </ChartContainer>
        <ChartContainer title="延期收敛/扩散" subtitle="未解决 vs 已解决">
          <LineChart data={delayResolvedTrend} yAxisLabel="任务数" />
        </ChartContainer>
      </ChartGroup>

      <ChartContainer title="成员个人延期趋势" subtitle="Top 10 成员当前延期数变化">
        {memberTrends.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>
        ) : (
          <LineChart data={memberTrendChart} strokeWidth={1.5} yAxisLabel="延期任务数" />
        )}
      </ChartContainer>
    </div>
  );
}
