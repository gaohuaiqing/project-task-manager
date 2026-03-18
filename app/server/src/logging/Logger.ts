/**
 * 高性能日志服务
 *
 * 支持 pino 日志库（可选）：
 * - 如果 pino 可用：使用 pino 实现高性能日志
 * - 如果 pino 不可用：降级到简单控制台日志
 *
 * 功能：
 * - 异步写入：不阻塞主线程（pino 模式）
 * - 性能监控：自动记录慢操作
 * - 结构化日志：JSON格式，便于分析
 * - 分级日志：ERROR/WARN/INFO/DEBUG/TRACE
 */

// 尝试导入 pino，如果失败则使用 null
let pino: any = null;
let pinoAvailable = false;
try {
  const pinoModule = await import('pino');
  pino = pinoModule.default || pinoModule;
  pinoAvailable = true;
} catch (e) {
  pinoAvailable = false;
}

import {
  DEFAULT_LOGGER_CONFIG,
  getPinoConfig,
  getPinoTransport,
  isPinoAvailable,
  LogLevel,
  PERFORMANCE_CONFIG,
  LOG_CATEGORIES,
  type LogCategory
} from './config.js';

/**
 * 性能日志数据接口
 */
export interface PerformanceLogData {
  method: string;
  duration: number;
  args?: string;
  error?: string;
  stack?: string;
}

/**
 * HTTP请求日志数据接口
 */
export interface HttpRequestLogData {
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * HTTP响应日志数据接口
 */
export interface HttpResponseLogData {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestId?: string;
}

/**
 * 简单日志接口（用于 pino 不可用时）
 */
interface SimpleLogger {
  fatal: (obj: any, msg: string) => void;
  error: (obj: any, msg: string) => void;
  warn: (obj: any, msg: string) => void;
  info: (obj: any, msg: string) => void;
  debug: (obj: any, msg: string) => void;
  trace: (obj: any, msg: string) => void;
}

/**
 * 创建简单控制台日志（pino 不可用时的后备方案）
 */
function createSimpleLogger(): SimpleLogger {
  return {
    fatal: (obj: any, msg: string) => console.error(`[FATAL] ${obj.category || ''} ${msg}`, obj),
    error: (obj: any, msg: string) => console.error(`[ERROR] ${obj.category || ''} ${msg}`, obj),
    warn: (obj: any, msg: string) => console.warn(`[WARN] ${obj.category || ''} ${msg}`, obj),
    info: (obj: any, msg: string) => console.info(`[INFO] ${obj.category || ''} ${msg}`, obj),
    debug: (obj: any, msg: string) => console.debug(`[DEBUG] ${obj.category || ''} ${msg}`, obj),
    trace: (obj: any, msg: string) => console.trace(`[TRACE] ${obj.category || ''} ${msg}`, obj)
  };
}

/**
 * 日志服务类
 */
export class LoggerService {
  private logger: any;
  private config: typeof DEFAULT_LOGGER_CONFIG;
  private errorCounts: Map<string, number> = new Map();
  private performanceSamples: Map<string, number[]> = new Map();

  constructor(config = DEFAULT_LOGGER_CONFIG) {
    this.config = config;

    if (pinoAvailable && isPinoAvailable()) {
      // 使用 pino 高性能日志
      const pinoConfig = getPinoConfig(config);

      // 如果是开发环境且启用prettyPrint，使用不同的transport
      if (config.prettyPrint && config.enableConsole) {
        // 开发环境：使用pino-pretty美化输出
        this.logger = pino(pinoConfig, pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false
          }
        }));
      } else {
        // 生产环境：使用文件传输
        this.logger = pino(pinoConfig);
      }

