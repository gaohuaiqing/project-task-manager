/**
 * 冲突解决对话框组件
 *
 * 当多个用户同时编辑同一数据时，显示此对话框让用户选择：
 * - 保留我的修改
 * - 使用服务器数据
 * - 合并（智能合并或手动合并）
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, GitCompare, User, Clock, Info } from 'lucide-react';
import type { DataConflict } from '@/services/ConflictManager';

// ================================================================
// 类型定义
// ================================================================

export interface ConflictDialogProps {
  /** 是否显示对话框 */
  open: boolean;
  /** 冲突信息 */
  conflict: DataConflict | null;
  /** 解决冲突 */
  onResolve: (resolution: 'keep_local' | 'keep_server' | 'merge', mergedData?: any) => void;
  /** 取消/忽略冲突 */
  onIgnore?: () => void;
  /** 是否正在处理 */
  isResolving?: boolean;
}

// ================================================================
// 工具函数
// ================================================================

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else {
    return date.toLocaleString('zh-CN');
  }
}

/**
 * 获取冲突类型标签
 */
function getConflictTypeBadge(dataType: string): JSX.Element {
  const typeMap: Record<string, { label: string; color: string }> = {
    projects: { label: '项目', color: 'bg-blue-500' },
    wbs_tasks: { label: 'WBS任务', color: 'bg-purple-500' },
    organization_units: { label: '组织单元', color: 'bg-green-500' },
    members: { label: '成员', color: 'bg-yellow-500' },
    tasks: { label: '任务', color: 'bg-orange-500' }
  };

  const info = typeMap[dataType] || { label: dataType, color: 'bg-gray-500' };

  return (
    <Badge className={`${info.color} text-white`}>
      {info.label}
    </Badge>
  );
}

/**
 * 深度比较两个对象，返回差异字段
 */
function getDiffFields(local: any, server: any): string[] {
  const diffs: string[] = [];

  if (!local || !server) return diffs;

  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of allKeys) {
    const localValue = local[key];
    const serverValue = server[key];

    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      // 转换字段名为中文
      const fieldNameMap: Record<string, string> = {
        name: '名称',
        assignee: '分配给',
        status: '状态',
        priority: '优先级',
        description: '描述',
        dueDate: '截止日期',
        progress: '进度'
      };

      diffs.push(fieldNameMap[key] || key);
    }
  }

  return diffs;
}

// ================================================================
// 主组件
// ================================================================

