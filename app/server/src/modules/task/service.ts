// app/server/src/modules/task/service.ts
import { v4 as uuidv4 } from 'uuid';
import { TaskRepository } from './repository';
import { ProjectRepository } from '../project/repository';
import { AuthRepository } from '../auth/repository';
import { WorkflowRepository } from '../workflow/repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import { sanitizeString } from '../../core/utils/sanitize';
import { audit } from '../../core/audit';
import { sendToUser } from '../../core/realtime';
import { logger } from '../../core/logger';
import { wbsCodeService, wbsCodeCache, wbsCodeRegistry } from '../../core/wbs';
import { getTechManagerGroupIds } from '../analytics/query-builder';

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

/**
 * 任务类型名称到代码的映射
 * Excel 导入使用中文名称，数据库存储英文代码
 */
const TASK_TYPE_NAME_TO_CODE: Record<string, string> = {
  '固件': 'firmware',
  '板卡': 'board',
  '驱动': 'driver',
  '接口类': 'interface',
  '硬件恢复包': 'hw_recovery',
  '物料导入': 'material_import',
  '物料改代': 'material_sub',
  '系统设计': 'sys_design',
  '核心风险': 'core_risk',
  '接口人': 'contact',
  '职能任务': 'func_task',
  '其它': 'other',
  // 英文代码直接返回
  'firmware': 'firmware',
  'board': 'board',
  'driver': 'driver',
  'interface': 'interface',
  'hw_recovery': 'hw_recovery',
  'material_import': 'material_import',
  'material_sub': 'material_sub',
  'sys_design': 'sys_design',
  'core_risk': 'core_risk',
  'contact': 'contact',
  'func_task': 'func_task',
  'other': 'other',
};

/**
 * 将任务类型名称转换为代码
 * @param typeName 任务类型名称（中文或英文）
 * @returns 任务类型代码，未找到则返回 'other'
 */
function mapTaskType(typeName: string | undefined): string {
  if (!typeName) return 'other';
  return TASK_TYPE_NAME_TO_CODE[typeName] || 'other';
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
  emitTaskCreated,
  emitTaskDeleted,
  emitPlanChangeRequested,
  type TaskUpdatedEvent,
} from '../../core/events';
import type { User } from '../../core/types';
import type { TaskStatus, WBSTask, WBSTaskListItem, CreateTaskRequest, UpdateTaskRequest, TaskQueryOptions, ProgressRecord } from './types';

/** WBS层级最大值 */
const MAX_WBS_LEVEL = 5;

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

/** 执行状态类型 */
export type ExecutionStatusType = 'not_started' | 'in_progress' | 'completed' | 'pending_approval';

/** 时间状态类型 */
export type TimeStatusType = 'normal' | 'warning' | 'delayed' | 'not_applicable';

export class TaskService {
  // P16说明：当前实例化模式在开发环境热重载时可能产生多个实例
  // 生产环境不受影响（单一实例）。如需优化，可改为依赖注入模式。
  private repo = new TaskRepository();
  private projectRepo = new ProjectRepository();
  private authRepo = new AuthRepository();
  private workflowRepo = new WorkflowRepository();

