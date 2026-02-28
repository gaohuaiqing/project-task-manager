/**
 * 权限配置导入导出组件
 * 从 PermissionManagement.tsx 拆分出来
 */

import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import type { PermissionConfig } from '@/types/auth';

interface PermissionImportExportProps {
  permissionConfig: PermissionConfig;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PermissionImportExport({
  permissionConfig,
  onImport
}: PermissionImportExportProps) {
  // 导出权限配置
  const handleExportConfig = () => {
    const dataStr = JSON.stringify(permissionConfig, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permission-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
        onClick={handleExportConfig}
      >
        <Download className="w-4 h-4 mr-2" />
        导出
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
        onClick={() => document.getElementById('import-permission-config')?.click()}
      >
        <Upload className="w-4 h-4 mr-2" />
        导入
      </Button>
      <input
        id="import-permission-config"
        type="file"
        accept=".json"
        className="hidden"
        onChange={onImport}
      />
    </>
  );
}
