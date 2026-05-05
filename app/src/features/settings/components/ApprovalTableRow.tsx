/**
 * 审批项表格行组件
 * 渲染单行审批记录，支持多变更合并显示
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ApprovalItem, ApprovalStatus } from '@/lib/api/workflow.api';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '待审批', variant: 'secondary' },
  approved: { label: '已通过', variant: 'default' },
  rejected: { label: '已驳回', variant: 'destructive' },
  timeout: { label: '已超时', variant: 'outline' },
};

function formatChangeValue(type: string, value: string | null): string {
  if (value === null || value === undefined) return '-';
  if (type === 'start_date' || type === 'end_date') {
    try {
      return format(new Date(value), 'MM-dd');
    } catch {
      return value;
    }
  }
  if (type === 'duration') return `${value}天`;
  return value;
}

interface ApprovalTableRowProps {
  item: ApprovalItem;
  onApprove: (submissionId: string) => void;
  onReject: (item: ApprovalItem) => void;
  onViewDetail: (item: ApprovalItem) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function ApprovalTableRow({
  item,
  onApprove,
  onReject,
  onViewDetail,
  isApproving,
  isRejecting,
}: ApprovalTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[item.status];
  const isPending = item.status === 'pending';
  const hasMultipleChanges = item.changes.length > 1;

  const renderChangeContent = () => {
    if (hasMultipleChanges) {
      if (expanded) {
        return (
          <div className="space-y-1">
            {item.changes.map((change) => (
              <div key={change.id} className="text-sm font-mono">
                {CHANGE_TYPE_LABELS[change.changeType] || change.changeType}:{' '}
                {formatChangeValue(change.changeType, change.oldValue)} → {formatChangeValue(change.changeType, change.newValue)}
              </div>
            ))}
          </div>
        );
      }
      return <span className="text-sm font-mono">{item.changes.length} 项变更</span>;
    }

    const change = item.changes[0];
    return (
      <span className="text-sm font-mono">
        {formatChangeValue(change.changeType, change.oldValue)} → {formatChangeValue(change.changeType, change.newValue)}
      </span>
    );
  };

  return (
    <TableRow className={isPending ? 'bg-amber-50/50 hover:bg-amber-50' : undefined}>
      {/* 提交时间 */}
      <TableCell className="text-sm whitespace-nowrap">
        {format(new Date(item.createdAt), 'MM-dd HH:mm')}
      </TableCell>

      {/* 项目 */}
      <TableCell className="max-w-[120px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.projectName}</span>
            </TooltipTrigger>
            <TooltipContent>{item.projectName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 任务 */}
      <TableCell className="max-w-[150px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.taskDescription}</span>
            </TooltipTrigger>
            <TooltipContent>{item.taskDescription}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 变更类型 */}
      <TableCell>
        {hasMultipleChanges ? (
          <Badge variant="outline">多项变更</Badge>
        ) : (
          <Badge variant="outline">
            {CHANGE_TYPE_LABELS[item.changes[0].changeType] || item.changes[0].changeType}
          </Badge>
        )}
      </TableCell>

      {/* 变更内容 */}
      <TableCell className="max-w-[200px]">
        <div className="flex items-start gap-1">
          <div className="flex-1">{renderChangeContent()}</div>
          {hasMultipleChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </TableCell>

      {/* 变更原因 */}
      <TableCell className="max-w-[100px]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-sm">{item.reason}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{item.reason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* 申请人 */}
      <TableCell className="text-sm whitespace-nowrap">{item.userName}</TableCell>

      {/* 状态 */}
      <TableCell>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </TableCell>

      {/* 审批人 */}
      <TableCell className="text-sm">{item.approverName || '-'}</TableCell>

      {/* 审批时间 */}
      <TableCell className="text-sm whitespace-nowrap">
        {item.approvedAt ? format(new Date(item.approvedAt), 'MM-dd HH:mm') : '-'}
      </TableCell>

      {/* 操作 */}
      <TableCell>
        {isPending ? (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => onReject(item)}
              disabled={isRejecting}
            >
              <XCircle className="h-3 w-3 mr-1" />
              驳回
            </Button>
            <Button
              size="sm"
              className="h-7"
              onClick={() => onApprove(item.submissionId)}
              disabled={isApproving}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              通过
            </Button>
          </div>
        ) : (
          <Button variant="link" size="sm" className="h-7 p-0" onClick={() => onViewDetail(item)}>
            详情
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
