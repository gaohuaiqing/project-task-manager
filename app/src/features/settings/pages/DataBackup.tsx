/**
 * 数据备份与恢复页面
 *
 * 功能：
 * 1. 备份配置管理（间隔、路径、保留数量、格式）
 * 2. 手动触发备份
 * 3. 备份记录列表（下载、恢复、删除）
 * 4. 恢复确认弹窗（支持从备份记录恢复或自定义SQL文件恢复）
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Trash2,
  RotateCcw,
  Loader2,
  Database,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { backupApi, type BackupConfig, type BackupRecord, type BackupStats, type BackupInterval, type BackupFormat } from '@/lib/api/backup.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { PathPicker } from '@/components/ui/path-picker';

// 备份间隔选项
const INTERVAL_OPTIONS: { value: BackupInterval; label: string }[] = [
  { value: 'hourly', label: '每小时' },
  { value: '6hours', label: '每6小时' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每双周' },
  { value: 'monthly', label: '每月' },
];

// 备份格式选项
const FORMAT_OPTIONS: { value: BackupFormat; label: string }[] = [
  { value: 'sql', label: 'SQL文件' },
  { value: 'excel', label: 'Excel文件' },
  { value: 'both', label: 'SQL + Excel' },
];

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
};

// 状态标签
const STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  running: '执行中',
  success: '成功',
  failed: '失败',
};

// 类型标签
const TYPE_LABELS: Record<string, string> = {
  auto: '自动',
  manual: '手动',
};

export function DataBackupSettings() {
  const { user } = useAuth();

  // 配置状态
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<Partial<BackupConfig>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // 记录状态
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // 统计状态
  const [stats, setStats] = useState<BackupStats | null>(null);

  // 操作状态
  const [isExecutingBackup, setIsExecutingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreRecordId, setRestoreRecordId] = useState<string | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // 自定义恢复状态
  const [showCustomRestoreDialog, setShowCustomRestoreDialog] = useState(false);
  const [customRestoreTab, setCustomRestoreTab] = useState<'upload' | 'path'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sqlFiles, setSqlFiles] = useState<Array<{ name: string; path: string; size: number; modifiedTime: string }>>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [isLoadingSqlFiles, setIsLoadingSqlFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 下载进度状态
  const [downloadProgress, setDownloadProgress] = useState<{
    recordId: string;
    type: 'sql' | 'excel';
    progress: number;
  } | null>(null);

  // 权限检查
  const isAdmin = user?.role === 'admin';

  // 加载配置
  const loadConfig = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoadingConfig(true);
    try {
      const data = await backupApi.getConfig();
      setConfig(data);
      setEditedConfig({});
    } catch (error) {
      toast.error('加载备份配置失败');
      console.error(error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [isAdmin]);

  // 加载记录
  const loadRecords = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoadingRecords(true);
    try {
      const result = await backupApi.getRecords(recordsPage, 10);
      setRecords(result.items);
      setRecordsTotal(result.total);
    } catch (error) {
      toast.error('加载备份记录失败');
      console.error(error);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [isAdmin, recordsPage]);

  // 加载统计
  const loadStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const data = await backupApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('加载备份统计失败:', error);
    }
  }, [isAdmin]);

  // 初始加载
  useEffect(() => {
    loadConfig();
    loadRecords();
    loadStats();
  }, [loadConfig, loadRecords, loadStats]);

  // 分页变化时加载记录
  useEffect(() => {
    loadRecords();
  }, [recordsPage, loadRecords]);

  // 保存配置
  const handleSaveConfig = async () => {
    if (!editedConfig || Object.keys(editedConfig).length === 0) {
      toast.info('配置未修改');
      return;
    }

    setIsSavingConfig(true);
    try {
      const updated = await backupApi.updateConfig(editedConfig);
      setConfig(updated);
      setEditedConfig({});
      toast.success('备份配置已保存');
    } catch (error) {
      toast.error('保存配置失败');
      console.error(error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 执行手动备份
  const handleExecuteBackup = async () => {
    setIsExecutingBackup(true);
    try {
      const result = await backupApi.executeBackup();
      toast.success(`备份已启动（ID: ${result.recordId}）`);

      // 刷新记录列表
      await loadRecords();
      await loadStats();
    } catch (error: any) {
      if (error.message?.includes('已有备份正在执行')) {
        toast.warning('已有备份正在执行，请等待完成');
      } else {
        toast.error('启动备份失败');
      }
      console.error(error);
    } finally {
      setIsExecutingBackup(false);
    }
  };

  // 下载备份文件（带进度）
  const handleDownload = async (record: BackupRecord, type: 'sql' | 'excel') => {
    try {
      setDownloadProgress({ recordId: record.id, type, progress: 0 });
      await backupApi.downloadRecord(record.id, type, (progress) => {
        setDownloadProgress({ recordId: record.id, type, progress });
      });
      toast.success('文件下载完成');
    } catch (error) {
      toast.error('下载失败');
      console.error(error);
    } finally {
      setDownloadProgress(null);
    }
  };

  // 确认恢复
  const handleConfirmRestore = async () => {
    if (!restoreRecordId) return;

    setIsRestoring(true);
    try {
      const result = await backupApi.restoreRecord(restoreRecordId);
      toast.success(`数据已恢复，已恢复 ${result.restoredTables.length} 个表`);

      // 刷新记录
      await loadRecords();
      await loadStats();
    } catch (error) {
      toast.error('恢复失败');
      console.error(error);
    } finally {
      setIsRestoring(false);
      setRestoreRecordId(null);
    }
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteRecordId) return;

    try {
      await backupApi.deleteRecord(deleteRecordId);
      toast.success('备份记录已删除');

      // 刷新记录
      await loadRecords();
      await loadStats();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    } finally {
      setDeleteRecordId(null);
    }
  };

  // 加载SQL文件列表
  const loadSqlFiles = async () => {
    setIsLoadingSqlFiles(true);
    try {
      const result = await backupApi.browseSqlFiles();
      setSqlFiles(result.files);
    } catch (error) {
      toast.error('加载SQL文件列表失败');
      console.error(error);
    } finally {
      setIsLoadingSqlFiles(false);
    }
  };

  // 打开自定义恢复弹窗
  const handleOpenCustomRestore = () => {
    setShowCustomRestoreDialog(true);
    setUploadedFile(null);
    setSelectedFilePath('');
    loadSqlFiles();
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        toast.error('只支持.sql文件');
        return;
      }
      setUploadedFile(file);
    }
  };

  // 执行自定义恢复
  const handleCustomRestore = async () => {
    setIsRestoring(true);
    try {
      let result;
      if (customRestoreTab === 'upload' && uploadedFile) {
        result = await backupApi.restoreFromUpload(uploadedFile);
      } else if (customRestoreTab === 'path' && selectedFilePath) {
        result = await backupApi.restoreFromPath(selectedFilePath);
      } else {
        toast.error('请选择要恢复的SQL文件');
        return;
      }

      toast.success(`数据已恢复，已恢复 ${result.restoredTables.length} 个表`);

      // 刷新记录
      await loadRecords();
      await loadStats();
      setShowCustomRestoreDialog(false);
    } catch (error) {
      toast.error('恢复失败');
      console.error(error);
    } finally {
      setIsRestoring(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // 无权限
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        仅管理员可访问数据备份功能
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">总备份</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.totalBackups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">成功</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.successfulBackups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">失败</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.failedBackups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">总大小</span>
              </div>
              <p className="text-2xl font-bold mt-2">{formatFileSize(stats.totalSizeBytes)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 备份配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              备份配置
              <span className="text-xs text-muted-foreground font-normal">
                （配置自动备份的时间间隔和存储方式）
              </span>
            </CardTitle>
            <Button
              onClick={handleSaveConfig}
              disabled={isSavingConfig || Object.keys(editedConfig).length === 0}
            >
              {isSavingConfig && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : config ? (
            <div className="space-y-3">
              {/* 备份间隔 */}
              <div className="flex items-center justify-between">
                <Label>
                  备份间隔 <span className="text-xs text-muted-foreground font-normal">（自动备份的执行频率）</span>
                </Label>
                <Select
                  value={editedConfig.backupInterval ?? config.backupInterval}
                  onValueChange={(v) => setEditedConfig(prev => ({ ...prev, backupInterval: v as BackupInterval }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 存储路径 */}
              <div className="flex items-center justify-between">
                <Label>
                  存储路径 <span className="text-xs text-muted-foreground font-normal">（备份文件的存储目录）</span>
                </Label>
                <PathPicker
                  value={editedConfig.targetPath ?? config.targetPath}
                  onChange={(v) => setEditedConfig(prev => ({ ...prev, targetPath: v }))}
                  placeholder="./backups/"
                  className="w-[300px]"
                />
              </div>

              {/* 保留数量 */}
              <div className="flex items-center justify-between">
                <Label>
                  保留数量 <span className="text-xs text-muted-foreground font-normal">（最多保留的备份文件数量）</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editedConfig.retentionCount ?? config.retentionCount}
                  onChange={(e) => setEditedConfig(prev => ({ ...prev, retentionCount: Number(e.target.value) }))}
                  className="w-[100px]"
                />
              </div>

              {/* 备份格式 */}
              <div className="flex items-center justify-between">
                <Label>
                  备份格式 <span className="text-xs text-muted-foreground font-normal">（生成的备份文件格式）</span>
                </Label>
                <Select
                  value={editedConfig.backupFormat ?? config.backupFormat}
                  onValueChange={(v) => setEditedConfig(prev => ({ ...prev, backupFormat: v as BackupFormat }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 启用状态 */}
              <div className="flex items-center justify-between">
                <Label>
                  自动备份 <span className="text-xs text-muted-foreground font-normal">（是否启用定时自动备份）</span>
                </Label>
                <Switch
                  checked={editedConfig.enabled ?? config.enabled}
                  onCheckedChange={(v) => setEditedConfig(prev => ({ ...prev, enabled: v }))}
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              无法加载备份配置
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动备份 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            手动备份
            <span className="text-xs text-muted-foreground font-normal">
              （立即执行一次数据备份）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExecuteBackup}
              disabled={isExecutingBackup}
              size="default"
            >
              {isExecutingBackup && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              立即备份
            </Button>
            <Button
              onClick={handleOpenCustomRestore}
              disabled={isRestoring}
              variant="outline"
              size="default"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              自定义恢复
            </Button>
            <p className="text-sm text-muted-foreground">
              立即备份当前数据，或从自定义SQL文件恢复数据
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 备份记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            备份记录
            <span className="text-xs text-muted-foreground font-normal">
              （共 {recordsTotal} 条备份记录）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecords ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              暂无备份记录
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {/* 表头 */}
              <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground">
                <div className="w-[160px]">备份时间</div>
                <div className="w-[80px]">类型</div>
                <div className="w-[100px]">格式</div>
                <div className="w-[100px]">大小</div>
                <div className="w-[80px]">状态</div>
                <div className="w-[80px]">操作人</div>
                <div className="flex-1 text-right">操作</div>
              </div>

              {/* 数据行 */}
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* 时间 */}
                  <div className="text-sm w-[160px]">
                    {format(new Date(record.backupTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </div>

                  {/* 类型 */}
                  <Badge variant="outline" className="w-[80px]">
                    {TYPE_LABELS[record.backupType] || record.backupType}
                  </Badge>

                  {/* 格式 */}
                  <div className="flex items-center gap-2 w-[100px]">
                    {record.fileFormat === 'sql' && <FileText className="h-4 w-4" />}
                    {record.fileFormat === 'excel' && <FileSpreadsheet className="h-4 w-4" />}
                    {record.fileFormat === 'both' && (
                      <>
                        <FileText className="h-4 w-4" />
                        <FileSpreadsheet className="h-4 w-4" />
                      </>
                    )}
                  </div>

                  {/* 大小 */}
                  <div className="text-sm w-[100px]">
                    {formatFileSize(record.fileSizeBytes)}
                  </div>

                  {/* 状态 */}
                  <Badge className={STATUS_COLORS[record.status]}>
                    {STATUS_LABELS[record.status]}
                  </Badge>

                  {/* 操作人 */}
                  <div className="text-sm w-[80px] truncate">
                    {record.operatorName || '-'}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex-1 flex items-center justify-end gap-2">
                    {/* 下载进度条 */}
                    {downloadProgress?.recordId === record.id && (
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Progress value={downloadProgress.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-9 text-right">
                          {downloadProgress.progress}%
                        </span>
                      </div>
                    )}

                    {/* 下载 */}
                    {record.status === 'success' && (
                      <>
                        {(record.fileFormat === 'sql' || record.fileFormat === 'both') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(record, 'sql')}
                            disabled={!!downloadProgress}
                            title="下载SQL文件"
                          >
                            {downloadProgress?.recordId === record.id && downloadProgress.type === 'sql' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {(record.fileFormat === 'excel' || record.fileFormat === 'both') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(record, 'excel')}
                            disabled={!!downloadProgress}
                            title="下载Excel文件"
                          >
                            {downloadProgress?.recordId === record.id && downloadProgress.type === 'excel' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    )}

                    {/* 恢复 */}
                    {record.status === 'success' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRestoreRecordId(record.id)}
                        title="恢复数据"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}

                    {/* 删除 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRecordId(record.id)}
                      disabled={record.status === 'running'}
                      title="删除记录"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {recordsTotal > 10 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={recordsPage === 1}
                onClick={() => setRecordsPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm">
                第 {recordsPage} / {Math.ceil(recordsTotal / 10)} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={recordsPage * 10 >= recordsTotal}
                onClick={() => setRecordsPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 恢复确认弹窗 */}
      <AlertDialog open={!!restoreRecordId} onOpenChange={() => setRestoreRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              确认恢复数据
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                此操作将从备份恢复数据，将覆盖当前系统中的所有数据。
              </p>
              <p className="text-red-500 font-medium">
                此操作不可撤销，请谨慎操作！
              </p>
              <p className="text-muted-foreground">
                恢复前系统会自动创建当前数据的备份，以便回滚。
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="bg-red-500 hover:bg-red-600"
            >
              {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除备份记录</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除该备份记录及其对应的文件，删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 自定义SQL文件恢复弹窗 */}
      <Dialog open={showCustomRestoreDialog} onOpenChange={setShowCustomRestoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              自定义SQL文件恢复
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                从上传的SQL文件或服务器路径恢复数据。
              </p>
              <p className="text-red-500 font-medium">
                此操作将覆盖当前系统中的所有数据，请谨慎操作！
              </p>
              <p className="text-muted-foreground">
                恢复前系统会自动创建当前数据的备份。
              </p>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={customRestoreTab} onValueChange={(v) => setCustomRestoreTab(v as 'upload' | 'path')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">上传文件</TabsTrigger>
              <TabsTrigger value="path">服务器路径</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.size)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      更换文件
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      点击选择或拖拽SQL文件
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      选择文件
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="path" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>选择备份目录中的SQL文件</Label>
                {isLoadingSqlFiles ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : sqlFiles.length > 0 ? (
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {sqlFiles.map((file) => (
                      <div
                        key={file.path}
                        className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted ${
                          selectedFilePath === file.path ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedFilePath(file.path)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    备份目录中没有SQL文件
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomRestoreDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCustomRestore}
              disabled={
                isRestoring ||
                (customRestoreTab === 'upload' && !uploadedFile) ||
                (customRestoreTab === 'path' && !selectedFilePath)
              }
              className="bg-red-500 hover:bg-red-600"
            >
              {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}