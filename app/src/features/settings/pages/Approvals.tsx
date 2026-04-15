/**
 * 审批管理页面
 * 管理角色（admin/dept_manager/tech_manager）查看和操作计划变更审批
 */
import { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlanChanges, useApprovePlanChange, useRejectPlanChange } from '../hooks/useApprovals';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { RejectionReasonDialog } from '../components/RejectionReasonDialog';
import { format } from 'date-fns';
import type { ApprovalStatus, PlanChange } from '@/lib/api/workflow.api';

/** 变更类型中文映射 */
const CHANGE_TYPE_LABELS: Record<string, string> = {
  start_date: '开始日期',
  duration: '工期',
  predecessor_id: '前置任务',
  lag_days: '提前/落后天数',
};

/** 审批状态配置 */
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }
> = {
  pending: { label: '待审批', variant: 'secondary', icon: Clock },
  approved: { label: '已通过', variant: 'default', icon: CheckCircle },
  rejected: { label: '已驳回', variant: 'destructive', icon: XCircle },
  timeout: { label: '已超时', variant: 'outline', icon: AlertCircle },
};

/** 格式化显示变更值 */
function formatChangeValue(type: string, value: string | null): string {
  if (value === null || value === undefined) return '-';
  if (type === 'start_date' || type === 'end_date') {
    try {
      return format(new Date(value), 'yyyy-MM-dd');
    } catch {
      return value;
    }
  }
  if (type === 'duration') return `${value} 天`;
  return value;
}

export function ApprovalsSettings() {
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 驳回弹窗状态
  const [rejectTarget, setRejectTarget] = useState<PlanChange | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // 查询数据
  const { data, isLoading } = usePlanChanges({
    status: statusFilter === 'all' ? undefined : statusFilter,
    projectId: projectFilter === 'all' ? undefined : projectFilter,
    page,
    pageSize,
  });
  const { data: projectsData } = useProjects({ pageSize: 100 });

  // Mutations
  const approveMutation = useApprovePlanChange();
  const rejectMutation = useRejectPlanChange();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const projects = projectsData?.items ?? [];

  // 审批通过
  const handleApprove = useCallback(
    (item: PlanChange) => {
      approveMutation.mutate(item.id);
    },
    [approveMutation],
  );

  // 打开驳回弹窗
  const handleOpenReject = useCallback((item: PlanChange) => {
    setRejectTarget(item);
    setRejectDialogOpen(true);
  }, []);

  // 确认驳回
  const handleConfirmReject = useCallback(
    (reason: string) => {
      if (rejectTarget) {
        rejectMutation.mutate(
          { id: rejectTarget.id, reason },
          {
            onSuccess: () => {
              setRejectDialogOpen(false);
              setRejectTarget(null);
            },
          },
        );
      }
    },
    [rejectTarget, rejectMutation],
  );

  // 状态筛选变化时重置页码
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ApprovalStatus | 'all');
    setPage(1);
  };

  const handleProjectChange = (value: string) => {
    setProjectFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 筛选区域 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">筛选：</span>
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]" data-testid="approval-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审批</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
            <SelectItem value="timeout">已超时</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-[180px]" data-testid="approval-filter-project">
            <SelectValue placeholder="全部项目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部项目</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
        </div>
      </div>

      {/* 列表区域 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">暂无审批记录</p>
          <p className="text-xs mt-1">当工程师提交计划变更时，审批记录将出现在这里</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-3 pr-4">
            {items.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <Card key={item.id} className="p-4 space-y-3">
                  {/* 头部：状态 + 变更类型 + 时间 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {CHANGE_TYPE_LABELS[item.changeType] || item.changeType}
                      </Badge>
                      <Badge variant={statusCfg.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusCfg.label}
                      </Badge>
                      {item.status === 'pending' && (
                        <span className="text-xs text-amber-500">待处理</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>

                  {/* 变更详情 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">原值：</span>
                      <span className="font-mono">
                        {formatChangeValue(item.changeType, item.oldValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">新值：</span>
                      <span className="font-mono font-medium">
                        {formatChangeValue(item.changeType, item.newValue)}
                      </span>
                    </div>
                  </div>

                  {/* 变更原因 */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">变更原因：</span>
                    <span>{item.reason}</span>
                  </div>

                  {/* 申请人信息 */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      申请人：{item.userName || '未知'}
                    </div>
                    {item.taskDescription && (
                      <div className="truncate max-w-[300px]">
                        任务：{item.taskDescription}
                      </div>
                    )}
                  </div>

                  {/* 审批信息（已处理状态） */}
                  {item.status !== 'pending' && (
                    <div className="border-t pt-3 space-y-1">
                      {item.approverName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          审批人：{item.approverName}
                        </div>
                      )}
                      {item.approvedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          审批时间：{format(new Date(item.approvedAt), 'yyyy-MM-dd HH:mm')}
                        </div>
                      )}
                      {item.rejectionReason && (
                        <div className="text-xs text-destructive">
                          驳回原因：{item.rejectionReason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 操作按钮（仅待审批状态） */}
                  {item.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="approval-btn-reject"
                        onClick={() => handleOpenReject(item)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        驳回
                      </Button>
                      <Button
                        size="sm"
                        data-testid="approval-btn-approve"
                        onClick={() => handleApprove(item)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        通过
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page}/{totalPages} 页，共 {total} 条
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 驳回原因弹窗 */}
      <RejectionReasonDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectTarget(null);
        }}
        onConfirm={handleConfirmReject}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
