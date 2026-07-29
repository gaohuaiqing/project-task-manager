/**
 * K1+K2+K3：问题任务榜（反复延期 + 频繁变更 + 超长延期天数）
 * 3 榜并排（桌面端 3 列）
 */
import { ChartContainer, ChartGroup } from '../shared';
import type { DelayTaskItem } from '../../types';

export interface ProblemTaskSectionProps {
  repeatDelayTasks: DelayTaskItem[];
  frequentChangeTasks: DelayTaskItem[];
  longestDelayTasks: DelayTaskItem[];
}

export function ProblemTaskSection({
  repeatDelayTasks,
  frequentChangeTasks,
  longestDelayTasks,
}: ProblemTaskSectionProps) {
  return (
    <ChartGroup className="lg:grid-cols-3">
      <TaskListCard
        title="反复延期任务榜"
        subtitle={`Top ${repeatDelayTasks.length}（按累计延期次数）`}
        tasks={repeatDelayTasks}
        metric={(t) => `${t.delayDays}天`}
      />
      <TaskListCard
        title="频繁变更任务榜"
        subtitle={`Top ${frequentChangeTasks.length}（按计划变更次数）`}
        tasks={frequentChangeTasks}
        metric={(t) => `${t.delayDays}天`}
      />
      <TaskListCard
        title="超长延期天数榜"
        subtitle={`Top ${longestDelayTasks.length}（按当前延期天数）`}
        tasks={longestDelayTasks}
        metric={(t) => `${t.delayDays}天`}
      />
    </ChartGroup>
  );
}

function TaskListCard({
  title,
  subtitle,
  tasks,
  metric,
}: {
  title: string;
  subtitle: string;
  tasks: DelayTaskItem[];
  metric: (t: DelayTaskItem) => string;
}) {
  return (
    <ChartContainer title={title} subtitle={subtitle}>
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 p-2 rounded border border-border/40 text-xs"
            >
              <div className="flex-1 min-w-0">
                {/* 注：brief 用 t.description，但 DelayTaskItem 实际字段为 taskName */}
                <div className="font-medium truncate">{t.taskName || '(无标题)'}</div>
                <div className="text-muted-foreground truncate">
                  {t.wbsCode ?? '—'} · {t.projectName} · {t.assigneeName}
                </div>
                {/* v2: 补原因显示（brief 要求 TaskListCard 含 reason/assigneeName/projectName） */}
                {t.delayReason && (
                  <div className="text-muted-foreground/70 truncate italic">
                    原因：{t.delayReason}
                  </div>
                )}
              </div>
              <span className="text-red-600 font-medium whitespace-nowrap">{metric(t)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartContainer>
  );
}
