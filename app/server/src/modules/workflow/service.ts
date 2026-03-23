// app/server/src/modules/workflow/service.ts
import { v4 as uuidv4 } from 'uuid';
import { WorkflowRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import {
  taskEvents,
  TaskEventType,
  type TaskPlanChangeRequestedEvent,
  type TaskPlanChangeApprovedEvent,
} from '../../core/events';
import type { User } from '../../core/types';
import type { PlanChange, DelayRecord, Notification, ApprovalStatus, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest } from './types';

export class WorkflowService {
  private repo = new WorkflowRepository();

  constructor() {
    // 订阅计划变更请求事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听计划变更请求事件
    taskEvents.on(
      TaskEventType.PLAN_CHANGE_REQUESTED,
      async (event: TaskPlanChangeRequestedEvent) => {
        try {
          await this.handlePlanChangeRequested(event);
        } catch (error) {
          console.error('处理计划变更请求事件失败:', error);
        }
      }
    );

    // 监听计划变更审批通过事件
    taskEvents.on(
      TaskEventType.PLAN_CHANGE_APPROVED,
      async (event: TaskPlanChangeApprovedEvent) => {
        try {
          await this.handlePlanChangeApproved(event);
        } catch (error) {
          console.error('处理计划变更审批通过事件失败:', error);
        }
      }
    );
  }

  /**
   * 处理计划变更请求事件
   */
  private async handlePlanChangeRequested(event: TaskPlanChangeRequestedEvent): Promise<void> {
    // 为每个变更字段创建审批记录
    for (const change of event.changes) {
      await this.repo.createPlanChange({
        id: uuidv4(),
        task_id: event.taskId,
        user_id: event.userId,
        change_type: change.field as 'start_date' | 'duration' | 'predecessor_id' | 'lag_days',
        old_value: change.oldValue != null ? String(change.oldValue) : null,
        new_value: change.newValue != null ? String(change.newValue) : null,
        reason: event.reason,
      });
    }

    // 更新任务的计划变更次数
    await this.repo.incrementTaskCounter(event.taskId, 'plan_change_count');
  }

  /**
   * 处理计划变更审批通过事件
   */
  private async handlePlanChangeApproved(event: TaskPlanChangeApprovedEvent): Promise<void> {
    // 批量更新任务字段
    const updates: Record<string, string | number | null> = {};
    for (const change of event.changes) {
      updates[change.field] = change.value as string | number | null;
    }

    await this.repo.updateTaskFields(event.taskId, updates);
  }

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

    // 更新审批记录状态
    await this.repo.approvePlanChange(id, currentUser.id, data.rejection_reason);

    if (data.approved) {
      // ========== 审批通过 ==========
      // 1. 应用变更到任务
      const updates: Record<string, string | number | null> = {};
      updates[change.change_type] = change.new_value;

      await this.repo.updateTaskFields(change.task_id, updates);

      // 2. 清除待审批数据
      await this.repo.clearPendingChanges(change.task_id);

      // 3. 发送通知
      await this.sendNotification(change.user_id, 'approval_result', '变更审批通过', `您的变更请求已通过审批`);

      // 4. 发出事件（触发级联更新等）
      taskEvents.emit(TaskEventType.PLAN_CHANGE_APPROVED, {
        planChangeId: id,
        taskId: change.task_id,
        approverId: currentUser.id,
        changes: [{
          field: change.change_type,
          value: change.new_value,
        }],
      } as TaskPlanChangeApprovedEvent);
    } else {
      // ========== 审批驳回 ==========
      // 1. 清除待审批数据
      await this.repo.clearPendingChanges(change.task_id);

      // 2. 更新任务状态为 rejected
      await this.repo.updateTaskStatus(change.task_id, 'rejected');

      // 3. 发送通知
      await this.sendNotification(
        change.user_id,
        'approval_result',
        '变更审批驳回',
        `您的变更请求已被驳回：${data.rejection_reason || '无原因'}`
      );
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

  /**
   * 获取任务的计划变更历史
   */
  async getPlanChangesByTaskId(taskId: string): Promise<PlanChange[]> {
    return this.repo.getPlanChangesByTask(taskId);
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

  /**
   * 检查审批超时（7天有效期）
   * 将超过7天的待审批项标记为timeout状态
   */
  async checkTimeoutApprovals(): Promise<number> {
    const timeoutCount = await this.repo.markTimeoutApprovals(7);

    // 发送超时通知给相关审批人
    if (timeoutCount > 0) {
      const timeoutApprovals = await this.repo.getTimeoutApprovals();
      for (const approval of timeoutApprovals) {
        // 通知申请人
        await this.sendNotification(
          approval.user_id,
          'approval_timeout',
          '审批请求超时',
          `您提交的变更请求因超过7天未审批已自动关闭`,
          `/tasks/${approval.task_id}`
        );
      }
    }

    return timeoutCount;
  }

  /**
   * 检查延期任务
   * 每日凌晨1点执行，检查所有已过截止日期但未完成的任务
   */
  async checkDelayedTasks(): Promise<{ delayedCount: number; warningCount: number }> {
    const now = new Date();

    // 1. 检查延期预警任务（在预警天数内）
    const warningTasks = await this.repo.getTasksNeedingWarning();
    let warningCount = 0;

    for (const task of warningTasks) {
      // 发送预警通知
      if (task.assignee_id) {
        await this.sendNotification(
          task.assignee_id,
          'delay_warning',
          '任务延期预警',
          `任务 "${task.description}" 即将到期，请注意进度`,
          `/tasks/${task.id}`
        );
      }
      warningCount++;
    }

    // 2. 检查已延期任务（超过截止日期）
    const delayedTasks = await this.repo.getDelayedTasks();
    let delayedCount = 0;

    for (const task of delayedTasks) {
      // 更新状态为delayed
      await this.repo.updateTaskStatus(task.id, 'delayed');

      // 累计延期次数
      await this.incrementDelayCount(task.id);

      // 发送延期通知
      if (task.assignee_id) {
        await this.sendNotification(
          task.assignee_id,
          'task_delayed',
          '任务已延期',
          `任务 "${task.description}" 已超过截止日期，请尽快处理`,
          `/tasks/${task.id}`
        );
      }

      // 通知项目经理
      const projectManagers = await this.repo.getProjectManagers(task.project_id);
      for (const manager of projectManagers) {
        await this.sendNotification(
          manager.id,
          'task_delayed',
          '项目任务延期提醒',
          `任务 "${task.description}" 已延期，负责人：${task.assignee_name || '未分配'}`,
          `/tasks/${task.id}`
        );
      }

      delayedCount++;
    }

    return { delayedCount, warningCount };
  }

  /**
   * 累计延期次数
   * 规则：
   * - 首次延期：延期次数+1
   * - 计划未刷新：不累加
   * - 刷新后再次超期：再+1
   */
  private async incrementDelayCount(taskId: string): Promise<{ incremented: boolean; reason: string }> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      return { incremented: false, reason: '任务不存在' };
    }

    const lastRefresh = task.last_plan_refresh_at ? new Date(task.last_plan_refresh_at) : null;

    // 判断是否可以累加延期次数
    if (lastRefresh) {
      // 检查上次刷新时间是否在今天之前
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (lastRefresh >= todayStart) {
        // 计划今天刷新过，不累加
        return { incremented: false, reason: '计划未刷新，不累加延期次数' };
      }
    }

    // 累加延期次数
    await this.repo.incrementTaskCounter(taskId, 'delay_count');
    return { incremented: true, reason: '延期次数已累加' };
  }

  /**
   * 发送每日任务摘要通知
   */
  async sendDailyTaskSummary(): Promise<void> {
    // 获取所有有活跃任务的用户
    const usersWithTasks = await this.repo.getUsersWithActiveTasks();

    for (const user of usersWithTasks) {
      const summary = await this.repo.getUserTaskSummary(user.id);

      if (summary.total > 0) {
        await this.sendNotification(
          user.id,
          'daily_summary',
          '每日任务摘要',
          `您有 ${summary.pending} 个待处理任务，${summary.inProgress} 个进行中任务，${summary.delayed} 个延期任务`,
          '/tasks'
        );
      }
    }
  }
}
