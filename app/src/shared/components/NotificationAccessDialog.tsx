/**
 * 通知访问错误对话框
 * 用于处理从通知跳转到任务时的权限错误
 */
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface NotificationAccessError {
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'NETWORK_ERROR';
  message: string;
  taskTitle?: string;
}

interface NotificationAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: NotificationAccessError | null;
}

const CONFIG = {
  NOT_FOUND: {
    icon: <XCircle className="h-6 w-6 text-muted-foreground" />,
    title: '任务不可访问',
    getDescription: (error: NotificationAccessError) =>
      error.taskTitle
        ? `任务"${error.taskTitle}"已不存在或可能已被删除。请联系任务负责人或项目经理确认。`
        : '该任务已不存在或可能已被删除。',
  },
  FORBIDDEN: {
    icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    title: '无访问权限',
    getDescription: (error: NotificationAccessError) => {
      if (error.message.includes('转派') || error.message.includes('负责人')) {
        return '任务负责人已变更，您不再是该任务的负责人。如有疑问，请联系项目经理。';
      }
      if (error.message.includes('项目成员') || error.message.includes('项目')) {
        return '您已被移出该项目，无权访问该任务的详细信息。';
      }
      return error.message || '您没有权限访问此任务。';
    },
  },
  NETWORK_ERROR: {
    icon: <Info className="h-6 w-6 text-blue-500" />,
    title: '网络错误',
    getDescription: () => '网络连接异常，请检查网络后重试。',
  },
} as const;

export function NotificationAccessDialog({ open, onOpenChange, error }: NotificationAccessDialogProps) {
  if (!error) return null;

  const config = CONFIG[error.code];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {config.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">{config.getDescription(error)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
