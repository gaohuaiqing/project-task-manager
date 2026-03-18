/**
 * 高性能日志配置
 * 基于 pino 日志库（可选），支持异步写入和性能监控
 * 如果 pino 不可用，将降级到简单日志实现
 */

import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// 尝试导入 pino，如果失败则使用 null
let pino: any = null;
try {
  pino = await import('pino');
} catch (e) {
  // pino 未安装，将使用简单日志
  console.warn('[日志] pino 未安装，将使用简单日志实现');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 日志级别枚举
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel;
  isDevelopment: boolean;
  logDir: string;
  enableConsole: boolean;
  enableFile: boolean;
  prettyPrint: boolean;
  performanceThreshold: number; // 慢操作阈值（毫秒）
}

/**
 * 默认日志配置
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  isDevelopment: process.env.NODE_ENV !== 'production',
  logDir: process.env.LOG_DIR || path.join(__dirname, '../../../logs'),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  prettyPrint: process.env.LOG_PRETTY_PRINT === 'true' || process.env.NODE_ENV !== 'production',
  performanceThreshold: parseInt(process.env.LOG_PERFORMANCE_THRESHOLD || '50', 10)
};

/**
 * 检查 pino 是否可用
 */
export function isPinoAvailable(): boolean {
  return pino !== null;
}

/**
 * pino 日志配置（仅在 pino 可用时使用）
 */
export function getPinoTransport(config: LoggerConfig): any {
  const targets: any[] = [];

  // 控制台输出（开发环境）
  if (config.enableConsole) {
    if (config.prettyPrint) {
      targets.push({
        target: 'pino-pretty',
        level: config.level,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: (log: any) => {
            // 性能日志特殊格式
            if (log.performance) {
              return `[${log.performance}] ${log.msg} (${log.duration}ms)`;
            }
            return log.msg;
          }
        }
      });
    } else {
      targets.push({
        target: 'pino/file',
        level: config.level,
        options: {
          destination: 1, // stdout
          sync: false // 异步写入
        }
      });
    }
  }

  // 文件输出（异步写入，不阻塞主线程）
  if (config.enableFile) {
    targets.push({
      target: 'pino/file',
      level: config.level,
      options: {
        destination: path.join(config.logDir, 'app.log'),
        sync: false, // 异步写入，提升性能
        mkdir: true // 自动创建日志目录
      }
    });

    // 错误日志单独文件
    targets.push({
      target: 'pino/file',
      level: LogLevel.ERROR,
      options: {
        destination: path.join(config.logDir, 'error.log'),
        sync: false,
        mkdir: true
      }
    });
  }

  return {
    targets,
    dedupe: true // 去重相同日志
  };
}

/**
 * 获取pino基础配置（仅在 pino 可用时使用）
 */
export function getPinoConfig(config: LoggerConfig): any {
  if (!pino) {
    throw new Error('pino is not available');
  }

  return {
    level: config.level,
    // 生产环境移除开发字段
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err
    },
    // 时间戳格式
    timestamp: pino.stdTimeFunctions.isoTime,
    // 错误堆栈跟踪
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
      log: (object: any) => {
        const { performance, duration, ...rest } = object;
        // 性能日志添加特殊标记
        if (performance !== undefined) {
          return {
            ...rest,
            performance: duration,
            _perf: true // 性能日志标记
          };
        }
        return rest;
      }
    },
    // 自定义绑定
    base: {
      pid: process.pid,
      hostname: os.hostname(),
      node_version: process.version
    }
  };
}

/**
 * 性能监控配置
 */
export const PERFORMANCE_CONFIG = {
  // 慢操作阈值
  SLOW_OPERATION_THRESHOLD: DEFAULT_LOGGER_CONFIG.performanceThreshold,
  // 慢API响应阈值
  SLOW_API_THRESHOLD: 100,
  // 性能采样率（1 = 100%，0.1 = 10%）
  SAMPLE_RATE: parseFloat(process.env.LOG_PERFORMANCE_SAMPLE_RATE || '1'),
  // 最大调用栈深度
  MAX_STACK_DEPTH: parseInt(process.env.LOG_MAX_STACK_DEPTH || '10', 10)
};

/**
 * 日志类别配置
 */
export const LOG_CATEGORIES = {
  // 系统日志
  SYSTEM: 'system',
  STARTUP: 'startup',
  SHUTDOWN: 'shutdown',

  // HTTP请求
  HTTP_REQUEST: 'http_request',
  HTTP_RESPONSE: 'http_response',
  HTTP_ERROR: 'http_error',

  // 数据库
  DATABASE: 'database',
  DATABASE_QUERY: 'database_query',
  DATABASE_ERROR: 'database_error',

  // 认证
  AUTH: 'auth',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_SESSION: 'auth_session',

  // 数据同步
  DATA_SYNC: 'data_sync',
  DATA_CONFLICT: 'data_conflict',

  // WebSocket
  WEBSOCKET: 'websocket',
  WEBSOCKET_CONNECT: 'websocket_connect',
  WEBSOCKET_DISCONNECT: 'websocket_disconnect',
  WEBSOCKET_MESSAGE: 'websocket_message',

  // 缓存
  CACHE: 'cache',
  CACHE_HIT: 'cache_hit',
  CACHE_MISS: 'cache_miss',

  // 性能
  PERFORMANCE: 'performance',
  SLOW_OPERATION: 'slow_operation',

  // 错误
  ERROR: 'error',
  ERROR_FATAL: 'error_fatal'
} as const;

export type LogCategory = typeof LOG_CATEGORIES[keyof typeof LOG_CATEGORIES];
