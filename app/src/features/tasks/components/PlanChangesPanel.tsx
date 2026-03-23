/**
 * 计划变更面板组件
 * 显示任务的计划变更审批历史
 */
import { Badge } from '@/components/ui/badge';
import { Clock, Check, X, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import type { PlanChange } from '@/lib/api/workflow.api';

interface PlanChangesPanelProps {
  changes: PlanChange[];
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Check }> = {
  pending: { label: '待审批', variant: 'secondary', icon: Clock },
  approved: { label: '已通过', variant: 'default', icon: Check },
  rejected: { label: '已驳回', variant: 'destructive', icon: X },
  timeout: { label: '已超时', variant: 'outline', icon: AlertCircle },
};

export function PlanChangesPanel({ changes }: PlanChangesPanelProps) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>暂无计划变更</p>
        <p className="text-xs mt-1">任务未提交过计划变更申请</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changes.map((change) => {
        const statusConfig = STATUS_CONFIG[change.status] || STATUS_CONFIG.pending;
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={change.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {CHANGE_TYPE_LABELS[change.changeType] || change.changeType}
                </Badge>
                <Badge variant={statusConfig.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(change.createdAt), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">原值：</span>
                <span className="font-mono">{change.oldValue || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">新值：</span>
                <span className="font-mono">{change.newValue || '-'}</span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">变更原因：</span>
              <span>{change.reason}</span>
            </div>

            {/* 审批信息 */}
            {change.status !== 'pending' && (
              <div className="border-t pt-3 space-y-1">
                {change.approverName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    审批人：{change.approverName}
                  </div>
                )}
                {change.approvedAt && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    审批时间：{format(new Date(change.approvedAt), 'yyyy-MM-dd HH:mm')}
                  </div>
                )}
                {change.rejectionReason && (
                  <div className="text-xs text-destructive">
                    驳回原因：{change.rejectionReason}
                  </div>
                )}
              </div>
            )}

            {/* 申请人信息 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              申请人：{change.userName || '未知'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
