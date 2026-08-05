/**
 * T7：任务类型维度延期分布（条形图 + 延期率表格）
 * v2 修复：柱图用中文类型名（TASK_TYPE_LABELS）；追加表格列出延期率前列（参考项目延期排名）
 */
import { BarChart } from '../charts';
import { ChartContainer } from '../shared';
import { TASK_TYPE_LABELS } from '@/features/analytics/shared/constants/labels';
import type { TaskTypeDelayData, DelayDetailQuery } from '../../types';

export interface TaskTypeDelayViewProps {
  data: TaskTypeDelayData[];
  /** v2 交互增强：点击类型柱子下钻该类型延期任务明细 */
  onDrillDown?: (filters: DelayDetailQuery, title: string) => void;
}

/** 英文枚举 → 中文（保留原值兜底；空值显示"未分类"）。注意：onDrillDown 仍传英文 task_type 给后端 */
const typeLabel = (t: string): string => {
  if (!t) return '未分类';
  return TASK_TYPE_LABELS[t] || t;
};

export function TaskTypeDelayView({ data, onDrillDown }: TaskTypeDelayViewProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="任务类型延期分布" subtitle="各类型延期率">
        <Empty />
      </ChartContainer>
    );
  }
  const chartData = {
    labels: data.map((t) => typeLabel(t.taskType)),
    datasets: [
      { label: '延期数', values: data.map((t) => t.delayedCount), color: '#ef4444' },
      { label: '延期率(%)', values: data.map((t) => t.delayRate), color: '#f59e0b' },
    ],
  };
  // 表格按延期率降序（"延期率前列"在上）
  const byRate = [...data].sort((a, b) => b.delayRate - a.delayRate);

  return (
    <ChartContainer title="任务类型延期分布" subtitle="哪类任务最易延期">
      <BarChart
        data={chartData}
        layout="vertical"
        height={280}
        yAxisLabel="类型"
        onBarClick={onDrillDown ? ({ index }) => {
          const t = data[index];
          if (t) onDrillDown({ task_type: t.taskType }, `${typeLabel(t.taskType)} 类型的延期任务`);
        } : undefined}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {['类型', '总任务', '延期数', '延期率'].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byRate.map((t, i) => (
              <tr key={t.taskType || `type-${i}`} className="border-b border-border/40 hover:bg-muted/30">
                <td className="px-2 py-1.5 font-medium">{typeLabel(t.taskType)}</td>
                <td className="px-2 py-1.5">{t.totalTasks}</td>
                <td className="px-2 py-1.5 text-red-600">{t.delayedCount}</td>
                <td className="px-2 py-1.5">{t.delayRate}%</td>
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
