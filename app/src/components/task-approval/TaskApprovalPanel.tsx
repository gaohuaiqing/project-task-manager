/**
 * 任务审批面板组件
 *
 * 优化的审批流程界面：
 * - 展示待审批任务列表
 * - 支持批量审批/拒绝
 * - 支持查看审批历史
 * - 超时提醒功能
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  History,
  Check,
  X,
  Eye,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskApprovalRecord } from '@/types/wbs';
import { approvalApiService, ApprovalStatus } from '@/services/ApprovalApiService';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from '@/utils/dateUtils';

interface TaskApprovalPanelProps {
  onApprovalComplete?: () => void;
  onTaskClick?: (taskId: string) => void;
}

export function TaskApprovalPanel({ onApprovalComplete, onTaskClick }: TaskApprovalPanelProps) {
  const { user, isAdmin } = useAuth();
  const [approvals, setApprovals] = useState<TaskApprovalRecord[]>([]);
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('pending');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<TaskApprovalRecord[]>([]);
  const [batchResult, setBatchResult] = useState<{ success: number; fail: number } | null>(null); // 添加批量操作结果状态

  // 批量审批相关状态
  const [showBatchApproveDialog, setShowBatchApproveDialog] = useState(false);
  const [showBatchRejectDialog, setShowBatchRejectDialog] = useState(false);
  const [batchComment, setBatchComment] = useState('');

  // 单个审批相关状态
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [singleComment, setSingleComment] = useState('');

  // 权限检查：只有管理员和技术经理可以审批
  const canApprove = isAdmin || user?.role === 'tech_manager';

  // 加载审批记录
  useEffect(() => {
    loadApprovals();
    loadStats();

    // 使用 ref 追踪定时器，确保清理时只清除当前定时器
    let intervalId: NodeJS.Timeout | null = null;

    // 设置轮询定时器
    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        loadApprovals();
        loadStats();
      }, 30000); // 每30秒刷新
    };

    startPolling();

    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [user, isAdmin]);

  // 加载待审批列表
  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      if (canApprove) {
        // 管理员和技术经理看到所有待审批
        const pending = await approvalApiService.getPendingApprovals(100);
        setApprovals(pending);
      } else if (user) {
        // 工程师只看到自己的审批记录
        const myApprovals = await approvalApiService.getUserApprovalRequests(user.id);
        setApprovals(myApprovals);
      }
    } catch (error) {
      console.error('[TaskApprovalPanel] 加载审批记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await approvalApiService.getApprovalStats();
      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('[TaskApprovalPanel] 加载统计数据失败:', error);
    }
  };

  // 查看审批历史
  const viewHistory = async (taskId: string) => {
    try {
      const history = await approvalApiService.getTaskApprovalHistory(taskId);
      setApprovalHistory(history);
      setHistoryTaskId(taskId);
      setShowHistoryDialog(true);
    } catch (error) {
      console.error('[TaskApprovalPanel] 加载审批历史失败:', error);
    }
  };

  // 批量选中/取消选中
  const toggleSelect = (id: string) => {
    setSelectedApprovals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const pendingApprovals = approvals.filter(a => a.approvalStatus === 'pending');
    if (selectedApprovals.size === pendingApprovals.length) {
      setSelectedApprovals(new Set());
    } else {
      setSelectedApprovals(new Set(pendingApprovals.map(a => a.id)));
    }
  };

  // 批量审批
  const handleBatchApprove = async () => {
    if (selectedApprovals.size === 0) return;

    let successCount = 0;
    let failCount = 0;

    // 使用并发控制，限制同时处理的请求数量
    const MAX_CONCURRENT = 5; // 最多5个并发请求
    const approvalIds = Array.from(selectedApprovals);

    // 分批处理
    for (let i = 0; i < approvalIds.length; i += MAX_CONCURRENT) {
      const batch = approvalIds.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(id => approvalApiService.approveApproval(id, batchComment))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          console.error(`[TaskApprovalPanel] 审批失败 ${batch[index]}:`, result.reason);
          failCount++;
        }
      });
    }

    // 设置批量操作结果
    setBatchResult({ success: successCount, fail: failCount });

    // 刷新数据
    await loadApprovals();
    await loadStats();

    setSelectedApprovals(new Set());
    setBatchComment('');
    setShowBatchApproveDialog(false);

    if (onApprovalComplete) {
      onApprovalComplete();
    }

    // 3秒后清除结果提示
    setTimeout(() => setBatchResult(null), 3000);
  };

  // 批量拒绝
  const handleBatchReject = async () => {
    if (selectedApprovals.size === 0) return;

    let successCount = 0;
    let failCount = 0;

    // 使用并发控制，限制同时处理的请求数量
    const MAX_CONCURRENT = 5; // 最多5个并发请求
    const approvalIds = Array.from(selectedApprovals);

    // 分批处理
    for (let i = 0; i < approvalIds.length; i += MAX_CONCURRENT) {
      const batch = approvalIds.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(id => approvalApiService.rejectApproval(id, batchComment))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          console.error(`[TaskApprovalPanel] 拒绝失败 ${batch[index]}:`, result.reason);
          failCount++;
        }
      });
    }

    // 设置批量操作结果
    setBatchResult({ success: successCount, fail: failCount });

    // 刷新数据
    await loadApprovals();
    await loadStats();

    setSelectedApprovals(new Set());
    setBatchComment('');
    setShowBatchRejectDialog(false);

    if (onApprovalComplete) {
      onApprovalComplete();
    }

    // 3秒后清除结果提示
    setTimeout(() => setBatchResult(null), 3000);
  };

  // 单个审批
  const handleApprove = async () => {
    if (!selectedApprovalId) return;

    try {
      await approvalApiService.approveApproval(selectedApprovalId, singleComment);
      await loadApprovals();
      await loadStats();
      setShowApproveDialog(false);
      setSingleComment('');
      setSelectedApprovalId(null);

      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (error) {
      console.error('[TaskApprovalPanel] 审批失败:', error);
    }
  };

  // 单个拒绝
  const handleReject = async () => {
    if (!selectedApprovalId) return;

    try {
      await approvalApiService.rejectApproval(selectedApprovalId, singleComment);
      await loadApprovals();
      await loadStats();
      setShowRejectDialog(false);
      setSingleComment('');
      setSelectedApprovalId(null);

      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (error) {
      console.error('[TaskApprovalPanel] 拒绝失败:', error);
    }
  };

  // 撤销审批请求（工程师功能）
  const handleWithdraw = async (approvalId: string) => {
    try {
      const result = await approvalApiService.withdrawApproval(approvalId);
      if (result.success) {
        // 刷新数据
        await loadApprovals();
        await loadStats();

        if (onApprovalComplete) {
          onApprovalComplete();
        }
      } else {
        console.error('[TaskApprovalPanel] 撤销失败:', result.message);
      }
    } catch (error) {
      console.error('[TaskApprovalPanel] 撤销审批请求失败:', error);
    }
  };

  // 检查是否超时（超过24小时）
  const isOverdue = (requestDate: string): boolean => {
    const requestTime = new Date(requestDate).getTime();
    const now = Date.now();
    const hoursElapsed = (now - requestTime) / (1000 * 60 * 60);
    return hoursElapsed > 24;
  };

  // 过滤后的审批列表
  const filteredApprovals = useMemo(() => {
    if (filterStatus === 'all') return approvals;
    return approvals.filter(a => a.approvalStatus === filterStatus);
  }, [approvals, filterStatus]);

  // 待审批列表
  const pendingApprovals = approvals.filter(a => a.approvalStatus === 'pending');
  const hasSelection = selectedApprovals.size > 0;

  return (
    <div className="space-y-4">
      {/* 批量操作结果提示 */}
      {batchResult && (
        <div className={cn(
          "flex items-center gap-2 p-4 rounded-lg border",
          batchResult.fail === 0
            ? "bg-green-900/20 border-green-700/50 text-green-200"
            : "bg-orange-900/20 border-orange-700/50 text-orange-200"
        )}>
          <CheckCircle2 className="w-5 h-5" />
          <span>
            批量操作完成：成功 {batchResult.success} 条
            {batchResult.fail > 0 && `，失败 ${batchResult.fail} 条`}
          </span>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待审批</p>
                <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已通过</p>
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已拒绝</p>
                <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总计</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待审批</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canApprove && pendingApprovals.length > 0 && (
          <div className="flex items-center gap-2">
            {hasSelection && (
              <>
                <Button variant="outline" size="sm" onClick={() => setSelectedApprovals(new Set())}>
                  取消选择
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowBatchApproveDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  批量通过 ({selectedApprovals.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBatchRejectDialog(true)}
                >
                  <X className="h-4 w-4 mr-1" />
                  批量拒绝 ({selectedApprovals.size})
                </Button>
              </>
            )}
            {!hasSelection && (
              <>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadApprovals()}>
                  刷新
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 审批列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无审批记录</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredApprovals.map((approval) => (
            <Card
              key={approval.id}
              className={cn(
                "transition-colors hover:bg-muted/50",
                approval.approvalStatus === 'pending' && "border-l-4 border-l-orange-500",
                approval.approvalStatus === 'approved' && "border-l-4 border-l-green-500",
                approval.approvalStatus === 'rejected' && "border-l-4 border-l-red-500"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* 复选框（仅待审批任务） */}
                    {canApprove && approval.approvalStatus === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedApprovals.has(approval.id)}
                        onChange={() => toggleSelect(approval.id)}
                        className="h-4 w-4"
                      />
                    )}

                    {/* 任务信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{approval.taskTitle}</span>
                        <Badge
                          variant={approval.approvalStatus === 'pending' ? 'default' : 'secondary'}
                          className={cn(
                            approval.approvalStatus === 'pending' && "bg-orange-500 hover:bg-orange-600",
                            approval.approvalStatus === 'approved' && "bg-green-500 hover:bg-green-600",
                            approval.approvalStatus === 'rejected' && "bg-red-500 hover:bg-red-600"
                          )}
                        >
                          {approval.approvalStatus === 'pending' && '待审批'}
                          {approval.approvalStatus === 'approved' && '已通过'}
                          {approval.approvalStatus === 'rejected' && '已拒绝'}
                        </Badge>
                        {isOverdue(approval.requestDate) && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            超时
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>申请人: {approval.requesterName}</span>
                        <span>角色: {approval.requesterRole}</span>
                        <span>
                          {formatDistanceToNow(new Date(approval.requestDate))}前申请
                        </span>
                        {approval.approvalDate && (
                          <span>
                            {formatDistanceToNow(new Date(approval.approvalDate))}前处理
                          </span>
                        )}
                        {approval.approvalComment && (
                          <span className="text-foreground">
                            备注: {approval.approvalComment}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      {canApprove && approval.approvalStatus === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedApprovalId(approval.id);
                              setShowApproveDialog(true);
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedApprovalId(approval.id);
                              setShowRejectDialog(true);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            拒绝
                          </Button>
                        </>
                      )}

                      {!canApprove && user?.id === approval.requester && approval.approvalStatus === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdraw(approval.id)}
                        >
                          撤销
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewHistory(String(approval.taskId))}
                      >
                        <History className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTaskClick && onTaskClick(String(approval.taskId))}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 批量审批通过对话框 */}
      <AlertDialog open={showBatchApproveDialog} onOpenChange={setShowBatchApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量审批通过</AlertDialogTitle>
            <AlertDialogDescription>
              即将通过 {selectedApprovals.size} 个任务，确认操作？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="batch-comment">审批意见（可选）</Label>
            <Textarea
              id="batch-comment"
              placeholder="请输入批量审批意见..."
              value={batchComment}
              onChange={(e) => setBatchComment(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchApprove} className="bg-green-600 hover:bg-green-700">
              确认通过
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量拒绝对话框 */}
      <AlertDialog open={showBatchRejectDialog} onOpenChange={setShowBatchRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量拒绝</AlertDialogTitle>
            <AlertDialogDescription>
              即将拒绝 {selectedApprovals.size} 个任务，此操作不可撤销，确认操作？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="batch-reject-comment">拒绝原因（必填）</Label>
            <Textarea
              id="batch-reject-comment"
              placeholder="请输入拒绝原因..."
              value={batchComment}
              onChange={(e) => setBatchComment(e.target.value)}
              rows={3}
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchReject} className="bg-red-600 hover:bg-red-700">
              确认拒绝
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 单个审批通过对话框 */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>审批通过</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="single-comment">审批意见（可选）</Label>
            <Textarea
              id="single-comment"
              placeholder="请输入审批意见..."
              value={singleComment}
              onChange={(e) => setSingleComment(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              通过
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 单个拒绝对话框 */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒绝任务</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="single-reject-comment">拒绝原因（必填）</Label>
            <Textarea
              id="single-reject-comment"
              placeholder="请输入拒绝原因..."
              value={singleComment}
              onChange={(e) => setSingleComment(e.target.value)}
              rows={3}
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-red-600 hover:bg-red-700">
              确认拒绝
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 审批历史对话框 */}
      <AlertDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>审批历史</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {approvalHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                暂无审批历史
              </div>
            ) : (
              <div className="space-y-3">
                {approvalHistory.map((record, index) => (
                  <div key={record.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="flex-shrink-0">
                      {index === 0 && (
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {index > 0 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{record.requesterName}</span>
                        <Badge variant="outline">{record.requesterRole}</Badge>
                        <Badge
                          variant={record.approvalStatus === 'approved' ? 'default' : 'secondary'}
                          className={cn(
                            record.approvalStatus === 'approved' && "bg-green-500 hover:bg-green-600",
                            record.approvalStatus === 'rejected' && "bg-red-500 hover:bg-red-600"
                          )}
                        >
                          {record.approvalStatus === 'pending' && '待审批'}
                          {record.approvalStatus === 'approved' && '已通过'}
                          {record.approvalStatus === 'rejected' && '已拒绝'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        申请时间: {new Date(record.requestDate).toLocaleString('zh-CN')}
                      </p>
                      {record.approvalDate && (
                        <p className="text-sm text-muted-foreground mb-1">
                          处理时间: {new Date(record.approvalDate).toLocaleString('zh-CN')}
                        </p>
                      )}
                      {record.approverName && (
                        <p className="text-sm text-muted-foreground mb-1">
                          审批人: {record.approverName}
                        </p>
                      )}
                      {record.approvalComment && (
                        <p className="text-sm text-foreground">
                          备注: {record.approvalComment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowHistoryDialog(false)}>
              关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
