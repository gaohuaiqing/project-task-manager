// app/server/src/modules/task/service.ts
import { v4 as uuidv4 } from 'uuid';
import { TaskRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type { TaskStatus, WBSTask, WBSTaskListItem, CreateTaskRequest, UpdateTaskRequest, TaskQueryOptions, ProgressRecord } from './types';

export class TaskService {
  private repo = new TaskRepository();

  // ========== 任务管理 ==========

  async getTasks(options: TaskQueryOptions): Promise<{ items: WBSTaskListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const { items, total } = await this.repo.getTasks(options);
    const totalPages = Math.ceil(total / pageSize);

    // 构建树形结构
    const tree = this.buildTaskTree(items);

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
    return this.repo.getTaskById(id);
  }

  async createTask(data: CreateTaskRequest, currentUser: User): Promise<string> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'engineer') {
      throw new ForbiddenError('无权限创建任务');
    }

    // 验证必填字段
    if (!data.description) {
      throw new ValidationError('任务描述不能为空');
    }

    // 生成WBS编码
    const wbsCode = await this.repo.getNextWbsCode(data.project_id, data.parent_id || null);

    // 计算WBS等级
    let wbsLevel = 1;
    if (data.parent_id) {
      const parent = await this.repo.getTaskById(data.parent_id);
      if (parent) {
        wbsLevel = parent.wbs_level + 1;
        // 子任务继承父任务类型
        if (!data.task_type) {
          data.task_type = parent.task_type;
        }
      }
    }

    const id = uuidv4();
    const status: TaskStatus = 'not_started';

    await this.repo.createTask({
      ...data,
      id,
      wbs_code: wbsCode,
      wbs_level: wbsLevel,
      status,
    });

    return id;
  }

  async updateTask(id: string, data: UpdateTaskRequest, currentUser: User): Promise<{ updated: boolean; conflict: boolean; needsApproval: boolean }> {
    const task = await this.repo.getTaskById(id);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 检查版本
    if (data.version !== task.version) {
      return { updated: false, conflict: true, needsApproval: false };
    }

    // 判断是否需要审批（工程师修改计划需要审批）
    const needsApproval = this.checkNeedsApproval(data, currentUser);
    const planChangeFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];

    if (needsApproval && this.hasPlanChanges(data, planChangeFields)) {
      // 这里应该创建审批请求，简化实现：直接更新
      // 实际应该调用 WorkflowService.createPlanChange
    }

    const result = await this.repo.updateTask(id, { ...data, version: data.version || task.version });

    if (result.updated) {
      // 更新任务状态
      await this.recalculateTaskStatus(id);
    }

    return { ...result, needsApproval };
  }

  private checkNeedsApproval(data: UpdateTaskRequest, user: User): boolean {
    // 工程师需要审批
    return user.role === 'engineer';
  }

  private hasPlanChanges(data: UpdateTaskRequest, fields: string[]): boolean {
    return fields.some(f => (data as any)[f] !== undefined);
  }

  async deleteTask(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager') {
      throw new ForbiddenError('无权限删除任务');
    }

    const deleted = await this.repo.deleteTask(id);
    if (!deleted) {
      throw new ValidationError('删除任务失败');
    }
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
    const now = new Date();
    const endDate = task.end_date ? new Date(task.end_date) : null;
    const actualStart = task.actual_start_date ? new Date(task.actual_start_date) : null;
    const actualEnd = task.actual_end_date ? new Date(task.actual_end_date) : null;

    // 1. 已完成状态
    if (actualEnd) {
      if (endDate && actualEnd < endDate) return 'early_completed';
      if (endDate && actualEnd.getTime() === endDate.getTime()) return 'on_time_completed';
      if (endDate && actualEnd > endDate) return 'overdue_completed';
    }

    // 2. 进行中
    if (actualStart && !actualEnd) {
      if (endDate && now > endDate) return 'delayed';
      if (endDate) {
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= task.warning_days) return 'delay_warning';
      }
      return 'in_progress';
    }

    // 3. 未开始
    return 'not_started';
  }

  // ========== 进度记录 ==========

  async getProgressRecords(taskId: string): Promise<ProgressRecord[]> {
    return this.repo.getProgressRecords(taskId);
  }

  async addProgressRecord(taskId: string, content: string, userId: number): Promise<string> {
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
}
