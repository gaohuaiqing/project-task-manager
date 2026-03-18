/**
 * 审批流程相关 Hooks
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { useState, useCallback } from 'react';
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

 interface ApprovalListParams {
  status?: 'pending' | 'approved' | 'rejected';
  type?: 'my_pending' | 'my_submitted';
  project_id?: string;
  page?: number;
    pageSize?: number;
  status?: 'pending' | 'approved' | 'rejected';
  type?: string;
  reason?: string;
  old_value?: string | null;
    new_value?: string;
    reason?: string
  rejection_reason?: string | null;
    approver_id?: number | null;
    approved_at?: string | null;
    rejection_reason?: string | null;
    is_timeout?: boolean;
    created_at?: string | null;
    task_description?: string | null;
    task_wbs_code?: string;
    project_name?: string;
    user_name?: string;
    approver_name?: string | null;
    days_pending?: number;
  }
}

export interface ChangeRecord {
  id: string;
  change_type: string;
  old_value: string | null;
  new_value: string;
  reason: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
    approved_at: string | null;
    user_name: string;
    approver_name: string | null;
}

export interface DelayRecord {
  id: string;
  delay_days: number;
  reason: string;
  created_at: string;
    recorder_name: string;
}

// ==================== 通用 API 请求 Hook ====================

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
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setState({ data: result.data, loading: false, error: null });
    return true;
  }

  setState((prev) => ({
      ...prev,
      loading: true,
      error: result.message || errorMessage
    }));
    return false;
  }, [execute, setState]);

  return { ...state, execute, setState };
}

 return { data, loading, error, fetchApprovals };
}

// ==================== Hooks ====================

/** 获取审批列表 */
export function useApprovals() {
  const { data, loading, error, fetchApprovals } = useAsyncRequest<ApprovalListResponse>();

  const fetchApprovals = useCallback(
    async (params: ApprovalListParams = {}) => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set('status', params.status);
      if (params.type) queryParams.set('type', params.type);
      if (params.project_id) queryParams.set('project_id', params.project_id);
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());

      await execute(
        () => apiService.request<ApprovalListResponse>(`/approvals?${queryParams.toString()}`),
        '获取审批列表失败'
      );
    },
    [execute]
  );

  return { data, loading, error, fetchApprovals };
}

 return { ...state, execute, setState };
}

 return { ...state, execute };
}

 return { ...state };
}

/** 通过审批 */
export function useApprove() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const approve = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.request<{ success: boolean; message: string }>(
        `/approvals/${id}/approve`,
        { method: 'POST' }
      );

      if (result.success) {
        setLoading(false);
        return true;
      }

      setError(result.message || '审批通过失败');
      setLoading(false);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批通过失败');
      setLoading(false);
      return false;
    }
  }, []);

  return { approve, loading, error };
}

 return { reject, loading, error };
}

 return { data, loading, error, fetchApprovals };
}

 return { data, loading, error, fetchDelays };
}
 return { data, loading, error, fetchChanges };
}

 return { data, loading, error, fetchDelays };
            </ Promise<boolean> => {
              await execute(
                () => apiService.request<{ success: boolean; data?: T }>(
                  `/approvals/task/${taskId}/changes`
              ),
              if (result.success) {
                setData(result.data);
              } else {
                setError('获取变更历史失败');
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : '获取变更历史失败');
            }
          });
        } })
    } catch (err) {
          setError(err instanceof Error ? err.message : '获取变更历史失败');
        }
      });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { data, loading, error, fetchChanges };

}

/** 获取任务延期记录 */
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
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { data, loading, error, fetchDelays };
}

 return { data, loading, error, fetchDelays };
            / Promise<boolean> => {
              await execute(
                () => apiService.request<{ success: boolean; data?: T }>(
                  `/approvals/task/${taskId}/delays`,
                  { method: 'POST', body: JSON.stringify({ reason }) }
                );

                if (result.success) {
                  setLoading(false);
                  return true;
                }

                setError(result.message || '添加延期原因失败');
                setLoading(false);
                return false;
              } catch (err) {
                setError(err instanceof Error ? err.message : '添加延期原因失败');
                setLoading(false);
                return false;
              }
            },
            }, []);
          }

 { addReason, loading, error };
          } return { addReason, loading, error };
          } catch (err) {
            setError(err instanceof Error ? err.message : '添加延期原因失败')
          }
        } finally {
          setLoading(false);
        }
      },
      [taskId]
    );
  return { addReason, loading, error };
}
