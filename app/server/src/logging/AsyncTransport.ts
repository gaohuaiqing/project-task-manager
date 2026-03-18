/**
 * 异步日志传输
 *
 * 提供高性能的异步日志写入功能：
 * - 批量写入：减少I/O操作次数
 * - 队列缓冲：平滑峰值流量
 * - 失败重试：保证日志不丢失
 * - 优雅关闭：确保所有日志写入完成
 */

import { createWriteStream } from 'fs';
import path from 'path';
import { LogLevel, DEFAULT_LOGGER_CONFIG } from './config.js';

// 尝试导入 pino（可选）
let pino: any = null;
try {
  pino = await import('pino');
} catch (e) {
  // pino 未安装，使用任何类型
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  time: number;
  msg: string;
  category?: string;
  [key: string]: any;
}

/**
 * 异步传输配置
 */
export interface AsyncTransportConfig {
  batchSize: number;      // 批量写入大小
  flushInterval: number;  // 刷新间隔（毫秒）
  maxRetries: number;     // 最大重试次数
  retryDelay: number;     // 重试延迟（毫秒）
}

/**
 * 默认配置
 */
const DEFAULT_ASYNC_CONFIG: AsyncTransportConfig = {
  batchSize: 50,          // 50条日志批量写入
  flushInterval: 1000,    // 1秒刷新一次
  maxRetries: 3,          // 失败重试3次
  retryDelay: 100         // 100ms后重试
};

/**
 * 异步日志传输类
 */
export class AsyncLogTransport {
  private config: AsyncTransportConfig;
  private buffer: LogEntry[] = [];
  private writeStream: NodeJS.WritableStream;
  private errorStream: NodeJS.WritableStream;
  private flushTimer?: NodeJS.Timeout;
  private isClosing: boolean = false;
  private pendingWrites: Set<Promise<void>> = new Set();

  constructor(
    config: Partial<AsyncTransportConfig> = {},
    logDir: string = DEFAULT_LOGGER_CONFIG.logDir
  ) {
    this.config = { ...DEFAULT_ASYNC_CONFIG, ...config };

    // 创建写入流（使用追加模式）
    const logPath = path.join(logDir, 'app.log');
    const errorPath = path.join(logDir, 'error.log');

    this.writeStream = createWriteStream(logPath, { flags: 'a' });
    this.errorStream = createWriteStream(errorPath, { flags: 'a' });

    // 启动定时刷新
    this.startFlushTimer();

    // 处理进程退出
    this.setupExitHandlers();
  }

  /**
   * 写入日志（异步）
   */
  async write(entry: LogEntry): Promise<void> {
    if (this.isClosing) {
      // 关闭中，直接写入
      return this.writeToStream(entry);
    }

    // 添加到缓冲区
    this.buffer.push(entry);

    // 达到批量大小，立即写入
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * 刷新缓冲区
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // 取出缓冲区内容
    const entries = this.buffer.splice(0);

    // 批量写入
    const writePromise = this.writeBatch(entries);
    this.pendingWrites.add(writePromise);

    try {
      await writePromise;
    } finally {
      this.pendingWrites.delete(writePromise);
    }
  }

  /**
   * 批量写入日志
   */
  private async writeBatch(entries: LogEntry[]): Promise<void> {
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        // 分离错误日志和普通日志
        const errorEntries = entries.filter(e => this.isErrorLevel(e.level));
        const normalEntries = entries.filter(e => !this.isErrorLevel(e.level));

        // 写入普通日志
        if (normalEntries.length > 0) {
          const data = normalEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
          await this.writeWithRetry(this.writeStream, data);
        }

        // 写入错误日志
        if (errorEntries.length > 0) {
          const data = errorEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
          await this.writeWithRetry(this.errorStream, data);
        }

        return;
      } catch (error) {
        retries++;
        if (retries >= this.config.maxRetries) {
          console.error('[AsyncTransport] 写入失败，已达最大重试次数:', error);
          throw error;
        }

        // 延迟后重试
        await this.delay(this.config.retryDelay * retries);
      }
    }
  }

  /**
   * 写入单个日志条目
   */
  private async writeToStream(entry: LogEntry): Promise<void> {
    const stream = this.isErrorLevel(entry.level) ? this.errorStream : this.writeStream;
    const data = JSON.stringify(entry) + '\n';

    await this.writeWithRetry(stream, data);
  }

  /**
   * 带重试的写入
   */
  private async writeWithRetry(stream: NodeJS.WritableStream, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 判断是否是错误级别
   */
  private isErrorLevel(level: LogLevel): boolean {
    return ['error', 'fatal'].includes(level);
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (!this.isClosing) {
        await this.flush();
      }
    }, this.config.flushInterval);

    // 不阻止进程退出
    this.flushTimer.unref();
  }

  /**
   * 设置退出处理器
   */
  private setupExitHandlers(): void {
    const shutdown = async () => {
      await this.close();
    };

    process.on('beforeexit', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 关闭传输
   */
  async close(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;

    // 停止定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // 刷新缓冲区
    await this.flush();

    // 等待所有待处理的写入完成
    await Promise.all(Array.from(this.pendingWrites));

    // 关闭流
    await Promise.all([
      new Promise<void>(resolve => this.writeStream.end(() => resolve())),
      new Promise<void>(resolve => this.errorStream.end(() => resolve()))
    ]);
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * pino自定义传输工厂函数
 */
export function createAsyncTransport(config: Partial<AsyncTransportConfig> = {}): any {
  const transport = new AsyncLogTransport(config);

  return {
    write: (data: any) => {
      // pino会调用这个方法
      void transport.write(data as LogEntry);
    },
    flush: async (cb?: () => void) => {
      await transport.flush();
      cb?.();
    },
    end: async () => {
      await transport.close();
    }
  };
}

/**
 * 性能优化的写入队列
 *
 * 使用批量写入和去重来提升性能
 */
export class WriteQueue {
  private queue: Map<string, LogEntry> = new Map();
  private timer?: NodeJS.Timeout;
  private transport: AsyncLogTransport;
  private debounceMs: number;

  constructor(transport: AsyncLogTransport, debounceMs: number = 100) {
    this.transport = transport;
    this.debounceMs = debounceMs;
  }

  /**
   * 添加日志到队列（防抖）
   */
  add(entry: LogEntry): void {
    // 生成唯一key（用于去重）
    const key = this.generateKey(entry);
    this.queue.set(key, entry);

    // 防抖：延迟写入
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * 刷新队列
   */
  async flush(): Promise<void> {
    if (this.queue.size === 0) {
      return;
    }

    const entries = Array.from(this.queue.values());
    this.queue.clear();

    for (const entry of entries) {
      await this.transport.write(entry);
    }
  }

  /**
   * 生成日志唯一key
   */
  private generateKey(entry: LogEntry): string {
    // 基于时间、级别和消息生成key
    return `${entry.time}:${entry.level}:${entry.msg}`;
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.flush();
  }
}

/**
 * 导出工厂函数
 */
export default createAsyncTransport;
