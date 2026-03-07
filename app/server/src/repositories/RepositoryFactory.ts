/**
 * RepositoryFactory - Repository工厂类
 *
 * 统一管理和创建Repository实例
 * 确保整个应用使用相同的Repository实例
 */

import type { DatabaseService } from '../services/DatabaseService.js';
import {
  BaseRepository,
  ProjectRepository,
  WbsTaskRepository,
  MemberRepository,
  UserRepository,
} from './index.js';

/**
 * Repository注册表
 */
interface RepositoryRegistry {
  project: ProjectRepository;
  wbsTask: WbsTaskRepository;
  member: MemberRepository;
  user: UserRepository;
}

/**
 * RepositoryFactory类
 *
 * 单例模式，确保全局只有一个RepositoryFactory实例
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory | null = null;
  private readonly repositories: Partial<RepositoryRegistry> = {};
  private readonly db: DatabaseService;

  private constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * 获取RepositoryFactory单例实例
   */
  static getInstance(db: DatabaseService): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db);
    }
    return RepositoryFactory.instance;
  }

  /**
   * 重置RepositoryFactory实例（主要用于测试）
   */
  static resetInstance(): void {
    RepositoryFactory.instance = null;
  }

  /**
   * 获取ProjectRepository实例
   */
  getProjectRepository(): ProjectRepository {
    if (!this.repositories.project) {
      this.repositories.project = new ProjectRepository(this.db);
    }
    return this.repositories.project;
  }

  /**
   * 获取WbsTaskRepository实例
   */
  getWbsTaskRepository(): WbsTaskRepository {
    if (!this.repositories.wbsTask) {
      this.repositories.wbsTask = new WbsTaskRepository(this.db);
    }
    return this.repositories.wbsTask;
  }

  /**
   * 获取MemberRepository实例
   */
  getMemberRepository(): MemberRepository {
    if (!this.repositories.member) {
      this.repositories.member = new MemberRepository(this.db);
    }
    return this.repositories.member;
  }

  /**
   * 获取UserRepository实例
   */
  getUserRepository(): UserRepository {
    if (!this.repositories.user) {
      this.repositories.user = new UserRepository(this.db);
    }
    return this.repositories.user;
  }

  /**
   * 获取所有Repository实例
   */
  getAllRepositories(): RepositoryRegistry {
    return {
      project: this.getProjectRepository(),
      wbsTask: this.getWbsTaskRepository(),
      member: this.getMemberRepository(),
      user: this.getUserRepository(),
    };
  }

  /**
   * 通用方法：获取指定类型的Repository
   */
  getRepository<T extends keyof RepositoryRegistry>(type: T): RepositoryRegistry[T] {
    switch (type) {
      case 'project':
        return this.getProjectRepository() as RepositoryRegistry[T];
      case 'wbsTask':
        return this.getWbsTaskRepository() as RepositoryRegistry[T];
      case 'member':
        return this.getMemberRepository() as RepositoryRegistry[T];
      case 'user':
        return this.getUserRepository() as RepositoryRegistry[T];
      default:
        throw new Error(`Unknown repository type: ${type}`);
    }
  }

  /**
   * 清理所有Repository实例
   */
  clear(): void {
    for (const key of Object.keys(this.repositories)) {
      delete this.repositories[key as keyof RepositoryRegistry];
    }
  }

  /**
   * 执行数据库事务
   *
   * @param callback - 事务回调函数
   * @returns 回调函数的返回值
   */
  async transaction<T>(
    callback: (repos: RepositoryRegistry) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(async () => {
      return callback(this.getAllRepositories());
    });
  }

  /**
   * 健康检查
   *
   * 检查所有Repository是否可用
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    repositories: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};

    try {
      // 测试ProjectRepository
      await this.getProjectRepository().count();
      results.project = true;
    } catch {
      results.project = false;
    }

    try {
      // 测试WbsTaskRepository
      await this.getWbsTaskRepository().count();
      results.wbsTask = true;
    } catch {
      results.wbsTask = false;
    }

    try {
      // 测试MemberRepository
      await this.getMemberRepository().count();
      results.member = true;
    } catch {
      results.member = false;
    }

    try {
      // 测试UserRepository
      await this.getUserRepository().count();
      results.user = true;
    } catch {
      results.user = false;
    }

    const allHealthy = Object.values(results).every(status => status === true);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      repositories: results,
    };
  }
}

/**
 * 初始化RepositoryFactory的便捷函数
 *
 * @param db - DatabaseService实例
 * @returns RepositoryFactory实例
 */
export function initRepositories(db: DatabaseService): RepositoryFactory {
  return RepositoryFactory.getInstance(db);
}
