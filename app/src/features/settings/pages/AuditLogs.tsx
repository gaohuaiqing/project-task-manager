/**
 * 系统审计日志页面
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { auditLogApi, type AuditLog, type AuditLogQueryParams } from '@/lib/api/analytics.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format, subDays } from 'date-fns';

// 分类标签
const CATEGORY_LABELS: Record<string, string> = {
  security: '安全',
  project: '项目',
  task: '任务',
  org: '组织',
  config: '配置',
};

// 操作类型颜色
const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  PASSWORD_CHANGE: 'bg-orange-100 text-orange-700',
  ROLE_CHANGE: 'bg-yellow-100 text-yellow-700',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  ASSIGN: 'bg-cyan-100 text-cyan-700',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-rose-100 text-rose-700',
};

// 操作类型标签
const ACTION_LABELS: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '登出',
  PASSWORD_CHANGE: '改密',
  ROLE_CHANGE: '角色变更',
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  ASSIGN: '分配',
  ARCHIVE: '归档',
  RESTORE: '恢复',
  APPROVE: '批准',
  REJECT: '拒绝',
};

// 快捷时间选项
const QUICK_DATE_OPTIONS = [
  { label: '今天', days: 0 },
  { label: '近7天', days: 7 },
  { label: '近30天', days: 30 },
  { label: '近90天', days: 90 },
];

export function AuditLogsSettings() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 筛选条件
  const [category, setCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // 权限检查
  const canView = user?.role === 'admin' || user?.role === 'dept_manager';

  // 加载日志列表
  const loadLogs = useCallback(() => {
    if (!canView) return;

    const params: AuditLogQueryParams = {
      page,
      pageSize,
    };

    if (category !== 'all') {
      params.category = category;
    }
    if (startDate) {
      params.startDate = format(startDate, 'yyyy-MM-dd');
    }
    if (endDate) {
      params.endDate = format(endDate, 'yyyy-MM-dd');
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    setIsLoading(true);
    auditLogApi.getAuditLogs(params)
      .then((result) => {
        setLogs(result.items);
        setTotal(result.total);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [canView, category, startDate, endDate, searchTerm, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 快捷选择时间
  const handleQuickDate = (days: number) => {
    if (days === 0) {
      const today = new Date();
      setStartDate(today);
      setEndDate(today);
    } else {
      setStartDate(subDays(new Date(), days));
      setEndDate(new Date());
    }
  };

  // 清除时间筛选
  const handleClearDate = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // 导出
  const handleExport = async () => {
    const params: AuditLogQueryParams = {};
    if (category !== 'all') params.category = category;
    if (startDate) params.startDate = format(startDate, 'yyyy-MM-dd');
    if (endDate) params.endDate = format(endDate, 'yyyy-MM-dd');
    if (searchTerm.trim()) params.search = searchTerm.trim();

    try {
      await auditLogApi.exportAuditLogs(params);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 无权限
  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        无权限查看审计日志
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 筛选区 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 分类筛选 */}
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 快捷时间按钮 */}
        <div className="flex items-center gap-1">
          {QUICK_DATE_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => { handleQuickDate(opt.days); setPage(1); }}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* 开始日期 */}
        <DatePicker
          value={startDate}
          onChange={(date) => { setStartDate(date); setPage(1); }}
          placeholder="开始日期"
          className="w-[140px]"
        />

        {/* 结束日期 */}
        <DatePicker
          value={endDate}
          onChange={(date) => { setEndDate(date); setPage(1); }}
          placeholder="结束日期"
          className="w-[140px]"
        />

        {/* 清除日期 */}
        {(startDate || endDate) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearDate}>
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* 搜索框 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索操作内容..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {/* 导出按钮 */}
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          导出
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="text-sm text-muted-foreground">
        共 {total} 条记录
      </div>

      {/* 日志列表 */}
      <div className="border rounded-lg divide-y">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            暂无日志记录
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.audit_id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              {/* 时间 */}
              <div className="text-sm text-muted-foreground whitespace-nowrap w-[150px]">
                {new Date(log.created_at).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              {/* 用户 */}
              <div className="font-medium whitespace-nowrap w-[80px]">
                {log.actor_username || '系统'}
              </div>

              {/* 操作类型 */}
              <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
                {ACTION_LABELS[log.action] || log.action}
              </Badge>

              {/* 操作描述 */}
              <div className="flex-1 truncate text-sm">
                {log.details || `${log.action} ${log.table_name}`}
              </div>

              {/* IP地址（悬停显示） */}
              <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {log.ip_address || '-'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {Math.ceil(total / pageSize)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
