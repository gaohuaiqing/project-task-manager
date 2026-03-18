/**
 * 审批列表组件
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCwIcon, FilterIcon } from 'lucide-react';
import {
  useApprovals,
  useApprove,
  useReject,
  type ApprovalItem
} from './hooks/useApprovals';
import ApprovalCard from './ApprovalCard';

// ==================== 类型定义 ====================

type ListType = 'my_pending' | 'my_submitted';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

// ==================== 辅助组件 ====================

/** 统计卡片 */
function StatCard({
  value,
  label,
  variant = 'default'
}: {
  value: number;
  label: string;
  variant?: 'default' | 'blue' | 'red';
}) {
  const colorClass = {
    default: '',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    red: 'bg-red-50 border-red-100 text-red-600'
  }[variant];

  return (
    <div className={`p-4 rounded-lg border ${colorClass}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// ==================== 主组件 ====================

const ApprovalList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ListType>('my_pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, loading, error, fetchApprovals } = useApprovals();
  const { approve: approveMutation } = useApprove();
  const { reject: rejectMutation } = useReject();

  /** 刷新列表 */
  const refreshList = useCallback(() => {
    fetchApprovals({
      type: activeTab,
      status: statusFilter === 'all' ? undefined : statusFilter,
      page,
      pageSize
    });
  }, [activeTab, statusFilter, page, fetchApprovals]);

  // 初始加载及筛选变化
  useEffect(() => {
    refreshList();
  }, [refreshList]);

  /** 处理审批通过 */
  const handleApprove = async (id: string): Promise<boolean> => {
    const success = await approveMutation(id);
    if (success) {
      await refreshList();
    }
    return success;
  };

  /** 处理审批驳回 */
  const handleReject = async (id: string, reason: string): Promise<boolean> => {
    const success = await rejectMutation(id, reason);
    if (success) {
      await refreshList();
    }
    return success;
  };

  /** Tab 切换处理 */
  const handleTabChange = (value: string) => {
    setActiveTab(value as ListType);
    setPage(1);
  };

  /** 状态筛选处理 */
  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  return (
    <div className="space-y-4 p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">审批管理</h1>
        <Button variant="outline" size="sm" onClick={refreshList} disabled={loading}>
          <RefreshCwIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计栏 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={data?.stats?.pending ?? 0} label="待审批" variant="blue" />
        <StatCard value={data?.stats?.timeout ?? 0} label="超时" variant="red" />
        <StatCard value={data?.stats?.total ?? 0} label="总计" />
      </div>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="my_pending" className="flex items-center gap-2">
              待我审批
              {data?.stats?.pending ? <Badge>{data.stats.pending}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="my_submitted">我发起的</TabsTrigger>
          </TabsList>

          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审批</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {/* 加载中 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
              <Button variant="outline" className="mt-2" onClick={refreshList}>
                重试
              </Button>
            </div>
          )}

          {/* 审批列表 */}
          {!loading && !error && (
            <div className="space-y-3">
              {data?.data?.map((approval: ApprovalItem) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}

              {/* 空状态 */}
              {data?.data?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  暂无审批记录
                </div>
              )}

              {/* 分页 */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {data.pagination.totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApprovalList;
