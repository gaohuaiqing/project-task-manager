// app/server/src/core/logger/index.ts
import pino from 'pino';

/**
 * 格式化时间戳：YYYY-MM-DD HH:mm:ss.SSS
 */
function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
         `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

/**
 * 开发环境：彩色、易读的日志输出
 */
const devTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    // 关键：使用系统时间并格式化
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
    // 隐藏不需要的字段
    ignore: 'pid,hostname',
    // 单行输出，更紧凑
    singleLine: true,
  }
};

/**
 * 生产环境：结构化 JSON 日志（带精确时间）
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined, // 移除 pid 和 hostname
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
    bindings: () => ({}),
  },
  transport: process.env.NODE_ENV !== 'production' ? devTransport : undefined,
});

export type Logger = typeof logger;
