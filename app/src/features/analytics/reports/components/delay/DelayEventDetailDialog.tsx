/**
 * 双视角 · P3 成员榜下钻弹窗：成员延期事件明细
 * 点「延期次数排行」柱子弹出，逐条展示该成员的延期事件（发生时间 / WBS / 任务描述 / 延期天数）。
 * - filters 由 DelayAnalysisTab 合并当前 FilterBar 时间段 + 项目筛选后传入，
 *   与 P3 榜单 totalDelayCount（后端 countDelayEventsByAssignee 同参数）同口径，弹窗 total = 柱值。
 * - 服务端按 created_at DESC 返回（时间倒序），一次拉 page_size=100 + DataTable 本地分页
 *   （模式同 DelayTaskDetailDialog；区别于 DelayEventSection 的服务端分页——弹窗无需翻页请求）。
 */
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { DataTable } from '../shared';
import { getDelayEvents } from '@/lib/api/analytics.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { DelayEventItem, TableColumn } from '../../types';

/** 弹窗筛选参数（snake_case 与后端对齐；assignee_id 必填——弹窗打开即针对某成员） */
export interface DelayEventDialogFilters {
  assignee_id: number;
  project_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface DelayEventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filters: DelayEventDialogFilters;
}

/** 列定义：发生时间 / WBS编码 / 任务描述 / 延期天数（省略当时负责人列——弹窗本身按成员筛选） */
const DELAY_EVENT_DIALOG_COLUMNS: TableColumn[] = [
  { key: 'createdAt', label: '发生时间', width: 140 },
  { key: 'wbsCode', label: 'WBS编码', width: 120 },
  { key: 'taskDescription', label: '任务描述' },
  { key: 'delayDays', label: '延期天数', width: 90 },
];

/** ISO 时间 → 「YYYY-MM-DD HH:mm」本地时间（失效兜底返回原串；与 DelayEventSection 同模式，避免跨文件导出改动） */
function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DelayEventDetailDialog({ open, onOpenChange, title, filters }: DelayEventDetailDialogProps) {
  // 一次性拉取（page_size=100，服务端 clamp 上限）：单成员事件通常 <100；DataTable 本地分页
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.analytics.delayEventDialog(filters),
    queryFn: ({ signal }) => getDelayEvents({ ...filters, page: 1, page_size: 100 }, signal),
    enabled: open,
    staleTime: 60_000,
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">加载中...</div>
          ) : error ? (
            <div className="text-destructive text-center py-8">加载失败：{(error as Error).message}</div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">筛选范围内无延期事件</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                共 {total} 条{total > items.length ? `（仅显示前 ${items.length} 条）` : ''}
              </div>
              <DataTable<DelayEventItem>
                columns={DELAY_EVENT_DIALOG_COLUMNS}
                data={items}
                pagination={{ page: 1, pageSize: 10, total: items.length }}
                renderCell={(item, column) => {
                  if (column.key === 'createdAt') {
                    return <span className="font-mono text-xs">{formatEventTime(item.createdAt)}</span>;
                  }
                  if (column.key === 'wbsCode') {
                    return item.wbsCode ?? <span className="text-muted-foreground">-</span>;
                  }
                  if (column.key === 'delayDays') {
                    return <span className="font-mono">{item.delayDays}</span>;
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
