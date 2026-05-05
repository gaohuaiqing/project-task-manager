/**
 * 路径选择器组件
 * 用于浏览服务器目录并选择备份存储路径
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowUp,
  Loader2,
  CheckCircle,
  AlertCircle,
  Home,
} from 'lucide-react';
import { backupApi, type BrowseDirectoryResult } from '@/lib/api/backup.api';
import { cn } from '@/lib/utils';

interface PathPickerProps {
  /** 当前选中的路径 */
  value: string;
  /** 路径变更回调 */
  onChange: (path: string) => void;
  /** 输入框占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 输入框宽度 */
  className?: string;
}

export function PathPicker({
  value,
  onChange,
  placeholder = './backups/',
  disabled = false,
  className,
}: PathPickerProps) {
  // 弹窗状态
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 目录浏览数据
  const [browseData, setBrowseData] = useState<BrowseDirectoryResult | null>(null);
  const [currentPath, setCurrentPath] = useState(value || './backups');
  const [selectedPath, setSelectedPath] = useState(value || './backups');

  // 加载目录结构
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setCurrentPath(path);

    try {
      const result = await backupApi.browseDirectory(path);
      setBrowseData(result);
    } catch (error) {
      setBrowseData({
        currentPath: path,
        parentPath: null,
        directories: [],
        isWritable: false,
        error: '无法加载目录',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 弹窗打开时加载初始目录
  useEffect(() => {
    if (isOpen) {
      loadDirectory(selectedPath || './backups');
    }
  }, [isOpen, loadDirectory, selectedPath]);

  // 浏览子目录
  const handleBrowseSubdirectory = (dirPath: string) => {
    loadDirectory(dirPath);
    setSelectedPath(dirPath);
  };

  // 返回上级目录
  const handleGoUp = () => {
    if (browseData?.parentPath) {
      loadDirectory(browseData.parentPath);
      setSelectedPath(browseData.parentPath);
    }
  };

  // 回到根目录或默认目录
  const handleGoHome = () => {
    loadDirectory('./backups');
    setSelectedPath('./backups');
  };

  // 确认选择
  const handleConfirm = () => {
    onChange(selectedPath);
    setIsOpen(false);
  };

  // 取消选择
  const handleCancel = () => {
    setIsOpen(false);
    setSelectedPath(value || './backups');
  };

  // 手动输入路径变更
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 路径输入框 */}
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />

      {/* 选择按钮 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        title="浏览服务器目录"
      >
        <FolderOpen className="h-4 w-4" />
      </Button>

      {/* 目录浏览弹窗 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              选择备份存储路径
            </DialogTitle>
          </DialogHeader>

          {/* 当前路径显示 */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-medium truncate">
              {currentPath}
            </div>
            {browseData?.isWritable ? (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle className="h-3 w-3" />
                可写
              </div>
            ) : browseData?.error ? (
              <div className="flex items-center gap-1 text-red-500 text-xs">
                <AlertCircle className="h-3 w-3" />
                不可写
              </div>
            ) : null}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoHome}
              disabled={isLoading}
            >
              <Home className="h-4 w-4 mr-1" />
              默认
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoUp}
              disabled={isLoading || !browseData?.parentPath}
            >
              <ArrowUp className="h-4 w-4 mr-1" />
              上级
            </Button>
          </div>

          {/* 目录列表 */}
          <ScrollArea className="h-[300px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : browseData?.error ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                {browseData.error}
              </div>
            ) : browseData?.directories.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Folder className="h-5 w-5 mr-2" />
                当前目录无子目录
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {browseData?.directories.map((dir) => (
                  <button
                    key={dir.path}
                    onClick={() => handleBrowseSubdirectory(dir.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left',
                      selectedPath === dir.path && 'bg-muted'
                    )}
                  >
                    <Folder className={cn(
                      'h-4 w-4',
                      dir.isWritable ? 'text-green-600' : 'text-muted-foreground'
                    )} />
                    <span className="flex-1 truncate">{dir.name}</span>
                    {dir.isWritable ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* 选中路径提示 */}
          <div className="mt-4 text-sm">
            <span className="text-muted-foreground">已选择：</span>
            <span className="font-medium ml-1">{selectedPath}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button variant="outline" onClick={handleConfirm} disabled={!browseData?.isWritable}>
              确认选择
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}