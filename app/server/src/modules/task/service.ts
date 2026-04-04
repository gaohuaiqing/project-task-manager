// app/server/src/modules/task/service.ts
import { v4 as uuidv4 } from 'uuid';
import { TaskRepository } from './repository';
import { ProjectRepository } from '../project/repository';
import { AuthRepository } from '../auth/repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import { audit } from '../../core/audit';

/**
 * 将 Date 对象格式化为本地日期字符串 YYYY-MM-DD
 * 避免使用 toISOString() 导致 UTC 时区偏移问题
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
import {
  calculateEndDate,
  calculateStartDateFromPredecessor,
  calculateStartDateForDependency,
  getWorkingDaysBetween,
  detectCycleDependency,
  recalculateTaskDates,
  type DependencyType,
} from '../../core/utils/workingDays';
import {
  taskEvents,
  TaskEventType,
  emitTaskUpdated,
  emitPlanChangeRequested,
  type TaskUpdatedEvent,
} from '../../core/events';
import type { User } from '../../core/types';
import type { TaskStatus, WBSTask, WBSTaskListItem, CreateTaskRequest, UpdateTaskRequest, TaskQueryOptions, ProgressRecord } from './types';

/** WBS层级最大值 */
const MAX_WBS_LEVEL = 10;

/** 级联更新最大深度（防止无限递归） */
const MAX_CASCADE_DEPTH = 10;

/**
 * 计算计划周期（日历天数）
 * 公式：结束日期 - 开始日期 + 1
 */
function calculatePlannedDuration(startDate: Date | null, endDate: Date | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : null;
}

/**
 * 计算实际周期（日历天数）
 * 公式：实际结束日期 - 实际开始日期 + 1
 */
