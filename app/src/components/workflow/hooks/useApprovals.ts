/**
 * 审批流程相关 Hooks
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { useState, useCallback, useMemo } from 'react';
import { apiService } from '@/services/ApiService';

// ==================== 类型定义 ====================

export interface ApprovalItem {
  id: string;
  task_id: string;
  user_id: number;
  change_type: 'start_date' | 'end_date' | 'duration' | 'predecessor_id' | 'lag_days';
  old_value: string | null;
  new_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_id: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  is_timeout: boolean;
  created_at: string;
  task_description: string;
  task_wbs_code: string;
  project_name: string;
  user_name: string;
  approver_name: string | null;
  days_pending: number;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  timeout: number;
}

export interface ApprovalListResponse {
  success: boolean;
  data: ApprovalItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: ApprovalStats;
}

export interface ApprovalListParams {
  status?: 'pending' | 'approved' | 'rejected';
  type?: 'my_pending' | 'my_submitted';
  project_id?: string;
  page?: number;
  pageSize?: number;
}

export interface DelayRecord {
  id: number;
  task_id: string;
  delay_days: number;
  reason: string;
  recorded_by: number;
  recorder_name: string;
  created_at: string;
}

// ==================== 通用异步请求 Hook ====================

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsyncRequest<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    request: () => Promise<{ success: boolean; data?: T; message?: string }>,
    errorMessage: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await request();

      if (result.success && result.data !== undefined) {
        setState({ data: result.data, loading: false, error: null });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.message || errorMessage
        }));
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage;
      setState(prev => ({ ...prev, loading: false, error: message }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// ==================== 审批列表 Hook ====================

export function useApprovals(initialParams?: ApprovalListParams) {
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [stats, setStats] = useState<ApprovalStats>({ total: 0, pending: 0, timeout: 0 });

  const fetchApprovals = useCallback(async (params: ApprovalListParams = {}) => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set('status', params.status);
    if (params.type) queryParams.set('type', params.type);
    if (params.project_id) queryParams.set('project_id', params.project_id);
    queryParams.set('page', String(params.page || 1));
    queryParams.set('pageSize', String(params.pageSize || 20));

    try {
      const result = await apiService.request<ApprovalListResponse>(
        `/approvals?${queryParams.toString()}`
      );

      if (result.success) {
        setData(result.data);
        setPagination(result.pagination);
        setStats(result.stats);
      } else {
        setError('获取审批列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取审批列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useMemo(() => {
    if (initialParams) {
      fetchApprovals(initialParams);
    }
  }, []);

  const refreshList = useCallback(() => {
    fetchApprovals({ ...initialParams, page: pagination.page, pageSize: pagination.pageSize });
  }, [fetchApprovals, initialParams, pagination.page, pagination.pageSize]);

  return {
    data,
    loading,
    error,
    pagination,
    stats,
    fetchApprovals,
    refreshList
  };
}

// ==================== 审批操作 Hook ====================

export function useApprove() {
  const { data, loading, error, execute, reset } = useAsyncRequest<{ approval_id: string; task_id: string }>();

  const approve = useCallback(async (approvalId: string): Promise<boolean> => {
    return execute(
      () => apiService.request<{ success: boolean; data?: { approval_id: string; task_id: string }; message?: string }>(
        `/approvals/${approvalId}/approve`,
        { method: 'POST' }
      ),
      '审批通过失败'
    );
  }, [execute]);

  return { approve, loading, error, success: !!data, reset };
}

export function useReject() {
  const { data, loading, error, execute, reset } = useAsyncRequest<{ approval_id: string; task_id: string }>();

  const reject = useCallback(async (approvalId: string, reason: string): Promise<boolean> => {
    return execute(
      () => apiService.request<{ success: boolean; data?: { approval_id: string; task_id: string }; message?: string }>(
        `/approvals/${approvalId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ rejection_reason: reason })
        }
      ),
      '审批驳回失败'
    );
  }, [execute]);

  return { reject, loading, error, success: !!data, reset };
}

// ==================== 变更历史 Hook ====================

export function useTaskChanges(taskId: string | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChanges = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.request<{ success: boolean; data: Record<string, unknown>[] }>(
        `/approvals/task/${taskId}/changes`
      );

      if (result.success) {
        setData(result.data);
      } else {
        setError('获取变更历史失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取变更历史失败');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { data, loading, error, fetchChanges };
}

// ==================== 延期记录 Hook ====================

export function useDelayRecords(taskId: string | null) {
  const [data, setData] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDelays = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.request<{ success: boolean; data: DelayRecord[] }>(
        `/approvals/task/${taskId}/delays`
      );

      if (result.success) {
        setData(result.data);
      } else {
        setError('获取延期记录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取延期记录失败');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { data, loading, error, fetchDelays };
}

export function useAddDelayReason() {
  const { data, loading, error, execute, reset } = useAsyncRequest<{ delay_days: number }>();

  const addReason = useCallback(async (taskId: string, reason: string): Promise<boolean> => {
    return execute(
      () => apiService.request<{ success: boolean; data?: { delay_days: number }; message?: string }>(
        `/approvals/task/${taskId}/delays`,
        {
          method: 'POST',
          body: JSON.stringify({ reason })
        }
      ),
      '添加延期原因失败'
    );
  }, [execute]);

  return { addReason, loading, error, success: !!data, reset };
}
