import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';

interface ExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ExportProgressDialog({
  open,
  onOpenChange,
  onConfirm,
}: ExportProgressDialogProps) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setProgress(0);
      setMessage('');
    }
  }, [open]);

  const handleExport = async () => {
    setStatus('exporting');
    setProgress(10);
    setMessage('正在准备数据...');

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      setMessage('正在生成Excel文件...');
      await onConfirm();
      
      clearInterval(progressInterval);
      setProgress(100);
      setStatus('success');
      setMessage('导出成功！');

      // 3秒后关闭对话框（给用户足够时间查看成功信息）
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage('导出失败，请重试');
      console.error('Export error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            导出WBS任务分解表
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            将当前WBS任务分解表导出为Excel文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {status === 'idle' && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-white mb-2">导出内容</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• WBS任务分解表（主表）</li>
                  <li>• 计划调整记录</li>
                  <li>• 进展记录</li>
                  <li>• 延期记录</li>
                </ul>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-border"
                >
                  取消
                </Button>
                <Button
                  onClick={handleExport}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  开始导出
                </Button>
              </div>
            </div>
          )}

          {status === 'exporting' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{message}</span>
                  <span className="text-white font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                请稍候，正在处理数据...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                <p className="text-lg font-medium text-white">{message}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  文件已保存到您选择的位置
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <XCircle className="w-16 h-16 text-red-400 mb-4" />
                <p className="text-lg font-medium text-white">{message}</p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-border"
                >
                  关闭
                </Button>
                <Button
                  onClick={handleExport}
                  className="bg-primary hover:bg-primary/90"
                >
                  重试
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
