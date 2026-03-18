/**
 * 审批卡片组件
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalItem } from './hooks/useApprovals';

// ==================== 类型定义 ====================

interface ApprovalCardProps {
  approval: ApprovalItem;
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string, reason: string) => Promise<boolean>;
}

// ==================== 常量 ====================

const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  end_date: '结束日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数'
};

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'secondary', label: '待审批' },
  approved: { variant: 'default', label: '已通过' },
  rejected: { variant: 'destructive', label: '已驳回' }
};

// ==================== 子组件 ====================

/** 变更值对比 */
function ChangeValueBlock({ label, value, className }: {
  return (
    <div className={cn('flex-1 p-2 rounded border', className)}>
      <span className="text-muted-foreground">{label}：</span>
      <span className="font-mono">{value || '无'}</span>
    );
  );
  }
}

/** 驳回对话框 */
function RejectDialog({
  isOpen,
  isProcessing,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
        <h3 className="font-semibold text-lg mb-4">驳回原因</h3>
        <Textarea
          className="mb-4"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请输入驳回原因..."
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || !reason.trim()}
          >
            确认驳回
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onApprove, onReject }) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove(approval.id);
    setIsProcessing(false);
  };

  const handleReject = async (reason: string) => {
    setIsProcessing(true);
    const success = await onReject(approval.id, reason);
    setIsProcessing(false);
    if (success) {
      setShowRejectDialog(false);
    }
  };

  const statusStyle = STATUS_STYLES[approval.status] || STATUS_STYLES.pending;
  const isPending = approval.status === 'pending';

  return (
    <>
      <Card className={cn('transition-all', approval.is_timeout && 'border-red-300 bg-red-50')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{approval.task_wbs_code}</Badge>
              <span className="font-medium">{approval.user_name}</span>
              <span className="text-muted-foreground">申请修改</span>
              <Badge>{CHANGE_TYPE_LABELS[approval.change_type] || approval.change_type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {approval.is_timeout && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  超时 {approval.days_pending} 天
                </Badge>
              )}
              <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 任务描述 */}
          <div className="text-sm font-medium truncate" title={approval.task_description}>
            {approval.task_description}
          </div>

          {/* 项目名称 */}
          <div className="text-xs text-muted-foreground">项目: {approval.project_name}</div>

          {/* 变更对比 */}
          <div className="flex items-center gap-4 text-sm">
            <ChangeValueBlock
              label="原值"
              value={approval.old_value}
              className="bg-red-50 border-red-200"
            />
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <ChangeValueBlock
              label="新值"
              value={approval.new_value}
              className="bg-green-50 border-green-200"
            />
          </div>

          {/* 变更原因 */}
          <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded">
            <span className="font-medium">变更原因：</span>
            {approval.reason}
          </div>

          {/* 操作按钮 */}
          {isPending ? (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={isProcessing}>
                <XCircleIcon className="h-4 w-4 mr-1"                驳回
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                <CheckCircleIcon className="h-4 w-4 mr-1"                通过
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground pt-2">
              <span>
                {approval.approver_name} ·{' '}
                {approval.approved_at ? new Date(approval.approved_at).toLocaleString('zh-CN') : '-'}
              </span>
              {approval.status === 'rejected' && approval.rejection_reason && (
                <span className="text-red-500">（{approval.rejection_reason}）</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RejectDialog
        isOpen={showRejectDialog}
        isProcessing={isProcessing}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
      />
    </>
  );
};

export default ApprovalCard;
