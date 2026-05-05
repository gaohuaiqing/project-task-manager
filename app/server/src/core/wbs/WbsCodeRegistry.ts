/**
 * WBS 编码全局注册表
 *
 * 设计思路：
 * 1. 维护一个全局的 UUID → WBS编码 映射表
 * 2. 任务管理模块在任务增删改时更新此注册表
 * 3. 其他模块直接从注册表获取编码，保证一致性
 *
 * 优点：
 * - 单一职责：WBS 编码计算只在任务管理模块
 * - 一致性：所有模块使用同一映射源
 * - 性能：避免各模块重复计算
 */

import { WbsCodeService, wbsCodeService } from './WbsCodeService';
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import { logger } from '../../core/logger';

/** 任务节点数据（用于计算） */
interface TaskNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_level: number;
  sort_order: number | null;
  created_at: Date;
}

/** 项目编码映射 */
interface ProjectCodeMap {
  codeMap: Map<string, string>;
  idMap: Map<string, string>;
  updatedAt: number;
}

class WbsCodeRegistry {
  /** 按项目存储编码映射 */
  private projectMaps: Map<string, ProjectCodeMap> = new Map();

  /** 全局编码映射（合并所有项目） */
  private globalCodeMap: Map<string, string> = new Map();

  /** 服务实例 */
  private service: WbsCodeService;

  /** 是否已初始化 */
  private initialized = false;

  constructor() {
    this.service = wbsCodeService;
  }

  /**
   * 初始化注册表（从数据库加载所有任务）
   * 应用启动时调用一次
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const pool = getPool();
    try {
      // 加载所有任务
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, project_id, parent_id, wbs_level, sort_order, created_at
         FROM wbs_tasks
         ORDER BY project_id, sort_order ASC, created_at ASC`
      );

      // 按项目分组
      const tasksByProject = new Map<string, TaskNode[]>();
      (rows as TaskNode[]).forEach(task => {
        const tasks = tasksByProject.get(task.project_id) || [];
        tasks.push(task);
        tasksByProject.set(task.project_id, tasks);
      });

      // 为每个项目计算编码
      tasksByProject.forEach((tasks, projectId) => {
        const result = this.service.calculateCodes(tasks);
        this.projectMaps.set(projectId, {
          codeMap: result.codeMap,
          idMap: result.idMap,
          updatedAt: Date.now(),
        });
        // 合并到全局映射
        result.codeMap.forEach((code, id) => this.globalCodeMap.set(id, code));
      });

      this.initialized = true;
      logger.info(`[WbsCodeRegistry] 初始化完成，共加载 ${rows.length} 个任务，${tasksByProject.size} 个项目`);
    } catch (error) {
      logger.error('[WbsCodeRegistry] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务的 WBS 编码
   * @param taskId 任务 UUID
   * @returns WBS 编码，不存在返回 null
   */
  getCode(taskId: string): string | null {
    return this.globalCodeMap.get(taskId) || null;
  }

  /**
   * 批量获取任务的 WBS 编码
   * @param taskIds 任务 UUID 列表
   * @returns UUID → 编码映射
   */
  getCodes(taskIds: string[]): Map<string, string> {
    const result = new Map<string, string>();
    taskIds.forEach(id => {
      const code = this.globalCodeMap.get(id);
      if (code) result.set(id, code);
    });
    return result;
  }

  /**
   * 刷新项目的编码映射
   * 任务增删改时调用
   * @param projectId 项目 ID
   */
  async refreshProject(projectId: string): Promise<void> {
    const pool = getPool();
    try {
      // 加载该项目的所有任务
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, project_id, parent_id, wbs_level, sort_order, created_at
         FROM wbs_tasks
         WHERE project_id = ?
         ORDER BY sort_order ASC, created_at ASC`,
        [projectId]
      );

      const tasks = rows as TaskNode[];

      // 先清除该项目旧的编码映射
      const oldMap = this.projectMaps.get(projectId);
      if (oldMap) {
        oldMap.codeMap.forEach((_, id) => this.globalCodeMap.delete(id));
      }

      // 计算新的编码
      if (tasks.length > 0) {
        const result = this.service.calculateCodes(tasks);
        this.projectMaps.set(projectId, {
          codeMap: result.codeMap,
          idMap: result.idMap,
          updatedAt: Date.now(),
        });
        // 合并到全局映射
        result.codeMap.forEach((code, id) => this.globalCodeMap.set(id, code));
      } else {
        // 项目无任务，删除映射
        this.projectMaps.delete(projectId);
      }

      logger.debug(`[WbsCodeRegistry] 项目 ${projectId} 编码已刷新，共 ${tasks.length} 个任务`);
    } catch (error) {
      logger.error(`[WbsCodeRegistry] 刷新项目 ${projectId} 失败:`, error);
    }
  }

  /**
   * 刷新所有项目的编码映射
   */
  async refreshAll(): Promise<void> {
    this.projectMaps.clear();
    this.globalCodeMap.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * 删除任务的编码（任务删除时调用）
   * @param taskId 任务 ID
   * @param projectId 项目 ID（可选，用于确定是否需要刷新整个项目）
   */
  deleteTask(taskId: string, projectId?: string): void {
    this.globalCodeMap.delete(taskId);
    // 任务删除后，项目内其他任务的编码可能变化（如排序变化），需要刷新项目
    if (projectId) {
      // 异步刷新，不阻塞当前操作
      this.refreshProject(projectId).catch(err => {
        logger.error(`[WbsCodeRegistry] 刷新项目失败:`, err);
      });
    }
  }

  /**
   * 获取项目的完整编码映射
   * @param projectId 项目 ID
   * @returns 编码映射
   */
  getProjectCodeMap(projectId: string): Map<string, string> | null {
    const projectMap = this.projectMaps.get(projectId);
    return projectMap?.codeMap || null;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    projectCount: number;
    taskCount: number;
    initialized: boolean;
  } {
    return {
      projectCount: this.projectMaps.size,
      taskCount: this.globalCodeMap.size,
      initialized: this.initialized,
    };
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// 单例导出
export const wbsCodeRegistry = new WbsCodeRegistry();
// 导出类（使用 export default 或在类定义前加 export）
export { WbsCodeRegistry as WbsCodeRegistryClass };