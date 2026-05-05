/**
 * 审批管理页面
 * 管理角色（admin/dept_manager/tech_manager）查看和操作计划变更审批
 */
import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useApprovalItems,
  useApproveApprovalItem,
  useRejectApprovalItem,
} from '../hooks/useApprovals';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useMembers } from '@/features/org/hooks/useOrg';
import { ApprovalsTable } from '../components/ApprovalsTable';
import { ApprovalDetailDialog } from '../components/ApprovalDetailDialog';
import { RejectionReasonDialog } from '../components/RejectionReasonDialog';
import type { ApprovalStatus, ApprovalItem } from '@/lib/api/workflow.api';

export function ApprovalsSettings() {
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 详情弹窗状态
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 驳回弹窗状态
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // 正在处理的审批项 ID（用于显示加载状态）
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 查询数据
  const { data, isLoading } = useApprovalItems({
    status: statusFilter === 'all' ? undefined : statusFilter,
    projectId: projectFilter === 'all' ? undefined : projectFilter,
    userId: userFilter === 'all' ? undefined : Number(userFilter),
    page,
    pageSize,
  });
  const { data: projectsData } = useProjects({ pageSize: 100 });
  const { data: membersData } = useMembers({ pageSize: 200, status: 'active' });

  // Mutations
  const approveMutation = useApproveApprovalItem();
  const rejectMutation = useRejectApprovalItem();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const projects = projectsData?.items ?? [];
  const members = membersData?.items ?? [];

  // 审批通过
  const handleApprove = useCallback(
    (submissionId: string) => {
      setProcessingId(submissionId);
      approveMutation.mutate(submissionId, {
        onSettled: () => setProcessingId(null),
      });
    },
    [approveMutation],
  );

  // 打开驳回弹窗
  const handleOpenReject = useCallback((item: ApprovalItem) => {
    setRejectTarget(item);
    setRejectDialogOpen(true);
  }, []);

  // 确认驳回
  const handleConfirmReject = useCallback(
    (reason: string) => {
      if (rejectTarget) {
        setProcessingId(rejectTarget.submissionId);
        rejectMutation.mutate(
          { submissionId: rejectTarget.submissionId, reason },
          {
            onSuccess: () => {
              setRejectDialogOpen(false);
              setRejectTarget(null);
            },
            onSettled: () => setProcessingId(null),
          },
        );
      }
    },
    [rejectTarget, rejectMutation],
  );

  // 查看详情
  const handleViewDetail = useCallback((item: ApprovalItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  }, []);

  // 状态筛选变化时重置页码
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as ApprovalStatus | 'all');
    setPage(1);
  };

  const handleProjectChange = (value: string) => {
    setProjectFilter(value);
    setPage(1);
  };

  const handleUserChange = (value: string) => {
    setUserFilter(value);
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

        <Select value={userFilter} onValueChange={handleUserChange}>
          <SelectTrigger className="w-[140px]" data-testid="approval-filter-user">
            <SelectValue placeholder="全部申请人" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部申请人</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
        </div>
      </div>

      {/* 表格区域 */}
      <ApprovalsTable
        items={items}
        onApprove={handleApprove}
        onReject={handleOpenReject}
        onViewDetail={handleViewDetail}
        approvingId={approveMutation.isPending ? processingId ?? undefined : undefined}
        rejectingId={rejectMutation.isPending ? processingId ?? undefined : undefined}
        isLoading={isLoading}
      />

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

      {/* 详情弹窗 */}
      <ApprovalDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
      />

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
