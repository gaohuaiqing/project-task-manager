/**
 * 性能监控工具
 *
 * 功能：
 * - 条件化性能监控（仅开发环境）
 * - 统一的性能标记和测量接口
 * - 生产环境中零性能开销
 *
 * @module utils/performanceMonitor
 */

// 检查是否启用性能监控
const IS_DEV = import.meta.env.DEV;
const ENABLE_PERF = IS_DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('debug_perf') === 'true');

/**
 * 性能监控类
 */
class PerformanceMonitor {
  /**
   * 开始性能标记
   */
  start(markName: string): void {
    if (!ENABLE_PERF) return;
    try {
      performance.mark(`${markName}_start`);
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 结束性能标记
   */
  end(markName: string, suffix?: string): void {
    if (!ENABLE_PERF) return;
    try {
      const endMark = suffix ? `${markName}_${suffix}` : `${markName}_end`;
      performance.mark(endMark);
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 测量性能
   */
  measure(measureName: string, startMark?: string, endMark?: string): number {
    if (!ENABLE_PERF) return 0;
    try {
      const start = startMark || `${measureName}_start`;
      const end = endMark || `${measureName}_end`;
      performance.measure(measureName, start, end);

      const duration = performance.getEntriesByName(measureName)[0]?.duration || 0;
      return duration;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取性能测量结果
   */
  getDuration(measureName: string): number {
    if (!ENABLE_PERF) return 0;
    try {
      return performance.getEntriesByName(measureName)[0]?.duration || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 清理性能标记
   */
  clear(markName: string): void {
    if (!ENABLE_PERF) return;
    try {
      performance.clearMarks(markName);
      performance.clearMeasures(markName);
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 清理所有性能标记
   */
  clearAll(): void {
    if (!ENABLE_PERF) return;
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 测量异步函数的执行时间
   */
  async measureAsync<T>(markName: string, fn: () => Promise<T>): Promise<T> {
    if (!ENABLE_PERF) {
      return fn();
    }

    const startMark = `${markName}_start`;
    const endMark = `${markName}_end`;

    try {
      performance.mark(startMark);
      const result = await fn();
      performance.mark(endMark);

      performance.measure(markName, startMark, endMark);
      const duration = performance.getEntriesByName(markName)[0]?.duration || 0;

      console.log(`[Perf] ${markName}: ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      throw error;
    } finally {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(markName);
    }
  }

  /**
   * 测量同步函数的执行时间
   */
  measureSync<T>(markName: string, fn: () => T): T {
    if (!ENABLE_PERF) {
      return fn();
    }

    const startMark = `${markName}_start`;
    const endMark = `${markName}_end`;

    try {
      performance.mark(startMark);
      const result = fn();
      performance.mark(endMark);

      performance.measure(markName, startMark, endMark);
      const duration = performance.getEntriesByName(markName)[0]?.duration || 0;

      console.log(`[Perf] ${markName}: ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      throw error;
    } finally {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(markName);
    }
  }

  /**
   * 检查是否启用性能监控
   */
  isEnabled(): boolean {
    return ENABLE_PERF;
  }
}

// 导出单例实例
export const perfMonitor = new PerformanceMonitor();

// 导出便捷函数
export const perfStart = (name: string) => perfMonitor.start(name);
export const perfEnd = (name: string, suffix?: string) => perfMonitor.end(name, suffix);
export const perfMeasure = (name: string, start?: string, end?: string) => perfMonitor.measure(name, start, end);
export const perfClear = (name: string) => perfMonitor.clear(name);
export const isPerfEnabled = () => perfMonitor.isEnabled();

/**
 * 性能监控装饰器（用于类方法）
 * 仅在开发环境生效
 */
export function MeasurePerformance(markName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (!ENABLE_PERF) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const name = markName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const startMark = `${name}_start`;
      const endMark = `${name}_end`;

      performance.mark(startMark);
      try {
        const result = originalMethod.apply(this, args);
        performance.mark(endMark);

        performance.measure(name, startMark, endMark);
        const duration = performance.getEntriesByName(name)[0]?.duration || 0;
        console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);

        return result;
      } finally {
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(name);
      }
    };

    return descriptor;
  };
}
