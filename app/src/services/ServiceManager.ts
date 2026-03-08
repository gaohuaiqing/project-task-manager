/**
 * 统一服务生命周期管理器
 * 负责管理所有服务的初始化和清理
 *
 * 职责：
 * 1. 统一管理所有服务的初始化顺序
 * 2. 确保所有服务在应用卸载时正确清理
 * 3. 提供内存使用监控
 * 4. 防止内存泄漏
 */

import { CacheManager } from './CacheManager';
import { backendMonitor } from './BackendMonitor';
import { wsService } from './WebSocketService';

type ServiceCleanup = () => void | Promise<void>;

class ServiceManager {
  private cleanupFunctions: Set<ServiceCleanup> = new Set();
  private isInitialized: boolean = false;
  private isDestroyed: boolean = false;

  /**
   * 初始化所有服务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[ServiceManager] 服务已初始化');
      return;
    }

    console.log('[ServiceManager] 开始初始化所有服务...');

    // 1. 初始化缓存管理器
    try {
      CacheManager.init();
      this.registerCleanup(() => CacheManager.destroy());
      console.log('[ServiceManager] ✅ CacheManager 已初始化');
    } catch (error) {
      console.error('[ServiceManager] ❌ CacheManager 初始化失败:', error);
    }

    // 2. 初始化后端监控（延迟初始化，避免阻塞）
    this.registerCleanup(() => backendMonitor.destroy());
    console.log('[ServiceManager] ✅ BackendMonitor 已注册清理');

    // 3. WebSocket 服务清理
    this.registerCleanup(() => {
      if (wsService.isConnected()) {
        wsService.disconnect();
      }
    });
    console.log('[ServiceManager] ✅ WebSocketService 已注册清理');

    this.isInitialized = true;
    console.log('[ServiceManager] 所有服务初始化完成');
  }

  /**
   * 注册清理函数
   */
  registerCleanup(cleanup: ServiceCleanup): void {
    this.cleanupFunctions.add(cleanup);
  }

  /**
   * 清理所有服务
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      console.warn('[ServiceManager] 服务已销毁');
      return;
    }

    console.log('[ServiceManager] 开始清理所有服务...');
    this.isDestroyed = true;
    this.isInitialized = false;

    const cleanupPromises: Promise<void>[] = [];

    for (const cleanup of this.cleanupFunctions) {
      try {
        const result = cleanup();
        if (result instanceof Promise) {
          cleanupPromises.push(result);
        }
      } catch (error) {
        console.error('[ServiceManager] 清理服务时出错:', error);
      }
    }

    await Promise.allSettled(cleanupPromises);
    this.cleanupFunctions.clear();

    console.log('[ServiceManager] 所有服务已清理完成');
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): { used: number; total: number } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      };
    }
    return { used: 0, total: 0 };
  }
}

// 导出单例
export const serviceManager = new ServiceManager();
