/**
 * 导入导出对话框组件
 *
 * 职责：
 * 1. 文件选择和解析（导入）
 * 2. 数据预览和确认
 * 3. 生成并下载 xlsx 文件（导出）
 */

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, Download, FileText, CheckCircle2, X } from 'lucide-react';
import { importOrganizationFromExcel } from '@/utils/excelHandler';
import { saveOrganization } from '@/utils/organizationManager';
import type { OrganizationStructure } from '@/types/organization';

interface ImportExportDialogProps {
  mode: 'import' | 'export';
  isOpen: boolean;
  onClose: () => void;
  onImport?: (data: OrganizationStructure) => void;
  orgStructure?: OrganizationStructure;
}

export function ImportExportDialog({
  mode,
  isOpen,
  onClose,
  onImport,
  orgStructure
}: ImportExportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importOrganizationFromExcel(file);
      setImportResult(result);

      if (result.success && result.org && onImport) {
        onImport(result.org);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: '导入失败',
        errors: [error instanceof Error ? error.message : '未知错误']
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Upload className="w-5 h-5" />
                导入组织架构
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                导出组织架构
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'import' ? (
            <>
              {/* 文件选择 */}
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                {file ? (
                  <div className="space-y-2">
                    <p className="text-white">{file.name}</p>
                    <p className="text-sm text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      重新选择
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-400">
                      选择要导入的 Excel 文件 (.xlsx)
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      选择文件
                    </Button>
                  </div>
                )}
              </div>

              {/* 导入结果 */}
              {importResult && (
                <Alert
                  variant={importResult.success ? 'default' : 'destructive'}
                  className={importResult.success ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}
                >
                  {importResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <p className="font-medium">{importResult.message}</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">错误详情：</p>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  disabled={importing}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="bg-primary hover:bg-primary/90"
                >
                  {importing ? '导入中...' : '导入'}
                </Button>
              </div>

              {/* 导入说明 */}
              <div className="text-sm text-slate-400 space-y-2">
                <p className="font-medium text-white">导入说明：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Excel 文件需包含一个工作表：<strong>组织架构</strong></li>
                  <li>每行代表一个人员，包含组织信息
                    <ul className="list-[circle] list-inside ml-4 text-slate-500">
                      <li>部门经理：技术组列填 "-"</li>
                      <li>技术经理/工程师：需填写部门和技术组</li>
                    </ul>
                  </li>
                  <li>必填列：工号、员工姓名、角色、部门
                    <ul className="list-[circle] list-inside ml-4 text-slate-500">
                      <li>可选列：技术组、直属主管、邮箱、电话、能力评分</li>
                    </ul>
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mt-2">
                  💡 提示：可先导出现有组织架构作为模板
                </p>
              </div>
            </>
          ) : (
            <>
              {/* 导出说明 */}
              <div className="space-y-4">
                <div className="text-sm text-slate-400 space-y-2">
                  <p className="font-medium text-white">导出说明：</p>
                  <p>导出的 Excel 文件包含一个工作表，格式如下：</p>
                  <div className="bg-slate-800 p-3 rounded text-xs space-y-1">
                    <div className="grid grid-cols-5 gap-2 text-slate-300 font-medium border-b border-slate-700 pb-1">
                      <span>工号</span>
                      <span>员工姓名</span>
                      <span>角色</span>
                      <span>部门</span>
                      <span>技术组</span>
                    </div>
                    <div className="text-slate-500">
                      每行代表一个人员，包含部门、技术组、直属主管和能力评分信息
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    📋 参照公司员工清单格式设计
                  </p>
                </div>

                {orgStructure && (
                  <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-slate-400">当前组织架构统计：</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-white">
                          {orgStructure.departments?.length || 0}
                        </p>
                        <p className="text-xs text-slate-400">部门</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-white">
                          {(orgStructure.departments || []).reduce(
                            (count, dept) =>
                              count +
                              (dept.children || []).filter(
                                (c) => c.level === 'tech_group'
                              ).length,
                            0
                          )}
                        </p>
                        <p className="text-xs text-slate-400">技术组</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-white">
                          {(orgStructure.departments || []).reduce(
                            (count, dept) =>
                              count +
                              (dept.children || []).reduce(
                                (groupCount, child) =>
                                  groupCount +
                                  (child.level === 'tech_group'
                                    ? (child as any).children.length
                                    : 0),
                                0
                              ),
                            0
                          )}
                        </p>
                        <p className="text-xs text-slate-400">成员</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3">
                <Button onClick={onClose} variant="outline">
                  关闭
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