export function ConflictDialog({
  open,
  conflict,
  onResolve,
  onIgnore,
  isResolving = false
}: ConflictDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'local' | 'server' | 'diff'>('diff');
  const [mergedData, setMergedData] = useState<any>(null);

  useEffect(() => {
    if (conflict && open) {
      // 默认显示差异对比
      setSelectedTab('diff');
      // 尝试智能合并
      const smartMerge = smartMergeData(conflict.localData, conflict.serverData);
      setMergedData(smartMerge);
    }
  }, [conflict, open]);

  if (!conflict) return null;

  const diffFields = getDiffFields(conflict.localData, conflict.serverData);

  /**
   * 智能合并策略
   */
  function smartMergeData(local: any, server: any): any {
    const merged = { ...server };

    // 对于数组，使用服务器版本（避免顺序混乱）
    if (Array.isArray(server)) {
      return server;
    }

    // 对于对象，合并本地独有的字段
    if (typeof server === 'object' && server !== null) {
      if (typeof local === 'object' && local !== null) {
        for (const key in local) {
          if (!(key in server)) {
            merged[key] = local[key];
          }
        }
      }
    }

    return merged;
  }

  /**
   * 处理解决冲突
   */
  function handleResolve(resolution: 'keep_local' | 'keep_server' | 'merge') {
    if (resolution === 'merge') {
      onResolve('merge', mergedData);
    } else {
      onResolve(resolution);
    }
  }

  /**
   * 渲染数据视图
   */
  function renderDataView(data: any, title: string, badgeColor: string) {
    return (
      <div className="space-y-4">
        <div className={`inline-flex items-center px-2 py-1 rounded ${badgeColor} text-white text-sm`}>
          {title}
        </div>

        {typeof data === 'object' && data !== null ? (
          <ScrollArea className="h-64 w-full rounded-md border">
            <div className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 border rounded-md bg-muted">
            <p className="text-sm">{String(data)}</p>
          </div>
        )}
      </div>
    );
  }

  /**
   * 渲染差异对比
   */
  function renderDiffView() {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            检测到 <strong>{diffFields.length}</strong> 个字段存在差异：
            {diffFields.map((field, i) => (
              <Badge key={i} variant="outline" className="ml-1">
                {field}
              </Badge>
            ))}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          {/* 本地修改 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">你的修改</span>
            </div>
            <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-950">
              {diffFields.map(field => {
                const value = conflict.localData?.[field];
                return (
                  <div key={field} className="text-sm mb-1 last:mb-0">
                    <span className="font-medium">{field}:</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400">
                      {JSON.stringify(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 服务器数据 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">服务器数据</span>
            </div>
            <div className="border rounded-md p-3 bg-green-50 dark:bg-green-950">
              {diffFields.map(field => {
                const value = conflict.serverData?.[field];
                return (
                  <div key={field} className="text-sm mb-1 last:mb-0">
                    <span className="font-medium">{field}:</span>{' '}
                    <span className="text-green-600 dark:text-green-400">
                      {JSON.stringify(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 智能合并预览 */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">智能合并预览</span>
          </div>
          <div className="border rounded-md p-3 bg-purple-50 dark:bg-purple-950">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {JSON.stringify(mergedData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onIgnore?.()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            数据冲突 - 需要解决
          </DialogTitle>
          <DialogDescription>
            您修改的数据与服务器上的数据存在冲突，请选择如何处理
          </DialogDescription>
        </DialogHeader>

        {/* 冲突信息 */}
        <div className="flex items-center gap-4 py-4 border-y">
          {getConflictTypeBadge(conflict.dataType)}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>冲突时间：{formatTimestamp(conflict.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>服务器版本：v{conflict.serverVersion}</span>
          </div>
        </div>

        {/* 标签页 */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diff">
              差异对比
              {diffFields.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {diffFields.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="local">我的修改</TabsTrigger>
            <TabsTrigger value="server">服务器数据</TabsTrigger>
          </TabsList>

          <TabsContent value="diff" className="mt-4">
            {renderDiffView()}
          </TabsContent>

          <TabsContent value="local" className="mt-4">
            {renderDataView(conflict.localData, '我的修改（本地）', 'bg-blue-500')}
          </TabsContent>

          <TabsContent value="server" className="mt-4">
            {renderDataView(conflict.serverData, '服务器数据（最新）', 'bg-green-500')}
          </TabsContent>
        </Tabs>

        {/* 操作按钮 */}
        <DialogFooter className="gap-2">
          {onIgnore && (
            <Button
              variant="ghost"
              onClick={onIgnore}
              disabled={isResolving}
            >
              暂时忽略
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => handleResolve('keep_local')}
            disabled={isResolving}
          >
            保留我的修改
          </Button>

          <Button
            variant="outline"
            onClick={() => handleResolve('keep_server')}
            disabled={isResolving}
          >
            使用服务器数据
          </Button>

          <Button
            onClick={() => handleResolve('merge')}
            disabled={isResolving}
          >
            {isResolving ? '处理中...' : '智能合并'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ================================================================
// 导出便捷 Hook
// ================================================================

/**
 * 使用冲突对话框的 Hook
 */
export function useConflictDialog() {
  const [open, setOpen] = useState(false);
  const [conflict, setConflict] = useState<DataConflict | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const showConflict = (newConflict: DataConflict) => {
    setConflict(newConflict);
    setOpen(true);
  };

  const hideConflict = () => {
    setOpen(false);
    setTimeout(() => setConflict(null), 300);
  };

  return {
    open,
    conflict,
    isResolving,
    showConflict,
    hideConflict,
    setResolving: setIsResolving
  };
}
