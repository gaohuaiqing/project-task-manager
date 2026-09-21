/**
 * v2 重设统计卡：3指标 × 当前/时间段 × 团队/个人层
 * + 逾期未开始（仅当前口径，实时状态，不参与时间段统计）
 */
import { ChartContainer } from '../shared';
import type { StatsOverviewData, OverdueStartOverviewData } from '../../types';

export interface StatsOverviewSectionProps {
  data: StatsOverviewData;
  /** 逾期未开始总览（仅当前口径） */
  overdueStart: OverdueStartOverviewData;
}

export function StatsOverviewSection({ data, overdueStart }: StatsOverviewSectionProps) {
  const Cell = ({
    label,
    current,
    period,
  }: {
    label: string;
    current: number | string;
    period: number | string;
  }) => (
    <div className="p-3 rounded-lg border border-border/50 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{current}</div>
      <div className="text-[10px] text-muted-foreground">时段: {period}</div>
    </div>
  );

  return (
    <ChartContainer title="统计总览" subtitle="当前值 / 时段累计（团队层 + 个人层）">
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">团队层</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Cell
              label="延期任务数"
              current={data.team.delayedTaskCount.current}
              period={data.team.delayedTaskCount.period}
            />
            <Cell
              label="累计延期次数"
              current={data.team.totalDelayCount.current}
              period={data.team.totalDelayCount.period}
            />
            <Cell
              label="计划变更次数"
              current={data.team.planChangeCount.current}
              period={data.team.planChangeCount.period}
            />
            {/* 逾期未开始：实时状态，无时段累计（当前口径） */}
            <Cell
              label="逾期未开始"
              current={overdueStart.total}
              period="实时"
            />
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">个人层</div>
          <div className="grid grid-cols-3 gap-3">
            <Cell
              label="人均延期次数"
              current={data.individual.avgDelayCountPerMember.current}
              period={data.individual.avgDelayCountPerMember.period}
            />
            <Cell
              label="重灾区人"
              current={data.individual.worstMemberName.current ?? '—'}
              period={data.individual.worstMemberName.period ?? '—'}
            />
            <Cell
              label="重灾区次数"
              current={data.individual.worstMemberCount.current}
              period={data.individual.worstMemberCount.period}
            />
          </div>
        </div>
      </div>
    </ChartContainer>
  );
}
