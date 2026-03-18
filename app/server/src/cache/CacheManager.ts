/**
 * 缓存管理器
 *
 * 提供高级缓存操作：
 * - Cache-Aside模式：读时检查缓存，写时删除缓存
 * - 自动序列化/反序列化
 * - TTL管理
 * - 缓存预热
 * - 统计分析
 *
 * 使用示例：
 * ```typescript
 * const project = await cacheManager.getProject(1);
 * await cacheManager.setProject(1, projectData);
 * await cacheManager.invalidateProject(1);
 * ```
 */

import { redisService } from './RedisService.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import { cacheKeys, CACHE_TTL } from './config.js';
import type { CacheResult } from './config.js';

/**
 * 缓存管理器类
 */
export class CacheManager {
  /**
   * ============================================
   * 项目缓存操作
   * ============================================
   */

  /**
   * 获取项目缓存
   */
  async getProject(projectId: number): Promise<CacheResult> {
    const key = cacheKeys.project(projectId);
    const result = await redisService.get(key);

    if (result.success) {
      logger.debug(LOG_CATEGORIES.CACHE_HIT, `项目缓存命中: ${projectId}`);
    } else {
      logger.debug(LOG_CATEGORIES.CACHE_MISS, `项目缓存未命中: ${projectId}`);
    }

    return result;
  }

  /**
   * 设置项目缓存
   */
  async setProject(projectId: number, projectData: any): Promise<boolean> {
    const key = cacheKeys.project(projectId);
    return redisService.set(key, projectData, CACHE_TTL.PROJECT_DETAIL);
  }

  /**
   * 删除项目缓存
   */
  async invalidateProject(projectId: number): Promise<boolean> {
    const key = cacheKeys.project(projectId);
    const deleted = await redisService.del(key);

    // 级联失效：删除项目列表缓存
    await redisService.del(cacheKeys.projectsList());

    if (deleted) {
      logger.info(LOG_CATEGORIES.CACHE, `项目缓存已失效: ${projectId}`);
    }

    return deleted;
  }

  /**
   * 获取项目列表缓存
   */
  async getProjectsList(): Promise<CacheResult> {
    const key = cacheKeys.projectsList();
    return redisService.get(key);
  }

  /**
   * 设置项目列表缓存
   */
  async setProjectsList(projects: any[]): Promise<boolean> {
    const key = cacheKeys.projectsList();
    return redisService.set(key, projects, CACHE_TTL.PROJECTS_LIST);
  }

  /**
   * 失效项目列表缓存
   */
  async invalidateProjectsList(): Promise<boolean> {
    const key = cacheKeys.projectsList();
    return redisService.del(key);
  }

  /**
   * ============================================
   * 成员缓存操作
   * ============================================
   */

  /**
   * 获取成员缓存
   */
  async getMember(memberId: number): Promise<CacheResult> {
    const key = cacheKeys.member(memberId);
    return redisService.get(key);
  }

  /**
   * 设置成员缓存
   */
  async setMember(memberId: number, memberData: any): Promise<boolean> {
    const key = cacheKeys.member(memberId);
    return redisService.set(key, memberData, CACHE_TTL.MEMBER_DETAIL);
  }

  /**
   * 删除成员缓存
   */
  async invalidateMember(memberId: number): Promise<boolean> {
    const key = cacheKeys.member(memberId);
    const deleted = await redisService.del(key);

    // 级联失效：删除成员列表缓存
    await redisService.del(cacheKeys.membersList());

    return deleted;
  }

  /**
   * 获取成员列表缓存
   */
  async getMembersList(): Promise<CacheResult> {
    const key = cacheKeys.membersList();
    return redisService.get(key);
  }

  /**
   * 设置成员列表缓存
   */
  async setMembersList(members: any[]): Promise<boolean> {
    const key = cacheKeys.membersList();
    return redisService.set(key, members, CACHE_TTL.MEMBERS_LIST);
  }

