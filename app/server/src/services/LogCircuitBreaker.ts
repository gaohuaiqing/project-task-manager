/**
 * 日志系统熔断器
 * 防止日志系统故障导致级联故障
 *
 * 🚨 紧急修复：保护主业务系统不受日志系统故障影响
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // 失败阈值（默认 10）
  cooldownTime?: number;          // 冷却时间（默认 60000ms = 1 分钟）
  resetTimeout?: number;         // 半开状态超时（默认 10000ms = 10 秒）
  onOpen?: () => void;            // 熔断开启回调
  onHalfOpen?: () => void;        // 半开状态回调
  onClose?: () => void;           // 熔断关闭回调
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // 正常状态
  OPEN = 'OPEN',         // 熔断开启
  HALF_OPEN = 'HALF_OPEN'  // 半开状态（尝试恢复）
}

export class LogCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  private readonly failureThreshold: number;
  private readonly cooldownTime: number;
  private readonly resetTimeout: number;

  private onOpenCallback?: () => void;
  private onHalfOpenCallback?: () => void;
  private onCloseCallback?: () => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 10;
    this.cooldownTime = options.cooldownTime ?? 60000;
    this.resetTimeout = options.resetTimeout ?? 10000;

    this.onOpenCallback = options.onOpen;
    this.onHalfOpenCallback = options.onHalfOpen;
    this.onCloseCallback = options.onClose;

    console.log('[CircuitBreaker] ✅ 熔断器已初始化', {
      failureThreshold: this.failureThreshold,
      cooldownTime: this.cooldownTime,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * 执行函数（带熔断保护）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查是否在熔断状态
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        // 熔断开启，拒绝请求
        throw new Error('[CircuitBreaker] 熔断开启，拒绝执行');
      }

      // 冷却时间结束，进入半开状态
      this.transitionToHalfOpen();
    }

    try {
      const result = await fn();

      // 成功，重置失败计数
      this.onSuccess();

      return result;
    } catch (error) {
      // 失败，增加失败计数
      this.onFailure();

      throw error;
    }
  }

  /**
   * 同步执行函数（带熔断保护）
   */
  executeSync<T>(fn: () => T): T {
    // 检查是否在熔断状态
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        // 熔断开启，拒绝请求
        throw new Error('[CircuitBreaker] 熔断开启，拒绝执行');
      }

      // 冷却时间结束，进入半开状态
      this.transitionToHalfOpen();
    }

    try {
      const result = fn();

      // 成功，重置失败计数
      this.onSuccess();

      return result;
    } catch (error) {
      // 失败，增加失败计数
      this.onFailure();

      throw error;
    }
  }

  /**
   * 处理成功
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下成功，关闭熔断器
      if (this.successCount >= 3) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * 处理失败
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下失败，重新开启熔断器
      this.transitionToOpen();
    } else if (this.failureCount >= this.failureThreshold) {
      // 达到失败阈值，开启熔断器
      this.transitionToOpen();
    }
  }

  /**
   * 转换到关闭状态（正常）
   */
  private transitionToClosed(): void {
    if (this.state !== CircuitBreakerState.CLOSED) {
      console.log('[CircuitBreaker] ✅ 熔断器已关闭（恢复正常）');
      this.state = CircuitBreakerState.CLOSED;
      this.failureCount = 0;
      this.successCount = 0;
      this.onCloseCallback?.();
    }
  }

  /**
   * 转换到开启状态（熔断）
   */
  private transitionToOpen(): void {
    if (this.state !== CircuitBreakerState.OPEN) {
      console.error(`[CircuitBreaker] 🔴 熔断器已开启！连续失败 ${this.failureCount} 次`);
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.cooldownTime;
      this.onOpenCallback?.();
    }
  }

  /**
   * 转换到半开状态（尝试恢复）
   */
  private transitionToHalfOpen(): void {
    if (this.state !== CircuitBreakerState.HALF_OPEN) {
      console.log('[CircuitBreaker] ⚠️ 熔断器进入半开状态（尝试恢复）');
      this.state = CircuitBreakerState.HALF_OPEN;
      this.successCount = 0;
      this.onHalfOpenCallback?.();
    }
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * 手动重置熔断器
   */
  reset(): void {
    console.log('[CircuitBreaker] 🔄 熔断器已手动重置');
    this.transitionToClosed();
  }

  /**
   * 强制开启熔断器（用于测试）
   */
  forceOpen(): void {
    console.log('[CircuitBreaker] 🔴 熔断器已强制开启');
    this.transitionToOpen();
  }
}

// ================================================================
// 全局单例
// ================================================================

/**
 * 系统日志熔断器
 */
export const systemLogCircuitBreaker = new LogCircuitBreaker({
  failureThreshold: 10,
  cooldownTime: 60000,
  resetTimeout: 10000,
  onOpen: () => {
    console.error('[SystemLogCircuitBreaker] 🔴 系统日志熔断器开启！日志已禁用');
    console.error('[SystemLogCircuitBreaker] ⚠️ 检查：1) 数据库连接 2) 磁盘空间 3) 日志表锁定');
  },
  onHalfOpen: () => {
    console.log('[SystemLogCircuitBreaker] ⚠️ 系统日志熔断器进入半开状态（尝试恢复）');
  },
  onClose: () => {
    console.log('[SystemLogCircuitBreaker] ✅ 系统日志熔断器已关闭（恢复正常）');
  }
});

/**
 * 审计日志熔断器
 */
export const auditLogCircuitBreaker = new LogCircuitBreaker({
  failureThreshold: 15,
  cooldownTime: 120000,  // 2 分钟
  resetTimeout: 10000,
  onOpen: () => {
    console.error('[AuditLogCircuitBreaker] 🔴 审计日志熔断器开启！审计日志已禁用');
  },
  onHalfOpen: () => {
    console.log('[AuditLogCircuitBreaker] ⚠️ 审计日志熔断器进入半开状态（尝试恢复）');
  },
  onClose: () => {
    console.log('[AuditLogCircuitBreaker] ✅ 审计日志熔断器已关闭（恢复正常）');
  }
});

/**
 * 检查所有熔断器状态
 */
export function getAllCircuitBreakerStats(): {
  systemLog: ReturnType<typeof systemLogCircuitBreaker.getStats>;
  auditLog: ReturnType<typeof auditLogCircuitBreaker.getStats>;
} {
  return {
    systemLog: systemLogCircuitBreaker.getStats(),
    auditLog: auditLogCircuitBreaker.getStats()
  };
}

/**
 * 重置所有熔断器
 */
export function resetAllCircuitBreakers(): void {
  systemLogCircuitBreaker.reset();
  auditLogCircuitBreaker.reset();
  console.log('[CircuitBreaker] ✅ 所有熔断器已重置');
}
