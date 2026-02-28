/**
 * 原子事务辅助工具
 * 提供事务安全的数据库操作，确保多个操作作为一个原子单元执行
 * P1-1: 已启用死锁重试机制，提高并发成功率
 */

import { databaseService } from './DatabaseService.js';
import { systemLogger } from './AsyncSystemLogger.js';
import { withDeadlockRetry } from '../utils/DeadlockRetry.js';

/**
 * 原子创建项目并记录版本（带死锁重试）
 * 确保项目创建和版本记录在同一事务中完成
 */
export async function createProjectWithVersion(
  projectData: {
    code: string;
    name: string;
    description?: string;
    project_type?: string;
    planned_start_date?: Date | null;
    planned_end_date?: Date | null;
    created_by: number;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  // P1-1: 使用死锁重试包装
  return withDeadlockRetry(
    () => databaseService.transaction(async (connection) => {
    try {
      // 1. 插入项目
      const [insertResult] = await connection.execute(
        `INSERT INTO projects (code, name, description, project_type, planned_start_date, planned_end_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projectData.code,
          projectData.name,
          projectData.description || null,
          projectData.project_type || 'other',
          projectData.planned_start_date || null,
          projectData.planned_end_date || null,
          projectData.created_by
        ]
      ) as any[];

      const projectId = insertResult.insertId;

      // 2. 查询新创建的项目（在同一个事务中，使用字段别名转换为 camelCase）
      const [newProject] = await connection.execute(
        `SELECT
          p.id,
          p.code,
          p.name,
          p.description,
          p.status,
          p.project_type as projectType,
          p.planned_start_date as plannedStartDate,
          p.planned_end_date as plannedEndDate,
          p.progress,
          p.task_count as taskCount,
          p.completed_task_count as completedTaskCount,
          p.created_at as createdAt,
          p.updated_at as updatedAt,
          p.created_by as createdBy,
          p.version,
          u.name as created_by_name
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`,
        [projectId]
      ) as any[];

      // 3. 记录版本历史（在同一个事务中）
      await connection.execute(
        `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'project',
          projectId,
          1,
          projectData.created_by,
          'create',
          JSON.stringify(newProject[0]),
          '创建项目'
        ]
      );

      // 4. 记录变更日志（与 GlobalDataManager 保持一致）
      await connection.execute(
        `INSERT INTO data_change_log (data_type, data_id, action, new_value, changed_by, change_reason)
         VALUES (?, ?, 'create', ?, ?, ?)`,
        ['projects', String(projectId), JSON.stringify(newProject[0]), projectData.created_by, '创建项目']
      );

      // 异步记录用户操作到 system_logs
      setImmediate(() => {
        systemLogger.logUserAction(
          'create_project',
          { projectId, code: projectData.code, name: projectData.name },
          projectData.created_by
        ).catch(err => console.error('[AtomicTransaction] 记录日志失败:', err));
      });

      return { success: true, data: newProject[0] };
    } catch (error: any) {
      console.error('[AtomicTransaction] 创建项目失败:', error);
      // 记录错误到 system_logs
      systemLogger.error('创建项目失败', {
        error: error.message,
        projectCode: projectData.code,
        projectName: projectData.name
      }, projectData.created_by).catch(err => console.error('[AtomicTransaction] 记录错误日志失败:', err));
      throw error;
    }
  }), {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  });
}

/**
 * 原子更新项目并记录版本
 */
