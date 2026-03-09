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
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialog } from '@/hooks/useDialog';
import { ConfirmDialog, CustomAlertDialog } from '@/components/common/DialogProvider';
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
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">事件日志</h2>
            <p className="text-sm text-muted-foreground mt-1">
              系统运行日志和用户操作日志，默认显示过去24小时，自动记录各类操作
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button
                onClick={handleClearLogs}
                variant="outline"
                className="border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-600/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除日志
              </Button>
            )}
            <Button
              onClick={handleExportJSON}
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Download className="w-4 h-4 mr-2" />
              导出JSON
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              刷新
            </Button>
          </div>
        </div>

        {/* 过滤器 */}
        <Card className="bg-muted/30 border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 级别过滤 */}
            <div>
              <Label className="text-foreground text-sm mb-1.5">日志级别</Label>
              <Select value={logFilters.filters.level} onValueChange={logFilters.setLevel}>
                <SelectTrigger className="bg-background border-border text-foreground">
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
              <Label className="text-foreground text-sm mb-1.5">日志类型</Label>
              <Select value={logFilters.filters.type} onValueChange={logFilters.setType}>
                <SelectTrigger className="bg-background border-border text-foreground">
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
              <Label className="text-foreground text-sm mb-1.5">时间范围</Label>
              <Select value={logFilters.filters.timeRange} onValueChange={logFilters.setTimeRange}>
                <SelectTrigger className="bg-background border-border text-foreground">
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
              <Label className="text-foreground text-sm mb-1.5">搜索日志</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={logFilters.filters.searchKeyword}
                  onChange={(e) => logFilters.setSearchKeyword(e.target.value)}
                  placeholder="搜索日志内容..."
                  className="bg-background border-border text-foreground pl-10"
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
            <Label htmlFor="autoRefresh" className="text-foreground text-sm cursor-pointer">
              自动刷新（每10秒）
            </Label>
          </div>
        </Card>

        {/* 日志列表 */}
        <Card className="bg-card border-border">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin mr-2" />
              <span className="text-muted-foreground">加载中...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无日志
            </div>
          ) : (
            <div className="font-mono text-sm">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-1.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 select-text"
                >
                  <span className="text-muted-foreground">{formatTime(log.created_at)}</span>
                  {' '}
                  <span className={cn(
                    "font-semibold",
                    log.log_level === 'ERROR' && "text-red-600 dark:text-red-400",
                    log.log_level === 'WARN' && "text-yellow-600 dark:text-yellow-400",
                    log.log_level === 'INFO' && "text-blue-600 dark:text-blue-400",
                    log.log_level === 'DEBUG' && "text-muted-foreground"
                  )}>
                    [{log.log_level}]
                  </span>
                  {' '}
                  <span className="text-green-600 dark:text-green-400">[{log.log_type}]</span>
                  {log.username && <span className="text-purple-600 dark:text-purple-400"> [{log.username}]</span>}
                  {' '}
                  <span className="text-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 分页信息 */}
          {total > 0 && (
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              显示 {Math.min((page + 1) * pageSize, total)} / {total} 条日志
              {total > pageSize && (
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground"
                  >
                    上一页
                  </Button>
                  <span className="py-1">第 {page + 1} 页</span>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= total}
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground"
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
