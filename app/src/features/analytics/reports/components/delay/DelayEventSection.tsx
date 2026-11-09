/**
 * 延期事件明细表（双视角 · 任务视角明细）
 * 逐条展示延期事件：何时发生、当时谁负责、所属项目与根任务、延期几天；受 FilterBar 时间段/项目筛选联动。
 * 服务端分页（page_size=20，翻页调 API）——区别于 DelayDetailSection 的整包拉取 + DataTable 本地切片分页，
 * 故不传 DataTable 的 pagination（其内置分页会二次切片服务端已分页的 items），分页条自绘。
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable } from '../shared';
import { getDelayEvents } from '@/lib/api/analytics.api';
import { queryKeys } from '@/lib/api/query-keys';
import type { ReportFilters, TableColumn } from '../../types';

/** 每页条数（服务端分页） */
const DELAY_EVENT_PAGE_SIZE = 20;

/** 列定义：发生时间 / 当时负责人 / 项目 / 根任务 / WBS编码 / 任务描述 / 延期天数（v3 加项目+根任务两列） */
const DELAY_EVENT_COLUMNS: TableColumn[] = [
  { key: 'createdAt', label: '发生时间', width: 130 },
  { key: 'assigneeName', label: '当时负责人', width: 110 },
  { key: 'projectName', label: '项目', width: 140 },
  { key: 'rootTaskName', label: '根任务', width: 160 },
  { key: 'wbsCode', label: 'WBS编码', width: 130 },
  { key: 'taskDescription', label: '任务描述' },
  { key: 'delayDays', label: '延期天数', width: 90 },
];

/** ISO 时间 → 「YYYY-MM-DD HH:mm」本地时间（失效兜底返回原串） */
function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface DelayEventSectionProps {
  /** FilterBar 筛选（时间段/项目联动：变化自动重查并重置回第 1 页） */
  filters: ReportFilters;
}

export function DelayEventSection({ filters }: DelayEventSectionProps) {
  const [page, setPage] = useState(1);

  // 筛选变化（时间段/项目）时重置回第 1 页（依赖取原始值字段，避免 filters 对象引用变化误触发）
  useEffect(() => {
    setPage(1);
  }, [filters.projectId, filters.startDate, filters.endDate]);

  // 请求参数（snake_case 与后端对齐；undefined 键不序列化进 query string，current 视角即不带时间段）
  const queryParams = {
    project_id: filters.projectId || undefined,
    start_date: filters.startDate || undefined,
    end_date: filters.endDate || undefined,
    page,
    page_size: DELAY_EVENT_PAGE_SIZE,
  };

  // queryKey 含全部筛选 + 页码：切筛选/翻页自动重查
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.analytics.delayEvents(queryParams),
    queryFn: ({ signal }) => getDelayEvents(queryParams, signal),
    staleTime: 60_000,
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DELAY_EVENT_PAGE_SIZE));

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h3 className="text-sm font-semibold">延期事件明细</h3>
        <span className="text-xs text-muted-foreground">
          逐条记录延期发生时点与当时负责人（每页 {DELAY_EVENT_PAGE_SIZE} 条）
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">加载中...</div>
      ) : error ? (
        <div className="flex items-center justify-center h-24 text-destructive">
          加载失败：{(error as Error).message}
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">时间段内无延期事件</div>
      ) : (
        <>
          <DataTable
            columns={DELAY_EVENT_COLUMNS}
            data={items}
            renderCell={(item, column) => {
              if (column.key === 'createdAt') {
                return <span className="font-mono text-xs">{formatEventTime(item.createdAt)}</span>;
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
              if (column.key === 'assigneeName') {
                return item.assigneeName || '未分配';
              }
              if (column.key === 'delayDays') {
                return <span className="font-mono">{item.delayDays}</span>;
              }
              return item.taskDescription;
            }}
          />

          {/* 服务端分页条（翻页重新请求 API；样式沿用 DataTable 分页 footer） */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">共 {total} 条</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
