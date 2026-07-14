// app/server/src/modules/workflow/service.ts
import { v4 as uuidv4 } from 'uuid';
import { WorkflowRepository } from './repository';
import { OrgService } from '../org/service';
import { TaskService } from '../task/service';
import { ValidationError, ForbiddenError } from '../../core/errors';
import { sanitizeString } from '../../core/utils/sanitize';
import { sendToUser } from '../../core/realtime';
import { logger } from '../../core/logger';
import {
  taskEvents,
  TaskEventType,
  type TaskPlanChangeRequestedEvent,
  type TaskPlanChangeApprovedEvent,
} from '../../core/events';
import type { User } from '../../core/types';
import type { PlanChange, DelayRecord, Notification, ApprovalStatus, CreatePlanChangeRequest, ApprovalDecisionRequest, CreateDelayRecordRequest, CreateNotificationRequest, ApprovalItem, ApprovalItemsQueryOptions, ApprovalItemsResponse } from './types';

export class WorkflowService {
  private static listenersInitialized = false;
  private repo = new WorkflowRepository();
  private orgService = new OrgService();

  constructor() {
    // 仅在首次实例化时注册事件监听器，防止多实例导致重复处理
    if (!WorkflowService.listenersInitialized) {
      this.setupEventListeners();
      WorkflowService.listenersInitialized = true;
    }
  }

