// app/server/src/core/cache/redis.ts
import { createClient, RedisClientType } from 'redis';
import type { CacheInterface } from './index';
import { MemoryCache } from './memory';

export class RedisCache implements CacheInterface {
  private client: RedisClientType | null = null;
  private fallback: MemoryCache | null = null;

  async connect(): Promise<void> {
    try {
      this.client = createClient({ url: process.env.REDIS_URL });
      await this.client.connect();
    } catch {
      console.warn('Redis connection failed, falling back to memory cache');
      this.fallback = new MemoryCache();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.fallback) return this.fallback.get<T>(key);
    const value = await this.client?.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (this.fallback) return this.fallback.set(key, value, ttlSeconds);
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client?.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client?.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.fallback) return this.fallback.delete(key);
    await this.client?.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    if (this.fallback) return this.fallback.deletePattern(pattern);
    const keys = await this.client?.keys(pattern);
    if (keys && keys.length > 0) {
      await this.client?.del(keys);
    }
  }
}
