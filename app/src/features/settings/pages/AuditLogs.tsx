/**
 * 系统审计日志页面
 */
import { useState } from 'react';
import { Search, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

const mockLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: '2026-03-20T10:30:00Z',
    userId: 1,
    userName: '张三',
    action: 'CREATE',
    resource: 'task',
    resourceId: 'task-001',
    details: '创建任务：实现用户登录功能',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/122.0',
  },
  {
    id: '2',
    timestamp: '2026-03-20T10:25:00Z',
    userId: 2,
    userName: '李四',
    action: 'UPDATE',
    resource: 'task',
    resourceId: 'task-002',
    details: '更新任务状态：in_progress -> completed',
    ipAddress: '192.168.1.101',
    userAgent: 'Firefox/123.0',
  },
  {
    id: '3',
    timestamp: '2026-03-20T10:20:00Z',
    userId: 1,
    userName: '张三',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: 'session-001',
    details: '用户登录成功',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/122.0',
  },
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  LOGIN: '登录',
  LOGOUT: '登出',
};

export function AuditLogsSettings() {
  const [logs] = useState<AuditLog[]>(mockLogs);
  const [isLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.userName.toLowerCase().includes(search) ||
        log.details.toLowerCase().includes(search) ||
        log.resource.toLowerCase().includes(search)
      );
    }
    if (actionFilter !== 'all') {
      return log.action === actionFilter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户、操作或资源..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部操作</SelectItem>
              <SelectItem value="CREATE">创建</SelectItem>
              <SelectItem value="UPDATE">更新</SelectItem>
              <SelectItem value="DELETE">删除</SelectItem>
              <SelectItem value="LOGIN">登录</SelectItem>
              <SelectItem value="LOGOUT">登出</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          导出日志
        </Button>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>系统日志</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>资源</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead>IP地址</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>
                      <Badge className={ACTION_COLORS[log.action] || ''}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{log.resource}</span>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.details}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ipAddress}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
