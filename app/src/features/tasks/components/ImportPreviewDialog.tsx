/**
 * 导入预览对话框
 * 显示解析结果和错误信息
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  XCircle,
} from 'lucide-react';
import type { ParsedTaskData, ValidationError } from '../utils/taskImporter';

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  parsedData: ParsedTaskData[];
  errors: ValidationError[];
  newCount: number;
  updateCount: number;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  fileName,
  parsedData,
  errors,
  newCount,
  updateCount,
  onConfirm,
  isLoading,
}: ImportPreviewDialogProps) {
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setImporting(false);
  }, [open]);

  const handleConfirm = async () => {
    setImporting(true);
    try {
      await onConfirm();
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.length;
  const errorCount = errors.length;
  const hasErrors = errorCount > 0;
  const canImport = validCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            导入预览
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {/* 文件信息 */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>文件：{fileName}</span>
                <span>•</span>
                <span>共解析 {validCount + errorCount} 行数据</span>
              </div>

              {/* 有效数据统计 */}
              {canImport && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                    <CheckCircle className="h-4 w-4" />
                    有效数据：{validCount} 行
                  </div>
                  <div className="flex gap-4 text-sm text-green-600 dark:text-green-500">
                    <span>• 新建任务：{newCount} 行</span>
                    <span>• 更新任务：{updateCount} 行</span>
                  </div>
                </div>
              )}

              {/* 错误数据 */}
              {hasErrors && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium mb-2">
                    <XCircle className="h-4 w-4" />
                    错误数据：{errorCount} 行
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {errors.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 dark:text-red-500 flex items-start gap-2"
                      >
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          行{error.rowNumber}：{error.field} - {error.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 无有效数据提示 */}
              {!canImport && (
                <div className="text-center py-8 text-muted-foreground">
                  没有可导入的有效数据
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canImport || importing || isLoading}
          >
            {importing || isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                导入中...
              </>
            ) : hasErrors ? (
              `仅导入有效数据(${validCount}条)`
            ) : (
              `确认导入(${validCount}条)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