export async function updateProjectWithVersion(
  projectId: number,
  updateData: {
    name?: string;
    description?: string;
    status?: string;
    progress?: number;
    expectedVersion?: number;
    // 新增支持的字段
    projectType?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
  },
  userId: number
): Promise<{ success: boolean; data?: any; conflict?: boolean; error?: string }> {
  // P1-1: 使用死锁重试包装
  return withDeadlockRetry(
    () => databaseService.transaction(async (connection) => {
    try {
      // 1. 查询当前项目（加锁）
      const [current] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? FOR UPDATE',
        [projectId]
      ) as any[];

      if (!current || current.length === 0) {
        return { success: false, error: '项目不存在' };
      }

      // 2. 获取当前版本号（从 data_versions 表）
      const [versionResult] = await connection.execute(
        `SELECT COALESCE(MAX(version), 0) as current_version FROM data_versions WHERE entity_type = 'project' AND entity_id = ?`,
        [projectId]
      ) as any[];
      const currentVersion = versionResult[0]?.current_version || 0;

      // 3. 检查版本冲突
      if (updateData.expectedVersion !== undefined && currentVersion !== updateData.expectedVersion) {
        return {
          success: false,
          conflict: true,
          error: '版本冲突',
          data: current[0]
        };
      }

      // 4. 更新项目
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updateData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updateData.description);
      }
      if (updateData.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(updateData.status);
      }
      if (updateData.progress !== undefined) {
        updateFields.push('progress = ?');
        updateValues.push(updateData.progress);
      }
      // 新增字段支持（转换为 snake_case）
      if (updateData.projectType !== undefined) {
        updateFields.push('project_type = ?');
        updateValues.push(updateData.projectType);
      }
      if (updateData.plannedStartDate !== undefined) {
        updateFields.push('planned_start_date = ?');
        updateValues.push(updateData.plannedStartDate);
      }
      if (updateData.plannedEndDate !== undefined) {
        updateFields.push('planned_end_date = ?');
        updateValues.push(updateData.plannedEndDate);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(projectId);

      await connection.execute(
        `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // 5. 查询更新后的项目（使用字段别名转换为 camelCase）
      const [updated] = await connection.execute(
        `SELECT
          p.id,
          p.code,
          p.name,
          p.description,
          p.status,
          p.project_type as projectType,
          p.planned_start_date as plannedStartDate,
          p.planned_end_date as plannedEndDate,
          p.progress,
          p.task_count as taskCount,
          p.completed_task_count as completedTaskCount,
          p.created_at as createdAt,
          p.updated_at as updatedAt,
          p.created_by as createdBy,
          p.version,
          u.name as created_by_name
         FROM projects p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.id = ?`,
        [projectId]
      ) as any[];

      // 6. 记录版本历史
      const newVersion = currentVersion + 1;
      await connection.execute(
        `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'project',
          projectId,
          newVersion,
          userId,
          'update',
          JSON.stringify({ before: current[0], after: updated[0] }),
          '更新项目'
        ]
      );

      // 6. 记录变更日志（与 GlobalDataManager 保持一致）
      await connection.execute(
        `INSERT INTO data_change_log (data_type, data_id, action, old_value, new_value, changed_by, change_reason)
         VALUES (?, ?, 'update', ?, ?, ?, ?)`,
        [
          'projects',
          String(projectId),
          JSON.stringify(current[0]),
          JSON.stringify(updated[0]),
          userId,
          '更新项目'
        ]
      );

      // 异步记录用户操作到 system_logs
      setImmediate(() => {
        systemLogger.logUserAction(
          'update_project',
          { projectId, changes: updateData },
          userId
        ).catch(err => console.error('[AtomicTransaction] 记录日志失败:', err));
      });

      return { success: true, data: updated[0] };
    } catch (error: any) {
      console.error('[AtomicTransaction] 更新项目失败:', error);
      // 记录错误到 system_logs
      systemLogger.error('更新项目失败', {
        error: error.message,
        projectId
      }, userId).catch(err => console.error('[AtomicTransaction] 记录错误日志失败:', err));
      throw error;
    }
  }), {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  });
}

/**
 * 原子删除项目并记录版本（软删除）
 */
