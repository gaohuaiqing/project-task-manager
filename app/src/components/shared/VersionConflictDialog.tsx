/**
 * 版本冲突对话框组件
 *
 * 用于解决多人同时编辑同一数据时的乐观锁冲突
 * 提供三种解决方案：
 * 1. 使用服务器数据（放弃本地修改）
 * 2. 保留本地修改（强制覆盖服务器数据）
 * 3. 合并修改（手动选择保留哪些字段）
 */

import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, User } from 'lucide-react';

// ==================== 类型定义 ====================

export interface VersionConflictData {
  entityType: string; // 'project', 'member', 'task', 'wbs_task'
  entityId: number;
  entityName?: string;
  currentVersion: number;
  latestData: any;
  localData?: any;
  changedBy?: string;
  changedAt?: string;
}

export interface VersionConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: VersionConflictData;
  onResolve: (resolution: 'use_server' | 'use_local' | 'merge', mergedData?: any) => void;
}

// ==================== 辅助函数 ====================

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 获取实体类型中文名
 */
function getEntityTypeName(entityType: string): string {
  const typeMap: Record<string, string> = {
    'project': '项目',
    'member': '成员',
    'task': '任务',
    'wbs_task': 'WBS任务'
  };
  return typeMap[entityType] || entityType;
}

/**
 * 比较两个对象的差异
 */
function compareObjects(local: any, server: any): Array<{ field: string; local: any; server: any }> {
  const differences: Array<{ field: string; local: any; server: any }> = [];

  // 获取所有字段
  const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(server || {})]);

  allKeys.forEach(key => {
    if (JSON.stringify(local?.[key]) !== JSON.stringify(server?.[key])) {
      differences.push({
        field: key,
        local: local?.[key],
        server: server?.[key]
      });
    }
  });

  return differences;
}

/**
 * 格式化字段显示值
 */
function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return '(空)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * 获取字段显示名称
 */
function getFieldDisplayName(entityType: string, field: string): string {
  const fieldMaps: Record<string, Record<string, string>> = {
    'project': {
      'code': '项目编码',
      'name': '项目名称',
      'description': '描述',
      'status': '状态',
      'progress': '进度',
      'version': '版本号'
    },
    'member': {
      'name': '姓名',
      'employee_id': '员工编号',
      'department': '部门',
      'position': '职位',
      'email': '邮箱',
      'phone': '电话',
      'status': '状态',
      'skills': '技能',
      'capabilities': '能力'
    },
    'wbs_task': {
      'task_code': '任务编码',
      'task_name': '任务名称',
      'description': '描述',
      'status': '状态',
      'priority': '优先级',
      'progress': '进度',
      'assignee_id': '分配给',
      'planned_start_date': '计划开始日期',
      'planned_end_date': '计划结束日期'
    }
  };

  return fieldMaps[entityType]?.[field] || field;
}

// ==================== 组件 ====================

