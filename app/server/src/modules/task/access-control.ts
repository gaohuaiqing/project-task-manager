// app/server/src/modules/task/access-control.ts
/**
 * 任务访问权限检查 —— 从 task/routes.ts 抽取共享，供 task/routes 与 workflow/routes 复用。
 * 避免 checkTaskAccess 在多处复制导致规则漂移。
 */
import type { User } from '../../core/types';
import { taskService } from './service';

/**
 * 数据隔离检查：验证用户是否有权限访问指定任务
 * @param user 当前用户
 * @param task 要访问的任务（需要 project_id 和 assignee_id）
 * @returns true 表示有权限，false 表示无权限
 *
 * 安全规则：
 * 1. admin 有全部权限
 * 2. 无项目归属任务：只有任务负责人可以访问
 * 3. 悬空项目引用任务（项目不存在）：视为无项目归属任务，只有负责人可见
 * 4. 正常项目任务：用户必须是项目成员
 */
export async function checkTaskAccess(
  user: User,
  task: { project_id: string | null; assignee_id: number | null }
): Promise<boolean> {
  // admin 有全部权限
  if (user.role === 'admin') return true;

  // 任务无项目归属时，只有任务负责人可以访问
  if (!task.project_id) {
    return task.assignee_id === user.id;
  }

  // 检查项目是否存在（防止悬空引用）
  const projectRepo = new (await import('../project/repository')).ProjectRepository();
  const project = await projectRepo.getProjectById(task.project_id);

  // 项目不存在（悬空引用）：视为无项目归属任务，只有负责人可见
  if (!project) {
    return task.assignee_id === user.id;
  }

  // 有项目归属的任务：检查用户是否是项目成员
  const accessibleProjectIds = await taskService.getAccessibleProjectIds(user);
  if (!accessibleProjectIds || accessibleProjectIds.length === 0) return false;

  // accessibleProjectIds 是 string[]，task.project_id 可能是 number，需要统一类型
  return accessibleProjectIds.includes(String(task.project_id));
}
