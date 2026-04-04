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
  LOGIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  LOGOUT: 'bg-muted text-muted-foreground',
  PASSWORD_CHANGE: 'bg-orange-100 dark:bg-orange-900/3 text-orange-700 dark:text-orange-300',
  ROLE_CHANGE: 'bg-yellow-100 dark:bg-yellow-900/3 text-yellow-700 dark:text-yellow-300',
  CREATE: 'bg-green-100 dark:bg-green-900/3 text-green-700 dark:text-green-300',
  UPDATE: 'bg-blue-100 dark:bg-blue-900/3 text-blue-700 dark:text-blue-300',
  DELETE: 'bg-red-100 dark:bg-red-900/3 text-red-700 dark:text-red-300',
  ASSIGN: 'bg-cyan-100 dark:bg-cyan-900/3 text-cyan-700 dark:text-cyan-300',
  APPROVE: 'bg-emerald-100 dark:bg-emerald-900/3 text-emerald-700 dark:text-emerald-300',
  REJECT: 'bg-rose-100 dark:bg-rose-900/3 text-rose-700 dark:text-rose-300',
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

/**
 * 安全格式化时间 - 处理无效日期
 */
function safeFormatTime(time: string | Date | null | undefined): string {
  if (!time) return '-';

  try {
    const date = new Date(time);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '-';
    }
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return '-';
  }
}

/**
 * 格式化日志详情 - 让内容更易读
 */
function formatLogDetails(log: AuditLog): string {
  // 1. 尝试解析 details
  let detailsObj: Record<string, unknown> | null = null;

  if (log.details) {
    if (typeof log.details === 'string') {
      // 尝试解析 JSON 字符串
      try {
        const parsed = JSON.parse(log.details);
        if (parsed && typeof parsed === 'object') {
          detailsObj = parsed;
        } else {
          // 不是对象，直接返回字符串
          return log.details;
        }
      } catch {
        // 不是 JSON，直接返回原始字符串
        return log.details;
      }
    } else if (typeof log.details === 'object') {
      detailsObj = log.details as Record<string, unknown>;
    }
  }

  // 2. 如果解析出对象，提取关键字段
  if (detailsObj) {
    // 提取 message 字段
    if (detailsObj.message) {
      return String(detailsObj.message);
    }

    // 提取 action + target 组合
    if (detailsObj.action && detailsObj.target) {
      return `${detailsObj.action} ${detailsObj.target}`;
    }

    // 提取字段变更
    if (detailsObj.field && detailsObj.from !== undefined && detailsObj.to !== undefined) {
      return `修改 ${detailsObj.field}: "${detailsObj.from}" → "${detailsObj.to}"`;
    }

    // 提取项目/任务名称
    if (detailsObj.name || detailsObj.projectName || detailsObj.taskName) {
      const name = detailsObj.name || detailsObj.projectName || detailsObj.taskName;
      const action = ACTION_LABELS[log.action] || log.action;
      return `${action} "${name}"`;
    }
  }

  // 3. 根据 action 类型生成默认描述
  const actionLabel = ACTION_LABELS[log.action] || log.action;
  const categoryLabel = CATEGORY_LABELS[log.category] || log.category;

  if (log.tableName) {
    // 转换表名为中文
    const tableNames: Record<string, string> = {
      projects: '项目',
      tasks: '任务',
      users: '用户',
      departments: '部门',
      milestones: '里程碑',
      progress_records: '进度记录',
      capability_models: '能力模型',
      delay_records: '延期记录',
    };
    const tableName = tableNames[log.tableName] || log.tableName;
    return `${actionLabel} ${tableName}`;
  }

  // 4. 兜底：显示分类+操作
  return `${categoryLabel} - ${actionLabel}`;
}

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
        {/* 表头 */}
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground">
          <div className="whitespace-nowrap w-[170px]">时间</div>
          <div className="whitespace-nowrap w-[80px]">用户</div>
          <div className="whitespace-nowrap">操作</div>
          <div className="flex-1">操作内容</div>
          <div className="whitespace-nowrap">IP地址</div>
        </div>

        {/* 数据行 */}
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
              key={log.auditId}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              {/* 时间 - 精确到秒 */}
              <div className="text-sm text-muted-foreground whitespace-nowrap w-[170px] font-mono">
                {safeFormatTime(log.createdAt)}
              </div>

              {/* 用户 */}
              <div className="font-medium whitespace-nowrap w-[80px]">
                {log.actorUsername || '系统'}
              </div>

              {/* 操作类型 */}
              <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
                {ACTION_LABELS[log.action] || log.action}
              </Badge>

              {/* 操作描述 - 格式化显示 */}
              <div className="flex-1 truncate text-sm">
                {formatLogDetails(log)}
              </div>

              {/* IP地址（悬停显示） */}
              <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {log.ipAddress || '-'}
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
