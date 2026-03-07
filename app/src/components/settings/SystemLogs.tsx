/**
 * 事件日志查看器组件 - 优化版本
 *
 * 优化内容：
 * 1. 使用 useLogFilters Hook 管理过滤状态
 * 2. 使用 logExporter 工具处理导出
 * 3. 拆分子组件
 * 4. 合并相关状态变量
 *
 * @module components/settings/SystemLogs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription
} from '@/components/ui/alert';
import {
  Trash2,
  Download,
  RefreshCw,
  Search,
  ServerOff,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, CustomAlertDialog } from '@/components/common/DialogProvider';
import { backendMonitor } from '@/services/BackendMonitor';
import { useLogFilters } from '@/hooks/useLogFilters';
import { exportLogs } from '@/utils/logExporter';
import { LOG_LEVELS, LOG_TYPES, TIME_RANGES } from './SystemLogs.types';

// 日志条目接口
interface LogEntry {
  id: number;
  log_id: string;
  log_level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  log_type: 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE' | 'FRONTEND';
  message: string;
  details: any;
  user_id?: number;
  username?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface SystemLogsProps {
  readOnly?: boolean;
}

/**
 * 系统日志组件
 */
export function SystemLogs({ readOnly = false }: SystemLogsProps) {
  const dialog = useDialog();
  const logFilters = useLogFilters();

  // 状态管理
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [page, setPage] = useState(0);

  // 后端连接状态
  const [backendStatus, setBackendStatus] = useState(backendMonitor.getStatus());
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  /**
   * 加载日志
   */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = logFilters.buildQueryParams(100, page);
      const url = `http://localhost:3001/api/logs?${params}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setLogs(result.logs || []);
        setTotal(result.total || 0);
      } else {
        console.error('[SystemLogs] API返回失败:', result.message);
      }
    } catch (error) {
      console.error('[SystemLogs] 加载日志失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, logFilters]);

  /**
   * 初始加载和自动刷新
   */
  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [loadLogs, autoRefresh]);

  /**
   * 监听后端状态变化
   */
  useEffect(() => {
    setBackendStatus(backendMonitor.getStatus());

    const interval = setInterval(() => {
      setBackendStatus(backendMonitor.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 清除日志
   */
  const handleClearLogs = async () => {
    const confirmed = await dialog.confirm('确定要清空所有日志吗？此操作不可恢复。', {
      title: '确认清空日志',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const response = await fetch('http://localhost:3001/api/logs', {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        await dialog.alert(result.message, { variant: 'success' });
        loadLogs();
      }
    } catch (error) {
      console.error('[SystemLogs] 清除日志失败:', error);
    }
  };

  /**
   * 导出为 JSON
   */
  const handleExportJSON = async () => {
    await exportLogs({
      format: 'json',
      level: logFilters.filters.level,
      type: logFilters.filters.type,
    });
  };

  /**
   * 导出为 Excel (CSV)
   */
  const handleExportExcel = async () => {
    await exportLogs({
      format: 'csv',
      level: logFilters.filters.level,
      type: logFilters.filters.type,
    });
  };

  /**
   * 过滤日志
   */
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilters.filters.searchKeyword &&
          !log.message.toLowerCase().includes(logFilters.filters.searchKeyword.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [logs, logFilters.filters.searchKeyword]);

  /**
   * 手动检查后端状态
   */
  const handleManualBackendCheck = async () => {
    setIsCheckingBackend(true);
    try {
      await backendMonitor.manualCheck();
      setBackendStatus(backendMonitor.getStatus());
    } finally {
      setIsCheckingBackend(false);
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = useCallback((createdAtStr: string) => {
    // 检查是否是MySQL DATETIME格式
    if (createdAtStr && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAtStr)) {
      return createdAtStr.replace(/-/g, '/');
    }
    // 其他格式尝试解析
    const date = new Date(createdAtStr);
    if (isNaN(date.getTime())) {
      return createdAtStr;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }, []);

  const pageSize = 100;

  return (
    <>
      <div className="space-y-4">
        {/* 后端连接状态提示 */}
        {!backendStatus.isOnline && backendStatus.consecutiveFailures > 0 && (
          <Alert className="bg-red-900/20 border-red-700">
            <ServerOff className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <strong>后端服务不可用</strong>
                  <p className="text-sm mt-1">
                    连续失败 {backendStatus.consecutiveFailures} 次，最后错误：{backendStatus.lastError || '未知错误'}
                  </p>
                  <p className="text-xs mt-1 text-red-300">
                    请启动后端服务：cd app/server && npm run dev
                  </p>
                </div>
                <Button
                  onClick={handleManualBackendCheck}
                  disabled={isCheckingBackend}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-300 hover:bg-red-900/30"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1", isCheckingBackend && "animate-spin")} />
                  重新检查
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">事件日志</h2>
            <p className="text-sm text-slate-400 mt-1">
              系统运行日志和用户操作日志，默认显示过去24小时，自动记录各类操作
            </p>
            {/* 后端状态指示器 */}
            <div className={cn(
              "flex items-center gap-2 mt-2 text-xs",
              backendStatus.isOnline ? "text-green-400" : "text-red-400"
            )}>
              {backendStatus.isOnline ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>后端服务在线</span>
                  {backendStatus.lastSuccessTime && (
                    <span className="text-slate-500 ml-2">
                      最后检查: {new Date(backendStatus.lastSuccessTime).toLocaleTimeString()}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>后端服务离线</span>
                  {backendStatus.lastFailureTime && (
                    <span className="text-slate-500 ml-2">
                      最后失败: {new Date(backendStatus.lastFailureTime).toLocaleTimeString()}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button
                onClick={handleClearLogs}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除日志
              </Button>
            )}
            <Button
              onClick={handleExportJSON}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              导出JSON
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
            <Button
              onClick={() => {
                setPage(0);
                loadLogs();
              }}
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              刷新
            </Button>
          </div>
        </div>

        {/* 过滤器 */}
        <Card className="bg-slate-800 border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 级别过滤 */}
            <div>
              <Label className="text-slate-300 text-sm mb-1.5">日志级别</Label>
              <Select value={logFilters.filters.level} onValueChange={logFilters.setLevel}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={level.color}>{level.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 类型过滤 */}
            <div>
              <Label className="text-slate-300 text-sm mb-1.5">日志类型</Label>
              <Select value={logFilters.filters.type} onValueChange={logFilters.setType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 时间范围过滤 */}
            <div>
              <Label className="text-slate-300 text-sm mb-1.5">时间范围</Label>
              <Select value={logFilters.filters.timeRange} onValueChange={logFilters.setTimeRange}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 搜索框 */}
            <div className="md:col-span-2">
              <Label className="text-slate-300 text-sm mb-1.5">搜索日志</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={logFilters.filters.searchKeyword}
                  onChange={(e) => logFilters.setSearchKeyword(e.target.value)}
                  placeholder="搜索日志内容..."
                  className="bg-slate-700 border-slate-600 text-white pl-10"
                />
              </div>
            </div>
          </div>

          {/* 自动刷新开关 */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="autoRefresh" className="text-slate-300 text-sm cursor-pointer">
              自动刷新（每10秒）
            </Label>
          </div>
        </Card>

        {/* 日志列表 */}
        <Card className="bg-slate-900 border-slate-700">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mr-2" />
              <span className="text-slate-400">加载中...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              暂无日志
            </div>
          ) : (
            <div className="font-mono text-sm">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-1.5 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-0 select-text"
                >
                  <span className="text-slate-400">{formatTime(log.created_at)}</span>
                  {' '}
                  <span className={cn(
                    "font-semibold",
                    log.log_level === 'ERROR' && "text-red-400",
                    log.log_level === 'WARN' && "text-yellow-400",
                    log.log_level === 'INFO' && "text-blue-400",
                    log.log_level === 'DEBUG' && "text-slate-400"
                  )}>
                    [{log.log_level}]
                  </span>
                  {' '}
                  <span className="text-green-400">[{log.log_type}]</span>
                  {log.username && <span className="text-purple-400"> [{log.username}]</span>}
                  {' '}
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 分页信息 */}
          {total > 0 && (
            <div className="p-3 border-t border-slate-700 text-xs text-slate-400 text-center">
              显示 {Math.min((page + 1) * pageSize, total)} / {total} 条日志
              {total > pageSize && (
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    上一页
                  </Button>
                  <span className="py-1">第 {page + 1} 页</span>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= total}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 自定义对话框 */}
      <ConfirmDialog
        isOpen={dialog.confirmDialog.isOpen}
        options={dialog.confirmDialog.options}
        onConfirm={dialog.confirmDialog.handleConfirm}
        onCancel={dialog.confirmDialog.handleCancel}
      />
      <CustomAlertDialog
        isOpen={dialog.alertDialog.isOpen}
        options={dialog.alertDialog.options}
        onClose={dialog.alertDialog.handleClose}
      />
    </>
  );
}

export default SystemLogs;
