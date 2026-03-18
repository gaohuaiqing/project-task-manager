/**
 * 数据服务 - 导出入口
 *
 * 使用示例：
 * ```typescript
 * import { projectService, memberService, taskService, dataService } from './data/index.js';
 *
 * // 获取项目列表
 * const projects = await projectService.getProjects();
 *
 * // 更新项目（带版本控制）
 * await projectService.updateProject(projectId, data, currentVersion, userId);
 *
 * // 获取初始数据
 * const initialData = await dataService.getInitialData();
 * ```
 */

// 导出项目服务
export { ProjectService, projectService } from './ProjectService.js';

// 导出成员服务
export { MemberService, memberService } from './MemberService.js';

// 导出任务服务
export { TaskService, taskService } from './TaskService.js';

// 导出统一数据接口
export { DataService, dataService } from './DataService.js';

// 导出类型定义
export {
  VersionConflictError,
  type VersionedEntity,
  type Project,
  type Member,
  type Task,
  type QueryOptions,
  type PaginatedResult,
  type BatchOperationResult,
  type VersionHistory
} from './types.js';

// 默认导出统一数据接口
export { default } from './DataService.js';
