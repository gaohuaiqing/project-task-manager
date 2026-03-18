/**
 * 统一数据接口
 *
 * 提供统一的数据访问层：
 * - 整合项目、成员、任务服务
 * - 批量查询优化
 * - 数据一致性保证
 */

import { projectService } from './ProjectService.js';
import { memberService } from './MemberService.js';
import { taskService } from './TaskService.js';
import { cacheManager } from '../cache/index.js';
import { broadcastService } from '../realtime/index.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import type { Project, Member, Task, PaginatedResult } from './types.js';

/**
 * 统一数据服务类
 */
export class DataService {

  /**
   * 从联合类型中提取数组
   */
  private extractArray<T>(result: T[] | PaginatedResult<T>): T[] {
    if (Array.isArray(result)) {
      return result;
    }
    return result.rows;
  }
  /**
   * ============================================
   * 批量查询（初始数据）
   * ============================================
   */

  /**
   * 获取初始数据（应用启动时调用）
   *
   * 一次性获取所有基础数据，减少请求次数
   */
  async getInitialData(): Promise<{
    projects: Project[];
    members: Member[];
    tasks: Task[];
  }> {
    const startTime = Date.now();

    try {
      // 并行查询
      const [projects, members, tasks] = await Promise.all([
        projectService.getProjects(),
        memberService.getMembers(),
        taskService.getTasks()
      ]);

      const duration = Date.now() - startTime;

      // 提取数组数据
      const projectsArray = this.extractArray(projects);
      const membersArray = this.extractArray(members);
      const tasksArray = this.extractArray(tasks);

      logger.info(LOG_CATEGORIES.DATA_SYNC, '初始数据加载完成', {
        projectCount: projectsArray.length,
        memberCount: membersArray.length,
        taskCount: tasksArray.length,
        duration
      });

      return {
        projects: projectsArray,
        members: membersArray,
        tasks: tasksArray
      };
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.DATA_SYNC, '初始数据加载失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * ============================================
   * 批量写入（事务保证）
   * ============================================
   */

  /**
   * 批量创建项目
   */
  async createProjectsBatch(projects: Partial<Project>[], userId: number): Promise<{
    success: number;
    failed: Array<{ project: Partial<Project>; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: [] as Array<{ project: Partial<Project>; error: string }>
    };

    for (const project of projects) {
      try {
        await projectService.createProject(project, userId);
        results.success++;
      } catch (error: any) {
        results.failed.push({
          project,
          error: error.message
        });
      }
    }

    logger.info(LOG_CATEGORIES.DATA_SYNC, '批量创建项目完成', {
      total: projects.length,
      success: results.success,
      failed: results.failed.length
    });

    return results;
  }

  /**
   * 批量创建成员
   */
  async createMembersBatch(members: Partial<Member>[], userId: number): Promise<{
    success: number;
    failed: Array<{ member: Partial<Member>; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: [] as Array<{ member: Partial<Member>; error: string }>
    };

    for (const member of members) {
      try {
        await memberService.createMember(member, userId);
        results.success++;
      } catch (error: any) {
        results.failed.push({
          member,
          error: error.message
        });
      }
    }

    logger.info(LOG_CATEGORIES.DATA_SYNC, '批量创建成员完成', {
      total: members.length,
      success: results.success,
      failed: results.failed.length
    });

    return results;
  }

  /**
   * ============================================
   * 缓存预热
   * ============================================
   */

  /**
   * 预热缓存（应用启动时调用）
   */
  async warmupCache(): Promise<void> {
    const startTime = Date.now();

    try {
      // 预热项目缓存
      const projects = await projectService.getProjects();
      const projectsArray = this.extractArray(projects);
      await cacheManager.setProjectsList(projectsArray);

      // 预热成员缓存
      const members = await memberService.getMembers();
      const membersArray = this.extractArray(members);
      await cacheManager.setMembersList(membersArray);

      // 预热任务缓存
      const tasks = await taskService.getTasks();
      const tasksArray = this.extractArray(tasks);
      await cacheManager.setTasksList(tasksArray);

      const duration = Date.now() - startTime;

      logger.info(LOG_CATEGORIES.CACHE, '缓存预热完成', {
        projectCount: projectsArray.length,
        memberCount: membersArray.length,
        taskCount: tasksArray.length,
        duration
      });
    } catch (error: any) {
      logger.error(LOG_CATEGORIES.CACHE, '缓存预热失败', {
        error: error.message
      });
    }
  }

  /**
   * ============================================
   * 数据导出
   * ============================================
   */

  /**
   * 导出所有数据
   */
  async exportAllData(): Promise<{
    projects: Project[];
    members: Member[];
    tasks: Task[];
    exportedAt: string;
  }> {
    const [projects, members, tasks] = await Promise.all([
      projectService.getProjects(),
      memberService.getMembers(),
      taskService.getTasks()
    ]);

    return {
      projects: this.extractArray(projects),
      members: this.extractArray(members),
      tasks: this.extractArray(tasks),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * ============================================
   * 统计信息
   * ============================================
   */

  /**
   * 获取数据统计
   */
  async getStatistics(): Promise<{
    projects: {
      total: number;
      byStatus: Record<string, number>;
    };
    members: {
      total: number;
      byDepartment: Record<string, number>;
    };
    tasks: {
      total: number;
      byStatus: Record<string, number>;
    };
  }> {
    const data = await this.getInitialData();

    // 项目统计
    const projectsByStatus: Record<string, number> = {};
    for (const project of data.projects) {
      projectsByStatus[project.status] = (projectsByStatus[project.status] || 0) + 1;
    }

    // 成员统计
    const membersByDepartment: Record<string, number> = {};
    for (const member of data.members) {
      const dept = member.department || '未知';
      membersByDepartment[dept] = (membersByDepartment[dept] || 0) + 1;
    }

    // 任务统计
    const tasksByStatus: Record<string, number> = {};
    for (const task of data.tasks) {
      tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
    }

    return {
      projects: {
        total: data.projects.length,
        byStatus: projectsByStatus
      },
      members: {
        total: data.members.length,
        byDepartment: membersByDepartment
      },
      tasks: {
        total: data.tasks.length,
        byStatus: tasksByStatus
      }
    };
  }
}

/**
 * 全局数据服务实例
 */
export const dataService = new DataService();

/**
 * 默认导出
 */
export default dataService;
