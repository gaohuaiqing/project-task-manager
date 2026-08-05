/**
 * T6：项目维度延期排名（条形图）
 * v2: BarChart 下方追加紧凑表格，显示每个项目的改善方向（↑恶化/↓改善/→持平 + delta 值）
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import type { ProjectDelayData, DelayDetailQuery } from '../../types';

export interface ProjectDelayViewProps {
  data: ProjectDelayData[];
  /** v2 交互增强：点击项目柱子下钻该项目延期任务明细 */
  onDrillDown?: (filters: DelayDetailQuery, title: string) => void;
}

/** 改善方向徽章：箭头 + 颜色 + delta 值（与 DeptComparisonView 共用同款样式） */
function ImprovementBadge({
  direction,
  delta,
}: {
  direction: ProjectDelayData['improvementDirection'];
  delta: number;
}) {
  if (direction === 'improving') {
    return (
      <span className="text-green-600">
        ↓改善
        <span className="ml-1 text-xs">
          ({delta > 0 ? '+' : ''}
          {delta})
        </span>
      </span>
    );
  }
  if (direction === 'worsening') {
    return (
      <span className="text-red-600">
        ↑恶化
        <span className="ml-1 text-xs">
          ({delta > 0 ? '+' : ''}
          {delta})
        </span>
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      →持平
      <span className="ml-1 text-xs">
        ({delta > 0 ? '+' : ''}
        {delta})
      </span>
    </span>
  );
}

export function ProjectDelayView({ data, onDrillDown }: ProjectDelayViewProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="项目延期排名" subtitle="Top 10">
        <Empty />
      </ChartContainer>
    );
  }
  const chartData = {
    labels: data.map((p) => p.projectName),
    datasets: [
      { label: '延期数', values: data.map((p) => p.delayedCount), color: '#ef4444' },
      { label: '延期率(%)', values: data.map((p) => p.delayRate), color: '#f59e0b' },
    ],
  };
  return (
    <ChartContainer title="项目延期排名" subtitle="延期数 + 延期率 Top 10，含改善方向">
      <BarChart
        data={chartData}
        layout="vertical"
        height={280}
        yAxisLabel="项目"
        onBarClick={onDrillDown ? ({ index }) => {
          const p = data[index];
          if (p) onDrillDown({ project_id: p.projectId }, `项目 ${p.projectName} 的延期任务`);
        } : undefined}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {['项目', '延期数', '延期率', '改善方向'].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.projectId} className="border-b border-border/40 hover:bg-muted/30">
                <td className="px-2 py-1.5 font-medium">{p.projectName}</td>
                <td className="px-2 py-1.5 text-red-600">{p.delayedCount}</td>
                <td className="px-2 py-1.5">{p.delayRate}%</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <ImprovementBadge direction={p.improvementDirection} delta={p.improvementDelta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartContainer>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">暂无数据</div>;
}
