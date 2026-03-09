/**
 * 缓存预热脚本
 *
 * 功能：
 * 1. 在系统启动时预加载热点数据到缓存
 * 2. 支持手动触发预热
 * 3. 提供预热进度和统计信息
 * 4. 支持按类型选择性预热
 *
 * 使用方法：
 * - 自动预热：在 index.ts 中调用 warmupCacheOnStartup()
 * - 手动预热：调用 warmupCache()
 * - API触发：POST /api/batch/cache/warmup
 *
 * @author AI Assistant
 * @since 2025-03-09
 */

import { optimizedProjectService } from '../services/OptimizedProjectService.js';
import { optimizedMemberService } from '../services/OptimizedMemberService.js';
import { optimizedWbsTaskService } from '../services/OptimizedWbsTaskService.js';

// ==================== 类型定义 ====================

type WarmupType = 'projects' | 'members' | 'wbs_tasks' | 'all';

interface WarmupOptions {
  types?: WarmupType[];
  projectLimit?: number;
  memberLimit?: number;
  taskLimit?: number;
  verbose?: boolean;
}

interface WarmupResult {
  success: boolean;
  duration: number;
  stats: {
    projects: number;
    members: number;
    tasks: number;
  };
  errors: string[];
}

// ==================== 缓存预热服务 ====================

class CacheWarmupService {
  private isWarmingUp: boolean = false;
  private lastWarmupTime: number = 0;
  private warmupHistory: Array<{ time: number; result: WarmupResult }> = [];

  /**
   * 执行缓存预热
   */
  async warmupCache(options: WarmupOptions = {}): Promise<WarmupResult> {
    // 防止并发预热
    if (this.isWarmingUp) {
      console.warn('[CacheWarmup] ⚠️ 缓存预热正在进行中，跳过本次请求');
      return {
        success: false,
        duration: 0,
        stats: { projects: 0, members: 0, tasks: 0 },
        errors: ['预热正在进行中']
      };
    }

    this.isWarmingUp = true;
    const startTime = Date.now();
    const errors: string[] = [];
    const stats = { projects: 0, members: 0, tasks: 0 };

    const {
      types = ['all'],
      projectLimit = 100,
      memberLimit = 200,
      taskLimit = 500,
      verbose = true
    } = options;

    try {
      console.log('[CacheWarmup] 🚀 开始缓存预热...');
      if (verbose) {
        console.log('[CacheWarmup] 配置:', {
          types,
          projectLimit,
          memberLimit,
          taskLimit
        });
      }

      // 预热项目列表
      if (types.includes('all') || types.includes('projects')) {
        try {
          console.log('[CacheWarmup] 📦 预热项目列表...');
          const projectResult = await optimizedProjectService.getProjectList({
            page: 1,
            pageSize: projectLimit
          });
          stats.projects = projectResult.data.length;
          console.log(`[CacheWarmup] ✅ 项目列表已预热: ${stats.projects} 个项目 (耗时: ${projectResult.queryTime}ms, 缓存: ${projectResult.cached})`);
        } catch (error: any) {
          const msg = `预热项目失败: ${error.message}`;
          console.error(`[CacheWarmup] ❌ ${msg}`);
          errors.push(msg);
        }
      }

      // 预热成员列表
      if (types.includes('all') || types.includes('members')) {
        try {
          console.log('[CacheWarmup] 👥 预热成员列表...');
          const memberResult = await optimizedMemberService.getMemberList({
            page: 1,
            pageSize: memberLimit
          });
          stats.members = memberResult.data.length;
          console.log(`[CacheWarmup] ✅ 成员列表已预热: ${stats.members} 个成员 (耗时: ${memberResult.queryTime}ms, 缓存: ${memberResult.cached})`);
        } catch (error: any) {
          const msg = `预热成员失败: ${error.message}`;
          console.error(`[CacheWarmup] ❌ ${msg}`);
          errors.push(msg);
        }
      }

      // 预热任务列表
      if (types.includes('all') || types.includes('wbs_tasks')) {
        try {
          console.log('[CacheWarmup] 📋 预热任务列表...');
          const taskResult = await optimizedWbsTaskService.getTaskList({
            page: 1,
            pageSize: taskLimit
          });
          stats.tasks = taskResult.data.length;
          console.log(`[CacheWarmup] ✅ 任务列表已预热: ${stats.tasks} 个任务 (耗时: ${taskResult.queryTime}ms, 缓存: ${taskResult.cached})`);
        } catch (error: any) {
          const msg = `预热任务失败: ${error.message}`;
          console.error(`[CacheWarmup] ❌ ${msg}`);
          errors.push(msg);
        }
      }

      const duration = Date.now() - startTime;
      this.lastWarmupTime = Date.now();

      const result: WarmupResult = {
        success: errors.length === 0,
        duration,
        stats,
        errors
      };

      // 保存到历史记录
      this.warmupHistory.push({ time: Date.now(), result });
      if (this.warmupHistory.length > 10) {
        this.warmupHistory.shift(); // 只保留最近10次记录
      }

      console.log(`[CacheWarmup] 🎉 缓存预热完成! 总耗时: ${duration}ms`);
      console.log(`[CacheWarmup] 📊 统计:`, stats);

      if (errors.length > 0) {
        console.warn(`[CacheWarmup] ⚠️ 预热过程中发生 ${errors.length} 个错误:`, errors);
      }

      return result;
    } finally {
      this.isWarmingUp = false;
    }
  }

  /**
   * 系统启动时自动预热
   */
  async warmupCacheOnStartup(): Promise<void> {
    // 延迟2秒，避免阻塞系统启动
    setTimeout(async () => {
      console.log('[CacheWarmup] 系统启动完成，开始自动缓存预热...');
      await this.warmupCache({
        types: ['projects', 'members'], // 只预热核心数据
        projectLimit: 100,
        memberLimit: 200,
        verbose: true
      });
    }, 2000);
  }

  /**
   * 获取预热状态
   */
  getStatus(): {
    isWarmingUp: boolean;
    lastWarmupTime: number;
    lastWarmupAgo: string;
    history: Array<{ time: number; result: WarmupResult }>;
  } {
    const lastWarmupAgo = this.lastWarmupTime
      ? `${Math.floor((Date.now() - this.lastWarmupTime) / 1000)}秒前`
      : '从未预热';

    return {
      isWarmingUp: this.isWarmingUp,
      lastWarmupTime: this.lastWarmupTime,
      lastWarmupAgo,
      history: this.warmupHistory
    };
  }

  /**
   * 获取预热历史
   */
  getHistory(): Array<{ time: number; result: WarmupResult }> {
    return [...this.warmupHistory];
  }
}

// ==================== 导出 ====================

export const cacheWarmupService = new CacheWarmupService();

// 便捷函数
export async function warmupCache(options?: WarmupOptions): Promise<WarmupResult> {
  return cacheWarmupService.warmupCache(options);
}

export async function warmupCacheOnStartup(): Promise<void> {
  return cacheWarmupService.warmupCacheOnStartup();
}
