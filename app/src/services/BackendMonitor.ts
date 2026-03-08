/**
 * 后端连接监控服务
 * 定期检查后端服务是否可用，当后端不可用时记录到事件日志
 */

import { frontendLogger } from './FrontendLogger';

export interface BackendStatus {
  isOnline: boolean;
  lastCheckTime: number;
  lastSuccessTime?: number;
  lastFailureTime?: number;
  consecutiveFailures: number;
  lastError?: string;
}

export interface BackendMonitorConfig {
  // 后端服务器地址
  backendUrl: string;
  // 健康检查间隔（毫秒）
  checkInterval: number;
  // 连接超时时间（毫秒）
  timeout: number;
  // 多少次连续失败后记录错误日志
  failureThreshold: number;
  // 是否在启动时立即检查
  checkOnStartup: boolean;
  // 是否在页面可见时检查
  checkOnVisibilityChange: boolean;
}

class BackendMonitor {
  private status: BackendStatus = {
    isOnline: false,
    lastCheckTime: 0,
    consecutiveFailures: 0
  };

  private config: BackendMonitorConfig = {
    backendUrl: 'http://localhost:3001',
    checkInterval: 30000, // 30秒
    timeout: 5000, // 5秒
    failureThreshold: 2, // 2次连续失败后记录错误
    checkOnStartup: true,
    checkOnVisibilityChange: true
  };

  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private isChecking: boolean = false;
  private hasLoggedOffline: boolean = false; // 防止重复记录离线日志

  // 生命周期管理属性
  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private initIdleCallbackId: number | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private isDestroyed: boolean = false;
  private isInitialized: boolean = false;

  constructor(config?: Partial<BackendMonitorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // ✅ 恢复自动初始化
    // 确保单例在创建时立即开始工作
    this.init();

    console.log('[BackendMonitor] 已创建并自动初始化');
  }

