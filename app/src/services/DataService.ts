/**
 * 统一数据服务层
 * 负责所有业务数据的访问，统一管理缓存策略
 *
 * 架构原则：
 * 1. MySQL 是唯一真相源
 * 2. localStorage 仅作为本地缓存（5分钟有效期）
 * 3. 内存缓存用于高频访问（1分钟有效期）
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: number;
}

interface DataServiceConfig {
  apiBaseUrl: string;
  cacheDuration: {
    memory: number;    // 内存缓存时间（毫秒）
    localStorage: number; // localStorage缓存时间（毫秒）
  };
}

const DEFAULT_CONFIG: DataServiceConfig = {
  apiBaseUrl: 'http://localhost:3001',
  cacheDuration: {
    memory: 60 * 1000,      // 1分钟（与MySqlDataService保持一致）
    localStorage: 10 * 60 * 1000 // 10分钟（延长localStorage缓存时间）
  }
};

class DataService {
  private config: DataServiceConfig;
  private memoryCache = new Map<string, CacheEntry<any>>();

  constructor(config: Partial<DataServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 通用数据获取方法
   * @param dataType 数据类型（对应后端的 dataType）
   * @param dataId 数据ID（默认为 'default'）
   * @param forceRefresh 强制从后端刷新
   */
  async getData<T>(dataType: string, dataId = 'default', forceRefresh = false): Promise<T | null> {
    const cacheKey = `${dataType}_${dataId}`;
    const now = Date.now();

    // 1. 检查内存缓存
    if (!forceRefresh) {
      const memCached = this.memoryCache.get(cacheKey);
      if (memCached && (now - memCached.timestamp) < this.config.cacheDuration.memory) {
        console.log(`[DataService] 从内存缓存获取: ${dataType}`);
        return memCached.data as T;
      }
    }

    // 2. 检查 localStorage 缓存
    if (!forceRefresh) {
      const localCached = this.getLocalStorageCache<T>(cacheKey);
      if (localCached && (now - localCached.timestamp) < this.config.cacheDuration.localStorage) {
        console.log(`[DataService] 从localStorage缓存获取: ${dataType}`);
        // 异步更新内存缓存
        this.memoryCache.set(cacheKey, localCached);
        // 后台刷新数据
        this.fetchFromBackend<T>(dataType, dataId).then(data => {
          if (data) {
            const entry: CacheEntry<T> = { data, timestamp: now };
            this.memoryCache.set(cacheKey, entry);
          }
        }).catch(err => {
          console.warn(`[DataService] 后台刷新失败: ${dataType}`, err);
        });
        return localCached.data;
      }
    }

    // 3. 从后端获取
    console.log(`[DataService] 从后端获取: ${dataType}`);
    const data = await this.fetchFromBackend<T>(dataType, dataId);
    if (data) {
      const entry: CacheEntry<T> = { data, timestamp: now };
      // 更新内存缓存
      this.memoryCache.set(cacheKey, entry);
      // 更新 localStorage 缓存
      this.setLocalStorageCache(cacheKey, entry);
    }
    return data;
  }

  /**
   * 通用数据保存方法
   * @param dataType 数据类型
   * @param dataId 数据ID
   * @param data 要保存的数据
   * @param expectedVersion 期望的版本号（用于乐观锁）
   */
  async saveData<T>(dataType: string, data: T, dataId = 'default', expectedVersion?: number): Promise<{ success: boolean; version?: number; message?: string }> {
    const now = Date.now();
    const cacheKey = `${dataType}_${dataId}`;

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/global-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType,
          dataId,
          data,
          expectedVersion,
          changeReason: `前端更新 ${dataType}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // 更新缓存
        const entry: CacheEntry<T> = {
          data,
          timestamp: now,
          version: result.version
        };
        this.memoryCache.set(cacheKey, entry);
        this.setLocalStorageCache(cacheKey, entry);

        console.log(`[DataService] 保存成功: ${dataType}, 版本: ${result.version}`);
      }

      return result;
    } catch (error) {
      console.error(`[DataService] 保存失败: ${dataType}`, error);
      return { success: false, message: error instanceof Error ? error.message : '保存失败' };
    }
  }

  /**
   * 删除数据
   */
  async deleteData(dataType: string, dataId = 'default'): Promise<{ success: boolean; message?: string }> {
    const cacheKey = `${dataType}_${dataId}`;

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/global-data/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType,
          dataId,
          changeReason: `前端删除 ${dataType}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // 清除缓存
        this.memoryCache.delete(cacheKey);
        localStorage.removeItem(`cache_${cacheKey}`);
      }

      return result;
    } catch (error) {
      console.error(`[DataService] 删除失败: ${dataType}`, error);
      return { success: false, message: error instanceof Error ? error.message : '删除失败' };
    }
  }

  /**
   * 从后端获取数据
   */
  private async fetchFromBackend<T>(dataType: string, dataId: string): Promise<T | null> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/api/global-data/get?dataType=${dataType}&dataId=${dataId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const record = result.data[0];
        // global_data 表的 data_json 字段包含实际数据
        return record.data_json as T;
      }

      return null;
    } catch (error) {
      console.error(`[DataService] 从后端获取失败: ${dataType}`, error);
      return null;
    }
  }

  /**
   * 从 localStorage 获取缓存
   */
  private getLocalStorageCache<T>(cacheKey: string): CacheEntry<T> | null {
    try {
      const cached = localStorage.getItem(`cache_${cacheKey}`);
      if (cached) {
        return JSON.parse(cached) as CacheEntry<T>;
      }
    } catch (error) {
      console.warn(`[DataService] localStorage缓存解析失败: ${cacheKey}`, error);
    }
    return null;
  }

  /**
   * 保存到 localStorage 缓存
   */
  private setLocalStorageCache<T>(cacheKey: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(entry));
    } catch (error) {
      console.warn(`[DataService] localStorage缓存保存失败: ${cacheKey}`, error);
    }
  }

  /**
   * 清除指定数据的缓存
   */
  clearCache(dataType: string, dataId = 'default'): void {
    const cacheKey = `${dataType}_${dataId}`;
    this.memoryCache.delete(cacheKey);
    localStorage.removeItem(`cache_${cacheKey}`);
    console.log(`[DataService] 清除缓存: ${dataType}`);
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.memoryCache.clear();
    // 清除所有带 cache_ 前缀的 localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[DataService] 清除所有缓存');
  }

  /**
   * 预热缓存（批量加载常用数据）
   */
  async warmupCache(dataTypes: string[]): Promise<void> {
    console.log('[DataService] 开始预热缓存...', dataTypes);
    await Promise.all(
      dataTypes.map(type => this.getData(type))
    );
    console.log('[DataService] 缓存预热完成');
  }
}

// 导出单例
export const dataService = new DataService();

// 导出类型
export type { DataServiceConfig, CacheEntry };
