// app/server/src/core/cache/index.ts

export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

export { RedisCache } from './redis';
export { MemoryCache } from './memory';
