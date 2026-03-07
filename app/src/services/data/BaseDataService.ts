/**
 * 基础数据服务类
 *
 * 提供数据服务的通用功能：
 * - 缓存管理
 * - 认证头处理
 * - API调用封装
 * - 错误处理
 */

import { apiService } from '../ApiService';
import { CACHE_TTL, generateCacheKey, createCacheEntry, isCacheEntryValid } from '../CacheConfig';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  version?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: number;
}

/**
 * 基础数据服务类
 * 所有领域服务的基类，提供通用功能
 */
export abstract class BaseDataService<T, TFilter = any> {
  protected cache: Map<string, CacheEntry<T[]>> = new Map();
  protected singleItemCache: Map<string, CacheEntry<T>> = new Map();

  /**
   * 获取认证头
   */
  protected getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 从 localStorage 获取 sessionId
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (activeUserKey) {
      try {
        const sessionData = localStorage.getItem(activeUserKey);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.sessionId) {
            (headers as any)['x-session-id'] = session.sessionId;
          }
          if (session.userId) {
            (headers as any)['x-user-id'] = session.userId.toString();
          }
          if (session.role) {
            (headers as any)['x-user-role'] = session.role;
          }
        }
      } catch (error) {
        console.warn('[BaseDataService] 解析session数据失败:', error);
      }
    }

    return headers;
  }

  /**
   * 通用GET请求方法
   */
  protected async get<R = T>(endpoint: string): Promise<R> {
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      headers: this.getAuthHeaders()
    });
    const result: ApiResponse<R> = await response.json();

    if (!result.success) {
      throw new Error(result.message || '请求失败');
    }

    return result.data as R;
  }

  /**
   * 通用POST请求方法
   */
  protected async post<R = T>(endpoint: string, data: any): Promise<R> {
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result: ApiResponse<R> = await response.json();

    if (!result.success) {
      throw new Error(result.message || '请求失败');
    }

    return result.data as R;
  }

  /**
   * 通用PUT请求方法
   */
  protected async put<R = T>(endpoint: string, data: any): Promise<R> {
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const result: ApiResponse<R> = await response.json();

    if (!result.success) {
      throw new Error(result.message || '请求失败');
    }

    return result.data as R;
  }

  /**
   * 通用DELETE请求方法
   */
  protected async del<R = void>(endpoint: string): Promise<R> {
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    const result: ApiResponse<R> = await response.json();

    if (!result.success) {
      throw new Error(result.message || '请求失败');
    }

    return result.data as R;
  }

  /**
   * 从缓存获取列表数据
   */
  protected getListFromCache(cacheKey: string): T[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && isCacheEntryValid(cached, CACHE_TTL)) {
      console.log(`[${this.constructor.name}] 从缓存获取列表:`, cacheKey);
      return cached.data;
    }
    return null;
  }

  /**
   * 从缓存获取单个数据
   */
  protected getSingleFromCache(cacheKey: string): T | null {
    const cached = this.singleItemCache.get(cacheKey);
    if (cached && isCacheEntryValid(cached, CACHE_TTL)) {
      console.log(`[${this.constructor.name}] 从缓存获取单项:`, cacheKey);
      return cached.data;
    }
    return null;
  }

  /**
   * 更新列表缓存
   */
  protected updateListCache(cacheKey: string, data: T[], version?: number): void {
    this.cache.set(cacheKey, createCacheEntry(data, version));
  }

  /**
   * 更新单项缓存
   */
  protected updateSingleCache(cacheKey: string, data: T, version?: number): void {
    this.singleItemCache.set(cacheKey, createCacheEntry(data, version));
  }

  /**
   * 清除缓存
   */
  protected clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.singleItemCache.delete(key);
      console.log(`[${this.constructor.name}] 缓存已清除:`, key);
    } else {
      this.cache.clear();
      this.singleItemCache.clear();
      console.log(`[${this.constructor.name}] 所有缓存已清除`);
    }
  }

  /**
   * 处理版本冲突
   */
  protected handleVersionConflict(data: any): void {
    console.warn(`[${this.constructor.name}] 版本冲突:`, data);
    // TODO: 触发冲突解决事件
  }

  /**
   * 抽象方法：获取服务名称
   */
  abstract getServiceName(): string;

  /**
   * 抽象方法：获取API端点前缀
   */
  abstract getEndpointPrefix(): string;
}