  /**
   * 初始化监控服务
   */
  private init(): void {
    if (this.isDestroyed || this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    console.log('[BackendMonitor] 后端连接监控服务初始化');

    // 启动时检查
    if (this.config.checkOnStartup) {
      this.checkBackendStatus();
    }

    // 设置定期检查
    this.startPeriodicCheck();

    // 监听页面可见性变化（保存处理器引用以便清理）
    if (this.config.checkOnVisibilityChange) {
      this.visibilityChangeHandler = () => {
        if (!document.hidden && !this.isDestroyed) {
          console.log('[BackendMonitor] 页面变为可见，检查后端状态');
          this.checkBackendStatus();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    // 监听网络状态变化（保存处理器引用以便清理）
    this.onlineHandler = () => {
      if (!this.isDestroyed) {
        console.log('[BackendMonitor] 网络连接恢复，检查后端状态');
        this.checkBackendStatus();
      }
    };
    window.addEventListener('online', this.onlineHandler);

    // 记录监控启动
    frontendLogger.info('后端连接监控服务已启动', {
      backendUrl: this.config.backendUrl,
      checkInterval: `${this.config.checkInterval}ms`,
      timeout: `${this.config.timeout}ms`
    });
  }

  /**
   * 启动定期检查
   */
  private startPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkBackendStatus();
    }, this.config.checkInterval);
  }

  /**
   * 检查后端状态
   */
  public async checkBackendStatus(): Promise<boolean> {
    // 防止重复检查
    if (this.isChecking) {
      return this.status.isOnline;
    }

    this.isChecking = true;

    try {
      const startTime = Date.now();

      // 使用 fetch 的超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      if (response.ok) {
        // 后端在线
        this.handleBackendOnline();
        return true;
      } else {
        // 后端返回错误状态码
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // 后端离线或连接失败
      this.handleBackendOffline(error);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 处理后端在线
   */
  private handleBackendOnline(): void {
    const wasOffline = !this.status.isOnline;
    const wasConsecutivelyFailed = this.status.consecutiveFailures > 0;

    this.status.isOnline = true;
    this.status.lastCheckTime = Date.now();
    this.status.lastSuccessTime = Date.now();
    this.status.consecutiveFailures = 0;
    this.status.lastError = undefined;
    this.hasLoggedOffline = false;

    // 如果之前离线，现在恢复在线，记录恢复日志
    if (wasOffline && wasConsecutivelyFailed) {
      frontendLogger.info('后端服务已恢复在线', {
        backendUrl: this.config.backendUrl,
        downtime: this.status.lastFailureTime
          ? `${Date.now() - this.status.lastFailureTime}ms`
          : 'unknown'
      });

      console.log('[BackendMonitor] ✅ 后端服务已恢复在线');
    }
  }

  /**
   * 处理后端离线
   */
  private handleBackendOffline(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.status.isOnline = false;
    this.status.lastCheckTime = Date.now();
    this.status.lastFailureTime = Date.now();
    this.status.consecutiveFailures++;
    this.status.lastError = errorMessage;

    // 达到失败阈值后记录错误日志（防止重复记录）
    if (this.status.consecutiveFailures >= this.config.failureThreshold && !this.hasLoggedOffline) {
      this.hasLoggedOffline = true;

      // 记录错误日志到前端日志（会在后端恢复后发送）
      frontendLogger.error('后端服务不可用', {
        backendUrl: this.config.backendUrl,
        error: errorMessage,
        consecutiveFailures: this.status.consecutiveFailures,
        suggestion: '请检查后端服务是否已启动',
        troubleshooting: [
          '1. 确认后端服务是否正在运行',
          '2. 检查后端服务地址是否正确',
          '3. 查看后端服务日志',
          '4. 确认端口 3001 是否被占用',
          '5. 启动后端: cd app/server && npm run dev'
        ]
      });

      // 同时记录到 localStorage 作为持久化备份
      this.saveOfflineErrorToStorage(errorMessage);

      console.error('[BackendMonitor] ❌ 后端服务不可用:', errorMessage);
      console.error('[BackendMonitor] 💡 解决方案:');
      console.error('[BackendMonitor]    1. 检查后端服务是否已启动');
      console.error('[BackendMonitor]    2. 查看后端日志排查错误');
      console.error('[BackendMonitor]    3. 启动命令: cd app/server && npm run dev');
      console.error('[BackendMonitor]    4. 检查端口 3001 是否被占用');
    }
  }

  /**
   * 保存离线错误到 localStorage
   * 确保即使页面刷新，用户也能看到后端离线的信息
   */
  private saveOfflineErrorToStorage(errorMessage: string): void {
    try {
      const offlineError = {
        type: 'backend_offline',
        message: '后端服务不可用',
        error: errorMessage,
        backendUrl: this.config.backendUrl,
        timestamp: Date.now(),
        resolved: false
      };

      localStorage.setItem('backend_offline_status', JSON.stringify(offlineError));
    } catch (e) {
      console.error('[BackendMonitor] 保存离线状态到 localStorage 失败:', e);
    }
  }

  /**
   * 清除离线错误标记
   */
  private clearOfflineErrorFromStorage(): void {
    try {
      localStorage.removeItem('backend_offline_status');
    } catch (e) {
      console.error('[BackendMonitor] 清除离线状态失败:', e);
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus(): BackendStatus {
    return { ...this.status };
  }

  /**
   * 检查后端是否在线
   */
  public isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * 获取连续失败次数
   */
  public getConsecutiveFailures(): number {
    return this.status.consecutiveFailures;
  }

  /**
   * 手动触发检查
   */
  public async manualCheck(): Promise<boolean> {
    console.log('[BackendMonitor] 手动触发后端状态检查');
    return await this.checkBackendStatus();
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<BackendMonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // 如果更新了检查间隔，重启定时器
    if (config.checkInterval) {
      this.startPeriodicCheck();
    }
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    console.log('[BackendMonitor] 后端连接监控服务已停止');
  }

  /**
   * 恢复监控
   */
  public resume(): void {
    if (this.isDestroyed) {
      console.warn('[BackendMonitor] 无法恢复已销毁的监控服务');
      return;
    }
    this.startPeriodicCheck();
    console.log('[BackendMonitor] 后端连接监控服务已恢复');
  }

  /**
   * 销毁监控服务，清理所有资源
   * 这个方法应该只在应用卸载时调用
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isInitialized = false;

    // 停止定时器
    this.stop();

    // 清理初始化定时器
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }

    // 清理 idle callback
    if (this.initIdleCallbackId !== null && typeof window !== 'undefined') {
      if ('cancelIdleCallback' in window) {
        cancelIdleCallback(this.initIdleCallbackId);
      }
      this.initIdleCallbackId = null;
    }

    // 移除事件监听器
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }

    // 清除离线错误标记
    this.clearOfflineErrorFromStorage();

    console.log('[BackendMonitor] 后端连接监控服务已销毁');
  }

  /**
   * 检查服务是否已销毁
   */
  public isServiceDestroyed(): boolean {
    return this.isDestroyed;
  }
}

// 导出单例实例
export const backendMonitor = new BackendMonitor();

// 导出类型
export type { BackendMonitorConfig };
