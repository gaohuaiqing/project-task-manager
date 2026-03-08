/**
 * 前端日志服务
 * 用于收集和记录前端运行日志和用户操作日志
 * 包括console拦截、错误捕获、性能监控等
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogType = 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE' | 'FRONTEND';

export interface LogEntry {
  level: LogLevel;
  type: LogType;
  message: string;
  details?: any;
  userId?: number;
  username?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: number;
}

class FrontendLogger {
  // 🚨 紧急修复：默认禁用前端日志，避免后端服务崩溃
  // 可通过 window.ENABLE_FRONTEND_LOGS = true 临时启用调试
  private isEnabled: boolean = false;

  private sessionId: string | null = null;
  private buffer: LogEntry[] = [];
  private maxBufferSize: number = 20; // 🔧 优化：从 100 降低到 20，减少日志量
  private flushInterval: number = 60000; // 🔧 紧急修复：增加到 60 秒，减少发送频率
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private enableConsoleIntercept: boolean = false; // 🔧 优化：禁用 console 拦截，避免日志爆炸

  // 🚨 紧急模式标志
  private emergencyMode: boolean = false;

  // 保存原始console方法
  private originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  constructor() {
    // 检查是否有全局标志启用日志（用于调试）
    if (typeof window !== 'undefined' && (window as any).ENABLE_FRONTEND_LOGS === true) {
      this.isEnabled = true;
      console.warn('[FrontendLogger] ⚠️ 前端日志已手动启用（调试模式）');
    }

    // 检查是否处于紧急模式（后端不可用）
    if (typeof window !== 'undefined' && (window as any).BACKEND_UNAVAILABLE === true) {
      this.emergencyMode = true;
      this.isEnabled = false;
      console.warn('[FrontendLogger] 🚨 紧急模式：后端不可用，日志已禁用');
    }

    // 优化：使用 requestIdleCallback 或微任务初始化
    if (typeof window !== 'undefined') {
      const initLogger = () => {
        try {
          this.init();
        } catch (error) {
          console.error('[FrontendLogger] 初始化失败:', error);
        }
      };

      // 优先使用 requestIdleCallback
      if ('requestIdleCallback' in window) {
        requestIdleCallback(initLogger, { timeout: 2000 });
      } else {
        // 降级方案：使用 queueMicrotask 或较短的 setTimeout
        if ('queueMicrotask' in window) {
          queueMicrotask(initLogger);
        } else {
          setTimeout(initLogger, 100);
        }
      }
    }
  }

  private init() {
    // 生成会话ID
    this.sessionId = this.generateSessionId();

    // 🔧 优化：默认禁用 console 拦截，避免日志爆炸
    // 如需启用，将 enableConsoleIntercept 设置为 true
    if (this.enableConsoleIntercept) {
      this.interceptConsole();
    }

    // 捕获全局错误（保留，这些是重要错误）
    this.setupGlobalErrorHandlers();

    // 捕获性能指标（保留，性能监控有价值）
    this.setupPerformanceMonitoring();

    // 定期刷新缓冲区
    this.startFlushTimer();

    // 页面卸载时发送日志
    window.addEventListener('beforeunload', () => {
      this.flushSync();
    });

    // 记录启动信息
    this.addToBuffer({
      level: 'INFO',
      type: 'FRONTEND',
      message: this.enableConsoleIntercept
        ? '前端日志服务已启动，console拦截已启用'
        : '前端日志服务已启动，console拦截已禁用（优化模式）'
    });
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 拦截console方法 - 捕获所有控制台输出
   */
  private interceptConsole() {
    const self = this;

    // 拦截 console.log
    console.log = function(...args: any[]) {
      self.originalConsole.log(...args);
      self.addToBuffer({
        level: 'INFO',
        type: 'FRONTEND',
        message: self.formatArgs(args),
        details: { args: self.safeStringifyArgs(args) }
      });
    };

    // 拦截 console.info
    console.info = function(...args: any[]) {
      self.originalConsole.info(...args);
      self.addToBuffer({
        level: 'INFO',
        type: 'FRONTEND',
        message: self.formatArgs(args),
        details: { args: self.safeStringifyArgs(args) }
      });
    };

    // 拦截 console.warn
    console.warn = function(...args: any[]) {
      self.originalConsole.warn(...args);
      self.addToBuffer({
        level: 'WARN',
        type: 'FRONTEND',
        message: self.formatArgs(args),
        details: { args: self.safeStringifyArgs(args) }
      });
    };

    // 拦截 console.error
    console.error = function(...args: any[]) {
      self.originalConsole.error(...args);
      self.addToBuffer({
        level: 'ERROR',
        type: 'FRONTEND',
        message: self.formatArgs(args),
        details: { args: self.safeStringifyArgs(args) }
      });
    };

    // 拦截 console.debug
    console.debug = function(...args: any[]) {
      self.originalConsole.debug(...args);
      self.addToBuffer({
        level: 'DEBUG',
        type: 'FRONTEND',
        message: self.formatArgs(args),
        details: { args: self.safeStringifyArgs(args) }
      });
    };
  }

  /**
   * 格式化参数为字符串
   */
  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');
  }

  /**
   * 安全地序列化参数（避免循环引用）
   */
  private safeStringifyArgs(args: any[]): any[] {
    return args.map(arg => {
      if (arg === null || arg === undefined) return arg;
      if (typeof arg !== 'object') return arg;
      if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: arg.stack };
      }
      try {
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return '[Circular]';
      }
    });
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers() {
    const self = this;

    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      self.addToBuffer({
        level: 'ERROR',
        type: 'FRONTEND',
        message: `运行时错误: ${event.message}`,
        details: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    });

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      self.addToBuffer({
        level: 'ERROR',
        type: 'FRONTEND',
        message: `未处理的Promise拒绝: ${event.reason}`,
        details: {
          reason: String(event.reason),
          promise: String(event.promise)
        }
      });
    });

    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        self.addToBuffer({
          level: 'ERROR',
          type: 'FRONTEND',
          message: `资源加载失败: <${target.tagName}>`,
          details: {
            tagName: target.tagName,
            src: (target as any).src || (target as any).href,
            type: (target as any).type
          }
        });
      }
    }, true);
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring() {
    const self = this;

    // 监听页面加载性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

        self.addToBuffer({
          level: 'INFO',
          type: 'PERFORMANCE',
          message: '页面加载性能',
          details: {
            pageLoadTime: `${pageLoadTime}ms`,
            domReadyTime: `${domReadyTime}ms`,
            dnsLookup: `${perfData.domainLookupEnd - perfData.domainLookupStart}ms`,
            tcpConnection: `${perfData.connectEnd - perfData.connectStart}ms`,
            requestTime: `${perfData.responseEnd - perfData.requestStart}ms`
          }
        });
      }, 0);
    });

    // 监听资源加载性能
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
              const perfEntry = entry as PerformanceResourceTiming;
              self.addToBuffer({
                level: 'DEBUG',
                type: 'PERFORMANCE',
                message: `资源加载: ${perfEntry.name}`,
                details: {
                  duration: `${perfEntry.duration.toFixed(2)}ms`,
                  size: perfEntry.transferSize ? `${(perfEntry.transferSize / 1024).toFixed(2)}KB` : 'unknown'
                }
              });
            }
          }
        });
        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (e) {
        // PerformanceObserver不支持，忽略
      }
    }
  }

  /**
   * 添加日志到缓冲区
   * 🔧 优化：添加级别过滤，只记录 ERROR 和 WARN
   */
  /**
   * 添加日志到缓冲区
   * 🚨 紧急优化：仅在紧急模式外记录日志
   */
  private addToBuffer(entry: LogEntry) {
    if (!this.isEnabled || this.emergencyMode) return;

    // 🔧 优化：只记录 ERROR 和 WARN 级别的日志
    // INFO 和 DEBUG 级别太多，会导致日志爆炸
    if (entry.level !== 'ERROR' && entry.level !== 'WARN') {
      return;
    }

    // 🚨 紧急修复：如果检测到大量日志，自动进入紧急模式
    if (this.buffer.length > 50) {
      console.warn('[FrontendLogger] 🚨 检测到日志积压，启用紧急模式');
      this.emergencyMode = true;
      this.buffer = [];  // 清空缓冲区
      return;
    }

    // 添加时间戳和会话ID
    entry.timestamp = Date.now();
    entry.sessionId = entry.sessionId || this.sessionId || undefined;

    // 添加用户代理
    if (!entry.userAgent) {
      entry.userAgent = navigator.userAgent;
    }

    this.buffer.push(entry);

    // 如果缓冲区满了，立即刷新
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * 记录日志（公开方法）
   */
  async log(entry: LogEntry): Promise<void> {
    this.addToBuffer(entry);
  }

  /**
   * 便捷方法：记录错误
   */
  async error(message: string, details?: any): Promise<void> {
    return this.log({
      level: 'ERROR',
      type: 'SYSTEM',
      message,
      details
    });
  }

  /**
   * 便捷方法：记录警告
   */
  async warn(message: string, details?: any): Promise<void> {
    return this.log({
      level: 'WARN',
      type: 'SYSTEM',
      message,
      details
    });
  }

  /**
   * 便捷方法：记录信息
   */
  async info(message: string, details?: any): Promise<void> {
    return this.log({
      level: 'INFO',
      type: 'SYSTEM',
      message,
      details
    });
  }

  /**
   * 便捷方法：记录用户操作
   */
  async logUserAction(action: string, details?: any): Promise<void> {
    return this.log({
      level: 'INFO',
      type: 'USER_ACTION',
      message: `用户操作: ${action}`,
      details
    });
  }

  /**
   * 便捷方法：记录API调用
   */
  async logApiCall(endpoint: string, success: boolean, duration?: number, details?: any): Promise<void> {
    return this.log({
      level: success ? 'INFO' : 'ERROR',
      type: 'DATA_SYNC',
      message: `API调用: ${endpoint} (${success ? '成功' : '失败'})`,
      details: {
        endpoint,
        success,
        duration: duration ? `${duration}ms` : undefined,
        ...details
      }
    });
  }

  /**
   * 便捷方法：记录认证事件
   */
  async logAuth(event: string, details?: any): Promise<void> {
    return this.log({
      level: 'INFO',
      type: 'AUTH',
      message: `认证事件: ${event}`,
      details
    });
  }

  /**
   * 便捷方法：记录性能指标
   */
  async logPerformance(metric: string, value: number, details?: any): Promise<void> {
    return this.log({
      level: 'INFO',
      type: 'PERFORMANCE',
      message: `性能指标: ${metric} = ${value}ms`,
      details: { metric, value, ...details }
    });
  }

  /**
   * 刷新缓冲区到后端（异步）
   * 🚨 紧急修复：增加后端健康检查和降级处理
   */
  private async flush(): Promise<void> {
    // 🚨 紧急模式或已禁用，不发送
    if (this.buffer.length === 0 || !this.isEnabled || this.emergencyMode) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch('http://localhost:3001/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
        keepalive: true,
        signal: AbortSignal.timeout(5000) // 🚨 添加 5 秒超时
      });

      // 🚨 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 🚨 如果记录率过低，启用紧急模式
      if (result.recorded / result.received < 0.5) {
        console.warn('[FrontendLogger] 🚨 日志记录率过低，启用紧急模式');
        this.emergencyMode = true;
      }

      console.log(`[FrontendLogger] ✅ 发送成功: ${result.recorded}/${result.received}`);
    } catch (error) {
      console.error('[FrontendLogger] 发送日志失败:', error);

      // 🚨 发送失败，启用紧急模式
      if (!this.emergencyMode) {
        this.emergencyMode = true;
        (window as any).BACKEND_UNAVAILABLE = true;
        console.warn('[FrontendLogger] 🚨 后端不可用，已启用紧急模式');
      }

      // 发送失败，重新加入缓冲区（但限制重试次数）
      if (this.buffer.length < this.maxBufferSize) {
        this.buffer.unshift(...logsToSend.slice(0, 10)); // 只重试前10条
      }
    }
  }

  /**
   * 同步刷新（用于页面卸载）
   * 修复Bug-P2-003: 检查sendBeacon返回值，失败时使用localStorage备份
   */
  private flushSync(): void {
    if (this.buffer.length === 0) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];

    // 使用 sendBeacon 确保页面卸载时也能发送
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ logs: logsToSend })], { type: 'application/json' });
      const sent = navigator.sendBeacon('http://localhost:3001/api/logs', blob);

      // 修复Bug-P2-003: 检查sendBeacon返回值
      if (!sent) {
        console.warn('[FrontendLogger] sendBeacon发送失败，尝试保存到localStorage');
        this.saveToLocalStorage(logsToSend);
      }
    } else {
      // 降级使用同步 fetch（不推荐但必要时使用）
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:3001/api/logs', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ logs: logsToSend }));

        // 检查XHR是否成功
        if (xhr.status >= 400) {
          console.warn('[FrontendLogger] XHR发送失败，尝试保存到localStorage');
          this.saveToLocalStorage(logsToSend);
        }
      } catch (error) {
        console.error('[FrontendLogger] 同步发送日志失败:', error);
        this.saveToLocalStorage(logsToSend);
      }
    }
  }

  /**
   * 保存日志到localStorage作为备份
   */
  private saveToLocalStorage(logs: LogEntry[]): void {
    try {
      const key = `frontend_logs_backup_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(logs));

      // 清理旧的备份日志（只保留最近5个备份）
      const backupKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('frontend_logs_backup_'))
        .sort()
        .reverse();

      if (backupKeys.length > 5) {
        backupKeys.slice(5).forEach(k => localStorage.removeItem(k));
      }

      console.log(`[FrontendLogger] 已备份 ${logs.length} 条日志到localStorage (${key})`);
    } catch (error) {
      console.error('[FrontendLogger] 保存到localStorage失败:', error);
    }
  }

  /**
   * 启动定期刷新
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 设置用户信息
   */
  setUser(userId: number, username: string): void {
    // 更新缓冲区中所有日志的用户信息
    this.buffer.forEach(entry => {
      if (!entry.userId) {
        entry.userId = userId;
        entry.username = username;
      }
    });
  }

  /**
   * 设置会话ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

// 导出单例实例
export const frontendLogger = new FrontendLogger();

// 在应用启动时自动初始化
if (typeof window !== 'undefined') {
  console.log('[FrontendLogger] 前端日志服务已启动，console拦截已启用');
}
