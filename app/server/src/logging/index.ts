/**
 * 高性能日志服务 - 导出入口
 *
 * 使用示例：
 * ```typescript
 * import { logger, performanceMonitor } from './logging/index.js';
 *
 * // 基础日志
 * logger.info('system', '应用启动', { port: 3001 });
 *
 * // 性能监控装饰器
 * class MyService {
 *   @performanceMonitor()
 *   async doSomething() {
 *     // 自动记录性能
 *   }
 * }
 * ```
 */

// 导出核心日志服务
export { LoggerService, logger, performanceMonitor } from './Logger.js';
export type { PerformanceLogData, HttpRequestLogData, HttpResponseLogData } from './Logger.js';

// 导出配置
export {
  DEFAULT_LOGGER_CONFIG,
  getPinoConfig,
  getPinoTransport,
  LogLevel,
  PERFORMANCE_CONFIG,
  LOG_CATEGORIES
} from './config.js';
export type { LoggerConfig, LogCategory } from './config.js';

// 导出异步传输
export {
  AsyncLogTransport,
  WriteQueue,
  createAsyncTransport
} from './AsyncTransport.js';
export type { AsyncTransportConfig, LogEntry } from './AsyncTransport.js';

// 默认导出日志实例
export { default } from './Logger.js';
