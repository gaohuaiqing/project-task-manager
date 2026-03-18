// app/server/src/modules/workflow/service.ts
import { v4 as uuidv4 } from 'uuid';
import { WorkflowRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type { PlanChange, DelayRecord, Notification, ApprovalStatus, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest } from './types';

export class WorkflowService {
  private repo = new WorkflowRepository();

  // ========== 计划变更管理 ==========

  async getPlanChanges(options?: {
    status?: ApprovalStatus;
    user_id?: number;
    approver_id?: number;
    project_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: PlanChange[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const { items, total } = await this.repo.getPlanChanges(options);
    const totalPages = Math.ceil(total / pageSize);
    return { items, total, page, pageSize, totalPages };
  }

  async getPlanChangeById(id: string): Promise<PlanChange | null> {
    return this.repo.getPlanChangeById(id);
  }

  async createPlanChange(data: CreatePlanChangeRequest, currentUser: User): Promise<string> {
    // 验证任务存在
    const task = await this.getTaskById(data.task_id);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 验证变更原因
    if (!data.reason || data.reason.trim() === '') {
      throw new ValidationError('变更原因不能为空');
    }

    const id = uuidv4();
    await this.repo.createPlanChange({ ...data, id, user_id: currentUser.id });

    return id;
  }

  private async getTaskById(taskId: string): Promise<{ id: string } | null> {
    // 简化实现，实际应该注入 TaskRepository
    return { id: taskId };
  }

  async approvePlanChange(id: string, data: ApprovalDecisionRequest, currentUser: User): Promise<void> {
    const change = await this.repo.getPlanChangeById(id);
    if (!change) {
      throw new ValidationError('变更请求不存在');
    }

    if (change.status !== 'pending') {
      throw new ValidationError('该变更请求已处理');
    }

    // 验证审批权限
    if (!await this.canApprove(change, currentUser)) {
      throw new ForbiddenError('无权限审批此变更');
    }

    await this.repo.approvePlanChange(id, currentUser.id, data.rejection_reason);

    // 发送通知
    if (data.approved) {
      await this.sendNotification(change.user_id, 'approval_result', '变更审批通过', `您的变更请求已通过审批`);
    } else {
      await this.sendNotification(change.user_id, 'approval_result', '变更审批驳回', `您的变更请求已被驳回：${data.rejection_reason}`);
    }
  }

  private async canApprove(change: PlanChange, user: User): Promise<boolean> {
    // 管理员和技术经理可以审批
    if (user.role === 'admin' || user.role === 'tech_manager') {
      return true;
    }
    // 部门经理可以审批本部门成员的变更
    if (user.role === 'dept_manager') {
      // 简化实现，实际应该检查组织架构
      return true;
    }
    return false;
  }

  async getPendingApprovals(currentUser: User): Promise<PlanChange[]> {
    return this.repo.getPendingApprovalsForUser(currentUser.id);
  }

  // ========== 延期记录管理 ==========

  async getDelayRecords(taskId: string): Promise<DelayRecord[]> {
    return this.repo.getDelayRecords(taskId);
  }

  async addDelayRecord(taskId: string, data: CreateDelayRecordRequest, currentUser: User): Promise<string> {
    if (!data.reason || data.reason.trim() === '') {
      throw new ValidationError('延期原因不能为空');
    }

    const id = uuidv4();
    await this.repo.createDelayRecord({
      ...data,
      id,
      task_id: taskId,
      recorded_by: currentUser.id,
    });

    return id;
  }

  // ========== 通知管理 ==========

  async getNotifications(userId: number, options?: { unreadOnly?: boolean; page?: number; pageSize?: number }): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const { items, total } = await this.repo.getNotifications(userId, options);

    // 获取未读数量
    const { total: unreadCount } = await this.repo.getNotifications(userId, { unreadOnly: true, pageSize: 1000 });

    return { items, total, unreadCount };
  }

  async markNotificationAsRead(id: string, userId: number): Promise<void> {
    await this.repo.markNotificationAsRead(id);
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    return this.repo.markAllNotificationsAsRead(userId);
  }

  async sendNotification(userId: number, type: CreateNotificationRequest['type'], title: string, content: string, link?: string): Promise<void> {
    const id = uuidv4();
    await this.repo.createNotification({ id, user_id: userId, type, title, content, link });
  }

  async sendNotificationsToUsers(userIds: number[], type: CreateNotificationRequest['type'], title: string, content: string, link?: string): Promise<void> {
    await this.repo.createNotificationsForUsers(userIds, { type, title, content, link });
  }

  // ========== 定时任务 ==========

  async checkTimeoutApprovals(): Promise<number> {
    // 检查超过7天的待审批项，标记超时
    // 简化实现
    return 0;
  }

  async checkDelayedTasks(): Promise<void> {
    // 检查延期任务，更新状态
    // 简化实现
  }
}