  /**
   * 失效成员列表缓存
   */
  async invalidateMembersList(): Promise<boolean> {
    const key = cacheKeys.membersList();
    return redisService.del(key);
  }

  /**
   * ============================================
   * 任务缓存操作
   * ============================================
   */

  /**
   * 获取任务缓存
   */
  async getTask(taskId: number): Promise<CacheResult> {
    const key = cacheKeys.task(taskId);
    return redisService.get(key);
  }

  /**
   * 设置任务缓存
   */
  async setTask(taskId: number, taskData: any): Promise<boolean> {
    const key = cacheKeys.task(taskId);
    return redisService.set(key, taskData, CACHE_TTL.TASK_DETAIL);
  }

  /**
   * 删除任务缓存
   */
  async invalidateTask(taskId: number): Promise<boolean> {
    const key = cacheKeys.task(taskId);
    const deleted = await redisService.del(key);

    // 级联失效：删除任务列表缓存
    await redisService.del(cacheKeys.tasksList());

    return deleted;
  }

  /**
   * 获取任务列表缓存
   */
  async getTasksList(projectId?: number): Promise<CacheResult> {
    const key = cacheKeys.tasksList(projectId);
    return redisService.get(key);
  }

  /**
   * 设置任务列表缓存
   */
  async setTasksList(tasks: any[], projectId?: number): Promise<boolean> {
    const key = cacheKeys.tasksList(projectId);
    return redisService.set(key, tasks, CACHE_TTL.TASKS_LIST);
  }

  /**
   * 失效任务列表缓存
   */
  async invalidateTasksList(projectId?: number): Promise<boolean> {
    const key = cacheKeys.tasksList(projectId);
    return redisService.del(key);
  }

  /**
   * ============================================
   * 用户缓存操作
   * ============================================
   */

  /**
   * 获取用户缓存
   */
  async getUser(userId: number): Promise<CacheResult> {
    const key = cacheKeys.user(userId);
    return redisService.get(key);
  }

  /**
   * 设置用户缓存
   */
  async setUser(userId: number, userData: any): Promise<boolean> {
    const key = cacheKeys.user(userId);
    return redisService.set(key, userData, CACHE_TTL.USER_INFO);
  }

  /**
   * 删除用户缓存
   */
  async invalidateUser(userId: number): Promise<boolean> {
    const key = cacheKeys.user(userId);
    return redisService.del(key);
  }

  /**
   * 获取用户权限缓存
   */
  async getUserPermissions(userId: number): Promise<CacheResult> {
    const key = cacheKeys.permission(userId);
    return redisService.get(key);
  }

  /**
   * 设置用户权限缓存
   */
  async setUserPermissions(userId: number, permissions: any): Promise<boolean> {
    const key = cacheKeys.permission(userId);
    return redisService.set(key, permissions, CACHE_TTL.USER_PERMISSIONS);
  }

  /**
   * 失效用户权限缓存
   */
  async invalidateUserPermissions(userId: number): Promise<boolean> {
    const key = cacheKeys.permission(userId);
    return redisService.del(key);
  }

  /**
   * ============================================
   * 会话缓存操作
   * ============================================
   */

  /**
   * 获取会话缓存
   */
  async getSession(sessionId: string): Promise<CacheResult> {
    const key = cacheKeys.session(sessionId);
    return redisService.get(key);
  }

  /**
   * 设置会话缓存
   */
  async setSession(sessionId: string, sessionData: any): Promise<boolean> {
    const key = cacheKeys.session(sessionId);
    return redisService.set(key, sessionData, CACHE_TTL.SESSION);
  }

  /**
   * 刷新会话TTL（续期）
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    const key = cacheKeys.session(sessionId);
    // 通过重新设置来刷新TTL
    const result = await redisService.get(key);
    if (result.success) {
      return redisService.set(key, result.data, CACHE_TTL.SESSION);
    }
    return false;
  }

  /**
   * 删除会话缓存
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    const key = cacheKeys.session(sessionId);
    return redisService.del(key);
  }

  /**
   * ============================================
   * 通用缓存操作
   * ============================================
   */