export async function deleteProjectWithVersion(
  projectId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // P1-1: 使用死锁重试包装
  return withDeadlockRetry(
    () => databaseService.transaction(async (connection) => {
    try {
      // 1. 查询当前项目（加锁）
      const [current] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [projectId]
      ) as any[];

      if (!current || current.length === 0) {
        return { success: false, error: '项目不存在' };
      }

      // 2. 获取当前版本号
      const [versionResult] = await connection.execute(
        `SELECT COALESCE(MAX(version), 0) as current_version FROM data_versions WHERE entity_type = 'project' AND entity_id = ?`,
        [projectId]
      ) as any[];
      const currentVersion = versionResult[0]?.current_version || 0;

      // 3. 软删除项目
      await connection.execute(
        `UPDATE projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [projectId]
      );

      // 4. 记录版本历史
      await connection.execute(
        `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'project',
          projectId,
          currentVersion,
          userId,
          'delete',
          JSON.stringify(current[0]),
          '删除项目'
        ]
      );

      // 5. 记录变更日志（与 GlobalDataManager 保持一致）
      await connection.execute(
        `INSERT INTO data_change_log (data_type, data_id, action, old_value, changed_by, change_reason)
         VALUES (?, ?, 'delete', ?, ?, ?)`,
        ['projects', String(projectId), JSON.stringify(current[0]), userId, '删除项目']
      );

      // 异步记录用户操作到 system_logs
      setImmediate(() => {
        systemLogger.logUserAction(
          'delete_project',
          { projectId, projectName: current[0].name },
          userId
        ).catch(err => console.error('[AtomicTransaction] 记录日志失败:', err));
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AtomicTransaction] 删除项目失败:', error);
      // 记录错误到 system_logs
      systemLogger.error('删除项目失败', {
        error: error.message,
        projectId
      }, userId).catch(err => console.error('[AtomicTransaction] 记录错误日志失败:', err));
      throw error;
    }
  }), {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  });
}

/**
 * 原子创建 WBS 任务并更新项目计数
 */
export async function createTaskWithCounter(
  taskData: {
    project_id: number;
    parent_id?: number | null;
    task_code: string;
    task_name: string;
    description?: string;
    task_type?: string;
    planned_start_date?: Date | null;
    planned_end_date?: Date | null;
    assignee_id?: number | null;
    dependencies?: any;
    tags?: any;
    priority?: number;
    created_by: number;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  // P1-1: 使用死锁重试包装
  return withDeadlockRetry(
    () => databaseService.transaction(async (connection) => {
    try {
      // 1. 插入任务
      const [insertResult] = await connection.execute(
        `INSERT INTO wbs_tasks
         (project_id, parent_id, task_code, task_name, description, task_type,
          planned_start_date, planned_end_date, assignee_id, dependencies, tags, priority, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskData.project_id,
          taskData.parent_id || null,
          taskData.task_code,
          taskData.task_name,
          taskData.description || null,
          taskData.task_type || 'task',
          taskData.planned_start_date || null,
          taskData.planned_end_date || null,
          taskData.assignee_id || null,
          taskData.dependencies ? JSON.stringify(taskData.dependencies) : null,
          taskData.tags ? JSON.stringify(taskData.tags) : null,
          taskData.priority || 1,
          taskData.created_by
        ]
      ) as any[];

      const taskId = insertResult.insertId;

      // 2. 原子更新项目任务计数
      await connection.execute(
        'UPDATE projects SET task_count = task_count + 1 WHERE id = ?',
        [taskData.project_id]
      );

      // 3. 查询新创建的任务（带关联数据）
      const [newTask] = await connection.execute(
        `SELECT t.*, m.name as assignee_name
         FROM wbs_tasks t
         LEFT JOIN members m ON t.assignee_id = m.id
         WHERE t.id = ?`,
        [taskId]
      ) as any[];

      // 4. 记录版本历史
      await connection.execute(
        `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'wbs_task',
          taskId,
          1,
          taskData.created_by,
          'create',
          JSON.stringify(newTask[0]),
          '创建WBS任务'
        ]
      );

      // 5. 记录变更日志（与 GlobalDataManager 保持一致）
      await connection.execute(
        `INSERT INTO data_change_log (data_type, data_id, action, new_value, changed_by, change_reason)
         VALUES (?, ?, 'create', ?, ?, ?)`,
        ['wbs_tasks', String(taskId), JSON.stringify(newTask[0]), taskData.created_by, '创建WBS任务']
      );

      // 异步记录用户操作到 system_logs
      setImmediate(() => {
        systemLogger.logUserAction(
          'create_task',
          { taskId, projectId: taskData.project_id, taskCode: taskData.task_code, taskName: taskData.task_name },
          taskData.created_by
        ).catch(err => console.error('[AtomicTransaction] 记录日志失败:', err));
      });

      return { success: true, data: newTask[0] };
    } catch (error: any) {
      console.error('[AtomicTransaction] 创建任务失败:', error);
      // 记录错误到 system_logs
      systemLogger.error('创建任务失败', {
        error: error.message,
        projectId: taskData.project_id,
        taskCode: taskData.task_code
      }, taskData.created_by).catch(err => console.error('[AtomicTransaction] 记录错误日志失败:', err));
      throw error;
    }
  }), {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  });
}