      this.info(LOG_CATEGORIES.STARTUP, '日志服务已启动 (pino)', {
        level: config.level,
        performanceThreshold: config.performanceThreshold
      });
    } else {
      // 降级到简单控制台日志
      this.logger = createSimpleLogger();
      this.info(LOG_CATEGORIES.STARTUP, '日志服务已启动 (console)', {
        level: config.level,
        performanceThreshold: config.performanceThreshold
      });
    }
  }

  /**
   * ============================================
   * 基础日志方法
   * ============================================
   */

  /**
   * 记录FATAL级别日志
   */
  fatal(category: LogCategory, message: string, data?: any): void {
    this.logger.fatal({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);
  }

  /**
   * 记录ERROR级别日志
   */
  error(category: LogCategory, message: string, data?: any): void {
    this.logger.error({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);

    // 错误计数（用于连续错误告警）
    this.trackError(category, message);
  }

  /**
   * 记录WARN级别日志
   */
  warn(category: LogCategory, message: string, data?: any): void {
    this.logger.warn({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);
  }

  /**
   * 记录INFO级别日志
   */
  info(category: LogCategory, message: string, data?: any): void {
    this.logger.info({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);
  }

  /**
   * 记录DEBUG级别日志
   */
  debug(category: LogCategory, message: string, data?: any): void {
    this.logger.debug({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);
  }

  /**
   * 记录TRACE级别日志
   */
  trace(category: LogCategory, message: string, data?: any): void {
    this.logger.trace({
      category,
      timestamp: new Date().toISOString(),
      ...data
    }, message);
  }

  /**
   * ============================================
   * HTTP请求日志
   * ============================================
   */

  /**
   * 记录HTTP请求开始
   */
  logHttpRequest(data: HttpRequestLogData): void {
    this.debug(LOG_CATEGORIES.HTTP_REQUEST, 'HTTP请求', data);
  }

  /**
   * 记录HTTP响应
   */
  logHttpResponse(data: HttpResponseLogData): void {
    const logLevel = data.duration > PERFORMANCE_CONFIG.SLOW_API_THRESHOLD ? 'warn' : 'debug';
    this[logLevel](LOG_CATEGORIES.HTTP_RESPONSE, `HTTP响应 (${data.duration}ms)`, data);
  }

  /**
   * 记录HTTP错误
   */
  logHttpError(data: HttpResponseLogData & { error: string }): void {
    this.error(LOG_CATEGORIES.HTTP_ERROR, `HTTP错误 (${data.duration}ms)`, data);
  }

  /**
   * ============================================
   * 性能监控
   * ============================================
   */

  /**
   * 记录性能数据
   */
  logPerformance(category: LogCategory, method: string, duration: number, args?: any[]): void {
    const data: PerformanceLogData = {
      method,
      duration,
      args: this.sanitizeArgs(args)
    };

    if (duration > PERFORMANCE_CONFIG.SLOW_OPERATION_THRESHOLD) {
      this.warn(category, `慢操作: ${method} (${duration}ms)`, data);
    } else {
      this.debug(category, `${method} (${duration}ms)`, data);
    }

    // 性能采样（只记录部分样本）
    if (Math.random() < PERFORMANCE_CONFIG.SAMPLE_RATE) {
      if (!this.performanceSamples.has(method)) {
        this.performanceSamples.set(method, []);
      }
      const samples = this.performanceSamples.get(method)!;
      samples.push(duration);

      // 只保留最近100个样本
      if (samples.length > 100) {
        samples.shift();
      }
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(method: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const samples = this.performanceSamples.get(method);
    if (!samples || samples.length === 0) {
      return null;
    }

    return {
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
      count: samples.length
    };
  }

  /**
   * ============================================
   * 错误追踪
   * ============================================
   */

  /**
   * 追踪错误（用于连续错误告警）
   */
  private trackError(category: LogCategory, message: string): void {
    const errorKey = `${category}:${message}`;
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    // 同一错误连续出现3次，发送告警
    if (count === 3) {
      this.error(LOG_CATEGORIES.ERROR_FATAL, '⚠️ 连续错误告警', {
        errorKey,
        count,
        timestamp: new Date().toISOString()
      });
    }

    // 每分钟重置计数
    setTimeout(() => {
      const newCount = (this.errorCounts.get(errorKey) || 0) - 1;
      if (newCount <= 0) {
        this.errorCounts.delete(errorKey);
      } else {
        this.errorCounts.set(errorKey, newCount);
      }
    }, 60000);
  }

  /**
   * ============================================
   * 工具方法
   * ============================================
   */

  /**
   * 清理参数（避免日志过大）
   */
  sanitizeArgs(args?: any[]): string {
    if (!args || args.length === 0) {
      return '';
    }

    try {
      const str = JSON.stringify(args);
      return str.slice(0, 200); // 限制长度
    } catch {
      return '[Circular]';
    }
  }

  /**
   * ============================================
   * 性能监控装饰器
   * ============================================
   */

  /**
   * 性能监控装饰器工厂
   * @param methodName 可选的方法名（自动推断）
   */
  static performanceMonitor(methodName?: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      const name = methodName || `${target.constructor.name}.${propertyName}`;

      descriptor.value = async function (...args: any[]) {
        const start = Date.now();

        try {
          const result = await method.apply(this, args);
          const duration = Date.now() - start;

          // 记录性能（只记录慢操作）
          if (duration > PERFORMANCE_CONFIG.SLOW_OPERATION_THRESHOLD) {
            logger.warn(
              LOG_CATEGORIES.SLOW_OPERATION,
              `慢操作: ${name} (${duration}ms)`,
              {
                method: name,
                duration,
                args: logger.sanitizeArgs(args).slice(0, 200)
              } as PerformanceLogData
            );
          }

          return result;
        } catch (error: any) {
          const duration = Date.now() - start;

          logger.error(
            LOG_CATEGORIES.ERROR,
            `操作失败: ${name} (${duration}ms)`,
            {
              method: name,
              duration,
              error: error.message,
              stack: error.stack?.split('\n').slice(0, PERFORMANCE_CONFIG.MAX_STACK_DEPTH).join('\n')
            } as PerformanceLogData
          );

          throw error;
        }
      };

      return descriptor;
    };
  }
}

/**
 * 全局日志实例
 */
export const logger = new LoggerService();

/**
 * 导出性能监控装饰器的简写形式
 */
export const performanceMonitor = LoggerService.performanceMonitor;

/**
 * 默认导出日志实例
 */
export default logger;
