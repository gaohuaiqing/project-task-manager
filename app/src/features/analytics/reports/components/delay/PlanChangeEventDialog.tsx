/**
 * v3 双视角 · P3 计划变更排行下钻弹窗：成员计划变更事件明细
 * 点「计划变更排行」柱子弹出，逐批次展示该成员的计划变更（生效时间 / 项目 / 根任务 / WBS / 任务描述 / 变更内容 / 状态）。
 * - 行粒度=批次（一次提交的多字段变更一行）；仅 approved（直接变更+审批通过），
 *   与柱值（后端 countPlanChangeEventsByAssignee 同参数）同口径，弹窗 total = 柱值。
 * - filters 由 DelayAnalysisTab 合并当前 FilterBar 时间段 + 项目筛选后传入。
 * - 一次性拉 page_size=100 + DataTable 本地分页（模式同 DelayEventDetailDialog）。
 */
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { DataTable } from '../shared';
import { getPlanChangeEvents } from '@/lib/api/analytics.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { PlanChangeEventItem, TableColumn } from '../../types';

/** 弹窗筛选参数（snake_case 与后端对齐；assignee_id 必填——弹窗打开即针对某成员） */
export interface PlanChangeEventDialogFilters {
  assignee_id: number;
  project_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface PlanChangeEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filters: PlanChangeEventDialogFilters;
}

/** 变更字段中文名（与 PlanChangesPanel 的 CHANGE_TYPE_LABELS 同源映射，跨 feature 各自持有） */
const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

/** 列定义：生效时间 / 项目 / 根任务 / WBS编码 / 任务描述 / 变更内容 / 状态 */
const PLAN_CHANGE_EVENT_DIALOG_COLUMNS: TableColumn[] = [
  { key: 'effectiveAt', label: '生效时间', width: 140 },
  { key: 'projectName', label: '项目', width: 130 },
  { key: 'rootTaskName', label: '根任务', width: 150 },
  { key: 'wbsCode', label: 'WBS编码', width: 120 },
  { key: 'taskDescription', label: '任务描述' },
  { key: 'changes', label: '变更内容' },
  { key: 'changeKind', label: '状态', width: 100 },
];

/** ISO 时间 → 「YYYY-MM-DD HH:mm」本地时间（失效兜底返回原串；与 DelayEventDetailDialog 同模式） */
function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlanChangeEventDialog({ open, onOpenChange, title, filters }: PlanChangeEventDialogProps) {
  // 一次性拉取（page_size=100，服务端 clamp 上限）：单成员变更事件通常 <100；DataTable 本地分页
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.analytics.planChangeEventDialog(filters),
    queryFn: ({ signal }) => getPlanChangeEvents({ ...filters, page: 1, page_size: 100 }, signal),
    enabled: open,
    staleTime: 60_000,
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">加载中...</div>
          ) : error ? (
            <div className="text-destructive text-center py-8">加载失败：{(error as Error).message}</div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">筛选范围内无已生效计划变更</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                共 {total} 条{total > items.length ? `（仅显示前 ${items.length} 条）` : ''}
              </div>
              <DataTable<PlanChangeEventItem>
                columns={PLAN_CHANGE_EVENT_DIALOG_COLUMNS}
                data={items}
                pagination={{ page: 1, pageSize: 10, total: items.length }}
                renderCell={(item, column) => {
                  if (column.key === 'effectiveAt') {
                    return <span className="font-mono text-xs">{formatEventTime(item.effectiveAt)}</span>;
                  }
                  if (column.key === 'wbsCode') {
                    return item.wbsCode ?? <span className="text-muted-foreground">-</span>;
                  }
                  if (column.key === 'projectName') {
                    return item.projectName ?? <span className="text-muted-foreground">-</span>;
                  }
                  if (column.key === 'rootTaskName') {
                    return item.rootTaskName ?? <span className="text-muted-foreground">-</span>;
                  }
                  if (column.key === 'changes') {
                    // 批次内多字段变更行内列举：「工期: 5 → 8」
                    return (
                      <span className="text-xs">
                        {item.changes.map((c, i) => (
                          <span key={`${item.id}-${c.changeType}-${i}`}>
                            {i > 0 && <span className="text-muted-foreground">；</span>}
                            {CHANGE_TYPE_LABELS[c.changeType] || c.changeType}:{' '}
                            <span className="font-mono">{c.oldValue ?? '-'}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-mono">{c.newValue}</span>
                          </span>
                        ))}
                      </span>
                    );
                  }
                  if (column.key === 'changeKind') {
                    return item.changeKind === 'direct' ? (
                      <Badge variant="secondary">直接变更</Badge>
                    ) : (
                      <Badge variant="default">审批通过</Badge>
                    );
                  }
                  return item.taskDescription;
                }}
              />
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
