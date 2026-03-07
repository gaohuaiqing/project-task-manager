/**
 * 数据服务层 - 统一导出
 *
 * 本目录包含按领域划分的数据服务：
 * - BaseDataService: 基础服务类，提供通用功能
 * - ProjectDataService: 项目数据服务
 * - TaskDataService: 任务数据服务
 * - MemberDataService: 成员数据服务
 *
 * 设计原则：
 * - 每个服务负责单一领域
 * - 继承BaseDataService获得通用功能
 * - 保持向后兼容的API
 * - 支持缓存、版本控制等特性
 */

// 基础服务类
export { BaseDataService } from './BaseDataService';
export type { ApiResponse, CacheEntry } from './BaseDataService';

// 项目数据服务
export { ProjectDataService, projectDataService } from './ProjectDataService';

// 任务数据服务
export { TaskDataService, taskDataService } from './TaskDataService';
export type { WbsTask, TaskAssignment } from './TaskDataService';

// 成员数据服务
export { MemberDataService, memberDataService } from './MemberDataService';
export type { Member } from './MemberDataService';

// ==================== 使用示例 ====================
/**
 * @example 使用项目数据服务
 * ```typescript
 * import { projectDataService } from '@/services/data';
 *
 * // 获取所有项目
 * const projects = await projectDataService.getProjects();
 *
 * // 创建项目
 * const newProject = await projectDataService.createProject({
 *   name: '新项目',
 *   code: 'PRJ001'
 * });
 * ```
 *
 * @example 使用任务数据服务
 * ```typescript
 * import { taskDataService } from '@/services/data';
 *
 * // 获取项目的所有任务
 * const tasks = await taskDataService.getWbsTasks(projectId);
 *
 * // 创建任务
 * const newTask = await taskDataService.createWbsTask({
 *   task_name: '新任务',
 *   project_id: projectId
 * });
 * ```
 */
