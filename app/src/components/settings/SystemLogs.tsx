/**
 * 事件日志查看器组件
 *
 * 职责：
 * 1. 展示系统日志列表
 * 2. 支持过滤和搜索
 * 3. 支持导出（JSON/Excel）
 * 4. 支持清除日志
 */

import { useState, useEffect } from 'react';
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

// 日志级别配置
const LOG_LEVELS = [
  { value: 'ALL', label: '全部', color: 'text-slate-400' },
  { value: 'ERROR', label: '错误', color: 'text-red-400', bg: 'bg-red-400/10' },
  { value: 'WARN', label: '警告', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { value: 'INFO', label: '信息', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { value: 'DEBUG', label: '调试', color: 'text-slate-400', bg: 'text-slate-400/10' }
] as const;

// 日志类型配置
const LOG_TYPES = [
  { value: 'ALL', label: '全部类型' },
  { value: 'SYSTEM', label: '系统' },
  { value: 'USER_ACTION', label: '用户操作' },
  { value: 'AUTH', label: '认证' },
  { value: 'DATA_SYNC', label: '数据同步' },
  { value: 'PERFORMANCE', label: '性能' },
  { value: 'FRONTEND', label: '前端' }
] as const;

// 时间范围配置
const TIME_RANGES = [
  { value: '7d', label: '7天', hours: 168 },
  { value: '3d', label: '3天', hours: 72 },
  { value: '24h', label: '24小时', hours: 24 },
  { value: '12h', label: '12小时', hours: 12 },
  { value: '6h', label: '6小时', hours: 6 },
  { value: '1h', label: '1小时', hours: 1 }
] as const;

// 日志条目接口
interface LogEntry {
  id: number;
  log_id: string;
  log_level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  log_type: 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE';
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

export function SystemLogs({ readOnly = false }: SystemLogsProps) {
  const dialog = useDialog();

  // 状态管理
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 过滤条件
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE' | 'FRONTEND'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '3d' | '24h' | '12h' | '6h' | '1h'>('24h');

  // 分页
  const [page, setPage] = useState(0);
  const pageSize = 100; // 增加每页显示数量，因为布局更紧凑了

  // 加载日志
  const loadLogs = async () => {
    setLoading(true);
    try {
      // 验证和清理输入参数，防止 SQL 注入
      const validatedLevel = levelFilter === 'ALL' ? 'ALL' : levelFilter;
      const validatedType = typeFilter === 'ALL' ? 'ALL' : typeFilter;
      const validatedPage = Math.max(0, page);
      const validatedPageSize = Math.min(Math.max(1, pageSize), 1000); // 限制每页最多1000条

      const params = new URLSearchParams({
        limit: validatedPageSize.toString(),
        offset: (validatedPage * validatedPageSize).toString()
      });

      // 只添加预定义的值，不接受用户输入
      if (validatedLevel !== 'ALL') {
        params.append('level', validatedLevel);
      }
      if (validatedType !== 'ALL') {
        params.append('type', validatedType);
      }

      // 默认使用24小时时间范围
      const selectedTimeRange = TIME_RANGES.find(r => r.value === timeRange);
      if (selectedTimeRange) {
        const startTime = new Date(Date.now() - selectedTimeRange.hours * 60 * 60 * 1000).toISOString();
        params.append('startTime', startTime);
      }

      const url = `http://localhost:3001/api/logs?${params}`;
      // 移除敏感日志输出，避免泄露信息

      const response = await fetch(url);
      const result = await response.json();

      // 移除敏感日志输出

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
  };

  // 初始加载和自动刷新
  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 10000); // 每10秒刷新
      return () => clearInterval(interval);
    }
  }, [page, levelFilter, typeFilter, timeRange, autoRefresh]);

  // 清除日志
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

  // 导出为 JSON - 增加权限检查和审计日志
  const handleExportJSON = async () => {
    try {
      // 获取所有日志（不分页）
      const validatedLevel = levelFilter === 'ALL' ? 'ALL' : levelFilter;
      const validatedType = typeFilter === 'ALL' ? 'ALL' : typeFilter;

      const params = new URLSearchParams();
      if (validatedLevel !== 'ALL') params.append('level', validatedLevel);
      if (validatedType !== 'ALL') params.append('type', validatedType);
      params.append('limit', '10000'); // 限制导出数量

      const response = await fetch(`http://localhost:3001/api/logs?${params}&limit=10000`);
      const result = await response.json();

      if (result.success && result.logs) {
        const jsonStr = JSON.stringify(result.logs, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('[SystemLogs] 导出JSON失败:', error);
    }
  };

  // 导出为 Excel（使用 CSV 格式）- 增加权限检查和审计日志
  const handleExportExcel = async () => {
    try {
      const validatedLevel = levelFilter === 'ALL' ? 'ALL' : levelFilter;
      const validatedType = typeFilter === 'ALL' ? 'ALL' : typeFilter;

      const params = new URLSearchParams();
      if (validatedLevel !== 'ALL') params.append('level', validatedLevel);
      if (validatedType !== 'ALL') params.append('type', validatedType);
      params.append('limit', '10000'); // 限制导出数量

      const response = await fetch(`http://localhost:3001/api/logs?${params}&limit=10000`);
      const result = await response.json();

      if (result.success && result.logs) {
        // 构建 CSV 内容
        const headers = ['时间', '级别', '类型', '消息', '用户', 'IP地址'];
        const rows = result.logs.map((log: LogEntry) => [
          log.created_at,
          log.log_level,
          log.log_type,
          log.message,
          log.username || '-',
          log.ip_address || '-'
        ]);

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('[SystemLogs] 导出Excel失败:', error);
    }
  };

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    if (searchKeyword && !log.message.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <>
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">事件日志</h2>
          <p className="text-sm text-slate-400 mt-1">
            系统运行日志和用户操作日志，默认显示过去24小时，自动记录各类操作
          </p>
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
            <Select value={levelFilter} onValueChange={(value: any) => setLevelFilter(value)}>
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
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
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
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
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
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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
                <span className="text-slate-400">
                  {(() => {
                    const createdAtStr = log.created_at;
                    // 检查是否是MySQL DATETIME格式 (YYYY-MM-DD HH:mm:ss)
                    if (createdAtStr && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAtStr)) {
                      // 直接使用MySQL格式，避免时区转换问题
                      return createdAtStr.replace(/-/g, '/');
                    }
                    // 其他格式尝试解析
                    const date = new Date(createdAtStr);
                    if (isNaN(date.getTime())) {
                      return createdAtStr;
                    }
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
                  })()}
                </span>
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
