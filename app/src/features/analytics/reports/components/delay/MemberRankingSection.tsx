/**
 * P1+P4：成员延期排名（含累计延期次数置顶高亮重灾区）
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import type { MemberRankingData } from '../../types';

export interface MemberRankingSectionProps {
  data: MemberRankingData[];
  selectedDeptName?: string | null;
  /** 选中的部门 id（来自 TeamSection 点组下钻）；非空时只展示该部门成员 */
  selectedDeptId?: number | null;
}

export function MemberRankingSection({ data, selectedDeptName, selectedDeptId }: MemberRankingSectionProps) {
  const subtitle = selectedDeptName ? `${selectedDeptName} 成员` : '当前范围内成员';
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="成员延期排名" subtitle={subtitle}>
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无延期成员</div>
      </ChartContainer>
    );
  }

  // 部门下钻筛选：dept_manager 点组后只显示该组成员（dept_id=0 的未分配成员在选了具体组时排除）
  const filtered = selectedDeptId ? data.filter((m) => m.deptId === selectedDeptId) : data;

  if (filtered.length === 0) {
    return (
      <ChartContainer title="成员延期排名" subtitle={subtitle}>
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          {selectedDeptName ? `${selectedDeptName} 暂无延期成员` : '暂无延期成员'}
        </div>
      </ChartContainer>
    );
  }

  // P4：按累计延期次数排序（重灾区置顶）— 在筛选后的集合内排序与高亮
  const sorted = [...filtered].sort((a, b) => b.totalDelayCount - a.totalDelayCount);
  const topDelayCount = sorted[0]?.totalDelayCount ?? 0;

  const chartData = {
    labels: sorted.map((m) => m.assigneeName),
    datasets: [
      { label: '当前延期数', values: sorted.map((m) => m.delayedTaskCount), color: '#ef4444' },
      { label: '累计延期次数', values: sorted.map((m) => m.totalDelayCount), color: '#f59e0b' },
      { label: '计划变更次数', values: sorted.map((m) => m.planChangeCount), color: '#3b82f6' },
    ],
  };

  return (
    <ChartContainer title="成员延期排名" subtitle={`${subtitle}（按累计延期次数排序，红色为重灾区）`}>
      <BarChart data={chartData} layout="vertical" height={Math.max(220, sorted.length * 36)} yAxisLabel="成员" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>{['成员', '当前延期', '累计延期', '计划变更', '平均天数'].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.assigneeId} className={`border-b border-border/40 ${m.totalDelayCount === topDelayCount && topDelayCount > 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                <td className="px-2 py-1.5 font-medium">{m.assigneeName}</td>
                <td className="px-2 py-1.5 text-red-600">{m.delayedTaskCount}</td>
                <td className="px-2 py-1.5 text-amber-600 font-medium">{m.totalDelayCount}</td>
                <td className="px-2 py-1.5">{m.planChangeCount}</td>
                <td className="px-2 py-1.5">{m.avgDelayDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}
