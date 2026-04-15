/**
 * 变更原因输入弹窗
 * 工程师修改计划字段时，需要填写变更原因
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
import { Loader2 } from 'lucide-react';

/** 变更字段信息 */
export interface ChangedField {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
}

interface ChangeReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 变更的字段列表 */
  changes: ChangedField[];
  /** 确认提交（携带原因） */
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function ChangeReasonDialog({
  open,
  onOpenChange,
  changes,
  onConfirm,
  loading = false,
}: ChangeReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('请输入变更原因');
      return;
    }
    if (trimmed.length < 2) {
      setError('变更原因至少2个字符');
      return;
    }
    if (trimmed.length > 500) {
      setError('变更原因不能超过500字');
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>提交计划变更</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* 变更摘要 */}
          {changes.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium">变更内容：</p>
              <div className="space-y-1">
                {changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{c.label}：</span>
                    <span className="font-mono text-destructive line-through">
                      {String(c.oldValue ?? '-')}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono font-medium text-primary">
                      {String(c.newValue ?? '-')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 原因输入 */}
          <div className="space-y-2">
            <Label htmlFor="change-reason">变更原因 *</Label>
            <Textarea
              id="change-reason"
              data-testid="change-reason-input"
              placeholder="请说明变更原因（必填）"
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
            data-testid="change-reason-btn-submit"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                提交中...
              </>
            ) : (
              '提交审批'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
