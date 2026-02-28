/**
 * 版本信息显示组件
 *
 * 在编辑器中显示：
 * - 当前版本号
 * - 最后修改时间
 * - 修改者
 * - 版本状态（是否最新）
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, User, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ================================================================
// 类型定义
// ================================================================

export interface VersionInfo {
  /** 当前版本号 */
  version: number;
  /** 最后修改时间 */
  lastModified: number;
  /** 修改者 */
  modifiedBy: string;
  /** 修改者姓名 */
  modifiedByName?: string;
  /** 修改类型 */
  changeType?: 'create' | 'update' | 'delete';
  /** 是否是最新版本（需要从服务器验证） */
  isLatest?: boolean;
  /** 是否正在检查版本 */
  isChecking?: boolean;
}

export interface VersionInfoDisplayProps {
  /** 版本信息 */
  versionInfo: VersionInfo;
  /** 数据类型（用于显示） */
  dataType?: string;
  /** 数据ID（用于重新获取） */
  dataId?: string;
  /** 刷新版本信息 */
  onRefresh?: () => Promise<void>;
  /** 点击版本号查看历史 */
  onViewHistory?: () => void;
  /** 是否显示完整信息 */
  detailed?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ================================================================
// 工具函数
// ================================================================

/**
 * 格式化时间差
 */
function formatTimeDiff(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) {
    return '刚刚';
  } else if (diff < 60000) {
    return `${Math.floor(diff / 1000)} 秒前`;
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} 天前`;
  } else {
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }
}

/**
 * 获取修改类型标签
 */
function getChangeTypeBadge(changeType?: string) {
  switch (changeType) {
    case 'create':
      return <Badge variant="outline" className="text-green-600 border-green-600">新建</Badge>;
    case 'update':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">更新</Badge>;
    case 'delete':
      return <Badge variant="outline" className="text-red-600 border-red-600">删除</Badge>;
    default:
      return null;
  }
}

/**
 * 获取版本状态颜色
 */
function getVersionStatusColor(isLatest?: boolean, isChecking?: boolean) {
  if (isChecking) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  if (isLatest === false) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-green-600 dark:text-green-400';
}

/**
 * 获取版本状态图标
 */
function getVersionStatusIcon(isLatest?: boolean, isChecking?: boolean) {
  if (isChecking) {
    return <RefreshCw className="h-3 w-3 animate-spin" />;
  }
  if (isLatest === false) {
    return <AlertCircle className="h-3 w-3" />;
  }
  return <CheckCircle className="h-3 w-3" />;
}

// ================================================================
// 子组件
// ================================================================

/**
 * 精简版版本信息
 */
function CompactVersionInfo({ versionInfo, onRefresh, isRefreshing }: {
  versionInfo: VersionInfo;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || isRefreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <User className="h-3 w-3" />
              <span>v{versionInfo.version}</span>
              <span className={getVersionStatusColor(versionInfo.isLatest, versionInfo.isChecking)}>
                {getVersionStatusIcon(versionInfo.isLatest, versionInfo.isChecking || refreshing)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>版本: v{versionInfo.version}</p>
              <p>修改者: {versionInfo.modifiedByName || versionInfo.modifiedBy}</p>
              <p>时间: {formatTimeDiff(versionInfo.lastModified)}</p>
              {versionInfo.isLatest === false && (
                <p className="text-orange-500">⚠️ 有新版本可用</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1"
          onClick={handleRefresh}
          disabled={refreshing || isRefreshing}
        >
          <RefreshCw className={cn(
            "h-3 w-3",
            (refreshing || isRefreshing) && "animate-spin"
          )} />
        </Button>
      )}
    </div>
  );
}

/**
 * 详细版版本信息
 */
function DetailedVersionInfo({ versionInfo, onRefresh, onViewHistory }: {
  versionInfo: VersionInfo;
  onRefresh?: () => Promise<void>;
  onViewHistory?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 版本状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            v{versionInfo.version}
          </Badge>
          {getChangeTypeBadge(versionInfo.changeType)}
          <span className={cn(
            "flex items-center gap-1 text-sm",
            getVersionStatusColor(versionInfo.isLatest, versionInfo.isChecking || refreshing)
          )}>
            {getVersionStatusIcon(versionInfo.isLatest, versionInfo.isChecking || refreshing)}
            {versionInfo.isChecking || refreshing ? '检查中...' :
             versionInfo.isLatest === false ? '有新版本' : '最新版本'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onViewHistory && (
            <Button variant="ghost" size="sm" onClick={onViewHistory}>
              查看历史
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-1",
                refreshing && "animate-spin"
              )} />
              刷新
            </Button>
          )}
        </div>
      </div>

      {/* 修改信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span>修改者：</span>
          <span className="font-medium text-foreground">
            {versionInfo.modifiedByName || versionInfo.modifiedBy}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>修改时间：</span>
          <span className="font-medium text-foreground">
            {formatTimeDiff(versionInfo.lastModified)}
          </span>
        </div>
      </div>

      {/* 新版本警告 */}
      {versionInfo.isLatest === false && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-md border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-800 dark:text-orange-200">
              检测到新版本
            </p>
            <p className="text-orange-600 dark:text-orange-400">
              您编辑的版本可能已过期，建议刷新获取最新数据后再继续编辑。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// 主组件
// ================================================================

export function VersionInfoDisplay({
  versionInfo,
  dataType,
  dataId,
  onRefresh,
  onViewHistory,
  detailed = false,
  className
}: VersionInfoDisplayProps) {
  const [currentVersion, setCurrentVersion] = useState(versionInfo);

  // 同步外部版本更新
  useEffect(() => {
    setCurrentVersion(versionInfo);
  }, [versionInfo]);

  const handleRefresh = async () => {
    await onRefresh?.();
  };

  const handleViewHistory = () => {
    onViewHistory?.();
  };

  return (
    <div className={cn("version-info", className)}>
      {detailed ? (
        <DetailedVersionInfo
          versionInfo={currentVersion}
          onRefresh={handleRefresh}
          onViewHistory={handleViewHistory}
        />
      ) : (
        <CompactVersionInfo
          versionInfo={currentVersion}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

// ================================================================
// 导出 Hook
// ================================================================

/**
 * 使用版本信息的 Hook
 * 自动检测版本是否过期
 */
export function useVersionInfo(
  initialVersion: VersionInfo,
  checkVersionFn?: (dataType: string, dataId: string) => Promise<{ isLatest: boolean; latestVersion: number }>
) {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(initialVersion);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * 刷新版本信息
   */
  const refreshVersion = async () => {
    if (!checkVersionFn || !dataType || !dataId) return;

    setIsChecking(true);
    try {
      const result = await checkVersionFn(dataType, dataId);
      setVersionInfo(prev => ({
        ...prev,
        isLatest: result.isLatest
      }));
    } catch (error) {
      console.error('[VersionInfo] 检查版本失败:', error);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 更新版本信息
   */
  const updateVersion = (updates: Partial<VersionInfo>) => {
    setVersionInfo(prev => ({ ...prev, ...updates }));
  };

  return {
    versionInfo,
    isChecking,
    refreshVersion,
    updateVersion
  };
}

// ================================================================
// 导出默认
// ================================================================

export default VersionInfoDisplay;