export function VersionConflictDialog({
  open,
  onClose,
  conflict,
  onResolve
}: VersionConflictDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<'use_server' | 'use_local' | 'merge' | null>(null);
  const [mergedData, setMergedData] = useState<any>(null);
  const [differences, setDifferences] = useState<Array<{ field: string; local: any; server: any }>>([]);

  useEffect(() => {
    if (open && conflict.localData) {
      const diffs = compareObjects(conflict.localData, conflict.latestData);
      setDifferences(diffs);

      // 默认合并策略：优先使用服务器数据
      const defaultMerge = { ...conflict.latestData };
      diffs.forEach(diff => {
        // 对于一些字段，优先保留本地修改
        if (['progress', 'actual_hours', 'actual_start_date', 'actual_end_date'].includes(diff.field)) {
          defaultMerge[diff.field] = diff.local;
        }
      });
      setMergedData(defaultMerge);
    }
  }, [open, conflict]);

  const entityTypeName = getEntityTypeName(conflict.entityType);

  const handleResolve = () => {
    if (!selectedResolution) return;

    if (selectedResolution === 'merge') {
      onResolve('merge', mergedData);
    } else {
      onResolve(selectedResolution);
    }

    onClose();
    setSelectedResolution(null);
  };

  const handleMergeFieldChange = (field: string, value: 'local' | 'server') => {
    const diff = differences.find(d => d.field === field);
    if (!diff) return;

    setMergedData(prev => ({
      ...prev,
      [field]: value === 'local' ? diff.local : diff.server
    }));
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>版本冲突</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            该{entityTypeName}已被其他用户修改，请选择解决方案
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 冲突信息 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{conflict.entityName || `${entityTypeName} #${conflict.entityId}`}</span>
                <Badge variant="outline">版本 {conflict.currentVersion}</Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-4 text-xs">
                {conflict.changedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    修改人: {conflict.changedBy}
                  </span>
                )}
                {conflict.changedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(conflict.changedAt)}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 差异比较 */}
          {differences.length > 0 && (
            <Tabs defaultValue="diff" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="diff">字段差异</TabsTrigger>
                <TabsTrigger value="preview">数据预览</TabsTrigger>
              </TabsList>

              <TabsContent value="diff" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {differences.map(diff => (
                      <div key={diff.field} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">
                          {getFieldDisplayName(conflict.entityType, diff.field)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">本地修改</div>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                              {formatFieldValue(diff.local)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">服务器数据</div>
                            <div className="p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                              {formatFieldValue(diff.server)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">本地修改</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs overflow-auto max-h-60">
                          {JSON.stringify(conflict.localData, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">服务器数据</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs overflow-auto max-h-60">
                          {JSON.stringify(conflict.latestData, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* 解决方案选择 */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-3">选择解决方案:</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Button
              variant={selectedResolution === 'use_server' ? 'default' : 'outline'}
              onClick={() => setSelectedResolution('use_server')}
              className="h-auto flex-col items-start p-3"
            >
              <div className="font-medium mb-1">使用服务器数据</div>
              <div className="text-xs text-left opacity-80">
                放弃本地修改，使用服务器最新数据
              </div>
            </Button>
            <Button
              variant={selectedResolution === 'use_local' ? 'default' : 'outline'}
              onClick={() => setSelectedResolution('use_local')}
              className="h-auto flex-col items-start p-3"
            >
              <div className="font-medium mb-1">保留本地修改</div>
              <div className="text-xs text-left opacity-80">
                强制覆盖服务器数据（可能导致其他用户修改丢失）
              </div>
            </Button>
            <Button
              variant={selectedResolution === 'merge' ? 'default' : 'outline'}
              onClick={() => setSelectedResolution('merge')}
              className="h-auto flex-col items-start p-3"
              disabled={!conflict.localData}
            >
              <div className="font-medium mb-1">合并修改</div>
              <div className="text-xs text-left opacity-80">
                手动选择保留哪些字段
              </div>
            </Button>
          </div>

          {/* 合并选项 */}
          {selectedResolution === 'merge' && differences.length > 0 && (
            <div className="border rounded-lg p-3 mb-4">
              <div className="text-sm font-medium mb-2">选择要保留的字段:</div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {differences.map(diff => (
                  <div
                    key={diff.field}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm">{getFieldDisplayName(conflict.entityType, diff.field)}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={mergedData?.[diff.field] === diff.local ? 'default' : 'outline'}
                        onClick={() => handleMergeFieldChange(diff.field, 'local')}
                        className="h-7 px-2 text-xs"
                      >
                        本地
                      </Button>
                      <Button
                        size="sm"
                        variant={mergedData?.[diff.field] === diff.server ? 'default' : 'outline'}
                        onClick={() => handleMergeFieldChange(diff.field, 'server')}
                        className="h-7 px-2 text-xs"
                      >
                        服务器
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleResolve} disabled={!selectedResolution}>
            应用解决方案
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ==================== Hook ====================

/**
 * 使用版本冲突处理的Hook
 */
export function useVersionConflict() {
  const [conflict, setConflict] = useState<VersionConflictData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleVersionConflict = (event: CustomEvent) => {
      setConflict(event.detail);
      setOpen(true);
    };

    window.addEventListener('versionConflict', handleVersionConflict as EventListener);

    return () => {
      window.removeEventListener('versionConflict', handleVersionConflict as EventListener);
    };
  }, []);

  const closeDialog = () => {
    setOpen(false);
    setConflict(null);
  };

  return {
    open,
    conflict,
    closeDialog
  };
}
