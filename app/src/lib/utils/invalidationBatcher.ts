/**
 * React Query 失效批处理工具
 *
 * 将短时间窗口内的多次 invalidateQueries 调用合并为单次批量操作，
 * 避免级联更新场景下的重复请求风暴。
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/shared/utils/query-client';

type ReadonlyQueryKey = readonly unknown[];

class InvalidationBatcher {
  private pendingKeys: Map<string, ReadonlyQueryKey> = new Map();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly windowMs: number;
  private readonly client: QueryClient;

  constructor(client: QueryClient, windowMs = 100) {
    this.client = client;
    this.windowMs = windowMs;
  }

  invalidate(queryKey: ReadonlyQueryKey): void {
    const key = this.serializeKey(queryKey);
    this.pendingKeys.set(key, queryKey);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => this.flush(), this.windowMs);
  }

  flush(): void {
    if (this.pendingKeys.size === 0) return;

    const keys = Array.from(this.pendingKeys.values());
    this.pendingKeys.clear();
    this.timer = null;

    for (const key of keys) {
      this.client.invalidateQueries({ queryKey: key });
    }
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.pendingKeys.clear();
    this.timer = null;
  }

  private serializeKey(key: ReadonlyQueryKey): string {
    return JSON.stringify(key);
  }
}

export const invalidationBatcher = new InvalidationBatcher(queryClient, 100);