function calculateActualCycle(actualStartDate: Date | null, actualEndDate: Date | null): number | null {
  if (!actualStartDate || !actualEndDate) return null;
  const start = new Date(actualStartDate);
  const end = new Date(actualEndDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : null;
}

export class TaskService {
  private repo = new TaskRepository();
  private projectRepo = new ProjectRepository();
  private authRepo = new AuthRepository();

  constructor() {
    // 订阅任务更新事件（级联更新）
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听任务更新事件（级联更新）
    taskEvents.on(TaskEventType.TASK_UPDATED, async (event: TaskUpdatedEvent) => {
      if (event.cascadeUpdate && (event.cascadeDepth || 0) < MAX_CASCADE_DEPTH) {
        try {
          await this.cascadeUpdateSuccessorTasks(event.taskId, event.cascadeDepth || 0);
        } catch (error) {
          console.error('级联更新后续任务失败:', error);
        }
      }
    });

    // 监听审批通过事件（重新计算任务状态和日期）
    taskEvents.on(TaskEventType.PLAN_CHANGE_APPROVED, async (event: import('../../core/events').TaskPlanChangeApprovedEvent) => {
      try {
        // 1. 获取任务
        const task = await this.repo.getTaskById(event.taskId);
        if (!task) return;

        // 2. 如果修改了影响日期的字段，重新计算日期
        const dateFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];
        const hasDateChanges = event.changes.some(c => dateFields.includes(c.field));

        if (hasDateChanges) {
          // 获取更新后的任务数据
          const updatedTask = await this.repo.getTaskById(event.taskId);
          if (updatedTask) {
            // 重新计算结束日期等
            const recalcData = await this.recalculateDates(updatedTask, {} as any);
            await this.repo.updateTask(event.taskId, {
              ...recalcData,
              version: updatedTask.version,
            } as any);
          }
        }

        // 3. 重新计算任务状态
        await this.recalculateTaskStatus(event.taskId);

        // 4. 触发级联更新（如果有日期变更）
        if (hasDateChanges) {
          emitTaskUpdated({
            taskId: event.taskId,
            changes: Object.fromEntries(event.changes.map(c => [c.field, c.value])),
            cascadeUpdate: true,
            cascadeDepth: 0,
          });
        }
      } catch (error) {
        console.error('处理审批通过事件失败:', error);
      }
    });
  }

  /**
   * 级联更新后续任务
   * 当前置任务变更时，自动重新计算后续任务的日期
   * 支持4种依赖类型：FS(完成-开始), SS(开始-开始), FF(完成-完成), SF(开始-完成)
   */
  private async cascadeUpdateSuccessorTasks(taskId: string, currentDepth: number): Promise<void> {
    // 获取后续任务（包含依赖类型）
    const successorTasks = await this.repo.getSuccessorTasks(taskId);

    if (successorTasks.length === 0) {
      return;
    }

    // 获取当前任务（作为前置任务）
    const predecessorTask = await this.repo.getTaskById(taskId);
    if (!predecessorTask || !predecessorTask.start_date) {
      return;
    }

    // 逐个更新后续任务
    for (const successor of successorTasks) {
      // 获取依赖类型，默认为 FS
      const dependencyType = ((successor as any).dependency_type || 'FS') as DependencyType;
      const duration = successor.duration || 1;

      // P0修复：使用支持4种依赖类型的日期计算方法
      const newStartDate = await calculateStartDateForDependency(
        predecessorTask.start_date,
        predecessorTask.end_date || predecessorTask.start_date,
        dependencyType,
        successor.lag_days || 0,
        duration,
        successor.is_six_day_week
      );

      // 计算新的结束日期
      const newEndDate = await calculateEndDate(newStartDate, duration, successor.is_six_day_week);

      // 更新任务日期
      await this.repo.updateTaskDates(successor.id, {
        start_date: formatLocalDate(newStartDate),
        end_date: formatLocalDate(newEndDate),
      });

      // 递归触发后续任务的级联更新
      emitTaskUpdated({
        taskId: successor.id,
        changes: {
          start_date: newStartDate,
          end_date: newEndDate,
        },
        cascadeUpdate: true,
        cascadeDepth: currentDepth + 1,
      });
    }
  }

  // ========== 任务管理 ==========

  async getTasks(options: TaskQueryOptions): Promise<{ items: WBSTaskListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const { items, total } = await this.repo.getTasks(options);
    const totalPages = Math.ceil(total / pageSize);

    // 实时计算每个任务的状态（符合需求文档：状态应该实时判断）
    const itemsWithComputedStatus = items.map(item => ({
      ...item,
      computed_status: this.calculateStatus(item as any),
    }));

    // 构建树形结构
    const tree = this.buildTaskTree(itemsWithComputedStatus);

    return { items: tree, total, page, pageSize, totalPages };
  }

  private buildTaskTree(tasks: WBSTaskListItem[]): WBSTaskListItem[] {
    const map = new Map<string, WBSTaskListItem>();
    const roots: WBSTaskListItem[] = [];

    // 创建映射
    tasks.forEach(t => {
      map.set(t.id, { ...t, children: [] });
    });

    // 构建树
    tasks.forEach(t => {
      const node = map.get(t.id)!;
      if (t.parent_id && map.has(t.parent_id)) {
        map.get(t.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getTaskById(id: string): Promise<WBSTask | null> {
    const task = await this.repo.getTaskById(id);
    if (!task) return null;

    // 实时计算状态（符合需求文档：状态应该实时判断）
    return {
      ...task,
      computed_status: this.calculateStatus(task),
    };
  }

  /**
   * 根据WBS编码获取任务
   */
  async getTaskByWbsCode(projectId: string, wbsCode: string): Promise<WBSTask | null> {
    return this.repo.getTaskByWbsCode(projectId, wbsCode);
  }

  async createTask(data: CreateTaskRequest, currentUser: User): Promise<string> {
    // 验证权限 - admin/tech_manager/dept_manager/engineer 都可以创建任务
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager' && currentUser.role !== 'engineer') {
      throw new ForbiddenError('无权限创建任务');
    }

    // 工程师只能创建子任务（在已分配给自己的任务下）
    if (currentUser.role === 'engineer') {
      // 1. 不能创建根任务
      if (!data.parent_id) {
        throw new ForbiddenError('工程师只能创建子任务，请选择父任务');
      }

      // 2. 父任务必须已分配给自己
      const parentTask = await this.repo.getTaskById(data.parent_id);
      if (!parentTask) {
        throw new ValidationError('父任务不存在');
      }
      if (parentTask.assignee_id !== currentUser.id) {
        throw new ForbiddenError('只能在自己负责的任务下创建子任务');
      }
    }

    // 验证必填字段
    if (!data.project_id) {
      throw new ValidationError('请选择所属项目');
    }

    if (!data.description) {
      throw new ValidationError('任务描述不能为空');
    }

    // P1修复：日期验证规则
    // 工期必须大于0
    if (data.duration !== undefined && data.duration !== null && data.duration <= 0) {
      throw new ValidationError('工期必须大于0');
    }

    // 项目成员验证（非管理员需要是项目成员）
    if (currentUser.role !== 'admin') {
      const isMember = await this.projectRepo.isProjectMember(data.project_id, currentUser.id);
      if (!isMember) {
        throw new ForbiddenError('您不是该项目的成员，无权限创建任务');
      }
    }

    // 生成WBS编码
    const wbsCode = await this.repo.getNextWbsCode(data.project_id, data.parent_id || null);

    // 计算WBS等级
    let wbsLevel = 1;
    let isSixDayWeek = data.is_six_day_week ?? false;
    if (data.parent_id) {
      const parent = await this.repo.getTaskById(data.parent_id);
      if (parent) {
        wbsLevel = parent.wbs_level + 1;
        // 验证WBS层级上限
        if (wbsLevel > MAX_WBS_LEVEL) {
          throw new ValidationError(`WBS层级不能超过${MAX_WBS_LEVEL}级`);
        }
        // 子任务继承父任务属性
        if (!data.task_type) {
          data.task_type = parent.task_type;
        }
        isSixDayWeek = parent.is_six_day_week;
      }
    }

    // 计算日期
    let startDate: Date;
    let endDate: Date;
    const duration = data.duration || 1;

    if (data.predecessor_id && data.start_date) {
      // 同时有前置任务和开始日期，以前置任务为准
      const predecessor = await this.repo.getTaskById(data.predecessor_id);
      if (predecessor && predecessor.end_date) {
        startDate = await calculateStartDateFromPredecessor(
          predecessor.end_date,
          data.lag_days || 0,
          isSixDayWeek
        );
      } else {
        startDate = new Date(data.start_date);
      }
    } else if (data.predecessor_id) {
      // 只有前置任务
      const predecessor = await this.repo.getTaskById(data.predecessor_id);
      if (predecessor && predecessor.end_date) {
        startDate = await calculateStartDateFromPredecessor(
          predecessor.end_date,
          data.lag_days || 0,
          isSixDayWeek
        );
      } else {
        startDate = new Date();
      }
    } else if (data.start_date) {
      // 只有开始日期
      startDate = new Date(data.start_date);
    } else {
      // 默认今天
      startDate = new Date();
    }

    // 计算结束日期
    endDate = await calculateEndDate(startDate, duration, isSixDayWeek);

    // 计算计划周期（日历天数）
    const plannedDuration = calculatePlannedDuration(startDate, endDate);

    const id = uuidv4();
    const status: TaskStatus = 'not_started';

    await this.repo.createTask({
      ...data,
      id,
      wbs_code: wbsCode,
      wbs_level: wbsLevel,
      status,
      is_six_day_week: isSixDayWeek,
      planned_duration: plannedDuration ?? undefined,
      start_date: formatLocalDate(startDate),
      end_date: formatLocalDate(endDate),
    });

    // 🆕 自动创建第一条进展记录（记录任务创建时间）
    const initialInfo = [
      `WBS编码: ${wbsCode}`,
      `工期: ${duration}天`,
      data.start_date ? `计划开始: ${formatLocalDate(startDate)}` : null,
    ].filter(Boolean).join('，');

    await this.repo.createProgressRecord({
      id: uuidv4(),
      task_id: id,
      content: `📝 任务创建。${initialInfo}`,
      recorded_by: currentUser.id,
    });

    // 进展记录计数 +1
    await this.repo.incrementTaskCounter(id, 'progress_record_count');

    return id;
  }

  async updateTask(id: string, data: UpdateTaskRequest, currentUser: User): Promise<{ updated: boolean; conflict: boolean; needsApproval: boolean }> {
    const task = await this.repo.getTaskById(id);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 项目成员验证（非管理员需要是项目成员）
    if (currentUser.role !== 'admin') {
      const isMember = await this.projectRepo.isProjectMember(task.project_id, currentUser.id);
      if (!isMember) {
        throw new ForbiddenError('您不是该项目的成员，无权限修改任务');
      }
    }

    // P0修复：工程师编辑限制 - 工程师只能编辑自己负责的任务
    if (currentUser.role === 'engineer' && task.assignee_id !== currentUser.id) {
      throw new ForbiddenError('工程师只能编辑自己负责的任务');
    }

    // P0修复：TASK_ASSIGN 权限检查 - 工程师不能修改任务负责人
    if (data.assignee_id !== undefined && data.assignee_id !== task.assignee_id) {
      if (currentUser.role === 'engineer') {
        throw new ForbiddenError('工程师无权分配任务给其他人');
      }
    }

    // 验证不能将任务自身作为前置任务
    if (data.predecessor_id && data.predecessor_id === id) {
      throw new ValidationError('不能将任务自身作为前置任务');
    }

    // P1修复：日期验证规则
    // 工期必须大于0
    if (data.duration !== undefined && data.duration !== null && data.duration <= 0) {
      throw new ValidationError('工期必须大于0');
    }

    // 实际结束日期必须晚于实际开始日期
    if (data.actual_start_date && data.actual_end_date) {
      const actualStart = new Date(data.actual_start_date);
      const actualEnd = new Date(data.actual_end_date);
      if (actualEnd < actualStart) {
        throw new ValidationError('实际结束日期必须晚于或等于实际开始日期');
      }
    }

    // 循环依赖检测：当设置前置任务时
    if (data.predecessor_id !== undefined && data.predecessor_id !== null && data.predecessor_id !== task.predecessor_id) {
      const cycleCheck = await detectCycleDependency(
        id,
        data.predecessor_id,
        async () => this.repo.getAllTasksForCycleDetection(id)
      );

      if (cycleCheck.hasCycle) {
        throw new ValidationError(cycleCheck.message || '检测到循环依赖');
      }
    }

    // 检查版本
    if (data.version !== task.version) {
      return { updated: false, conflict: true, needsApproval: false };
    }

    // 判断是否需要审批（工程师修改计划需要审批）
    const needsApproval = this.checkNeedsApproval(data, currentUser);
    const planChangeFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];

    if (needsApproval && this.hasPlanChanges(data, planChangeFields)) {
      // 收集变更字段
      const changes = planChangeFields
        .filter(f => (data as any)[f] !== undefined)
        .map(f => ({
          field: f,
          oldValue: (task as any)[f],
          newValue: (data as any)[f],
        }));

      // 保存待审批的变更数据到任务表
      const pendingChangeData: import('./types').PendingChangeData = {
        changes,
        reason: '工程师修改计划需审批',
        submitted_at: new Date().toISOString(),
        submitted_by: currentUser.id,
      };

      // 更新任务：保存待审批数据 + 状态改为 pending_approval
      await this.repo.updateTask(id, {
        version: task.version,
        pending_changes: pendingChangeData as any,
        pending_change_type: 'plan_change',
      } as any);

      // 手动更新状态为 pending_approval（因为 calculateStatus 会根据 pending_changes 判断）
      await this.repo.updateTaskStatus(id, 'pending_approval');

      // P0修复：提交计划变更申请时，计划调整次数 +1
      await this.repo.incrementTaskCounter(id, 'plan_change_count');

      // 发布计划变更请求事件（工作流模块会创建审批记录）
      emitPlanChangeRequested({
        taskId: id,
        userId: currentUser.id,
        changes,
        reason: '工程师修改计划需审批',
      });

      // 返回等待审批状态
      return { updated: true, conflict: false, needsApproval: true };
    }

    // 如果修改了影响日期的字段，重新计算日期
    if (this.hasPlanChanges(data, planChangeFields)) {
      const updatedData = await this.recalculateDates(task, data);
      Object.assign(data, updatedData);
    }

    const result = await this.repo.updateTask(id, { ...data, version: data.version || task.version });

    if (result.updated) {
      // 检测负责人变更 - 权限跟随负责人规则
      if (data.assignee_id !== undefined && data.assignee_id !== task.assignee_id) {
        const oldAssignee = task.assignee_id;
        const newAssignee = data.assignee_id;

        // 记录审计日志（权限转移）
        await audit.log({
          userId: currentUser.id,
          username: currentUser.real_name,
          userRole: currentUser.role,
          category: 'data',
          action: 'UPDATE',
          tableName: 'wbs_tasks',
          recordId: id,
          details: `任务负责人变更: ${oldAssignee || '未分配'} → ${newAssignee || '未分配'}，权限已转移`,
          before_data: { assignee_id: oldAssignee },
          after_data: { assignee_id: newAssignee },
        });

        // TODO: 发送通知给新旧负责人
        // 通知旧负责人（如果有）- 权限已移除
        // 通知新负责人（如果有）- 获得新任务权限
      }

      // 更新任务状态
      await this.recalculateTaskStatus(id);

      // 发布任务更新事件（触发级联更新）
      const changedFields = Object.keys(data).filter(k => (data as any)[k] !== undefined);
      if (changedFields.some(f => planChangeFields.includes(f))) {
        const changes: Record<string, unknown> = {};
        changedFields.forEach(f => { changes[f] = (data as any)[f]; });
        emitTaskUpdated({
          taskId: id,
          changes,
          cascadeUpdate: true,
          cascadeDepth: 0,
        });
      }
    }

    return { ...result, needsApproval: false };
  }

  /**
   * 重新计算任务日期（支持多种依赖类型）
   */
  private async recalculateDates(task: WBSTask, data: UpdateTaskRequest): Promise<Partial<UpdateTaskRequest>> {
    const isSixDayWeek = data.is_six_day_week ?? task.is_six_day_week;
    const duration = data.duration ?? task.duration ?? 1;
    const lagDays = data.lag_days ?? task.lag_days ?? 0;
    const predecessorId = data.predecessor_id ?? task.predecessor_id;
    const dependencyType = (((data as any).dependency_type ?? task.dependency_type) || 'FS') as DependencyType;

    let startDate: Date;

    if (predecessorId) {
      const predecessor = await this.repo.getTaskById(predecessorId);
      if (predecessor && predecessor.start_date && predecessor.end_date) {
        // 使用新的依赖类型计算
        startDate = await calculateStartDateForDependency(
          predecessor.start_date,
          predecessor.end_date,
          dependencyType,
          lagDays,
          duration,
          isSixDayWeek
        );
      } else {
        startDate = data.start_date ? new Date(data.start_date) : (task.start_date ? new Date(task.start_date) : new Date());
      }
    } else if (data.start_date) {
      startDate = new Date(data.start_date);
    } else if (task.start_date) {
      startDate = new Date(task.start_date);
    } else {
      startDate = new Date();
    }

    const endDate = await calculateEndDate(startDate, duration, isSixDayWeek);

    // 计算计划周期
    const plannedDuration = calculatePlannedDuration(startDate, endDate);

    const result: Partial<UpdateTaskRequest> = {
      start_date: formatLocalDate(startDate),
      planned_duration: plannedDuration ?? undefined,
    };

    // 如果更新了实际日期，计算实际工期和实际周期
    const actualStartDate = data.actual_start_date ? new Date(data.actual_start_date) : (task.actual_start_date ? new Date(task.actual_start_date) : null);
    const actualEndDate = data.actual_end_date ? new Date(data.actual_end_date) : (task.actual_end_date ? new Date(task.actual_end_date) : null);

    if (actualStartDate && actualEndDate) {
      // 计算实际工期（工作日数）
      const actualDuration = await getWorkingDaysBetween(actualStartDate, actualEndDate, isSixDayWeek);
      // 计算实际周期（日历天数）
      const actualCycle = calculateActualCycle(actualStartDate, actualEndDate);

      (result as any).actual_duration = actualDuration;
      (result as any).actual_cycle = actualCycle;
    }

    return result;
  }

  private checkNeedsApproval(data: UpdateTaskRequest, user: User): boolean {
    // 工程师需要审批
    return user.role === 'engineer';
  }

  private hasPlanChanges(data: UpdateTaskRequest, fields: string[]): boolean {
    return fields.some(f => (data as any)[f] !== undefined);
  }

  async deleteTask(id: string, currentUser: User): Promise<void> {
    // admin/tech_manager/dept_manager 可以删除任务
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权限删除任务');
    }

    const task = await this.repo.getTaskById(id);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 项目成员验证（非管理员需要是项目成员）
    if (currentUser.role !== 'admin') {
      const isMember = await this.projectRepo.isProjectMember(task.project_id, currentUser.id);
      if (!isMember) {
        throw new ForbiddenError('您不是该项目的成员，无权限删除任务');
      }
    }

    // 获取所有将被删除的任务（包括子任务）
    const tasksToDelete = await this.repo.getTaskWithDescendants(id);

    // 执行删除
    const deleted = await this.repo.deleteTask(id);
    if (!deleted) {
      throw new ValidationError('删除任务失败');
    }

    // 记录审计日志
    await audit.log({
      userId: currentUser.id,
      username: currentUser.real_name,
      userRole: currentUser.role,
      category: 'data',
      action: 'DELETE',
      tableName: 'wbs_tasks',
      recordId: id,
      details: `删除任务: ${task.description} (WBS: ${task.wbs_code})，级联删除 ${tasksToDelete.length - 1} 个子任务`,
      before_data: {
        task: task,
        deleted_tasks: tasksToDelete.map(t => ({
          id: t.id,
          wbs_code: t.wbs_code,
          description: t.description,
          assignee_id: t.assignee_id,
        })),
      },
    });
  }

  // ========== 状态计算 ==========

  async recalculateTaskStatus(taskId: string): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) return;

    const newStatus = this.calculateStatus(task);
    if (newStatus !== task.status) {
      await this.repo.updateTaskStatus(taskId, newStatus);
    }
  }

  private calculateStatus(task: WBSTask): TaskStatus {
    // 0. 最高优先级：审批相关状态
    // 如果有待审批的变更，状态为 pending_approval
    if (task.pending_changes && task.pending_change_type === 'plan_change') {
      return 'pending_approval';
    }

    // 如果当前状态是 rejected，保持 rejected（直到用户重新提交）
    if (task.status === 'rejected') {
      return 'rejected';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);  // 重置时间部分，只比较日期
    const endDate = task.end_date ? new Date(task.end_date) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);
    const actualStart = task.actual_start_date ? new Date(task.actual_start_date) : null;
    if (actualStart) actualStart.setHours(0, 0, 0, 0);
    const actualEnd = task.actual_end_date ? new Date(task.actual_end_date) : null;
    if (actualEnd) actualEnd.setHours(0, 0, 0, 0);

    // 1. 已完成状态（规则5、6、9）
    if (actualEnd && endDate) {
      if (actualEnd < endDate) return 'early_completed';      // 规则5：提前完成
      if (actualEnd.getTime() === endDate.getTime()) return 'on_time_completed';  // 规则6：按时完成
      if (actualEnd > endDate) return 'overdue_completed';    // 规则9：超期完成
    }

    // 2. 未完成的任务（无实际完成日期）
    if (!actualEnd && endDate) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 规则8：已延迟 - 无实际完成日期且当前已超过计划完成日期
      if (daysLeft < 0) return 'delayed';

      // 规则7：延期预警 - 无实际完成日期且当前距离计划完成日期≤预警天数
      // 注意：需求文档没有要求有实际开始日期！
      if (daysLeft <= task.warning_days) return 'delay_warning';
    }

    // 3. 进行中（规则4）：有计划日期、实际开始日期，无实际完成日期且未超期
    // 修复：需要检查"未超期"条件 - 如果已超期应该返回 delayed 而不是 in_progress
    if (actualStart && (!endDate || now <= endDate)) {
      return 'in_progress';
    }

    // 4. 如果有实际开始日期但已超期（前面没有捕获的情况）
    if (actualStart && endDate && now > endDate) {
      return 'delayed';
    }

    // 5. 未开始（规则3）：没有完整计划日期或有计划日期但无实际开始日期
    return 'not_started';
  }

  // ========== 进度记录 ==========

  async getProgressRecords(taskId: string): Promise<ProgressRecord[]> {
    return this.repo.getProgressRecords(taskId);
  }

  async addProgressRecord(taskId: string, content: string, userId: number): Promise<string> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 获取用户信息进行权限检查
    const user = await this.authRepo.findById(userId);
    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // P1修复：权限检查 - 只有以下用户可以添加进度记录
    // 1. 管理员角色（admin/dept_manager/tech_manager）
    // 2. 任务负责人（assignee）
    // 3. 项目成员
    const isAdminRole = user.role === 'admin' || user.role === 'dept_manager' || user.role === 'tech_manager';
    const isAssignee = task.assignee_id === userId;

    if (!isAdminRole && !isAssignee) {
      // 非管理员且非任务负责人，需要检查是否为项目成员
      const isMember = await this.projectRepo.isProjectMember(task.project_id, userId);
      if (!isMember) {
        throw new ForbiddenError('只有任务负责人或项目成员可以添加进度记录');
      }
    }

    const id = uuidv4();
    await this.repo.createProgressRecord({ id, task_id: taskId, content, recorded_by: userId });
    await this.repo.incrementTaskCounter(taskId, 'progress_record_count');
    return id;
  }

  // ========== 批量操作 ==========

  async getTasksByIds(ids: string[]): Promise<WBSTask[]> {
    return this.repo.getTasksByIds(ids);
  }

  // ========== 统计 ==========

  async getTaskStats(projectId: string): Promise<{ total: number; completed: number; delayed: number }> {
    return this.repo.getTaskStats(projectId);
  }

  // ========== 日期计算工具方法 ==========

  /**
   * 计算任务结束日期
   */
  async calculateTaskEndDate(startDate: Date | string, duration: number, isSixDayWeek: boolean): Promise<Date> {
    return calculateEndDate(startDate, duration, isSixDayWeek);
  }

  /**
   * 计算两个日期之间的工作日数
   */
  async getWorkingDays(startDate: Date | string, endDate: Date | string, isSixDayWeek: boolean): Promise<number> {
    return getWorkingDaysBetween(new Date(startDate), new Date(endDate), isSixDayWeek);
  }

  // ========== 延期次数累计 ==========

  /**
   * 增加延期次数
   * 规则：
   * - 首次延期：延期次数+1
   * - 计划未刷新：不累加
   * - 刷新后再次超期：再+1
   */
  async incrementDelayCount(taskId: string): Promise<{ incremented: boolean; reason: string }> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    const now = new Date();
    const lastRefresh = task.last_plan_refresh_at ? new Date(task.last_plan_refresh_at) : null;

    // 判断是否可以累加延期次数
    // 如果有上次刷新时间，且上次刷新时间在当前延期之后，则可以累加
    // 如果没有上次刷新时间，则可以累加（首次延期）
    if (lastRefresh) {
      // 检查上次刷新时间是否在当前检测之前
      // 如果上次刷新时间在今天之前，说明计划已经刷新过，可以累加
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (lastRefresh < todayStart) {
        // 计划已刷新，可以累加
        await this.repo.incrementTaskCounter(taskId, 'delay_count');
        return { incremented: true, reason: '计划已刷新，延期次数+1' };
      } else {
        // 计划未刷新（今天刷新的），不累加
        return { incremented: false, reason: '计划未刷新，不累加延期次数' };
      }
    } else {
      // 首次延期
      await this.repo.incrementTaskCounter(taskId, 'delay_count');
      return { incremented: true, reason: '首次延期，延期次数+1' };
    }
  }

  /**
   * 刷新计划（更新 last_plan_refresh_at）
   * 在用户修改计划日期后调用
   */
  async refreshPlan(taskId: string): Promise<void> {
    await this.repo.updateTask(taskId, {
      last_plan_refresh_at: new Date(),
      version: (await this.repo.getTaskById(taskId))?.version || 1,
    } as any);
  }
}