/**
 * 原子删除 WBS 任务并更新项目计数
 */
export async function deleteTaskWithCounter(
  taskId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // P1-1: 使用死锁重试包装
  return withDeadlockRetry(
    () => databaseService.transaction(async (connection) => {
    try {
      // 1. 查询任务（加锁）
      const [current] = await connection.execute(
        'SELECT * FROM wbs_tasks WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
        [taskId]
      ) as any[];

      if (!current || current.length === 0) {
        return { success: false, error: '任务不存在' };
      }

      const projectId = current[0].project_id;
      const wasCompleted = current[0].status === 'completed';

      // 2. 软删除任务
      await connection.execute(
        `UPDATE wbs_tasks SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [taskId]
      );

      // 3. 原子更新项目计数
      await connection.execute(
        'UPDATE projects SET task_count = task_count - 1 WHERE id = ?',
        [projectId]
      );

      // 4. 如果任务已完成，更新完成计数
      if (wasCompleted) {
        await connection.execute(
          'UPDATE projects SET completed_task_count = completed_task_count - 1 WHERE id = ?',
          [projectId]
        );
      }

      // 5. 获取当前版本号
      const [versionResult] = await connection.execute(
        `SELECT COALESCE(MAX(version), 0) as current_version FROM data_versions WHERE entity_type = 'wbs_task' AND entity_id = ?`,
        [taskId]
      ) as any[];
      const currentVersion = versionResult[0]?.current_version || 0;

      // 6. 记录版本历史
      await connection.execute(
        `INSERT INTO data_versions (entity_type, entity_id, version, changed_by, change_type, change_data, change_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'wbs_task',
          taskId,
          currentVersion,
          userId,
          'delete',
          JSON.stringify(current[0]),
          '删除WBS任务'
        ]
      );

      // 7. 记录变更日志（与 GlobalDataManager 保持一致）
      await connection.execute(
        `INSERT INTO data_change_log (data_type, data_id, action, old_value, changed_by, change_reason)
         VALUES (?, ?, 'delete', ?, ?, ?)`,
        ['wbs_tasks', String(taskId), JSON.stringify(current[0]), userId, '删除WBS任务']
      );

      // 异步记录用户操作到 system_logs
      setImmediate(() => {
        systemLogger.logUserAction(
          'delete_task',
          { taskId, projectName: current[0].task_name },
          userId
        ).catch(err => console.error('[AtomicTransaction] 记录日志失败:', err));
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AtomicTransaction] 删除任务失败:', error);
      // 记录错误到 system_logs
      systemLogger.error('删除任务失败', {
        error: error.message,
        taskId
      }, userId).catch(err => console.error('[AtomicTransaction] 记录错误日志失败:', err));
      throw error;
    }
  }), {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000
  });
}
