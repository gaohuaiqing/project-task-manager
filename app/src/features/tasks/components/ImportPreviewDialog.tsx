/**
 * 导入预览对话框
 * 显示解析结果、错误信息和导入结果
 */
import { useState, useEffect, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { ParsedTaskData, ValidationError } from '../utils/taskImporter';
import * as XLSX from 'xlsx';

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    success: boolean;
    wbsCode?: string;
    rowNumber?: number;
    error?: string;
  }>;
}

export interface ImportErrorItem {
  rowNumber: number;
  wbsCode?: string;
  description?: string;
  error: string;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  parsedData: ParsedTaskData[];
  errors: ValidationError[];
  newCount: number;
  updateCount: number;
  onConfirm?: () => Promise<ImportResult | void>;
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!open) {
      setImporting(false);
      setImportResult(null);
      setImportProgress(0);
      setProcessedCount(0);
      setTotalCount(0);
    }
  }, [open]);

  // 导出错误报告
  const exportErrorReport = (result: ImportResult) => {
    const errors: ImportErrorItem[] = result.results
      .filter(r => !r.success)
      .map(r => ({
        rowNumber: r.rowNumber || 0,
        wbsCode: r.wbsCode,
        description: parsedData.find(t => t.rowNumber === r.rowNumber)?.description || '',
        error: r.error || '导入失败',
      }));

    if (errors.length === 0) {
      return;
    }

    const data = errors.map(e => ({
      '行号': e.rowNumber,
      'WBS编码': e.wbsCode || '',
      '任务描述': e.description || '',
      '错误原因': e.error,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 },  // 行号
      { wch: 15 },  // WBS编码
      { wch: 30 },  // 任务描述
      { wch: 40 },  // 错误原因
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入错误');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `导入错误报告_${dateStr}.xlsx`);
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;

    setImporting(true);
    setImportProgress(0);
    setTotalCount(parsedData.length);
    setProcessedCount(0);

    try {
      console.log('[ImportPreviewDialog] 开始导入, 总数:', parsedData.length);

      // 调用父组件的导入函数（包含刷新逻辑）
      const result = await onConfirm();

      console.log('[ImportPreviewDialog] 导入完成:', result);

      // 设置导入结果
      if (result && typeof result === 'object' && 'success' in result) {
        setImportResult(result as ImportResult);
      } else {
        // 如果没有返回结果，假设成功
        setImportResult({
          total: parsedData.length,
          success: parsedData.length,
          failed: 0,
          results: [],
        });
      }

      // 全部成功，延迟关闭让用户看到结果
      if (result && typeof result === 'object' && 'failed' in result && (result as ImportResult).failed === 0) {
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error('[ImportPreviewDialog] 导入出错:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setImportResult({
        total: parsedData.length,
        success: 0,
        failed: parsedData.length,
        results: parsedData.map(t => ({
          success: false,
          wbsCode: t.wbsCode,
          rowNumber: t.rowNumber,
          error: errorMessage,
        })),
      });
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.length;
  const errorCount = errors.length;
  const hasErrors = errorCount > 0;
  const canImport = validCount > 0;
  const isImportComplete = importResult !== null;

  // 计算行号与WBS编码的映射
  const rowToWbsMap = useMemo(() => {
    const map = new Map<number, string>();
    parsedData.forEach(task => {
      if (task.rowNumber && task.wbsCode) {
        map.set(task.rowNumber, task.wbsCode);
      }
    });
    return map;
  }, [parsedData]);

  // 整合解析错误和导入错误
  const allErrors = useMemo(() => {
    console.log('[ImportPreviewDialog] 计算allErrors, errors:', errors.length, 'importResult:', importResult);
    const all: Array<{ rowNumber: number; wbsCode?: string; field?: string; message: string; type: 'parse' | 'import' }> = [];

    // 解析阶段错误
    errors.forEach(error => {
      all.push({
        rowNumber: error.rowNumber,
        wbsCode: rowToWbsMap.get(error.rowNumber),
        field: error.field,
        message: error.message,
        type: 'parse',
      });
    });

    // 导入阶段错误
    if (importResult?.results) {
      console.log('[ImportPreviewDialog] 处理importResult.results:', importResult.results.length, '条');
      importResult.results.forEach(result => {
        console.log('[ImportPreviewDialog] result:', result);
        if (!result.success) {
          let rowNumber = result.rowNumber;
          if (!rowNumber && result.wbsCode) {
            const found = parsedData.find(t => t.wbsCode === result.wbsCode);
            if (found) rowNumber = found.rowNumber;
          }
          console.log('[ImportPreviewDialog] 添加导入错误: row', rowNumber, 'wbs', result.wbsCode, 'error', result.error);
          all.push({
            rowNumber: rowNumber || 0,
            wbsCode: result.wbsCode,
            message: result.error || '导入失败',
            type: 'import',
          });
        }
      });
    }

    console.log('[ImportPreviewDialog] allErrors总数:', all.length);
    return all.sort((a, b) => a.rowNumber - b.rowNumber);
  }, [errors, importResult, rowToWbsMap, parsedData]);

  const handleClose = () => {
    // 如果导入完成且有错误，不自动关闭，让用户查看
    if (isImportComplete && importResult?.failed > 0) {
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog data-testid="task-dialog-import" open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {isImportComplete ? '导入结果' : '导入预览'}
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

              {/* 导入进度 - 仅在导入中显示 */}
              {importing && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在导入... {importProgress}%
                  </div>
                  <Progress value={importProgress} className="h-2" />
                  <div className="text-sm text-blue-600 dark:text-blue-500 mt-2">
                    已处理 {processedCount}/{totalCount} 条任务
                  </div>
                </div>
              )}

              {/* 导入成功结果 */}
              {isImportComplete && importResult.success > 0 && importResult.failed === 0 && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                    <CheckCircle className="h-5 w-5" />
                    导入成功
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-500">
                    共成功导入 {importResult.success} 条任务，列表已自动刷新
                  </div>
                </div>
              )}

              {/* 部分成功结果 */}
              {isImportComplete && importResult.success > 0 && importResult.failed > 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-medium mb-2">
                    <AlertCircle className="h-5 w-5" />
                    部分导入成功
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-500">
                    成功: {importResult.success} 条，失败: {importResult.failed} 条
                  </div>
                </div>
              )}

              {/* 有效数据统计（仅预览阶段显示） */}
              {!isImportComplete && canImport && (
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

              {/* 错误数据 - 解析阶段或导入阶段 */}
              {allErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium mb-3">
                    <XCircle className="h-4 w-4" />
                    {isImportComplete ? '导入失败' : '错误数据'}：{allErrors.length} 行
                  </div>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {allErrors.map((error, index) => (
                        <div
                          key={`${error.type}-${index}`}
                          className="flex items-start gap-2 text-sm bg-white dark:bg-gray-900 p-2 rounded border border-red-100 dark:border-red-900"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs shrink-0">
                                行 {error.rowNumber || '?'}
                              </Badge>
                              {error.wbsCode && (
                                <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                                  {error.wbsCode}
                                </Badge>
                              )}
                              {error.field && (
                                <Badge variant="outline" className="text-xs shrink-0 text-orange-600 border-orange-300">
                                  {error.field}
                                </Badge>
                              )}
                              {error.type === 'import' && (
                                <Badge variant="destructive" className="text-xs shrink-0">
                                  导入错误
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-red-600 dark:text-red-400">
                              {error.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* 导入失败结果 */}
              {isImportComplete && importResult.failed > 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-yellow-700 dark:text-yellow-500 text-sm">
                    ⚠️ 部分任务导入失败，失败的批次已回滚。请修正错误后重新导入失败的任务。
                  </div>
                </div>
              )}

              {/* 无有效数据提示 */}
              {!isImportComplete && !canImport && (
                <div className="text-center py-8 text-muted-foreground">
                  没有可导入的有效数据
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          {/* 导出错误报告按钮 - 仅在有失败时显示 */}
          {isImportComplete && importResult?.failed > 0 && (
            <Button
              variant="outline"
              onClick={() => exportErrorReport(importResult)}
              className="mr-auto"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              导出错误报告
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleClose}
            disabled={importing}
          >
            {isImportComplete ? '关闭' : '取消'}
          </Button>
          {!isImportComplete && (
            <Button
              data-testid="task-import-btn-confirm"
              onClick={handleConfirm}
              disabled={!canImport || importing || isLoading}
            >
              {importing || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : hasErrors ? (
                `仅导入有效数据(${validCount}条)`
              ) : (
                `确认导入(${validCount}条)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
