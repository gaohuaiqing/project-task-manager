/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

// 自定义 HMR 事件类型
interface HmrTimePayload {
  time: string;
  type: 'init' | 'update';
}

interface ViteHotContext {
  on(event: 'hmr-time', callback: (data: HmrTimePayload) => void): void;
  off(event: 'hmr-time', callback: (data: HmrTimePayload) => void): void;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: ViteHotContext;
}

declare const __BUILD_TIME__: string;
declare const __IS_DEV__: string;
