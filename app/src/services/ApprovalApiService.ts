/**
 * 任务审批 API 服务
 *
 * 与后端 TaskApprovalService 对应的前端服务
 * 处理任务创建和变更的审批流程
 */

import type { TaskApprovalRecord } from '@/types/wbs';

// ==================== 类型定义 ====================

export enum RequestType {
  CREATE_TASK = 'create_task',
  DATE_CHANGE = 'date_change'
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface CreateApprovalParams {
  taskId: string;
  taskTitle: string;
  requesterRole: string;
  requestType?: RequestType;
  changeBefore?: any;
  changeAfter?: any;
}

export interface ApprovalResponse {
  success: boolean;
  data?: TaskApprovalRecord;
  message?: string;
}

// ==================== 主服务类 ====================

class ApprovalApiService {
  private readonly baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/task-approvals';

  // 获取会话ID
  private getSessionId(): string | null {
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return null;

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);

      // 检查会话是否过期
      if (session.expiresAt) {
        const expiresAt = new Date(session.expiresAt).getTime();
        const now = Date.now();
        if (now > expiresAt) {
          // 会话已过期，清除并返回null
          localStorage.removeItem(activeUserKey);
          return null;
        }
      }

      return session.sessionId || null;
    } catch {
      return null;
    }
  }

  // 获取请求头
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const sessionId = this.getSessionId();
    if (sessionId) {
      (headers as any)['x-session-id'] = sessionId;
    }
    return headers;
  }

  /**
   * 创建审批记录
   */
  async createApproval(params: CreateApprovalParams): Promise<ApprovalResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params)
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 创建审批记录失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '创建审批记录失败'
      };
    }
  }

  /**
   * 审批通过
   */
  async approveApproval(recordId: string, comment?: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${recordId}/approve`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ comment })
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 审批通过失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '审批通过失败'
      };
    }
  }

  /**
   * 审批拒绝
   */
  async rejectApproval(recordId: string, comment?: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${recordId}/reject`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ comment })
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 审批拒绝失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '审批拒绝失败'
      };
    }
  }

  /**
   * 获取待审批列表
   */
  async getPendingApprovals(limit: number = 50): Promise<TaskApprovalRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pending?limit=${limit}`, {
        headers: this.getAuthHeaders()
      });

      const result: { success: boolean; data?: TaskApprovalRecord[] } = await response.json();

      if (result.success && result.data) {
        // 转换后端数据为前端格式
        return result.data.map(record => this.toFrontendRecord(record));
      }

      return [];
    } catch (error) {
      console.error('[ApprovalApiService] 获取待审批列表失败:', error);
      return [];
    }
  }

  /**
   * 获取任务的审批历史
   */
  async getTaskApprovalHistory(taskId: string): Promise<TaskApprovalRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
        headers: this.getAuthHeaders()
      });

      const result: { success: boolean; data?: any[] } = await response.json();

      if (result.success && result.data) {
        // 转换后端数据为前端格式
        return result.data.map(record => this.toFrontendRecord(record));
      }

      return [];
    } catch (error) {
      console.error('[ApprovalApiService] 获取任务审批历史失败:', error);
      return [];
    }
  }

  /**
   * 获取用户的审批请求
   */
  async getUserApprovalRequests(
    userId: string,
    status?: ApprovalStatus
  ): Promise<TaskApprovalRecord[]> {
    try {
      const url = status
        ? `${this.baseUrl}/user/${userId}?status=${status}`
        : `${this.baseUrl}/user/${userId}`;

      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });

      const result: { success: boolean; data?: any[] } = await response.json();

      if (result.success && result.data) {
        return result.data.map(record => this.toFrontendRecord(record));
      }

      return [];
    } catch (error) {
      console.error('[ApprovalApiService] 获取用户审批请求失败:', error);
      return [];
    }
  }

  /**
   * 获取审批统计
   */
  async getApprovalStats(): Promise<{ pending: number; approved: number; rejected: number; total: number } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: this.getAuthHeaders()
      });

      const result: { success: boolean; data?: any } = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('[ApprovalApiService] 获取审批统计失败:', error);
      return null;
    }
  }

  /**
   * 批量审批通过
   */
  async batchApprove(recordIds: string[], comment?: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/approve`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ recordIds, comment })
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 批量审批通过失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '批量审批通过失败'
      };
    }
  }

  /**
   * 批量拒绝
   */
  async batchReject(recordIds: string[], comment?: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/batch/reject`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ recordIds, comment })
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 批量拒绝失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '批量拒绝失败'
      };
    }
  }

  /**
   * 撤销审批请求
   */
  async withdrawApproval(recordId: string): Promise<ApprovalResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${recordId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const result: ApprovalResponse = await response.json();
      return result;
    } catch (error) {
      console.error('[ApprovalApiService] 撤销审批请求失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '撤销失败'
      };
    }
  }

  /**
   * 获取超时的待审批任务
   */
  async getOverdueApprovals(hours: number = 24): Promise<TaskApprovalRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/overdue?hours=${hours}`, {
        headers: this.getAuthHeaders()
      });

      const result: { success: boolean; data?: any[] } = await response.json();

      if (result.success && result.data) {
        return result.data.map(record => this.toFrontendRecord(record));
      }

      return [];
    } catch (error) {
      console.error('[ApprovalApiService] 获取超时任务失败:', error);
      return [];
    }
  }

  /**
   * 将后端记录转换为前端格式
   */
  private toFrontendRecord(backendRecord: any): TaskApprovalRecord {
    return {
      id: String(backendRecord.id),
      taskId: String(backendRecord.task_id),
      taskTitle: backendRecord.task_title,
      requester: String(backendRecord.requester_id),
      requesterName: backendRecord.requester_name,
      requesterRole: backendRecord.requester_role,
      requestDate: backendRecord.request_date,
      approvalStatus: backendRecord.approval_status,
      approver: backendRecord.approver_id ? String(backendRecord.approver_id) : undefined,
      approverName: backendRecord.approver_name,
      approvalDate: backendRecord.approval_date,
      approvalComment: backendRecord.approval_comment,
      createdAt: backendRecord.created_at
    };
  }

  /**
   * 监听审批记录变化（通过 WebSocket）
   */
  onApprovalChange(callback: (operation: 'create' | 'update' | 'delete', record: TaskApprovalRecord) => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'taskApprovalRecords' && e.newValue) {
        try {
          // 后端API不再使用localStorage，这里只是为了兼容旧代码
          // 实际应该通过 WebSocket 监听
        } catch (error) {
          console.error('[ApprovalApiService] 解析审批数据失败:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}

// 导出单例
export const approvalApiService = new ApprovalApiService();
