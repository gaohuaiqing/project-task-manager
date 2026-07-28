/**
 * L0 团队整体层：
 * - admin/dept_manager → DeptComparisonView（各组对比）
 * - tech_manager/engineer → 本组总览指标卡（单组，stats + memberRanking 派生）
 */
import { DeptComparisonView } from './DeptComparisonView';
import { ChartContainer } from '../shared';
import type { DelayAnalysisData, MemberRankingData } from '../../types';

export interface TeamSectionProps {
  data: DelayAnalysisData;
  /** admin/dept_manager 走组对比视图；tech_manager/engineer 走本组指标卡 */
  role: 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';
  onSelectDept?: (deptId: number | null) => void;
}

export function TeamSection({ data, role, onSelectDept }: TeamSectionProps) {
  if (role === 'tech_manager' || role === 'engineer') {
    // tech_manager 只管 1 组：后端 teamComparison 不填充（仅 admin/dept_manager），
    // 故累计延期次数从 memberRanking 求和（P1 数据 tech_manager 有）
    // transformer 输出 stats key 为 snake_case: delayed_count / warning_count
    const statMap = new Map((data.stats ?? []).map((s) => [s.key, s.value]));
    const num = (k: string): number => {
      const v = statMap.get(k);
      return typeof v === 'number' ? v : v ? Number(v) || 0 : 0;
    };
    return (
      <ChartContainer title="本组延期总览" subtitle="本组当前延期核心指标">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Metric label="当前延期" value={num('delayed_count')} color="text-red-600" />
          <Metric label="延期预警" value={num('warning_count')} color="text-amber-600" />
          <Metric label="累计延期次数" value={sumMemberDelay(data.memberRanking)} color="text-orange-600" />
          <Metric label="平均延期天数" value={data.severityDistribution?.avgDelayDays ?? 0} color="text-rose-600" />
        </div>
      </ChartContainer>
    );
  }

  // admin / dept_manager：各组对比
  return <DeptComparisonView data={data.teamComparison} onSelectDept={onSelectDept} />;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function sumMemberDelay(members: MemberRankingData[]): number {
  return (members ?? []).reduce((s, m) => s + (m.totalDelayCount || 0), 0);
}
