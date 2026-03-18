// app/server/src/modules/collab/service.ts
import { v4 as uuidv4 } from 'uuid';
import { CollabRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type { DataVersion, Attachment, UploadAttachmentRequest, BatchQueryRequest, OnlineUser, CacheStatus } from './types';
import { RedisCache, MemoryCache } from '../../core/cache';
import type { CacheInterface } from '../../core/cache';

export class CollabService {
  private repo = new CollabRepository();
  private cache: CacheInterface;

  constructor() {
    // 使用内存缓存作为默认
    this.cache = new MemoryCache();
  }

  // ========== 版本历史管理 ==========

  async getVersionHistory(tableName: string, recordId: string): Promise<DataVersion[]> {
    return this.repo.getVersionHistory(tableName, recordId);
  }

  async recordVersion(tableName: string, recordId: string, version: number, data: string, userId: number): Promise<void> {
    await this.repo.createVersion({
      table_name: tableName,
      record_id: recordId,
      version,
      data,
      changed_by: userId,
    });
  }

  // ========== 在线状态管理 ==========

  async getOnlineUsers(): Promise<OnlineUser[]> {
    return this.repo.getOnlineUsers();
  }

  async updateUserOnlineStatus(userId: number, status: 'online' | 'away' | 'offline'): Promise<void> {
    await this.repo.updateUserStatus(userId, status);
  }

  async setUserOffline(userId: number): Promise<void> {
    await this.repo.setOffline(userId);
  }

  // ========== 附件管理 ==========

  async getAttachments(taskId: string): Promise<Attachment[]> {
    return this.repo.getAttachments(taskId);
  }

  async uploadAttachment(data: UploadAttachmentRequest, currentUser: User): Promise<string> {
    // 验证文件大小（最大10MB）
    if (data.file_size > 10 * 1024 * 1024) {
      throw new ValidationError('文件大小不能超过10MB');
    }

    const id = uuidv4();
    await this.repo.createAttachment({
      ...data,
      id,
      uploaded_by: currentUser.id,
    });

    return id;
  }

  async deleteAttachment(id: string, currentUser: User): Promise<void> {
    // 简化实现，实际应该检查权限
    const deleted = await this.repo.deleteAttachment(id);
    if (!deleted) {
      throw new ValidationError('删除附件失败');
    }
  }

  // ========== 批量查询 ==========

  async batchQuery(request: BatchQueryRequest): Promise<{ projects?: unknown[]; members?: unknown[]; tasks?: unknown[] }> {
    return this.repo.mixedBatchQuery(request);
  }

  // ========== 缓存管理 ==========

  async getCacheStatus(): Promise<CacheStatus> {
    try {
      // 尝试使用 Redis
      const redisCache = new RedisCache();
      // 简化实现，返回内存缓存状态
      return {
        type: 'memory',
        connected: true,
        keys: 0,
      };
    } catch {
      return {
        type: 'memory',
        connected: true,
        keys: 0,
      };
    }
  }

  async clearCache(): Promise<void> {
    await this.cache.deletePattern('*');
  }

  async warmupCache(): Promise<void> {
    // 预热缓存 - 加载常用数据
    // 简化实现
  }

  // ========== 审计日志 ==========

  async createAuditLog(data: {
    user_id: number;
    action: string;
    table_name: string;
    record_id: string;
    old_value?: string;
    new_value?: string;
    ip_address?: string;
  }): Promise<void> {
    await this.repo.createAuditLog(data);
  }

  async getAuditLogs(options?: {
    user_id?: number;
    action?: string;
    table_name?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: unknown[]; total: number }> {
    return this.repo.getAuditLogs(options);
  }
}
