/**
 * T1：各技术组延期对比（admin/dept_manager 可见）
 * 表格 + 条形图：组名/总任务/延期数/延期率/平均天数/累计延期/计划变更
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import type { DepartmentDelayData } from '../../types';

export interface DeptComparisonViewProps {
  data: DepartmentDelayData[];
  onSelectDept?: (deptId: number | null) => void;
}

export function DeptComparisonView({ data, onSelectDept }: DeptComparisonViewProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="各技术组延期对比" subtitle="管辖各组延期排名">
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>
      </ChartContainer>
    );
  }

  const chartData = {
    labels: data.map((d) => d.deptName),
    datasets: [
      { label: '当前延期数', values: data.map((d) => d.delayedCount), color: '#ef4444' },
      { label: '累计延期次数', values: data.map((d) => d.totalDelayCount), color: '#f59e0b' },
    ],
  };

  return (
    <ChartContainer title="各技术组延期对比" subtitle="点击组名筛该组成员（管辖范围内）">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {['组名', '总任务', '延期数', '延期率', '平均天数', '累计延期', '计划变更'].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr
                key={d.deptId}
                className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelectDept?.(d.deptId)}
              >
                <td className="px-2 py-1.5 font-medium text-primary underline-offset-2 hover:underline">{d.deptName}</td>
                <td className="px-2 py-1.5">{d.totalTasks}</td>
                <td className="px-2 py-1.5 text-red-600 font-medium">{d.delayedCount}</td>
                <td className="px-2 py-1.5">{d.delayRate}%</td>
                <td className="px-2 py-1.5">{d.avgDelayDays}</td>
                <td className="px-2 py-1.5 text-amber-600">{d.totalDelayCount}</td>
                <td className="px-2 py-1.5">{d.planChangeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BarChart data={chartData} layout="vertical" height={Math.max(200, data.length * 40)} yAxisLabel="组" />
    </ChartContainer>
  );
}