  /**
   * 查找审批人（兜底规则）
   * 顺序：直接主管 → 技术经理 → 部门经理 → 系统管理员
   */
  async findApprover(userId: number): Promise<User | null> {
    return this.orgService.findApprover(userId);
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
          logger.error('处理计划变更请求事件失败: %s', error instanceof Error ? error.message : String(error));
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
          logger.error('处理计划变更审批通过事件失败: %s', error instanceof Error ? error.message : String(error));
        }
      }
    );
  }

  /**
   * 处理计划变更请求事件
   *
   * 修复：事件处理器失败时不应清除 pending_changes，否则会导致：
   * 1. 任务状态为 pending_approval 但 pending_changes 为 null
   * 2. calculateStatus 返回错误状态
   * 3. 审批人收不到通知
   */
  private async handlePlanChangeRequested(event: TaskPlanChangeRequestedEvent): Promise<void> {
    // 获取任务信息（用于通知内容）
    const task = await this.repo.getTaskWithDates(event.taskId);

    // 前置检查：任务必须存在
    if (!task) {
      logger.error('任务不存在，无法处理计划变更请求: taskId=%s', event.taskId);
      return;
    }

    // XSS 防护：消毒变更原因
    const sanitizedReason = sanitizeString(event.reason, 1000);

    // 优先发送通知（确保审批人能收到，即使后续步骤失败）
    const approver = await this.findApprover(event.userId);
    if (approver) {
      const applicant = await this.repo.getUserById(event.userId);
      const applicantName = applicant?.real_name || '工程师';
      const projectName = task.project_id ? (await this.repo.getProjectName(task.project_id)) ?? '' : '';
      const taskDescription = task.description || '';

      const FIELD_LABELS: Record<string, string> = {
        start_date: '开始日期',
        duration: '工期',
        predecessor_id: '前置任务',
        lag_days: '提前/落后天数',
      };

      const changeDescription = event.changes
        .map(c => `${FIELD_LABELS[c.field] || c.field}: ${c.oldValue ?? '空'} → ${c.newValue ?? '空'}`)
        .join('，');

      const contextParts: string[] = [];
      if (projectName) contextParts.push(`项目：${projectName}`);
      if (taskDescription) contextParts.push(`任务：${taskDescription}`);

      const contentParts = [
        `${applicantName} 提交了计划变更请求`,
        ...contextParts.length > 0 ? contextParts : [],
        `变更内容：${changeDescription}`,
        `变更原因：${sanitizedReason}`,
      ];

      try {
        await this.sendNotification(
          approver.id,
          'approval',
          '待审批：计划变更请求',
          contentParts.join('\n'),
          `/settings/approvals`,
          task.project_id,
          event.taskId
        );
      } catch (notifyError) {
        logger.error('发送审批通知失败: %s', notifyError instanceof Error ? notifyError.message : String(notifyError));
        // 通知失败不阻断流程，继续创建审批记录
      }
    } else {
      logger.warn('未找到用户 %d 的审批人，审批通知未发送', event.userId);
    }

    // 为每个变更字段创建审批记录，记录失败的字段
    // P9: 使用事件中的 submission_id（如果有），否则生成新的
    const submissionId = event.submissionId || uuidv4();
    const failedFields: string[] = [];
    for (const change of event.changes) {
      try {
        // 跳过 new_value 为 null 的变更（如 predecessor_id 设为空，无法写入 NOT NULL 列）
        const newValue = change.newValue != null ? String(change.newValue) : null;
        if (newValue === null) {
          logger.warn('跳过 new_value 为 null 的变更 (task=%s, field=%s)', event.taskId, change.field);
          continue;
        }

        await this.repo.createPlanChange({
          id: uuidv4(),
          submission_id: submissionId,
          task_id: event.taskId,
          user_id: event.userId,
          change_type: change.field as 'start_date' | 'duration' | 'predecessor_id' | 'lag_days',
          old_value: change.oldValue != null ? String(change.oldValue) : null,
          new_value: newValue,
          reason: sanitizedReason,
        });
      } catch (createError) {
        failedFields.push(change.field);
        logger.error('创建审批记录失败 (task=%s, field=%s): %s',
          event.taskId, change.field, createError instanceof Error ? createError.message : String(createError));
      }
    }

    // 处理审批记录创建结果
    if (failedFields.length === event.changes.length) {
      // 所有审批记录都创建失败，回滚任务状态
      logger.error('所有审批记录创建失败 (task=%s)，回滚任务状态', event.taskId);
      await this.repo.clearPendingChanges(event.taskId);
      const rollbackStatus = task.actual_start_date ? 'in_progress' : 'not_started';
      await this.repo.updateTaskStatus(event.taskId, rollbackStatus);

      // 通知申请人失败
      try {
        await this.sendNotification(
          event.userId,
          'system',
          '审批请求提交失败',
          '您的计划变更请求提交失败，请联系管理员处理',
          `/tasks/${event.taskId}`,
          task.project_id,
          event.taskId
        );
      } catch (notifyError) {
        logger.error('发送失败通知失败: %s', notifyError instanceof Error ? notifyError.message : String(notifyError));
      }
    } else if (failedFields.length > 0) {
      logger.warn('部分审批记录创建失败 (task=%s, fields=%s)，审批人可能只能审批部分字段',
        event.taskId, failedFields.join(', '));
    }

    // 注意：计划变更次数已在 task/service.ts 的 updateTask 方法中更新，此处不再重复更新
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

  /**
   * 获取分组后的审批项列表
   */
  async getApprovalItems(options?: ApprovalItemsQueryOptions): Promise<ApprovalItemsResponse> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const { items, total } = await this.repo.getApprovalItems(options);
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

    // XSS 防护：消毒变更原因
    data.reason = sanitizeString(data.reason, 1000);

    const id = uuidv4();
    await this.repo.createPlanChange({ ...data, id, user_id: currentUser.id });

    return id;
  }

  private async getTaskById(taskId: string): Promise<{
    id: string;
    project_id: string;
    version: number;
    last_plan_refresh_at: Date | null;
    delay_count: number;
    end_date: Date | null;
    actual_start_date: Date | null;
  } | null> {
    // 从数据库获取完整的任务信息
    const task = await this.repo.getTaskWithDates(taskId);
    if (!task) {
      return null;
    }
    return {
      id: task.id,
      project_id: task.project_id,
      version: task.version || 1,
      last_plan_refresh_at: task.last_plan_refresh_at || null,
      delay_count: task.delay_count || 0,
      end_date: task.end_date || null,
      actual_start_date: task.actual_start_date || null,
    };
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
    // XSS 防护：消毒驳回原因
    if (data.rejection_reason) {
      data.rejection_reason = sanitizeString(data.rejection_reason, 1000);
    }
    await this.repo.approvePlanChange(id, currentUser.id, data.rejection_reason);

    if (data.approved) {
      // ========== 审批通过 ==========
      // 1. 应用变更到任务
      const updates: Record<string, string | number | null> = {};
      updates[change.change_type] = change.new_value;

      await this.repo.updateTaskFields(change.task_id, updates);

      // 2. 清除待审批数据
      await this.repo.clearPendingChanges(change.task_id);

      // 3. 获取完整任务信息，调用 calculateStatus 重新计算状态
      const approvedTask = await this.repo.getTaskWithDates(change.task_id);
      if (approvedTask) {
        const newStatus = TaskService.calculateStatus(approvedTask);
        await this.repo.updateTaskStatus(change.task_id, newStatus);
      }

      // 4. 发送通知
      await this.sendNotification(change.user_id, 'approval_result', '变更审批通过', `您的变更请求已通过审批`, `/tasks/${change.task_id}`, approvedTask?.project_id, change.task_id);

      // 5. 发出事件（触发级联更新，不再重复应用变更）
      taskEvents.emit(TaskEventType.PLAN_CHANGE_APPROVED, {
        planChangeId: id,
        taskId: change.task_id,
        approverId: currentUser.id,
        changes: [{
          field: change.change_type,
          value: change.new_value,
        }],
        alreadyApplied: true,
      } as TaskPlanChangeApprovedEvent);
    } else {
      // ========== 审批驳回 ==========
      // 1. 清除待审批数据
      await this.repo.clearPendingChanges(change.task_id);

      // 2. 获取完整任务信息，调用 calculateStatus 重新计算状态
      const rejectedTask = await this.repo.getTaskWithDates(change.task_id);
      if (rejectedTask) {
        const newStatus = TaskService.calculateStatus(rejectedTask);
        await this.repo.updateTaskStatus(change.task_id, newStatus);
      }

      // 3. 发送通知
      await this.sendNotification(
        change.user_id,
        'approval_result',
        '变更审批驳回',
        `您的变更请求已被驳回：${data.rejection_reason || '无原因'}`,
        `/tasks/${change.task_id}`,
        rejectedTask?.project_id,
        change.task_id
      );
    }
  }

  /**
   * 审批整个 submission（通过或驳回）
   */
  async approveSubmission(
    submissionId: string,
    data: ApprovalDecisionRequest,
    currentUser: User
  ): Promise<void> {
    // 获取 submission 详情
    const item = await this.repo.getApprovalItemBySubmissionId(submissionId);
    if (!item) {
      throw new ValidationError('审批请求不存在');
    }

    if (item.status !== 'pending') {
      throw new ValidationError('该审批请求已处理');
    }

    // 验证审批权限（复用现有逻辑：取第一条变更记录判断）
    const firstChange = await this.repo.getPlanChangeById(item.changes[0].id);
    if (!firstChange || !await this.canApprove(firstChange, currentUser)) {
      throw new ForbiddenError('无权限审批此变更');
    }

    // XSS 防护：消毒驳回原因
    if (data.rejection_reason) {
      data.rejection_reason = sanitizeString(data.rejection_reason, 1000);
    }

    // 批量更新状态
    await this.repo.approveSubmission(
      submissionId,
      currentUser.id,
      data.approved,
      data.rejection_reason
    );

    if (data.approved) {
      // ========== 审批通过 ==========
      // 1. 应用所有变更到任务
      const updates: Record<string, string | number | null> = {};
      for (const change of item.changes) {
        updates[change.change_type] = change.new_value;
      }
      await this.repo.updateTaskFields(item.taskId, updates);

      // 2. 清除待审批数据
      await this.repo.clearPendingChanges(item.taskId);

      // 3. 重新计算任务状态
      const approvedTask = await this.repo.getTaskWithDates(item.taskId);
      if (approvedTask) {
        const newStatus = TaskService.calculateStatus(approvedTask);
        await this.repo.updateTaskStatus(item.taskId, newStatus);
      }

      // 4. 发送通知
      const taskInfo = await this.repo.getTaskById(item.taskId);
      await this.sendNotification(
        item.userId,
        'approval_result',
        '变更审批通过',
        `您的变更请求已通过审批`,
        `/tasks/${item.taskId}`,
        taskInfo?.project_id,
        item.taskId
      );

      // 5. 发出事件
      taskEvents.emit(TaskEventType.PLAN_CHANGE_APPROVED, {
        planChangeId: submissionId,
        taskId: item.taskId,
        approverId: currentUser.id,
        changes: item.changes.map(c => ({
          field: c.change_type,
          value: c.new_value,
        })),
        alreadyApplied: true,
      } as TaskPlanChangeApprovedEvent);
    } else {
      // ========== 审批驳回 ==========
      // 1. 清除待审批数据
      await this.repo.clearPendingChanges(item.taskId);

      // 2. 重新计算任务状态
      const rejectedTask = await this.repo.getTaskWithDates(item.taskId);
      if (rejectedTask) {
        const newStatus = TaskService.calculateStatus(rejectedTask);
        await this.repo.updateTaskStatus(item.taskId, newStatus);
      }

      // 3. 发送通知
      const taskInfo = await this.repo.getTaskById(item.taskId);
      await this.sendNotification(
        item.userId,
        'approval_result',
        '变更审批驳回',
        `您的变更请求已被驳回：${data.rejection_reason || '无原因'}`,
        `/tasks/${item.taskId}`,
        taskInfo?.project_id,
        item.taskId
      );
    }
  }

  /**
   * 按 submission_id 获取审批项详情
   */
  async getApprovalItemBySubmissionId(submissionId: string): Promise<ApprovalItem | null> {
    return this.repo.getApprovalItemBySubmissionId(submissionId);
  }

  private async canApprove(change: PlanChange, user: User): Promise<boolean> {
    // 管理员可以审批所有
    if (user.role === 'admin') {
      return true;
    }
    // 技术经理可以审批本技术组下成员的变更
    if (user.role === 'tech_manager') {
      const approver = await this.orgService.findApprover(change.user_id);
      return approver?.id === user.id;
    }
    // 部门经理仅在技术组无技术经理时可审批（兜底）
    if (user.role === 'dept_manager') {
      const approver = await this.orgService.findApprover(change.user_id);
      return approver?.id === user.id;
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

    // XSS 防护：消毒延期原因
    data.reason = sanitizeString(data.reason, 1000);

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

  async deleteNotification(id: string, userId: number): Promise<void> {
    await this.repo.deleteNotification(id, userId);
  }

  async deleteNotifications(ids: string[], userId: number): Promise<number> {
    return this.repo.deleteNotifications(ids, userId);
  }

  async deleteAllReadNotifications(userId: number): Promise<number> {
    return this.repo.deleteAllReadNotifications(userId);
  }

  async sendNotification(
    userId: number,
    type: CreateNotificationRequest['type'],
    title: string,
    content: string,
    link?: string,
    projectId?: string | null,
    taskId?: string | null
  ): Promise<void> {
    // XSS 防护：消毒通知内容
    title = sanitizeString(title, 200);
    content = sanitizeString(content, 2000);

    const id = uuidv4();
    await this.repo.createNotification({ id, user_id: userId, type, title, content, link, project_id: projectId, task_id: taskId });

    // WebSocket 实时推送
    sendToUser(userId, 'notification', { id, type, title, content, link, project_id: projectId, task_id: taskId, is_read: false, created_at: new Date().toISOString() });
  }

  async sendNotificationsToUsers(
    userIds: number[],
    type: CreateNotificationRequest['type'],
    title: string,
    content: string,
    link?: string,
    projectId?: string | null,
    taskId?: string | null
  ): Promise<void> {
    // XSS 防护：消毒通知内容
    title = sanitizeString(title, 200);
    content = sanitizeString(content, 2000);

    await this.repo.createNotificationsForUsers(userIds, { type, title, content, link, project_id: projectId, task_id: taskId });

    // 批量 WebSocket 实时推送
    for (const userId of userIds) {
      sendToUser(userId, 'notification', { type, title, content, link, project_id: projectId, task_id: taskId, is_read: false, created_at: new Date().toISOString() });
    }
  }

  // ========== 定时任务 ==========

  /**
   * 检查审批超时（7天有效期）
   * 将超过7天的待审批项标记为timeout状态
   * 同时清除任务表中的 pending_changes 并恢复任务状态
   */
  async checkTimeoutApprovals(): Promise<number> {
    const timeoutCount = await this.repo.markTimeoutApprovals(7);

    // 发送超时通知给相关审批人
    if (timeoutCount > 0) {
      const timeoutApprovals = await this.repo.getTimeoutApprovals();
      for (const approval of timeoutApprovals) {
        // 清除任务的 pending_changes 并恢复状态
        await this.repo.clearPendingChanges(approval.task_id);

        // 获取任务信息，根据是否有实际开始日期决定恢复到哪个状态
        const task = await this.repo.getTaskById(approval.task_id);
        if (task) {
          // 与 approvePlanChange 保持一致：根据 actual_start_date 判断恢复状态
          const newStatus = task.actual_start_date ? 'in_progress' : 'not_started';
          await this.repo.updateTaskStatus(approval.task_id, newStatus);
        }

        // 通知申请人
        await this.sendNotification(
          approval.user_id,
          'approval_timeout',
          '审批请求超时',
          `您提交的变更请求因超过7天未审批已自动关闭`,
          `/tasks/${approval.task_id}`,
          task?.project_id,
          approval.task_id
        );
      }
    }

    return timeoutCount;
  }

  /**
   * 检查延期任务
   * 每日凌晨1点执行，检查所有已过截止日期但未完成的任务
   */
  async checkDelayedTasks(): Promise<{ delayedCount: number; warningCount: number; recoveredCount: number }> {
    const now = new Date();

    // 0. 检查需要从预警状态恢复的任务（截止日期被延长后脱离预警范围）
    const tasksToRecover = await this.repo.getTasksToRecoverFromWarning();
    let recoveredCount = 0;

    for (const task of tasksToRecover) {
      // 根据是否有实际开始日期决定恢复到哪个状态
      // 符合需求文档的状态判断规则
      const newStatus = task.actual_start_date ? 'in_progress' : 'not_started';
      await this.repo.updateTaskStatus(task.id, newStatus);
      recoveredCount++;
    }

    // 1. 检查延期预警任务（在预警天数内）
    // 根据需求文档：无实际完成日期且当前距离计划完成日期≤预警天数
    const warningTasks = await this.repo.getTasksNeedingWarning();
    let warningCount = 0;

    for (const task of warningTasks) {
      // 更新状态为 delay_warning
      await this.repo.updateTaskStatus(task.id, 'delay_warning');

      // 发送预警通知
      if (task.assignee_id) {
        await this.sendNotification(
          task.assignee_id,
          'delay_warning',
          '任务延期预警',
          `任务 "${task.description}" 即将到期，请注意进度`,
          `/tasks/${task.id}`,
          task.project_id,
          task.id
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

      // 延期事件：累加 delay_count + 自动写延期记录
      // （getDelayedTasks 已过滤 delayed 状态，此处均为「新延期事件」：首次延期或刷新计划恢复后再次超期）
      await this.repo.incrementTaskCounter(task.id, 'delay_count');
      const delayDays = task.end_date
        ? Math.max(1, Math.ceil((Date.now() - new Date(task.end_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
      await this.repo.createDelayRecord({
        id: uuidv4(),
        task_id: task.id,
        delay_days: delayDays,
        reason: '系统自动记录：任务超过截止日期',
        recorded_by: 1, // admin（系统自动记录，用户可在任务详情补充原因）
      });

      // 发送延期通知
      if (task.assignee_id) {
        await this.sendNotification(
          task.assignee_id,
          'task_delayed',
          '任务已延期',
          `任务 "${task.description}" 已超过截止日期，请尽快处理`,
          `/tasks/${task.id}`,
          task.project_id,
          task.id
        );
      }

      // 通知项目经理、技术经理、部门经理
      const projectManagers = await this.repo.getProjectManagers(task.project_id);
      for (const manager of projectManagers) {
        await this.sendNotification(
          manager.id,
          'task_delayed',
          '项目任务延期提醒',
          `任务 "${task.description}" 已延期，负责人：${task.assignee_name || '未分配'}`,
          `/tasks/${task.id}`,
          task.project_id,
          task.id
        );
      }

      delayedCount++;
    }

    return { delayedCount, warningCount, recoveredCount };
  }

  // 延期次数累加已内联至上方 checkDelayedTasks（每次新延期事件 +1 并写 delay_records）

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

