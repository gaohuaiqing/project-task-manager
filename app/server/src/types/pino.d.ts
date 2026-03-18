/**
 * pino 类型定义（简化版）
 * 用于替代 npm install pino 的类型定义
 */

declare module 'pino' {
  type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  interface LogDescriptor {
    level: LogLevel;
    time: number;
    msg: string;
    [key: string]: any;
  }

  interface SerializerFn {
    (input: any): any;
  }

  interface Serializers {
    err?: SerializerFn;
    req?: SerializerFn;
    res?: SerializerFn;
  }

  interface TimeFn {
    (): string | number;
  }

  interface LoggerOptions {
    level?: LogLevel | string;
    serializers?: Serializers;
    timestamp?: TimeFn | boolean;
    formatters?: {
      level?: (label: string) => any;
      log?: (object: any) => any;
    };
    base?: any;
    [key: string]: any;
  }

  interface TransportTargetOptions {
    target: string;
    level?: LogLevel | string;
    options?: any;
  }

  interface TransportMultiOptions {
    targets: TransportTargetOptions[];
    dedupe?: boolean;
  }

  interface TransportBaseOptions {
    target?: string;
    level?: LogLevel | string;
    options?: any;
  }

  type TransportOptions = TransportBaseOptions | TransportMultiOptions;

  interface Logger {
    level: string;
    silent?: boolean;
    setLevel(level: LogLevel): void;
    isLevelEnabled(level: LogLevel): boolean;

    trace(msg: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    fatal(msg: string, ...args: any[]): void;

    child(bindings: any): Logger;
  }

  interface pino {
    LoggerOptions: LoggerOptions;
    stdSerializers: Serializers;
    stdTimeFunctions: {
      epochTime: TimeFn;
      unixTime: TimeFn;
      isoTime: TimeFn;
    };

    (options?: LoggerOptions): Logger;
    (options: LoggerOptions, stream?: any): Logger;
    transport(options: TransportOptions): any;

    levels: {
      values: Record<string, number>;
      labels: Record<number, string>;
    };

    version: string;
  }

  const pino: pino;
  export = pino;
}
