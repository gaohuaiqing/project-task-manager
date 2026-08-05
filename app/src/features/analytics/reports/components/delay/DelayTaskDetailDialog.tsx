/**
 * v2 交互增强：延期明细下钻弹窗
 * 点击柱子（成员延期次数排行 / 项目延期排名 / 任务类型延期分布）弹出，
 * 展示该维度的延期任务明细列表。复用 DELAY_DETAIL_COLUMNS 列定义。
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
import { DELAY_DETAIL_COLUMNS } from '../../config';
import { getDelayDetailTasks } from '../../api';
import { queryKeys } from '@/lib/api/query-keys';
import type { DelayDetailQuery } from '../../types';

export interface DelayTaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filters: DelayDetailQuery;
}

export function DelayTaskDetailDialog({ open, onOpenChange, title, filters }: DelayTaskDetailDialogProps) {
  // 一次性拉取（page_size=100），明细某维度通常 <100；复用 DataTable 前端分页
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.analytics.delayDetailTasks(filters),
    queryFn: ({ signal }) => getDelayDetailTasks({ ...filters, page: 1, page_size: 100 }, signal),
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
            <div className="text-muted-foreground text-center py-8">暂无延期任务</div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                共 {total} 条{total > items.length ? `（仅显示前 ${items.length} 条）` : ''}
              </div>
              <DataTable
                columns={DELAY_DETAIL_COLUMNS}
                data={items}
                pagination={{ page: 1, pageSize: 10, total: items.length }}
              />
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