  constructor() {
    // 订阅任务更新事件（级联更新）
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听任务更新事件（级联更新）
    // P8修复：添加重试机制和详细日志
    taskEvents.on(TaskEventType.TASK_UPDATED, async (event: TaskUpdatedEvent) => {
      if (event.cascadeUpdate && (event.cascadeDepth || 0) < MAX_CASCADE_DEPTH) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await this.cascadeUpdateSuccessorTasks(event.taskId, event.cascadeDepth || 0);
            break;
          } catch (error) {
            const depth = event.cascadeDepth || 0;
            logger.error(
              '级联更新后续任务失败 (taskId=%s, depth=%d, attempt=%d/%d): %s',
              event.taskId, depth, attempt, maxRetries,
              error instanceof Error ? error.message : String(error)
            );
            if (attempt === maxRetries) {
              logger.error('级联更新最终失败 (taskId=%s)，已放弃重试', event.taskId);
            }
          }
        }
      }
    });

    // 监听审批通过事件（重新计算任务状态和日期）
    taskEvents.on(TaskEventType.PLAN_CHANGE_APPROVED, async (event: import('../../core/events').TaskPlanChangeApprovedEvent) => {
      try {
        // 如果变更已应用，只做级联更新和状态重算，不再重复应用变更
        if (event.alreadyApplied) {
          // 1. 重新计算日期（重要：审批通过后必须根据新的 start_date/duration 重新计算 end_date）
          const dateFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];
          const hasDateChanges = event.changes.some(c => dateFields.includes(c.field));

          if (hasDateChanges) {
            const task = await this.repo.getTaskById(event.taskId);
            if (task) {
              const recalcData = await this.recalculateDates(task, {} as any);
              await this.repo.updateTask(event.taskId, {
                ...recalcData,
                version: task.version,
              } as any);
            }
          }

          // 2. 重新计算任务状态（重要：审批通过后必须根据实际数据计算正确状态）
          // 注意：审批通过场景不发送完成通知，因为这是计划变更而非实际完成
          await this.recalculateTaskStatus(event.taskId);

          // P1修复：审批通过的计划变更也需要刷新 last_plan_refresh_at
          if (hasDateChanges) {
            await this.refreshPlan(event.taskId);
          }

          // 3. 触发级联更新（如果有日期变更）
          if (hasDateChanges) {
            emitTaskUpdated({
              taskId: event.taskId,
              changes: Object.fromEntries(event.changes.map(c => [c.field, c.value])),
              cascadeUpdate: true,
              cascadeDepth: 0,
            });
          }
          return;
        }

        // 以下逻辑用于非 workflow 模块发起的审批（如直接调用 API）
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
        // 注意：审批通过场景不发送完成通知，因为这是计划变更而非实际完成
        await this.recalculateTaskStatus(event.taskId);

        // P1修复：审批通过的计划变更也需要刷新 last_plan_refresh_at
        if (hasDateChanges) {
          await this.refreshPlan(event.taskId);
        }

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
   * 使用事务保证数据一致性，添加乐观锁防止竞态条件
   */
  private async cascadeUpdateSuccessorTasks(taskId: string, currentDepth: number): Promise<void> {
    // 性能优化：深度超过阈值时使用异步执行，避免阻塞主线程
    const ASYNC_THRESHOLD = 3;
    const CASCADE_TIMEOUT = 30000; // 30秒超时

    // 获取后续任务（包含依赖类型）
    const successorTasks = await this.repo.getSuccessorTasks(taskId);

    if (successorTasks.length === 0) {
      return;
    }

    // 获取当前任务（作为前置任务）
    const predecessorTask = await this.repo.getTaskById(taskId);
    if (!predecessorTask) {
      return;
    }

    // 使用事务包裹所有级联更新，保证原子性
    const pool = (await import('../../core/db')).getPool();
    const connection = await pool.getConnection();

    // 性能优化：添加超时保护
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('级联更新超时')), CASCADE_TIMEOUT);
    });

    try {
      await Promise.race([
        (async () => {
          await connection.beginTransaction();

          // 获取所有后续任务的当前版本号（乐观锁检查）
          const successorIds = successorTasks.map(s => s.id);
          const placeholders = successorIds.map(() => '?').join(',');
          const [currentVersions] = await connection.execute(
            `SELECT id, version FROM wbs_tasks WHERE id IN (${placeholders})`,
            successorIds
          );
          const versionMap = new Map((currentVersions as any[]).map(r => [r.id, r.version]));

          // 验证前置任务是否有必要的日期
          // FS/FF 需要 end_date，SS/SF 需要 start_date
          const cascadeChanges: Array<{ taskId: string; changes: Record<string, unknown>; depth: number }> = [];

          for (const successor of successorTasks) {
            const dependencyType = ((successor as any).dependency_type || 'FS') as DependencyType;

            // 检查前置任务是否有必要的日期
            if ((dependencyType === 'FS' || dependencyType === 'FF') && !predecessorTask.end_date) {
              continue;
            }
            if ((dependencyType === 'SS' || dependencyType === 'SF') && !predecessorTask.start_date) {
              continue;
            }

            const duration = successor.duration || 1;

            // 使用支持4种依赖类型的日期计算方法
            const newStartDate = await calculateStartDateForDependency(
              predecessorTask.start_date || predecessorTask.end_date || new Date(),
              predecessorTask.end_date || predecessorTask.start_date || new Date(),
              dependencyType,
              successor.lag_days || 0,
              duration,
              successor.is_six_day_week
            );

            // 计算新的结束日期
            const newEndDate = await calculateEndDate(newStartDate, duration, successor.is_six_day_week);

            // 乐观锁检查：确保版本号未变化
            const expectedVersion = versionMap.get(successor.id);
            if (expectedVersion === undefined) {
              logger.warn('[Cascade] 任务 %s 版本信息丢失，跳过更新', successor.id);
              continue;
            }

            // 在事务内更新任务日期，带版本号检查（乐观锁）
            const fields: string[] = ['start_date = ?', 'end_date = ?', 'version = version + 1'];
            const values: (string | number | null)[] = [formatLocalDate(newStartDate), formatLocalDate(newEndDate), expectedVersion, successor.id];
            const [updateResult] = await connection.execute(
              `UPDATE wbs_tasks SET ${fields.join(', ')} WHERE id = ? AND version = ?`,
              values
            );

            // 检查更新是否成功（版本冲突检测）
            if ((updateResult as any).affectedRows === 0) {
              logger.warn('[Cascade] 任务 %s 版本冲突（期望 %d），跳过更新', successor.id, expectedVersion);
              continue;
            }

            // 收集级联变更，事务提交后统一发射
            cascadeChanges.push({
              taskId: successor.id,
              changes: { start_date: newStartDate, end_date: newEndDate },
              depth: currentDepth + 1,
            });
          }

          await connection.commit();

          // 事务提交成功后，统一发射级联事件
          // 性能优化：深度超过阈值时，使用 setImmediate 延迟执行，释放事件循环
          for (const change of cascadeChanges) {
            if (currentDepth >= ASYNC_THRESHOLD) {
              // 异步执行，不等待
              setImmediate(() => {
                emitTaskUpdated({
                  taskId: change.taskId,
                  changes: change.changes,
                  cascadeUpdate: true,
                  cascadeDepth: change.depth,
                });
              });
            } else {
              emitTaskUpdated({
                taskId: change.taskId,
                changes: change.changes,
                cascadeUpdate: true,
                cascadeDepth: change.depth,
              });
            }
          }
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ========== 任务管理 ==========

  /**
   * 获取用户可访问的项目ID列表
   * admin: 所有项目（返回 undefined 表示不过滤）
   * dept_manager: 自己部门及子部门成员参与的项目
   * tech_manager: 技术组成员参与的项目
   * engineer: 自己作为成员参与的项目
   */
  async getAccessibleProjectIds(user: User): Promise<string[] | undefined> {
    if (user.role === 'admin') return undefined; // 不过滤

    // 部门经理：获取自己部门及所有子部门成员参与的项目
    if (user.role === 'dept_manager') {
      return this.getDeptManagerAccessibleProjects(user);
    }

    // 技术经理：获取技术组成员参与的项目
    if (user.role === 'tech_manager') {
      return this.getTechManagerAccessibleProjects(user);
    }

    // 工程师：自己作为成员参与的项目
    return this.projectRepo.getProjectIdsByMember(user.id);
  }

  /**
   * 获取部门经理可访问的项目ID列表
   * 使用单次 CTE + JOIN 查询替代原来的 4+N 次顺序查询
   */
  private async getDeptManagerAccessibleProjects(user: User): Promise<string[]> {
    const pool = (await import('../../core/db')).getPool();

    // 单次查询：CTE 递归获取部门树 → JOIN 用户 → JOIN 项目成员 → UNION 自己的项目
    const [rows] = await pool.execute(
      `WITH RECURSIVE dept_tree AS (
        SELECT id FROM departments WHERE manager_id = ?
        UNION ALL
        SELECT d.id FROM departments d INNER JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT DISTINCT pm.project_id
      FROM dept_tree dt
      JOIN users u ON u.department_id = dt.id AND u.is_active = 1
      JOIN project_members pm ON pm.user_id = u.id
      UNION
      SELECT pm2.project_id
      FROM project_members pm2 WHERE pm2.user_id = ?`,
      [user.id, user.id]
    );

    return (rows as any[]).map(r => String(r.project_id));
  }

  /**
   * 获取技术经理可访问的项目ID列表
   * 使用递归 CTE 查询技术组及所有后代部门，然后查询这些部门成员参与的项目
   */
  private async getTechManagerAccessibleProjects(user: User): Promise<string[]> {
    // 防御性检查：无部门信息时仅返回自己参与的项目
    if (!user.department_id) {
      return this.projectRepo.getProjectIdsByMember(user.id);
    }

    const pool = (await import('../../core/db')).getPool();

    // 使用递归 CTE 获取管理的技术组及所有后代
    const groupIds = await getTechManagerGroupIds(user.id, user.department_id);

    if (groupIds.length === 0) return [];

    // 查询技术组成员参与的项目 + 自己参与的项目
    const placeholders = groupIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT DISTINCT pm.project_id
       FROM users u
       JOIN project_members pm ON pm.user_id = u.id
       WHERE u.department_id IN (${placeholders})
       AND u.is_active = 1
       UNION
       SELECT pm2.project_id
       FROM project_members pm2 WHERE pm2.user_id = ?`,
      [...groupIds, user.id]
    );

    return (rows as any[]).map(r => String(r.project_id));
  }

  /**
   * 获取用户管理的部门ID列表（包括子部门）
   * 使用单次 CTE 递归查询替代循环查询
   */
  private async getManagedDepartmentIds(user: User): Promise<number[]> {
    const pool = (await import('../../core/db')).getPool();

    const [managedDepts] = await pool.execute(
      'SELECT id FROM departments WHERE manager_id = ?',
      [user.id]
    );
    const directDeptIds = (managedDepts as any[]).map(r => r.id);

    if (directDeptIds.length === 0) {
      return [];
    }

    // 单次 CTE 查询所有子部门
    const placeholders = directDeptIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `WITH RECURSIVE dept_tree AS (
        SELECT id FROM departments WHERE id IN (${placeholders})
        UNION ALL
        SELECT d.id FROM departments d INNER JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`,
      directDeptIds
    );

    return Array.from(new Set((rows as any[]).map(r => r.id)));
  }

  async getTasks(options: TaskQueryOptions, user?: User): Promise<{ items: WBSTaskListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    // 性能优化：根据查询条件动态调整页面大小
    // - 指定项目时：使用合理分页（500条），减少内存占用
    // - 全局查询时：保持大页面以支持树形结构构建
    const effectivePageSize = options.project_id ? 500 : 10000;

    const page = options.page || 1;
    const { items, total } = await this.repo.getTasks({ ...options, pageSize: effectivePageSize });
    const totalPages = Math.ceil(total / effectivePageSize);

    if (items.length === 0) {
      return { items: [], total: 0, page, pageSize: effectivePageSize, totalPages: 0 };
    }

    // 全局统一计算 WBS 编码（不区分项目）
    let itemsWithCode: WBSTaskListItem[] = items;
    if (user) {
      // 每次查询都重新计算WBS编码（确保编码与查询顺序一致）
      const tasksForCalculation = items.map(item => ({
        id: item.id,
        parent_id: item.parent_id,
        wbs_level: item.wbs_level,
        sort_order: item.sort_order,
        created_at: item.created_at,
      }));

      const { codeMap } = wbsCodeService.calculateCodes(tasksForCalculation);

      itemsWithCode = items.map(item => {
        const wbsCode = codeMap.get(item.id) || '';
        // 从动态计算的 WBS 编码推算等级，确保 wbs_level 与 wbs_code 一致
        const derivedLevel = wbsCode ? wbsCode.split('.').length : 1;
        return {
          ...item,
          wbs_code: wbsCode,
          wbs_level: derivedLevel,
          predecessor_code: item.predecessor_id ? codeMap.get(item.predecessor_id) || '' : undefined,
        };
      });
    }

    // 实时计算每个任务的状态（符合需求文档：状态应该实时判断）
    const itemsWithComputedStatus = itemsWithCode.map(item => ({
      ...item,
      computed_status: TaskService.calculateStatus(item as any),
      computed_execution_status: TaskService.calculateExecutionStatus(item as any),
      computed_time_status: TaskService.calculateTimeStatus(item as any),
    }));

    // 始终构建树形结构，前端按需使用
    const result = this.buildTaskTree(itemsWithComputedStatus);

    return { items: result, total, page, pageSize: effectivePageSize, totalPages };
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
      computed_status: TaskService.calculateStatus(task),
      computed_execution_status: TaskService.calculateExecutionStatus(task),
      computed_time_status: TaskService.calculateTimeStatus(task),
    };
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

    // XSS 防护：消毒任务描述，剥离 HTML 标签
    data.description = sanitizeString(data.description);

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

    // 计算新任务的 sort_order
    const siblings = await this.repo.getSiblings(data.project_id, data.parent_id || null);
    let sortOrder: number;
    if (!data.parent_id) {
      // 根任务：后进先出，排在最前面
      const minSortOrder = siblings.length > 0
        ? Math.min(...siblings.map(s => s.sort_order ?? 100))
        : 100;
      sortOrder = minSortOrder - 100;
    } else {
      // 子任务：先进先出，排在同级末尾
      const maxSortOrder = siblings.length > 0
        ? Math.max(...siblings.map(s => s.sort_order ?? 100))
        : 100;
      sortOrder = maxSortOrder + 100;
    }

    // P10修复：使用事务包裹创建任务、进度记录、计数器递增，保证原子性
    const pool = (await import('../../core/db')).getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 创建任务（包含 sort_order）
      await connection.execute(
        `INSERT INTO wbs_tasks (
          id, project_id, parent_id, wbs_level, description, status, task_type, priority,
          assignee_id, start_date, end_date, duration, planned_duration, is_six_day_week, warning_days, predecessor_id, dependency_type, lag_days,
          redmine_link, full_time_ratio, delay_count, plan_change_count, progress_record_count, version, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?)`,
        [
          id, data.project_id, data.parent_id || null, wbsLevel, data.description,
          status, data.task_type || 'other', data.priority || 'medium', data.assignee_id || null,
          formatLocalDate(startDate), formatLocalDate(endDate), data.duration || null,
          plannedDuration ?? null,
          isSixDayWeek,
          data.warning_days || 3, data.predecessor_id || null, data.dependency_type || 'FS', data.lag_days || null,
          data.redmine_link || null, data.full_time_ratio ?? 100,
          sortOrder
        ]
      );

      // 2. 创建初始进展记录
      const initialInfo = [
        `层级: ${wbsLevel}`,
        `工期: ${duration}天`,
        data.start_date ? `计划开始: ${formatLocalDate(startDate)}` : null,
      ].filter(Boolean).join('，');

      await connection.execute(
        'INSERT INTO progress_records (id, task_id, content, recorded_by) VALUES (?, ?, ?, ?)',
        [uuidv4(), id, `📝 任务创建。${initialInfo}`, currentUser.id]
      );

      // 3. 进展记录计数 +1
      await connection.execute(
        'UPDATE wbs_tasks SET progress_record_count = progress_record_count + 1 WHERE id = ?',
        [id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // 失效项目所有用户的 WBS 编码缓存
    await wbsCodeCache.deleteProjectCache(data.project_id);

    // 清除当前用户的全局缓存（任务列表查询使用 'global' 作为 projectId）
    await wbsCodeCache.delete(currentUser.id, 'global');

    // 刷新 WBS 编码全局注册表
    await wbsCodeRegistry.refreshProject(data.project_id);

    // 通知分析模块缓存失效
    emitTaskCreated({ taskId: id, projectId: data.project_id });

    // WebSocket 广播任务创建
    if (data.project_id) {
      const { sendToProjectMembers } = await import('../../core/realtime');
      sendToProjectMembers(data.project_id, 'task_created', {
        taskId: id,
        projectId: data.project_id,
      });
    }

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

    // XSS 防护：消毒任务描述，剥离 HTML 标签
    if (data.description !== undefined) {
      data.description = sanitizeString(data.description);
    }

    // 检查版本 - H2修复：返回详细冲突信息
    if (data.version !== task.version) {
      return {
        updated: false,
        conflict: true,
        needsApproval: false,
        conflictInfo: {
          currentVersion: task.version,
          yourVersion: data.version,
          lastModifiedAt: task.updated_at ? new Date(task.updated_at).toISOString() : undefined,
          message: `数据已被修改（当前版本: ${task.version}，您的版本: ${data.version}），请刷新后重试`
        }
      };
    }

    // 判断是否需要审批（工程师修改计划需要审批）
    const needsApproval = this.checkNeedsApproval(data, currentUser);
    const planChangeFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];

    if (needsApproval && this.hasPlanChanges(data, planChangeFields)) {
      // 校验变更原因不能为空
      if (!data.reason || !data.reason.trim()) {
        throw new ValidationError('请输入变更原因');
      }

      // 收集真正发生变更的字段（比较新旧值，跳过无变化的字段）
      const changes = planChangeFields
        .filter(f => (data as any)[f] !== undefined)
        .filter(f => {
          const oldVal = (task as any)[f];
          const newVal = (data as any)[f];
          // 标准化比较：null/undefined 视为等价，日期格式统一比较
          const normalizedOld = oldVal ?? null;
          const normalizedNew = newVal ?? null;
          if (normalizedOld === normalizedNew) return false;
          // 日期字段：比较日期部分
          if (f === 'start_date' && normalizedOld && normalizedNew) {
            const oldDate = new Date(normalizedOld).toISOString().split('T')[0];
            const newDate = new Date(normalizedNew).toISOString().split('T')[0];
            return oldDate !== newDate;
          }
          return String(normalizedOld) !== String(normalizedNew);
        })
        .map(f => ({
          field: f,
          oldValue: (task as any)[f],
          newValue: (data as any)[f],
        }));

      // 无真正变更则跳过审批流程
      if (changes.length === 0) {
        return { updated: true, conflict: false, needsApproval: false };
      }

      // 保存待审批的变更数据到任务表（P9: 追加到数组而非覆盖）
      const pendingChangeData: import('./types').PendingChangeData = {
        submission_id: uuidv4(),
        changes,
        reason: data.reason || '工程师修改计划需审批',
        submitted_at: new Date().toISOString(),
        submitted_by: currentUser.id,
      };

      // 追加到现有 pending_changes 数组
      const existingPending = Array.isArray(task.pending_changes) ? task.pending_changes : [];
      const updatedPending = [...existingPending, pendingChangeData];

      // 更新任务：保存待审批数据 + 状态改为 pending_approval
      await this.repo.updateTask(id, {
        version: task.version,
        pending_changes: updatedPending as any,
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
        reason: data.reason || '工程师修改计划需审批',
        submissionId: pendingChangeData.submission_id,
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

        // 记录审计日志（同步写入，确保关键操作被记录）
        await audit.logSync({
          userId: currentUser.id,
          username: currentUser.real_name,
          userRole: currentUser.role,
          category: 'task',
          action: 'UPDATE',
          tableName: 'wbs_tasks',
          recordId: id,
          details: `任务负责人变更: ${oldAssignee || '未分配'} → ${newAssignee || '未分配'}，权限已转移`,
          beforeData: { assignee_id: oldAssignee },
          afterData: { assignee_id: newAssignee },
        });

        // 清理原负责人的相关通知
        if (oldAssignee) {
          await this.workflowRepo.deleteNotificationsByTaskAndUser(id, oldAssignee);
        }

        // 发送任务分配通知给新负责人
        if (newAssignee) {
          await this.sendTaskAssignedNotification(task, newAssignee, currentUser);
        }
      }

      // 更新任务状态
      await this.recalculateTaskStatus(id, currentUser);

      // P1修复：检测计划日期变更，自动刷新 last_plan_refresh_at（用于延期次数累计）
      const planDateFields = ['start_date', 'duration', 'predecessor_id', 'lag_days'];
      const hasPlanDateChange = planDateFields.some(f => (data as any)[f] !== undefined);
      if (hasPlanDateChange) {
        await this.refreshPlan(id);
      }

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

    // WebSocket 广播任务更新
    if (result.updated && task.project_id) {
      const { sendToProjectMembers } = await import('../../core/realtime');
      const changes: Record<string, unknown> = {};
      Object.keys(data).filter(k => (data as any)[k] !== undefined).forEach(k => { changes[k] = (data as any)[k]; });
      sendToProjectMembers(task.project_id, 'task_updated', {
        taskId: id,
        projectId: task.project_id,
        changes,
      });
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
      end_date: formatLocalDate(endDate),
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

  /**
   * P5: 获取任务及其所有后代任务（用于删除预览）
   */
  async getTaskWithDescendants(id: string): Promise<WBSTask[]> {
    return this.repo.getTaskWithDescendants(id);
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

    // 失效项目所有用户的 WBS 编码缓存
    await wbsCodeCache.deleteProjectCache(task.project_id);

    // 清除当前用户的全局缓存（任务列表查询使用 'global' 作为 projectId）
    await wbsCodeCache.delete(currentUser.id, 'global');

    // 刷新 WBS 编码全局注册表
    await wbsCodeRegistry.refreshProject(task.project_id);

    // 记录审计日志（同步写入，确保删除操作被记录）
    await audit.logSync({
      userId: currentUser.id,
      username: currentUser.real_name,
      userRole: currentUser.role,
      category: 'task',
      action: 'DELETE',
      tableName: 'wbs_tasks',
      recordId: id,
      details: `删除任务: ${task.description} (层级: ${task.wbs_level})，级联删除 ${tasksToDelete.length - 1} 个子任务`,
      beforeData: {
        task: task,
        deleted_tasks: tasksToDelete.map(t => ({
          id: t.id,
          description: t.description,
          assignee_id: t.assignee_id,
        })),
      },
    });

    // 通知分析模块缓存失效
    emitTaskDeleted({ taskId: id, projectId: task.project_id });

    // WebSocket 广播任务删除
    if (task.project_id) {
      const { sendToProjectMembers } = await import('../../core/realtime');
      sendToProjectMembers(task.project_id, 'task_deleted', {
        taskId: id,
        projectId: task.project_id,
      });
    }
  }

  // ========== 任务移动和层级检查 ==========

  /**
   * 检查移动任务后是否会超过最大层级
   */
  async checkMoveTaskLevel(taskId: string, newParentId: string | null): Promise<{ canMove: boolean; error?: string }> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      return { canMove: false, error: '任务不存在' };
    }

    // 获取任务及其所有后代的最大层级
    const maxDescendantLevel = await this.repo.getMaxDescendantLevel(taskId);

    // 计算新父任务的层级
    let newParentLevel = 0;
    if (newParentId) {
      const newParent = await this.repo.getTaskById(newParentId);
      if (newParent) {
        newParentLevel = newParent.wbs_level;
      }
    }

    // 检查是否会超过最大层级
    const willExceed = wbsCodeService.willExceedMaxLevel(
      task.wbs_level,
      maxDescendantLevel,
      newParentLevel
    );

    if (willExceed) {
      const newLevel = newParentLevel + 1;
      const deepestNewLevel = newLevel + (maxDescendantLevel - task.wbs_level);
      return {
        canMove: false,
        error: `移动后最深子任务将达到第 ${deepestNewLevel} 层，超过最大层级限制（${MAX_WBS_LEVEL} 层）`,
      };
    }

    return { canMove: true };
  }

  /**
   * 移动任务到新父任务下
   * 自动重新计算层级，级联更新子任务层级
   */
  async moveTask(taskId: string, newParentId: string | null, currentUser: User): Promise<void> {
    // 权限检查
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权移动任务');
    }

    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 层级检查
    const checkResult = await this.checkMoveTaskLevel(taskId, newParentId);
    if (!checkResult.canMove) {
      throw new ValidationError(checkResult.error || '无法移动任务');
    }

    // 计算新层级
    let newLevel = 1;
    if (newParentId) {
      const newParent = await this.repo.getTaskById(newParentId);
      if (newParent) {
        newLevel = newParent.wbs_level + 1;
      }
    }

    // 获取所有后代任务
    const descendants = await this.repo.getTaskWithDescendants(taskId);
    const children = descendants.slice(1);

    // 收集层级更新
    const updates: Array<{ id: string; parent_id: string | null; wbs_level: number }> = [];

    // 1. 移动任务自身
    updates.push({
      id: taskId,
      parent_id: newParentId,
      wbs_level: newLevel,
    });

    // 2. 子任务层级调整（保持相对层级关系）
    const levelDelta = newLevel - task.wbs_level;
    for (const child of children) {
      updates.push({
        id: child.id,
        parent_id: child.parent_id,
        wbs_level: child.wbs_level + levelDelta,
      });
    }

    // 3. 执行批量更新
    await this.repo.batchUpdateTaskHierarchy(updates);

    // 4. 失效项目缓存
    await wbsCodeCache.deleteProjectCache(task.project_id);
    // 清除当前用户的全局缓存（任务列表查询使用 'global' 作为 projectId）
    await wbsCodeCache.delete(currentUser.id, 'global');
    // 刷新 WBS 编码全局注册表
    await wbsCodeRegistry.refreshProject(task.project_id);
    if (newParentId) {
      const newParent = await this.repo.getTaskById(newParentId);
      if (newParent && newParent.project_id !== task.project_id) {
        await wbsCodeCache.deleteProjectCache(newParent.project_id);
        await wbsCodeRegistry.refreshProject(newParent.project_id);
      }
    }
  }

  /**
   * 检查任务是否被其他任务引用为前置任务
   */
  async getPredecessorReferences(taskId: string): Promise<Array<{ id: string; description: string }>> {
    return this.repo.getPredecessorReferences(taskId);
  }

  /**
   * 删除任务前检查并提示前置任务引用
   * 返回需要提示的信息
   */
  async checkDeleteTaskPredecessor(taskId: string): Promise<{ hasReferences: boolean; referencedBy: Array<{ id: string; description: string }> }> {
    const references = await this.repo.getPredecessorReferences(taskId);
    return {
      hasReferences: references.length > 0,
      referencedBy: references,
    };
  }

  // ========== 状态计算 ==========

  async recalculateTaskStatus(taskId: string, completedBy?: User): Promise<void> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) return;

    const oldStatus = task.status;
    const newStatus = TaskService.calculateStatus(task);

    if (newStatus !== task.status) {
      await this.repo.updateTaskStatus(taskId, newStatus);

      // 检测任务完成状态变化（从非完成变为完成）
      const completionStatuses = ['early_completed', 'on_time_completed', 'overdue_completed'];
      const wasNotCompleted = !completionStatuses.includes(oldStatus);
      const isNowCompleted = completionStatuses.includes(newStatus);

      if (wasNotCompleted && isNowCompleted && completedBy) {
        await this.sendTaskCompletedNotification(task, completedBy);
      }
    }
  }

  /** calculateStatus 所需的最小字段集合 */
  static readonly STATUS_CALC_FIELDS = {
    pending_changes: true,
    pending_change_type: true,
    end_date: true,
    actual_start_date: true,
    actual_end_date: true,
    warning_days: true,
  } as const;

  public static calculateStatus(task: {
    pending_changes?: unknown | null;
    pending_change_type?: string | null;
    end_date: Date | null;
    actual_start_date: Date | null;
    actual_end_date: Date | null;
    warning_days: number;
  }): TaskStatus {
    // 规则1：待审批 - 计划变更申请等待审批
    // P9修复：兼容数组和单实例的 pending_changes 格式
    const hasPendingChanges = Array.isArray(task.pending_changes)
      ? task.pending_changes.length > 0
      : !!task.pending_changes;
    if (hasPendingChanges && task.pending_change_type === 'plan_change') {
      return 'pending_approval';
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = task.end_date ? new Date(task.end_date) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);
    const actualStart = task.actual_start_date ? new Date(task.actual_start_date) : null;
    if (actualStart) actualStart.setHours(0, 0, 0, 0);
    const actualEnd = task.actual_end_date ? new Date(task.actual_end_date) : null;
    if (actualEnd) actualEnd.setHours(0, 0, 0, 0);

    // 规则5：提前完成 - 有实际完成日期且早于计划完成日期
    if (actualEnd && endDate && actualEnd < endDate) {
      return 'early_completed';
    }

    // 规则6：按时完成 - 有实际完成日期且等于计划完成日期
    if (actualEnd && endDate && actualEnd.getTime() === endDate.getTime()) {
      return 'on_time_completed';
    }

    // 规则9：超期完成 - 有实际完成日期且晚于计划完成日期
    if (actualEnd && endDate && actualEnd > endDate) {
      return 'overdue_completed';
    }

    // 以下状态要求无实际完成日期
    if (!actualEnd && endDate) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 规则8：已延迟 - 无实际完成日期且当前已超过计划完成日期
      if (daysLeft < 0) {
        return 'delayed';
      }

      // 规则7：延期预警 - 无实际完成日期且当前距离计划完成日期<=预警天数
      if (daysLeft <= (task.warning_days || 3)) {
        return 'delay_warning';
      }
    }

    // 规则4：进行中 - 有实际开始日期，无实际完成日期
    // P3修复：end_date 为 null 时也应正确识别为进行中
    if (actualStart && !actualEnd) {
      return 'in_progress';
    }

    // 规则3：未开始 - 没有实际开始日期
    return 'not_started';
  }

  // ========== P2: 双维度状态计算 ==========

  /** 执行状态值 */
  public static readonly EXECUTION_STATUS_VALUES = ['not_started', 'in_progress', 'completed', 'pending_approval'] as const;

  /** 时间状态值 */
  public static readonly TIME_STATUS_VALUES = ['normal', 'warning', 'delayed', 'not_applicable'] as const;

  /**
   * 计算执行状态（执行进度维度）
   * - not_started: 无实际开始日期
   * - in_progress: 有实际开始日期，无实际完成日期
   * - completed: 有实际完成日期
   * - pending_approval: 待审批状态
   */
  public static calculateExecutionStatus(task: {
    pending_changes?: unknown | null;
    pending_change_type?: string | null;
    actual_start_date: Date | null;
    actual_end_date: Date | null;
  }): 'not_started' | 'in_progress' | 'completed' | 'pending_approval' {
    // 待审批 - P9修复：兼容数组格式
    const hasPendingChanges = Array.isArray(task.pending_changes)
      ? task.pending_changes.length > 0
      : !!task.pending_changes;
    if (hasPendingChanges && task.pending_change_type === 'plan_change') {
      return 'pending_approval';
    }

    // 已完成
    if (task.actual_end_date) {
      return 'completed';
    }

    // 进行中
    if (task.actual_start_date) {
      return 'in_progress';
    }

    // 未开始
    return 'not_started';
  }

  /**
   * 计算时间状态（时间表现维度）
   * - normal: 正常（提前/按时完成，或未超期未预警）
   * - warning: 延期预警（距截止日期 <= 预警天数）
   * - delayed: 已延期（超过截止日期，或超期完成）
   * - not_applicable: 无截止日期
   */
  public static calculateTimeStatus(task: {
    end_date: Date | null;
    actual_end_date: Date | null;
    warning_days: number;
  }): 'normal' | 'warning' | 'delayed' | 'not_applicable' {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = task.end_date ? new Date(task.end_date) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);
    const actualEnd = task.actual_end_date ? new Date(task.actual_end_date) : null;
    if (actualEnd) actualEnd.setHours(0, 0, 0, 0);

    // 无截止日期
    if (!endDate) {
      return 'not_applicable';
    }

    // 已完成：根据实际完成日期判断
    if (actualEnd) {
      if (actualEnd.getTime() === endDate.getTime()) {
        return 'normal'; // 按时完成
      }
      if (actualEnd < endDate) {
        return 'normal'; // 提前完成
      }
      return 'delayed'; // 超期完成
    }

    // 未完成：根据当前日期判断
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return 'delayed'; // 已延期
    }

    if (daysLeft <= (task.warning_days || 3)) {
      return 'warning'; // 延期预警
    }

    return 'normal'; // 正常
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

  /**
   * 批量导入任务（事务保护）
   * 根据项目编码自动匹配项目UUID
   * 使用事务包裹所有任务创建操作，失败时全部回滚
   *
   * H1修复：添加导入数量限制，防止内存溢出
   * 性能优化：预加载任务数据 + 批量提交事务
   */
  async importTasks(
    tasks: Array<Record<string, unknown>>,
    currentUser: User
  ): Promise<{ total: number; success: number; failed: number; results: Array<{ success: boolean; wbs_code?: string; rowNumber?: number; error?: string }> }> {
    // H1修复：限制单次导入数量，防止内存溢出
    const MAX_IMPORT_SIZE = 1000;
    if (tasks.length > MAX_IMPORT_SIZE) {
      return {
        total: tasks.length,
        success: 0,
        failed: tasks.length,
        results: [{
          success: false,
          error: `导入数量超出限制：当前 ${tasks.length} 条，最大允许 ${MAX_IMPORT_SIZE} 条。请分批导入。`
        }],
      };
    }

    const pool = (await import('../../core/db')).getPool();
    const connection = await pool.getConnection();

    // 性能优化：批量提交配置
    const BATCH_SIZE = 50;
    let batchCount = 0;

    try {
      await connection.beginTransaction();

      const results: Array<{ success: boolean; wbs_code?: string; rowNumber?: number; error?: string }> = [];
      const taskMap = new Map<string, { taskId: string; projectId: string }>(); // wbs_code -> { task_id, project_id } 映射
      const projectCache = new Map<string, string>(); // project_code -> project_id 缓存

      // 性能优化：预加载所有现有任务的WBS编码映射（避免重复查询）
      const [allExistingTasks] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
        `SELECT t.id, t.project_id, t.parent_id, t.wbs_level, t.sort_order, t.created_at, p.code as project_code
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         ORDER BY t.project_id, t.sort_order ASC, t.created_at ASC`
      );

      // 按项目分组并计算WBS编码
      const existingTasksByProject = new Map<string, any[]>();
      const existingWbsCodeMap = new Map<string, { taskId: string; projectId: string }>(); // 全局WBS编码映射

      const wbsService = new (await import('../../core/wbs/WbsCodeService')).WbsCodeService();
      for (const row of allExistingTasks) {
        if (!existingTasksByProject.has(row.project_id)) {
          existingTasksByProject.set(row.project_id, []);
        }
        existingTasksByProject.get(row.project_id)!.push(row);
      }

      // 为每个项目计算WBS编码并建立映射
      for (const [projectId, projTasks] of existingTasksByProject) {
        const tasksWithCodes = wbsService.attachCodes(projTasks);
        for (const t of tasksWithCodes) {
          existingWbsCodeMap.set(t.wbs_code, { taskId: t.id, projectId });
        }
      }

      // P15: 预验证 - WBS编码格式和重复检查，收集所有错误
      const wbsCodePattern = /^\d+(\.\d+)*$/;
      const wbsCodeSet = new Set<string>();
      const preValidationErrors: Array<{ success: boolean; wbs_code?: string; rowNumber?: number; error?: string }> = [];

      for (const taskData of tasks) {
        const wbsCode = (
          taskData['WBS编码*'] ||
          taskData['WBS编码'] ||
          taskData.wbs_code ||
          taskData.wbsCode
        ) as string;
        const rowNumber = taskData.rowNumber as number | undefined;

        if (wbsCode && !wbsCodePattern.test(wbsCode)) {
          preValidationErrors.push({
            success: false,
            wbs_code: wbsCode,
            rowNumber,
            error: `WBS编码格式无效：${wbsCode}，应为数字点分格式（如 1, 1.1, 1.2.3）`
          });
          continue;
        }
        if (wbsCode && wbsCodeSet.has(wbsCode)) {
          preValidationErrors.push({
            success: false,
            wbs_code: wbsCode,
            rowNumber,
            error: `WBS编码重复：${wbsCode}`
          });
          continue;
        }
        if (wbsCode) wbsCodeSet.add(wbsCode);
      }

      // 如果预验证发现错误，返回所有错误
      if (preValidationErrors.length > 0) {
        return {
          total: tasks.length,
          success: 0,
          failed: tasks.length,
          results: preValidationErrors,
        };
      }

      // 性能优化：预加载用户姓名到ID映射
      const [allUsers] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
        'SELECT id, real_name FROM users WHERE is_active = 1'
      );
      const userNameToIdMap = new Map<string, number>();
      for (const user of allUsers) {
        if (user.real_name) {
          userNameToIdMap.set(user.real_name, user.id);
        }
      }

      for (const taskData of tasks) {
        try {
          // 解析任务数据 - 兼容前端导出的列名格式和驼峰命名
          const wbsCode = (
            taskData['WBS编码*'] ||
            taskData['WBS编码'] ||
            taskData.wbs_code ||
            taskData.wbsCode
          ) as string;
          const description = (
            taskData['描述*'] ||
            taskData['任务描述'] ||
            taskData.description
          ) as string;
          const rowNumber = taskData.rowNumber as number | undefined;

          if (!wbsCode || !description) {
            results.push({ success: false, wbs_code: wbsCode, rowNumber, error: '缺少必填字段：WBS编码或描述' });
            continue;
          }

          // 解析项目编码并查找项目UUID
          const projectCode = (
            taskData['项目编码'] ||
            taskData['项目编码*'] ||
            taskData.project_code ||
            taskData.projectCode
          ) as string;

          if (!projectCode) {
            results.push({ success: false, wbs_code: wbsCode, rowNumber, error: '缺少项目编码' });
            continue;
          }

          // 从缓存或数据库获取项目ID
          let projectId: string | undefined = projectCache.get(projectCode);
          if (!projectId) {
            const project = await this.projectRepo.getProjectByCode(projectCode);
            if (!project) {
              results.push({ success: false, wbs_code: wbsCode, rowNumber, error: `项目编码不存在: ${projectCode}` });
              continue;
            }
            projectId = project.id;
            projectCache.set(projectCode, projectId);
          }

          // 解析 WBS 层级和排序
          const wbsParts = wbsCode.split('.');
          const wbsLevel = wbsParts.length;
          // 使用行号作为 sort_order，保证导入顺序与 Excel 顺序一致
          // 这样可以确保父任务在子任务之前被创建和存储到 taskMap
          const sortOrder = rowNumber || (results.length + 1);

          // 查找父任务（性能优化：使用预加载的映射）
          let parentId: string | undefined;
          let parentProjectId: string | undefined;
          if (wbsLevel > 1) {
            const parentWbsCode = wbsParts.slice(0, -1).join('.');
            // 先从当前批次查找
            const parentInfo = taskMap.get(parentWbsCode);
            if (parentInfo) {
              parentId = parentInfo.taskId;
              parentProjectId = parentInfo.projectId;
            }
            // 再从预加载的现有任务映射查找
            if (!parentId) {
              const existingParent = existingWbsCodeMap.get(parentWbsCode);
              if (existingParent) {
                parentId = existingParent.taskId;
                parentProjectId = existingParent.projectId;
              }
            }
            if (!parentId) {
              results.push({ success: false, wbs_code: wbsCode, rowNumber, error: `父任务不存在：${parentWbsCode}。请先导入父任务，或确保导入文件按层级顺序排列。` });
              continue;
            }
          }

          // 项目一致性处理：子任务自动继承父任务的项目
          if (parentProjectId && parentProjectId !== projectId) {
            projectId = parentProjectId;
          }

          // 解析前置任务 - 性能优化：使用预加载的映射
          let predecessorId: string | undefined;
          const predecessorWbs = (
            taskData['前置任务WBS'] ||
            taskData['前置任务'] ||
            taskData.predecessor_wbs ||
            taskData.predecessorCode
          );
          if (predecessorWbs) {
            // 先从当前批次查找
            const predInfo = taskMap.get(predecessorWbs as string);
            if (predInfo) {
              predecessorId = predInfo.taskId;
            }
            // 再从预加载的现有任务映射查找
            if (!predecessorId) {
              const existingPred = existingWbsCodeMap.get(predecessorWbs as string);
              if (existingPred) {
                predecessorId = existingPred.taskId;
              }
            }
            if (!predecessorId) {
              results.push({ success: false, wbs_code: wbsCode, rowNumber, error: `前置任务不存在：${predecessorWbs}。请先导入前置任务。` });
              continue;
            }
          }

          // 解析负责人ID - 性能优化：使用预加载的用户映射
          let assigneeId: number | undefined;
          const assigneeIdValue = taskData['负责人ID'] || taskData.assignee_id;
          const assigneeNameValue = taskData['负责人'] || taskData.assignee_name || taskData.assigneeName;
          if (assigneeIdValue) {
            assigneeId = parseInt(String(assigneeIdValue));
          } else if (assigneeNameValue) {
            // 使用预加载的用户映射
            assigneeId = userNameToIdMap.get(String(assigneeNameValue));
          }

          // 创建任务请求
          const createRequest: CreateTaskRequest = {
            project_id: projectId,
            parent_id: parentId,
            wbs_level: wbsLevel,
            sort_order: sortOrder,
            description,
            task_type: mapTaskType(String(taskData['任务类型'] || taskData.task_type || '')) as import('./types').TaskType,
            priority: (taskData['优先级'] || taskData.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
            assignee_id: assigneeId,
            start_date: (taskData['开始日期'] || taskData.start_date) as string | undefined,
            duration: taskData['工期'] || taskData.duration ? parseInt(String(taskData['工期'] || taskData.duration)) : undefined,
            is_six_day_week: taskData['六天工作制'] === 'true' ||
                             taskData['单休'] === '是' ||
                             taskData.is_six_day_week === true,
            warning_days: taskData['预警天数'] || taskData.warning_days ? parseInt(String(taskData['预警天数'] || taskData.warning_days)) : 3,
            predecessor_id: predecessorId,
            dependency_type: (taskData['依赖类型'] || taskData.dependency_type || 'FS') as import('./types').DependencyType,
            lag_days: taskData['滞后天数'] || taskData['提前/落后'] || taskData.lag_days ? parseInt(String(taskData['滞后天数'] || taskData['提前/落后'] || taskData.lag_days)) : 0,
            redmine_link: (taskData['Redmine链接'] || taskData.redmine_link) as string | undefined,
            full_time_ratio: taskData['全职比例'] || taskData['全职比(%)'] || taskData.full_time_ratio ? parseInt(String(taskData['全职比例'] || taskData['全职比(%)'] || taskData.full_time_ratio)) : 100,
          };

          // 使用事务连接创建任务（跳过权限检查，导入操作需要覆盖多个项目）
          const taskId = await this.createTaskWithConnection(connection, createRequest, currentUser, true);
          taskMap.set(wbsCode, { taskId, projectId });
          // 同时更新现有任务映射，供后续任务查找
          existingWbsCodeMap.set(wbsCode, { taskId, projectId });
          logger.info('[Task] 导入成功: WBS=%s, 行号=%s, taskId=%s', wbsCode, rowNumber, taskId);

          // 性能优化：批量提交事务（每BATCH_SIZE条提交一次）
          batchCount++;
          if (batchCount >= BATCH_SIZE) {
            await connection.commit();
            await connection.beginTransaction();
            batchCount = 0;
          }

          results.push({ success: true, wbs_code: wbsCode, rowNumber });
        } catch (err) {
          const wbsCode = (
            taskData['WBS编码*'] ||
            taskData['WBS编码'] ||
            taskData.wbs_code ||
            taskData.wbsCode ||
            '未知'
          ) as string;
          const rowNumber = taskData.rowNumber as number | undefined;
          const errorMsg = err instanceof Error ? err.message : '创建失败';
          logger.error('[Task] 导入失败: WBS=%s, 行号=%s, 错误=%s, 堆栈=%s', wbsCode, rowNumber, errorMsg, err instanceof Error ? err.stack : '');
          results.push({ success: false, wbs_code: wbsCode, rowNumber, error: errorMsg });

          // 回滚当前失败的任务，开启新事务继续处理
          try { await connection.rollback(); } catch { /* ignore */ }
          try { await connection.beginTransaction(); } catch { /* ignore */ }
          batchCount = 0;
        }
      }

      // 最终提交当前事务（如果最后一个任务是成功的，需要提交）
      try { await connection.commit(); } catch { /* ignore */ }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      // 导入完成后，校正所有受影响项目的 sort_order
      if (successCount > 0) {
        const affectedProjects = new Set<string>();
        taskMap.forEach(info => affectedProjects.add(info.projectId));
        for (const projectId of affectedProjects) {
          try {
            await this.ensureProjectSortOrder(projectId);
          } catch (err) {
            logger.warn(`[Task] 校正项目 ${projectId} 的 sort_order 失败:`, err);
          }
        }
      }

      return {
        total: tasks.length,
        success: successCount,
        failed: failedCount,
        results,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 使用指定连接创建任务（用于事务场景）
   * @param connection 数据库连接（事务）
   * @param data 任务数据
   * @param currentUser 当前用户
   */
  private async createTaskWithConnection(
    connection: import('mysql2/promise').PoolConnection,
    data: CreateTaskRequest,
    currentUser: User,
    skipPermissionCheck: boolean = false
  ): Promise<string> {
    // 验证必填字段
    if (!data.project_id) {
      throw new ValidationError('请选择所属项目');
    }
    if (!data.description) {
      throw new ValidationError('任务描述不能为空');
    }
    if (data.duration !== undefined && data.duration !== null && data.duration <= 0) {
      throw new ValidationError('工期必须大于0');
    }

    // 项目成员权限验证（非管理员需要是项目成员）
    // 导入场景可跳过权限检查
    if (!skipPermissionCheck && currentUser.role !== 'admin') {
      const [memberRows] = await connection.execute<import('mysql2/promise').RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND user_id = ?',
        [data.project_id, currentUser.id]
      );
      if (memberRows[0].count === 0) {
        throw new ForbiddenError('您不是该项目的成员，无权限在此项目创建任务');
      }
    }

    // 计算WBS等级
    let wbsLevel = 1;
    let isSixDayWeek = data.is_six_day_week ?? false;
    if (data.parent_id) {
      const parent = await this.repo.getTaskById(data.parent_id);
      if (parent) {
        // 项目一致性：如果父任务项目不同，使用父任务的项目
        // 这支持导入场景，子任务自动继承父任务的项目
        if (parent.project_id !== data.project_id) {
          data.project_id = parent.project_id;
        }
        wbsLevel = parent.wbs_level + 1;
        if (wbsLevel > MAX_WBS_LEVEL) {
          throw new ValidationError(`WBS层级不能超过${MAX_WBS_LEVEL}级`);
        }
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
      startDate = new Date(data.start_date);
    } else {
      startDate = new Date();
    }

    endDate = await calculateEndDate(startDate, duration, isSixDayWeek);
    const plannedDuration = calculatePlannedDuration(startDate, endDate);

    const id = uuidv4();
    const status: TaskStatus = 'not_started';

    // XSS 防护
    const sanitizedDescription = sanitizeString(data.description);

    // 使用事务连接执行插入（存储 sort_order 以保持导入顺序）
    await connection.execute(
      `INSERT INTO wbs_tasks (
        id, project_id, parent_id, wbs_level, sort_order, description, status, task_type, priority,
        assignee_id, start_date, end_date, duration, planned_duration, is_six_day_week, warning_days, predecessor_id, dependency_type, lag_days,
        redmine_link, full_time_ratio, delay_count, plan_change_count, progress_record_count, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1)`,
      [
        id, data.project_id, data.parent_id || null, wbsLevel, data.sort_order ?? null, sanitizedDescription,
        status, data.task_type || 'other', data.priority || 'medium', data.assignee_id || null,
        formatLocalDate(startDate), formatLocalDate(endDate), data.duration || null,
        plannedDuration ?? null,
        isSixDayWeek,
        data.warning_days || 3, data.predecessor_id || null, data.dependency_type || 'FS', data.lag_days || null,
        data.redmine_link || null, data.full_time_ratio ?? 100
      ]
    );

    // 创建初始进展记录
    const initialInfo = [
      `层级: ${wbsLevel}`,
      `工期: ${duration}天`,
      data.start_date ? `计划开始: ${formatLocalDate(startDate)}` : null,
    ].filter(Boolean).join('，');

    await connection.execute(
      'INSERT INTO progress_records (id, task_id, content, recorded_by) VALUES (?, ?, ?, ?)',
      [uuidv4(), id, `📝 任务创建。${initialInfo}`, currentUser.id]
    );

    // 更新进展记录计数
    await connection.execute(
      'UPDATE wbs_tasks SET progress_record_count = progress_record_count + 1 WHERE id = ?',
      [id]
    );

    return id;
  }

  // ========== P11: 批量操作 ==========

  /**
   * 批量更新任务
   *
   * @param ids 任务ID列表
   * @param updates 更新内容
   * @param currentUser 当前用户
   * @param atomic 是否使用原子事务模式（默认 false）
   *                - false: 尽力而为模式，逐个更新，失败不影响其他任务
   *                - true: 原子模式，使用事务包裹，任一失败则全部回滚
   */
  async batchUpdateTasks(
    ids: string[],
    updates: Partial<UpdateTaskRequest>,
    currentUser: User,
    atomic: boolean = false
  ): Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }> {
    const errors: Array<{ id: string; error: string }> = [];
    let success = 0;

    // 允许批量更新的字段（白名单）
    const allowedFields = ['assignee_id', 'priority', 'task_type', 'warning_days', 'is_six_day_week'];
    const filteredUpdates: Partial<UpdateTaskRequest> = {};
    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        (filteredUpdates as any)[field] = (updates as any)[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new ValidationError('没有有效的更新字段');
    }

    if (atomic) {
      // 原子模式：使用事务，任一失败则全部回滚
      const pool = (await import('../../core/db')).getPool();
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (const id of ids) {
          const task = await this.repo.getTaskById(id);
          if (!task) {
            throw new ValidationError(`任务 ${id} 不存在，事务回滚`);
          }

          // 构建更新语句
          const fields: string[] = [];
          const values: (string | number | boolean | null)[] = [];
          for (const field of allowedFields) {
            if ((filteredUpdates as any)[field] !== undefined) {
              fields.push(`${field} = ?`);
              values.push((filteredUpdates as any)[field]);
            }
          }
          fields.push('version = version + 1');
          values.push(id, task.version);

          await connection.execute(
            `UPDATE wbs_tasks SET ${fields.join(', ')} WHERE id = ? AND version = ?`,
            values
          );
          success++;
        }

        await connection.commit();
        return { success, failed: 0, errors: [] };
      } catch (error) {
        await connection.rollback();
        return { success: 0, failed: ids.length, errors: [{ id: ids[0], error: error instanceof Error ? error.message : '批量更新失败，已回滚' }] };
      } finally {
        connection.release();
      }
    }

    // 尽力而为模式：逐个更新，失败不影响其他任务
    for (const id of ids) {
      try {
        const task = await this.repo.getTaskById(id);
        if (!task) {
          errors.push({ id, error: '任务不存在' });
          continue;
        }

        await this.repo.updateTask(id, { ...filteredUpdates, version: task.version });
        success++;
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : '更新失败' });
      }
    }

    return { success, failed: errors.length, errors };
  }

  /**
   * 批量删除任务（管理员专用）
   *
   * @param ids 任务ID列表
   * @param currentUser 当前用户
   * @param atomic 是否使用原子事务模式（默认 false）
   *                - false: 尽力而为模式，逐个删除，失败不影响其他任务
   *                - true: 原子模式，使用事务包裹，任一失败则全部回滚
   */
  async batchDeleteTasks(
    ids: string[],
    currentUser: User,
    atomic: boolean = false
  ): Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }> {
    const errors: Array<{ id: string; error: string }> = [];
    let success = 0;

    if (atomic) {
      // 原子模式：使用事务，任一失败则全部回滚
      const pool = (await import('../../core/db')).getPool();
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        for (const id of ids) {
          // 在事务内执行删除（复用 deleteTask 的核心逻辑）
          const task = await this.repo.getTaskById(id);
          if (!task) {
            errors.push({ id, error: '任务不存在' });
            throw new Error(`任务 ${id} 不存在，事务回滚`);
          }

          // 权限检查
          if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
            throw new ForbiddenError('无权限删除任务');
          }

          // 项目成员验证
          if (currentUser.role !== 'admin') {
            const [memberRows] = await connection.execute(
              'SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND user_id = ?',
              [task.project_id, currentUser.id]
            );
            if (memberRows[0].count === 0) {
              throw new ForbiddenError('您不是该项目的成员，无权限删除任务');
            }
          }

          // 获取所有后代任务
          const [descendants] = await connection.execute(
            `WITH RECURSIVE TaskTree AS (
              SELECT id FROM wbs_tasks WHERE id = ?
              UNION ALL
              SELECT t.id FROM wbs_tasks t
              INNER JOIN TaskTree tt ON t.parent_id = tt.id
            ) SELECT id FROM TaskTree`,
            [id]
          );
          const descendantIds = (descendants as any[]).map(r => r.id);

          // 清除前置关系
          if (descendantIds.length > 0) {
            const placeholders = descendantIds.map(() => '?').join(',');
            await connection.execute(
              `UPDATE wbs_tasks SET predecessor_id = NULL WHERE predecessor_id IN (${placeholders})`,
              descendantIds
            );
            // 删除任务
            await connection.execute(
              `DELETE FROM wbs_tasks WHERE id IN (${placeholders})`,
              descendantIds
            );
          }
          success++;
        }

        await connection.commit();
        return { success, failed: 0, errors: [] };
      } catch (error) {
        await connection.rollback();
        return { success: 0, failed: ids.length, errors: [{ id: ids[0], error: error instanceof Error ? error.message : '批量删除失败，已回滚' }] };
      } finally {
        connection.release();
      }
    }

    // 尽力而为模式：逐个删除，失败不影响其他任务
    for (const id of ids) {
      try {
        await this.deleteTask(id, currentUser);
        success++;
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : '删除失败' });
      }
    }

    return { success, failed: errors.length, errors };
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
   * - 计划未刷新：不累加（延期后用户还没有刷新计划）
   * - 刷新后再次超期：再+1（延期后用户刷新了计划，然后又延期了）
   */
  async incrementDelayCount(taskId: string): Promise<{ incremented: boolean; reason: string }> {
    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    const lastRefresh = task.last_plan_refresh_at ? new Date(task.last_plan_refresh_at) : null;
    const endDate = task.end_date ? new Date(task.end_date) : null;

    // 规则1：首次延期（delay_count == 0）
    if (task.delay_count === 0) {
      await this.repo.incrementTaskCounter(taskId, 'delay_count');
      return { incremented: true, reason: '首次延期，延期次数+1' };
    }

    // 规则2：之前延期过，检查是否刷新了计划
    if (!lastRefresh) {
      // 从未刷新过计划，不累加
      return { incremented: false, reason: '计划未刷新，不累加延期次数' };
    }

    // 规则3：刷新后再次超期
    // 判断刷新是否在原计划结束日期之后（延期后刷新）
    // 如果 last_plan_refresh_at 在 end_date 之后，说明延期后刷新了计划
    if (endDate && lastRefresh > endDate) {
      await this.repo.incrementTaskCounter(taskId, 'delay_count');
      return { incremented: true, reason: '刷新计划后再次超期，延期次数+1' };
    }

    // 规则2续：刷新时间在结束日期之前，不算"延期后刷新"
    return { incremented: false, reason: '计划未刷新，不累加延期次数' };
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

  // ========== 通知相关 ==========

  /**
   * 发送任务分配通知
   */
  private async sendTaskAssignedNotification(
    task: WBSTask,
    assigneeId: number,
    assignedBy: User
  ): Promise<void> {
    try {
      const notificationId = uuidv4();
      const title = '新任务分配';
      const content = `${assignedBy.real_name} 将任务 "${task.description}" 分配给了您`;

      await this.workflowRepo.createNotification({
        id: notificationId,
        user_id: assigneeId,
        type: 'task_assigned',
        title,
        content,
        link: `/tasks/${task.id}`,
        project_id: task.project_id,
        task_id: task.id,
      });

      // WebSocket 推送
      sendToUser(assigneeId, 'notification', {
        id: notificationId,
        type: 'task_assigned',
        title,
        content,
        link: `/tasks/${task.id}`,
        project_id: task.project_id,
        task_id: task.id,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      logger.info(`[Task] 已发送任务分配通知给用户 ${assigneeId}`);
    } catch (error) {
      logger.error('[Task] 发送任务分配通知失败: %s', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 发送任务完成通知
   */
  private async sendTaskCompletedNotification(task: WBSTask, completedBy: User): Promise<void> {
    try {
      // 通知项目经理
      const projectManagers = await this.workflowRepo.getProjectManagers(task.project_id);
      const notificationId = uuidv4();
      const title = '任务完成';
      const content = `${completedBy.real_name} 完成了任务 "${task.description}"`;

      for (const manager of projectManagers) {
        const id = uuidv4();
        await this.workflowRepo.createNotification({
          id,
          user_id: manager.id,
          type: 'task_completed',
          title,
          content,
          link: `/tasks/${task.id}`,
          project_id: task.project_id,
          task_id: task.id,
        });

        sendToUser(manager.id, 'notification', {
          id,
          type: 'task_completed',
          title,
          content,
          link: `/tasks/${task.id}`,
          project_id: task.project_id,
          task_id: task.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      logger.info(`[Task] 已发送任务完成通知`);
    } catch (error) {
      logger.error('[Task] 发送任务完成通知失败: %s', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 生成任务导入模板（带数据验证）
   * 任务类型列提供下拉框选项
   * 项目编码列提供下拉框选项
   */
  async generateImportTemplate(
    taskTypes: Array<{ code: string; name: string; is_active: boolean }>,
    projects: Array<{ id: string; code: string; name: string }>
  ): Promise<Buffer> {
    const exceljsModule = await import('exceljs');
    const ExcelJS = exceljsModule.default || exceljsModule;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('任务导入模板');

    // 定义列（28列，与前端模板一致）
    worksheet.columns = [
      { header: 'WBS等级', key: 'wbsLevel', width: 10 },
      { header: 'WBS编码', key: 'wbsCode', width: 12 },
      { header: '任务描述', key: 'description', width: 30 },
      { header: '任务状态', key: 'status', width: 12 },
      { header: 'Redmine链接', key: 'redmineLink', width: 25 },
      { header: '负责人', key: 'assigneeName', width: 12 },
      { header: '任务类型', key: 'taskType', width: 12 },
      { header: '优先级', key: 'priority', width: 10 },
      { header: '前置任务', key: 'predecessorCode', width: 15 },
      { header: '提前/落后', key: 'lagDays', width: 12 },
      { header: '开始日期', key: 'startDate', width: 12 },
      { header: '工期', key: 'duration', width: 10 },
      { header: '单休', key: 'isSixDayWeek', width: 8 },
      { header: '结束日期', key: 'endDate', width: 12 },
      { header: '计划周期', key: 'plannedDuration', width: 10 },
      { header: '预警天数', key: 'warningDays', width: 10 },
      { header: '实际开始', key: 'actualStartDate', width: 12 },
      { header: '实际结束', key: 'actualEndDate', width: 12 },
      { header: '实际工期', key: 'actualDuration', width: 10 },
      { header: '全职比(%)', key: 'fullTimeRatio', width: 12 },
      { header: '实际周期', key: 'actualCycle', width: 10 },
      { header: '项目编码', key: 'projectCode', width: 15 },
      { header: '项目名称', key: 'projectName', width: 20 },
      { header: '延期次数', key: 'delayCount', width: 10 },
      { header: '延期历史', key: 'delayHistory', width: 30 },
      { header: '计划调整', key: 'planChangeCount', width: 10 },
      { header: '计划调整历史', key: 'planChangeHistory', width: 30 },
      { header: '进展记录', key: 'progressRecords', width: 30 },
    ];

    // 表头样式
    worksheet.getRow(1).eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center' },
      };
    });

    // 任务类型列（第7列，G列）添加数据验证（下拉框）
    const activeTaskTypes = taskTypes.filter(t => t.is_active);
    const typeNames = activeTaskTypes.map(t => t.name).join(',');

    // 为数据区域添加数据验证（从第2行到第1000行，足够使用）
    for (let row = 2; row <= 1000; row++) {
      const cell = worksheet.getCell(row, 7);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${typeNames}"`],
        prompt: '请选择任务类型',
        promptTitle: '任务类型',
      };
    }

    // 优先级列（第8列，H列）添加数据验证
    const priorityOptions = '紧急,高,中,低';
    for (let row = 2; row <= 1000; row++) {
      const cell = worksheet.getCell(row, 8);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${priorityOptions}"`],
        prompt: '请选择优先级',
        promptTitle: '优先级',
      };
    }

    // 单休列（第13列，M列）添加数据验证
    for (let row = 2; row <= 1000; row++) {
      const cell = worksheet.getCell(row, 13);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"是,否"'],
        prompt: '是否六天工作制',
        promptTitle: '单休',
      };
    }

    // 项目编码列（第22列，V列）添加数据验证（下拉框）
    // 格式：项目编码（便于用户选择）
    const projectOptions = projects.map(p => p.code).join(',');
    for (let row = 2; row <= 1000; row++) {
      const cell = worksheet.getCell(row, 22);
      cell.dataValidation = {
        type: 'list',
        allowBlank: false, // 项目编码必填
        formulae: [`"${projectOptions}"`],
        prompt: '请选择项目编码',
        promptTitle: '项目编码',
      };
    }

    // 示例数据行
    worksheet.addRow([
      1,                                              // WBS等级
      '1',                                            // WBS编码
      '示例任务（请删除此行）',                         // 任务描述
      '未开始',                                        // 任务状态
      'https://redmine.example.com/issues/123',      // Redmine链接
      '张三',                                          // 负责人
      activeTaskTypes[0]?.name || '固件',             // 任务类型
      '中',                                            // 优先级
      '',                                              // 前置任务
      0,                                               // 提前/落后
      new Date().toISOString().split('T')[0],         // 开始日期
      5,                                               // 工期
      '否',                                            // 单休
      '',                                              // 结束日期（自动计算）
      '',                                              // 计划周期（自动计算）
      3,                                               // 预警天数
      '',                                              // 实际开始
      '',                                              // 实际结束
      '',                                              // 实际工期（自动计算）
      100,                                             // 全职比(%)
      '',                                              // 实际周期（自动计算）
      projects[0]?.code || '',                        // 项目编码（必填，下拉选择）
      '',                                              // 项目名称（只读）
      0,                                               // 延期次数
      '',                                              // 延期历史
      0,                                               // 计划调整
      '',                                              // 计划调整历史
      '',                                              // 进展记录
    ]);

    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ========== 任务层级管理 ==========

  /**
   * 修改任务等级
   * 核心逻辑：根据目标等级确定新 parent_id，重新计算 WBS 编码，连带子树一起移动
   *
   * 提升时：沿原 parent 链向上找目标等级的祖先，排在原父任务之后
   * 降低时：上方最近同级任务成为新 parent
   *
   * 关键：提升后需要设置 sort_order，使任务排在原父任务之后（而非末尾）
   */
  async changeTaskLevel(taskId: string, targetLevel: number, currentUser: User): Promise<WBSTask[]> {
    // 权限检查
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权修改任务层级');
    }

    // 等级范围验证
    const MAX_LEVEL = 5;
    if (targetLevel < 1 || targetLevel > MAX_LEVEL) {
      throw new ValidationError(`等级必须在 1-${MAX_LEVEL} 之间`);
    }

    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 边界规则：根任务不能再提升
    if (task.wbs_level === 1 && targetLevel < 1) {
      throw new ValidationError('根任务不能再提升');
    }

    // 边界规则：第5层任务不能再降低
    if (task.wbs_level === MAX_LEVEL && targetLevel > MAX_LEVEL) {
      throw new ValidationError(`第${MAX_LEVEL}层任务不能再降低`);
    }

    // 等级未变，直接返回
    if (task.wbs_level === targetLevel) {
      return [];
    }

    // 获取所有后代（子树）
    const descendants = await this.repo.getTaskWithDescendants(taskId);
    // descendants[0] 是任务自身
    const children = descendants.slice(1);

    // 计算子树最大深度
    const maxDescendantDepth = children.reduce(
      (max, d) => Math.max(max, d.wbs_level - task.wbs_level),
      0
    );
    const newMaxDepth = targetLevel + maxDescendantDepth;
    if (newMaxDepth > MAX_LEVEL) {
      throw new ValidationError(`提升后子树最大层级将达到 ${newMaxDepth}，超过 ${MAX_LEVEL} 层限制`);
    }

    let newParentId: string | null;
    let afterTaskId: string | null = null; // 排在这个任务之后

    if (targetLevel < task.wbs_level) {
      // 提升层级：排在原父任务之后
      // 1. 找到原父任务
      const parentTask = task.parent_id ? await this.repo.getTaskById(task.parent_id) : null;

      // 2. 找到原父任务在目标等级的祖先（即"排在谁之后"）
      const ancestors = await this.repo.getAncestorChain(taskId);
      const targetAncestor = ancestors.find(a => a.wbs_level === targetLevel);

      if (!targetAncestor) {
        // 没有目标等级的祖先 → 变为根任务
        newParentId = null;
        // 排在原父任务（作为根任务）之后
        if (parentTask && parentTask.wbs_level === targetLevel) {
          afterTaskId = parentTask.id;
        }
      } else {
        // 新 parent = 目标祖先的 parent
        newParentId = targetAncestor.parent_id;
        // 排在目标祖先之后
        afterTaskId = targetAncestor.id;
      }
    } else {
      // 降低层级：上方最近同级任务成为新 parent
      const prevSibling = await this.repo.getPreviousSibling(taskId);
      if (!prevSibling) {
        throw new ValidationError('上方没有同级任务，无法降低层级');
      }
      newParentId = prevSibling.id;
      // 降低时不设置 afterTaskId，因为成为子任务排在末尾
    }

    // 循环引用检测：新 parent 不能是自己的后代
    if (newParentId) {
      const descendantIds = new Set(descendants.map(d => d.id));
      if (descendantIds.has(newParentId)) {
        throw new ValidationError('不能将任务移动到自己的子任务下');
      }

      // 项目一致性验证：新 parent 必须属于同一项目
      const newParent = await this.repo.getTaskById(newParentId);
      if (newParent && newParent.project_id !== task.project_id) {
        throw new ValidationError('不能将任务移动到其他项目的任务下');
      }
    }

    // 收集所有需要更新的任务
    const allUpdates: Array<{
      id: string;
      parent_id: string | null;
      wbs_level: number;
      sort_order?: number | null;
    }> = [];

    // 1. 移动任务自身（提升时需要设置 sort_order）
    allUpdates.push({
      id: taskId,
      parent_id: newParentId,
      wbs_level: targetLevel,
      // sort_order 在下面重新计算后设置
    });

    // 2. 子树中的后代：保持相对层级关系
    for (const child of children) {
      const relativeDepth = child.wbs_level - task.wbs_level;
      const childLevel = targetLevel + relativeDepth;
      allUpdates.push({
        id: child.id,
        parent_id: child.parent_id === task.id ? taskId : child.parent_id,
        wbs_level: childLevel,
      });
    }

    // 3. 执行层级更新（不含 sort_order）
    await this.repo.batchUpdateTaskHierarchy(allUpdates);

    // 4. 提升时重新计算 sort_order（排在原父任务之后）
    if (targetLevel < task.wbs_level && afterTaskId) {
      // 获取新 parent 下的所有同级任务（包括刚移动的任务）
      const siblings = await this.repo.getSiblings(task.project_id, newParentId);
      const others = siblings.filter(s => s.id !== taskId);

      // 找到 afterTask 的位置
      const afterIndex = others.findIndex(s => s.id === afterTaskId);
      if (afterIndex !== -1) {
        // 插入到 afterTask 之后
        others.splice(afterIndex + 1, 0, task);
      } else {
        // afterTask 不在同级列表中（可能是跨项目或已删除），排在末尾
        others.push(task);
      }

      // 重新计算所有同级任务的 sort_order
      const BATCH_GAP = 100;
      const sortOrderUpdates: Array<{ id: string; sort_order: number }> = [];
      others.forEach((sibling, index) => {
        sortOrderUpdates.push({
          id: sibling.id,
          sort_order: (index + 1) * BATCH_GAP,
        });
      });

      await this.repo.batchUpdateSortOrder(sortOrderUpdates);
    }

    // 5. 清除项目缓存（所有用户）
    await wbsCodeCache.deleteProjectCache(task.project_id);

    // 清除当前用户的全局缓存（任务列表查询使用 'global' 作为 projectId）
    await wbsCodeCache.delete(currentUser.id, 'global');

    // 刷新 WBS 编码全局注册表
    await wbsCodeRegistry.refreshProject(task.project_id);

    // 6. 返回所有受影响的任务
    const affectedIds = allUpdates.map(u => u.id);
    return this.repo.getTasksByIds(affectedIds);
  }

  /**
   * 拖拽排序：在同级任务中调整顺序
   * 只更新 sort_order，WBS 编码实时计算
   * @param taskId 要移动的任务 ID
   * @param afterTaskId 放在哪个任务之后（null 表示排到最前）
   */
  async reorderTask(taskId: string, afterTaskId: string | null, currentUser: User): Promise<void> {
    // 权限检查
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权调整任务顺序');
    }

    const task = await this.repo.getTaskById(taskId);
    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 项目一致性验证：afterTask 必须属于同一项目和同一父任务
    if (afterTaskId) {
      const afterTask = await this.repo.getTaskById(afterTaskId);
      if (!afterTask) {
        throw new ValidationError('目标任务不存在');
      }
      if (afterTask.project_id !== task.project_id) {
        throw new ValidationError('不能将任务移动到其他项目的任务之后');
      }
      if (afterTask.parent_id !== task.parent_id) {
        throw new ValidationError('只能调整同级任务的顺序');
      }
    }

    // 获取同级任务（按 sort_order 排序）
    const siblings = await this.repo.getSiblings(task.project_id, task.parent_id);

    // 从列表中移除当前任务
    const others = siblings.filter(s => s.id !== taskId);

    // 插入到目标位置
    let insertIndex = 0;
    if (afterTaskId) {
      const afterIndex = others.findIndex(s => s.id === afterTaskId);
      if (afterIndex === -1) {
        throw new ValidationError('目标任务不存在或不属于同级');
      }
      insertIndex = afterIndex + 1;
    }

    others.splice(insertIndex, 0, task);

    // 重新计算 sort_order
    const updates: Array<{ id: string; sort_order: number }> = [];
    const BATCH_GAP = 100; // 编号间隔，便于后续插入

    others.forEach((sibling, index) => {
      updates.push({
        id: sibling.id,
        sort_order: (index + 1) * BATCH_GAP,
      });
    });

    // 批量更新 sort_order
    await this.repo.batchUpdateSortOrder(updates);

    // 清除项目缓存
    await wbsCodeCache.deleteProjectCache(task.project_id);

    // 清除当前用户的全局缓存（任务列表查询使用 'global' 作为 projectId）
    await wbsCodeCache.delete(currentUser.id, 'global');

    // 刷新 WBS 编码全局注册表
    await wbsCodeRegistry.refreshProject(task.project_id);
  }

  // ========== WBS 排序自动校正 ==========

  /**
   * 确保项目的 sort_order 符合 WBS 层级结构
   * 如果不一致则重新计算并保存
   * @returns true 表示进行了校正，false 表示无需校正
   */
  async ensureProjectSortOrder(projectId: string): Promise<boolean> {
    // 获取项目所有任务
    const tasks = await this.repo.getTasksForCodeCalculation(projectId);
    if (tasks.length === 0) return false;

    // 使用 WbsCodeService 计算当前 sort_order 对应的 WBS 编码
    const tasksWithCodes = wbsCodeService.attachCodes(tasks as any);

    // 检查排序一致性
    const needsRecalculation = this.checkSortOrderConsistency(tasksWithCodes);

    if (needsRecalculation) {
      await this.recalculateAndSaveSortOrder(tasksWithCodes);
      logger.info(`[WBS] 项目 ${projectId} 的 sort_order 已校正`);
      return true;
    }
    return false;
  }

  /**
   * 检查 sort_order 排序是否与 WBS 编码顺序一致
   */
  private checkSortOrderConsistency(
    tasks: Array<{ id: string; wbs_code: string; sort_order: number | null }>
  ): boolean {
    if (tasks.length === 0) return false;

    // 按 sort_order 排序（NULL 视为最大值）
    const sortedBySortOrder = [...tasks].sort((a, b) => {
      if (a.sort_order === null && b.sort_order === null) return 0;
      if (a.sort_order === null) return 1;
      if (b.sort_order === null) return -1;
      return a.sort_order - b.sort_order;
    });

    // 按 WBS 编码排序
    const sortedByWbsCode = this.sortByWbsCode(tasks);

    // 比较两个顺序是否一致
    for (let i = 0; i < sortedBySortOrder.length; i++) {
      if (sortedBySortOrder[i].id !== sortedByWbsCode[i].id) {
        return true; // 顺序不一致，需要校正
      }
    }
    return false;
  }

  /**
   * 按 WBS 编码排序（1 < 1.1 < 1.2 < 2 < 2.1）
   */
  private sortByWbsCode<T extends { wbs_code: string }>(tasks: T[]): T[] {
    return [...tasks].sort((a, b) => {
      const aParts = a.wbs_code.split('.').map(Number);
      const bParts = b.wbs_code.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] ?? 0;
        const bVal = bParts[i] ?? 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  }

  /**
   * 重新计算 sort_order 并保存到数据库
   */
  private async recalculateAndSaveSortOrder(
    tasks: Array<{ id: string; wbs_code: string }>
  ): Promise<void> {
    // 按 WBS 编码排序
    const sorted = this.sortByWbsCode(tasks);

    // 分配新的 sort_order（间隔 100）
    const updates: Array<{ id: string; sort_order: number }> = sorted.map(
      (task, index) => ({
        id: task.id,
        sort_order: (index + 1) * 100,
      })
    );

    // 批量更新
    await this.repo.batchUpdateSortOrder(updates);
  }
}
