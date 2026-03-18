/**
 * lru-cache 类型定义
 * 用于替代 npm install @types/lru-cache
 */

declare module 'lru-cache' {
  interface LRUCacheOptions<K, V> {
    max?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
    ttl?: number;
    ttlAutopurge?: boolean;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    allowStale?: boolean;
    noDisposeOnSet?: boolean;
    noUpdateTTL?: boolean;
    maxEntrySize?: number;
    sizeCalculation?: (value: V, key: K) => number;
  }

  interface LRUCache<K = any, V = any> {
    readonly max: number;
    readonly size: number;
    readonly maxSize: number;

    set(key: K, value: V, options?: { ttl?: number; size?: number }): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
    entries(): [K, V][];
    getRemainingTTL(key: K): number;
    dump(): [K, V, number][];
    load(entries: [K, V, number][]): void;
  }

  class LRUCache<K = any, V = any> implements LRUCache<K, V> {
    constructor(options?: LRUCacheOptions<K, V>);
    set(key: K, value: V, options?: { ttl?: number; size?: number }): boolean;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    keys(): K[];
    values(): V[];
    entries(): [K, V][];
    getRemainingTTL(key: K): number;
    dump(): [K, V, number][];
    load(entries: [K, V, number][]): void;
    readonly max: number;
    readonly size: number;
    readonly maxSize: number;
  }

  export = LRUCache;
}
