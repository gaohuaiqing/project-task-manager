/**
 * K1+K2+K3：问题任务榜（反复延期 + 频繁变更 + 超长延期天数）
 * + 逾期未开始 Top 成员榜（仅当前口径，实时状态）
 * 4 榜并排（桌面端 2 列 / 大屏 4 列）
 */
import { useState, useRef } from 'react';
import { ChartContainer, ChartGroup } from '../shared';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DelayHistoryPanel } from '@/features/tasks/components/DelayHistoryPanel';
import { PlanChangesPanel } from '@/features/tasks/components/PlanChangesPanel';
import { getDelayRecords, getPlanChangesByTask } from '@/lib/api/workflow.api';
import type { DelayRecord, PlanChange } from '@/lib/api/workflow.api';
import type { DelayTaskItem, OverdueStartMemberRankingItem } from '../../types';

export interface ProblemTaskSectionProps {
  repeatDelayTasks: DelayTaskItem[];
  frequentChangeTasks: DelayTaskItem[];
  longestDelayTasks: DelayTaskItem[];
  /** 逾期未开始成员排行（仅当前口径，实时状态） */
  overdueStartRanking: OverdueStartMemberRankingItem[];
  /** 逾期未开始 Top 榜成员下钻（「未分配」聚合行 assigneeId 为 null 不触发） */
  onOverdueStartDrillDown?: (member: OverdueStartMemberRankingItem) => void;
}

export function ProblemTaskSection({
  repeatDelayTasks,
  frequentChangeTasks,
  longestDelayTasks,
  overdueStartRanking,
  onOverdueStartDrillDown,
}: ProblemTaskSectionProps) {
  return (
    <ChartGroup className="lg:grid-cols-2 xl:grid-cols-4">
      <TaskListCard
        title="反复延期任务榜"
        subtitle={`Top ${repeatDelayTasks.length}（按累计延期次数，点击展开历史）`}
        tasks={repeatDelayTasks}
        metric={(t) => `${t.delayCount ?? 0}次`}
        expandable="delays"
      />
      <TaskListCard
        title="频繁变更任务榜"
        subtitle={`Top ${frequentChangeTasks.length}（按计划变更次数，点击展开历史）`}
        tasks={frequentChangeTasks}
        metric={(t) => `${t.planChangeCount ?? 0}次`}
        expandable="changes"
      />
      <TaskListCard
        title="超长延期天数榜"
        subtitle={`Top ${longestDelayTasks.length}（按当前延期天数）`}
        tasks={longestDelayTasks}
        metric={(t) => `${t.delayDays}天`}
      />
      <OverdueStartRankingCard items={overdueStartRanking} onDrillDown={onOverdueStartDrillDown} />
    </ChartGroup>
  );
}

/**
 * 逾期未开始 Top 成员榜（姓名 / 任务数 / 最长逾期天数；实时状态，不参与时间段统计）
 * 有 assigneeId 的行可点击下钻查看该成员逾期未开始任务明细；「未分配」聚合行不可点（样式弱化）
 */
function OverdueStartRankingCard({
  items,
  onDrillDown,
}: {
  items: OverdueStartMemberRankingItem[];
  onDrillDown?: (member: OverdueStartMemberRankingItem) => void;
}) {
  return (
    <ChartContainer
      title="逾期未开始 Top"
      subtitle={`Top ${items.length}（按任务数，仅当前口径实时状态${onDrillDown ? '，点击查看明细' : ''}）`}
    >
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((m, i) => {
            // 「未分配」聚合行 assigneeId 为 null，不可下钻
            const clickable = onDrillDown != null && m.assigneeId != null;
            return (
              <div
                key={`${m.name}-${i}`}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onDrillDown(m) : undefined}
                onKeyDown={clickable
                  ? (e) => {
                      // 键盘可达性：Enter/空格 触发与点击相同的下钻
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDrillDown(m);
                      }
                    }
                  : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 p-2 rounded border border-border/40 text-xs',
                  clickable && 'cursor-pointer hover:bg-muted/30 hover:border-border transition-colors',
                  !clickable && 'opacity-70',
                )}
              >
                <div className="flex-1 min-w-0 font-medium truncate">{m.name}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground whitespace-nowrap">
                    最长 <span className="font-medium text-orange-600">{m.maxOverdueDays}</span> 天
                  </span>
                  <span className="text-orange-600 font-medium whitespace-nowrap">{m.count} 个任务</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ChartContainer>
  );
}

function TaskListCard({
  title,
  subtitle,
  tasks,
  metric,
  expandable = 'none',
}: {
  title: string;
  subtitle: string;
  tasks: DelayTaskItem[];
  metric: (t: DelayTaskItem) => string;
  /** v2 交互增强：展开内容类型（delays=延期历史, changes=计划变更历史, none=不可展开） */
  expandable?: 'delays' | 'changes' | 'none';
}) {
  // 单展开 + 懒加载缓存（避免一次拉 N 个任务历史；折叠再展开走缓存）
  const [openId, setOpenId] = useState<string | null>(null);
  const cache = useRef<Record<string, DelayRecord[] | PlanChange[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleOpen = async (id: string) => {
    if (expandable === 'none' || cache.current[id]) return;
    setLoadingId(id);
    try {
      cache.current[id] = expandable === 'delays'
        ? await getDelayRecords(id)
        : await getPlanChangesByTask(id);
    } catch {
      cache.current[id] = [];
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          暂无数据
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {tasks.map((t) => (
            <Collapsible
              key={t.id}
              open={openId === t.id}
              onOpenChange={(o) => {
                setOpenId(o ? t.id : null);
                if (o) handleOpen(t.id);
              }}
            >
              <CollapsibleTrigger asChild>
                <div className={cn(
                  'flex items-center justify-between gap-2 p-2 rounded border border-border/40 text-xs',
                  expandable !== 'none' && 'cursor-pointer hover:bg-muted/30',
                )}>
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
                  <div className="flex items-center gap-1 shrink-0">
                    {expandable !== 'none' && (
                      <ChevronDown className={cn('h-3 w-3 transition-transform', openId === t.id && 'rotate-180')} />
                    )}
                    <span className="text-red-600 font-medium whitespace-nowrap">{metric(t)}</span>
                  </div>
                </div>
              </CollapsibleTrigger>
              {expandable !== 'none' && (
                <CollapsibleContent>
                  <div className={cn(
                    'mt-1 p-2 border rounded text-xs',
                    expandable === 'delays'
                      ? 'border-l-4 border-l-red-300 bg-red-50/40 dark:bg-red-950/20'
                      : 'border-l-4 border-l-amber-300 bg-amber-50/40 dark:bg-amber-950/20'
                  )}>
                    {loadingId === t.id ? (
                      <div className="text-muted-foreground text-center py-2">加载中...</div>
                    ) : cache.current[t.id] ? (
                      expandable === 'delays'
                        ? <DelayHistoryPanel records={(cache.current[t.id] as DelayRecord[]) ?? []} />
                        : <PlanChangesPanel changes={(cache.current[t.id] as PlanChange[]) ?? []} />
                    ) : null}
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          ))}
        </div>
      )}
    </ChartContainer>
  );
}
