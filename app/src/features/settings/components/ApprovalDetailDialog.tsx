/**
 * 审批项详情弹窗
 * 显示审批项的完整信息，包括所有变更项
 */
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { ApprovalItem, ApprovalStatus } from '@/lib/api/workflow.api';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }
> = {
  pending: { label: '待审批', variant: 'secondary', icon: Clock },
  approved: { label: '已通过', variant: 'default', icon: CheckCircle },
  rejected: { label: '已驳回', variant: 'destructive', icon: XCircle },
  timeout: { label: '已超时', variant: 'outline', icon: Clock },
};

function formatChangeValue(type: string, value: string | null): string {
  if (value === null || value === undefined) return '-';
  if (type === 'start_date' || type === 'end_date') {
    try {
      return format(new Date(value), 'yyyy-MM-dd');
    } catch {
      return value;
    }
  }
  if (type === 'duration') return `${value} 天`;
  return value;
}

interface ApprovalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
}

export function ApprovalDetailDialog({ open, onOpenChange, item }: ApprovalDetailDialogProps) {
  if (!item) return null;

  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant={statusConfig.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            审批详情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">项目：</span>
              <span className="font-medium">{item.projectName}</span>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground shrink-0">任务：</span>
              <span className="break-words">{item.taskDescription}</span>
            </div>
          </div>

          <Separator />

          {/* 变更列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">变更内容</h4>
            {item.changes.map((change) => (
              <div key={change.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                <Badge variant="outline" className="mb-2">
                  {CHANGE_TYPE_LABELS[change.changeType] || change.changeType}
                </Badge>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">原值：</span>
                    <span>{formatChangeValue(change.changeType, change.oldValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">新值：</span>
                    <span className="font-medium">{formatChangeValue(change.changeType, change.newValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* 变更原因 */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">变更原因</h4>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
          </div>

          {/* 申请人信息 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              申请人：{item.userName}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              提交时间：{format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>

          {/* 审批信息 */}
          {item.status !== 'pending' && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">审批信息</h4>
                {item.approverName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    审批人：{item.approverName}
                  </div>
                )}
                {item.approvedAt && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    审批时间：{format(new Date(item.approvedAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                )}
                {item.rejectionReason && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    驳回原因：{item.rejectionReason}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
