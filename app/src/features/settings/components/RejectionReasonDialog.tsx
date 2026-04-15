/**
 * 驳回原因输入弹窗
 * 审批人驳回变更申请时，必须填写驳回原因
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('请输入驳回原因');
      return;
    }
    if (trimmed.length < 2) {
      setError('驳回原因至少2个字符');
      return;
    }
    if (trimmed.length > 500) {
      setError('驳回原因不能超过500字');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      setReason('');
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>驳回变更申请</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">驳回原因 *</Label>
            <Textarea
              id="rejection-reason"
              data-testid="rejection-reason-input"
              placeholder="请输入驳回原因（必填）"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              maxLength={500}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            data-testid="rejection-reason-btn-confirm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : '确认驳回'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
