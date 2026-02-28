/**
 * 权限变更历史对话框组件
 * 从 PermissionManagement.tsx 拆分出来
 */

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, User } from 'lucide-react';
import type { PermissionHistoryRecord } from '@/types/auth';

interface PermissionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: PermissionHistoryRecord[];
}

export function PermissionHistoryDialog({
  open,
  onOpenChange,
  history
}: PermissionHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            权限变更历史
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto space-y-4">
          {history.map((record) => (
            <div key={record.id} className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {record.action}
                </Badge>
                <span className="text-slate-400 text-xs">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-white mb-2">{record.details}</p>
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <User className="w-3 h-3" />
                操作人: {record.user}
              </p>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              暂无历史记录
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
