/**
 * 审批项表格组件
 * 支持列宽拖拽调整，宽度持久化到 localStorage
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { ApprovalTableRow } from './ApprovalTableRow';
import type { ApprovalItem } from '@/lib/api/workflow.api';

const STORAGE_KEY = 'approval-table-column-widths';

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  createdAt: 90,
  projectName: 120,
  taskDescription: 150,
  changeType: 80,
  changeContent: 200,
  reason: 100,
  userName: 70,
  status: 70,
  approverName: 70,
  approvedAt: 90,
  actions: 100,
};

const COLUMNS = [
  { key: 'createdAt', label: '提交时间', minWidth: 80 },
  { key: 'projectName', label: '项目', minWidth: 80 },
  { key: 'taskDescription', label: '任务', minWidth: 100 },
  { key: 'changeType', label: '变更类型', minWidth: 70 },
  { key: 'changeContent', label: '变更内容', minWidth: 120 },
  { key: 'reason', label: '变更原因', minWidth: 80 },
  { key: 'userName', label: '申请人', minWidth: 60 },
  { key: 'status', label: '状态', minWidth: 60 },
  { key: 'approverName', label: '审批人', minWidth: 60 },
  { key: 'approvedAt', label: '审批时间', minWidth: 80 },
  { key: 'actions', label: '操作', minWidth: 80, resizable: false },
];

interface ApprovalsTableProps {
  items: ApprovalItem[];
  onApprove: (submissionId: string) => void;
  onReject: (item: ApprovalItem) => void;
  onViewDetail: (item: ApprovalItem) => void;
  approvingId?: string;
  rejectingId?: string;
  isLoading?: boolean;
}

export function ApprovalsTable({
  items,
  onApprove,
  onReject,
  onViewDetail,
  approvingId,
  rejectingId,
  isLoading,
}: ApprovalsTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMN_WIDTHS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) } : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const handleMouseDown = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(columnKey);
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const column = COLUMNS.find((c) => c.key === resizing);
      if (!column) return;

      const table = tableRef.current;
      if (!table) return;

      const headerCells = table.querySelectorAll('th');
      const columnIndex = COLUMNS.findIndex((c) => c.key === resizing);
      const headerCell = headerCells[columnIndex];
      if (!headerCell) return;

      const rect = table.getBoundingClientRect();
      const newWidth = Math.max(
        column.minWidth,
        Math.min(400, e.clientX - rect.left - headerCell.offsetLeft)
      );

      setColumnWidths((prev) => ({
        ...prev,
        [resizing]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table ref={tableRef}>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: columnWidths[column.key], minWidth: column.minWidth }}
                className="relative select-none"
              >
                {column.label}
                {column.resizable !== false && (
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50"
                    onMouseDown={(e) => handleMouseDown(column.key, e)}
                  />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="text-center py-16">
                <div className="flex flex-col items-center text-muted-foreground">
                  <p className="text-sm">暂无审批记录</p>
                  <p className="text-xs mt-1">当工程师提交计划变更时，审批记录将出现在这里</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <ApprovalTableRow
                key={item.submissionId}
                item={item}
                onApprove={onApprove}
                onReject={onReject}
                onViewDetail={onViewDetail}
                isApproving={approvingId === item.submissionId}
                isRejecting={rejectingId === item.submissionId}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