  /**
   * 获取通用数据缓存
   */
  async getData(type: string, id: string): Promise<CacheResult> {
    const key = cacheKeys.data(type, id);
    return redisService.get(key);
  }

  /**
   * 设置通用数据缓存
   */
  async setData(type: string, id: string, data: any, ttl?: number): Promise<boolean> {
    const key = cacheKeys.data(type, id);
    return redisService.set(key, data, ttl);
  }

  /**
   * 删除通用数据缓存
   */
  async invalidateData(type: string, id: string): Promise<boolean> {
    const key = cacheKeys.data(type, id);
    return redisService.del(key);
  }

  /**
   * 批量删除（通配符）
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = cacheKeys.pattern(pattern);
    return redisService.delPattern(fullPattern);
  }

  /**
   * ============================================
   * 缓存预热
   * ============================================
   */

  /**
   * 缓存预热：项目
   */
  async warmupProjects(projectIds: number[], fetchFn: (id: number) => Promise<any>): Promise<void> {
    logger.info(LOG_CATEGORIES.CACHE, '开始缓存预热: 项目', { count: projectIds.length });

    const startTime = Date.now();
    let success = 0;
    let failed = 0;

    for (const id of projectIds) {
      try {
        // 检查是否已缓存
        const cached = await this.getProject(id);
        if (cached.success) {
          success++;
          continue;
        }

        // 从数据库获取
        const data = await fetchFn(id);
        await this.setProject(id, data);
        success++;
      } catch (error) {
        failed++;
        logger.error(LOG_CATEGORIES.CACHE, `缓存预热失败: 项目${id}`, { error });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(LOG_CATEGORIES.CACHE, '缓存预热完成: 项目', {
      total: projectIds.length,
      success,
      failed,
      duration
    });
  }

  /**
   * 缓存预热：成员
   */
  async warmupMembers(memberIds: number[], fetchFn: (id: number) => Promise<any>): Promise<void> {
    logger.info(LOG_CATEGORIES.CACHE, '开始缓存预热: 成员', { count: memberIds.length });

    const startTime = Date.now();
    let success = 0;
    let failed = 0;

    for (const id of memberIds) {
      try {
        const cached = await this.getMember(id);
        if (cached.success) {
          success++;
          continue;
        }

        const data = await fetchFn(id);
        await this.setMember(id, data);
        success++;
      } catch (error) {
        failed++;
        logger.error(LOG_CATEGORIES.CACHE, `缓存预热失败: 成员${id}`, { error });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(LOG_CATEGORIES.CACHE, '缓存预热完成: 成员', {
      total: memberIds.length,
      success,
      failed,
      duration
    });
  }

  /**
   * ============================================
   * 统计分析
   * ============================================
   */

  /**
   * 获取缓存统计
   */
  getStats() {
    return redisService.getStats();
  }

  /**
   * 重置统计
   */
  resetStats() {
    redisService.resetStats();
  }

  /**
   * 打印缓存报告
   */
  async printReport(): Promise<void> {
    const stats = this.getStats();

    console.log('=== Redis缓存报告 ===');
    console.log(`命中率: ${stats.hitRate.toFixed(2)}%`);
    console.log(`命中次数: ${stats.hits}`);
    console.log(`未命中次数: ${stats.misses}`);
    console.log(`离线命中次数: ${stats.offlineHits}`);
    console.log(`当前缓存项数: ${stats.size}`);

    const health = await redisService.healthCheck();
    console.log(`健康状态: ${health.healthy ? '✅ 正常' : '❌ 异常'}`);
    if (health.latency) {
      console.log(`延迟: ${health.latency}ms`);
    }
    if (health.error) {
      console.log(`错误: ${health.error}`);
    }
  }
}

/**
 * 全局缓存管理器实例
 */
export const cacheManager = new CacheManager();

/**
 * 默认导出
 */
export default cacheManager;
