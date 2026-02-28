/**
 * 离线草稿服务（改进版）
 *
 * 使用IndexedDB存储离线编辑的草稿，网络恢复后自动同步
 * 改进：
 * 1. 重试机制（指数退避）
 * 2. 草稿冲突解决策略
 * 3. 草稿过期清理
 * 4. 更好的错误处理
 */

import { mySqlDataService } from './MySqlDataService';
import { wsService } from './WebSocketService';
import { wbsTaskApiService } from './WbsTaskApiService';

// ==================== 类型定义 ====================

export interface DraftData {
  id: string;
  entityType: 'project' | 'member' | 'wbs_task';
  entityId?: number | string; // 支持字符串ID
  operation: 'create' | 'update';
  data: any;
  version?: number; // 乐观锁版本号
  createdAt: number;
  updatedAt: number;
  synced: boolean; // 是否已同步到服务器
  syncError?: string; // 同步失败原因
  retryCount?: number; // 重试次数
  lastRetryAt?: number; // 最后重试时间
}

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 60000, // 60秒
  exponentialBackoff: true
};

// 草稿过期配置
const DRAFT_EXPIRY = {
  default: 7 * 24 * 60 * 60 * 1000, // 7天
  synced: 1 * 24 * 60 * 60 * 1000, // 已同步草稿1天后删除
  failed: 30 * 24 * 60 * 60 * 1000 // 失败草稿30天后删除
};

export interface DraftSyncResult {
  success: boolean;
  draftsSynced: number;
  draftsFailed: number;
  errors: Array<{ draftId: string; error: string }>;
}

// ==================== IndexedDB 封装 ====================

class IndexedDBHelper {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'TaskManagerDrafts';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'drafts';

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] 打开数据库失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] 数据库打开成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建草稿存储
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });

          // 创建索引
          store.createIndex('entityType', 'entityType', { unique: false });
          store.createIndex('entityId', 'entityId', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });

          console.log('[IndexedDB] 对象存储和索引创建成功');
        }
      };
    });
  }

  /**
   * 添加草稿
   */
  async addDraft(draft: DraftData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(draft);

      request.onsuccess = () => {
        console.log('[IndexedDB] 草稿已保存:', draft.id);
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] 保存草稿失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有草稿
   */
  async getAllDrafts(): Promise<DraftData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as DraftData[]);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取草稿失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取未同步的草稿
   */
  async getUnsyncedDrafts(): Promise<DraftData[]> {
    const allDrafts = await this.getAllDrafts();
    return allDrafts.filter(draft => !draft.synced);
  }

  /**
   * 获取指定实体类型的草稿
   */
  async getDraftsByEntityType(entityType: DraftData['entityType']): Promise<DraftData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('entityType');
      const request = index.getAll(entityType);

      request.onsuccess = () => {
        resolve(request.result as DraftData[]);
      };

      request.onerror = () => {
        console.error('[IndexedDB] 获取草稿失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 删除草稿
   */
  async deleteDraft(draftId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(draftId);

      request.onsuccess = () => {
        console.log('[IndexedDB] 草稿已删除:', draftId);
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] 删除草稿失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[IndexedDB] 所有草稿已清空');
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDB] 清空草稿失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 更新草稿同步状态
   */
  async updateDraftSyncStatus(draftId: string, synced: boolean, syncError?: string): Promise<void> {
    const drafts = await this.getAllDrafts();
    const draft = drafts.find(d => d.id === draftId);

    if (draft) {
      draft.synced = synced;
      draft.syncError = syncError;
      draft.updatedAt = Date.now();
      await this.addDraft(draft);
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDB] 数据库连接已关闭');
    }
  }
}

// ==================== 草稿服务 ====================

class OfflineDraftService {
  private db: IndexedDBHelper;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private syncInProgress = false;

  constructor() {
    this.db = new IndexedDBHelper();
    this.init();
  }

  /**
   * 初始化服务
   */
  private async init(): Promise<void> {
    try {
      await this.db.init();

      // 监听网络状态变化
      window.addEventListener('online', this.handleNetworkOnline);
      window.addEventListener('offline', this.handleNetworkOffline);

      // 监听页面可见性变化（页面隐藏时自动保存）
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // 启动自动同步（每分钟检查一次）
      this.startAutoSync();

      // 启动自动清理（每小时清理一次过期草稿）
      this.startAutoCleanup();

      console.log('[OfflineDraftService] 初始化成功');
    } catch (error) {
      console.error('[OfflineDraftService] 初始化失败:', error);
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft(
    entityType: DraftData['entityType'],
    operation: DraftData['operation'],
    data: any,
    entityId?: number,
    version?: number
  ): Promise<string> {
    const draftId = `${entityType}_${operation}_${entityId || 'new'}_${Date.now()}`;

    const draft: DraftData = {
      id: draftId,
      entityType,
      entityId,
      operation,
      data,
      version,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false
    };

    await this.db.addDraft(draft);

    // 尝试立即同步
    if (navigator.onLine) {
      this.syncDraft(draft);
    }

    return draftId;
  }

  /**
   * 获取指定实体的草稿
   */
  async getDraftsForEntity(
    entityType: DraftData['entityType'],
    entityId?: number
  ): Promise<DraftData[]> {
    const drafts = await this.db.getDraftsByEntityType(entityType);

    if (entityId !== undefined) {
      return drafts.filter(d => d.entityId === entityId);
    }

    return drafts;
  }

  /**
   * 获取所有未同步的草稿
   */
  async getUnsyncedDrafts(): Promise<DraftData[]> {
    return await this.db.getUnsyncedDrafts();
  }

  /**
   * 同步单个草稿（改进版，支持重试机制）
   */
  private async syncDraft(draft: DraftData): Promise<boolean> {
    const now = Date.now();
    const retryCount = draft.retryCount || 0;

    // 检查是否需要延迟重试（指数退避）
    if (draft.lastRetryAt && RETRY_CONFIG.exponentialBackoff) {
      const delaySinceLastRetry = now - draft.lastRetryAt;
      const requiredDelay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
        RETRY_CONFIG.maxDelay
      );

      if (delaySinceLastRetry < requiredDelay) {
        console.log(`[OfflineDraftService] 草稿 ${draft.id} 等待重试`);
        return false;
      }
    }

    // 检查重试次数
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      console.error(`[OfflineDraftService] 草稿 ${draft.id} 达到最大重试次数`);
      await this.db.updateDraftSyncStatus(draft.id, false, '达到最大重试次数');
      return false;
    }

    try {
      console.log('[OfflineDraftService] 同步草稿:', draft.id, `重试次数: ${retryCount}`);

      // 更新重试状态
      await this.db.updateDraft(draft.id, {
        ...draft,
        retryCount: retryCount + 1,
        lastRetryAt: now
      });

      let result;

      switch (draft.entityType) {
        case 'project':
          if (draft.operation === 'create') {
            result = await mySqlDataService.createProject(draft.data);
          } else if (draft.operation === 'update' && draft.entityId) {
            result = await mySqlDataService.updateProject(
              typeof draft.entityId === 'string' ? parseInt(draft.entityId) : draft.entityId as number,
              draft.data,
              draft.version
            );
          }
          break;

        case 'member':
          if (draft.operation === 'create') {
            result = await mySqlDataService.createMember(draft.data);
          } else if (draft.operation === 'update' && draft.entityId) {
            result = await mySqlDataService.updateMember(
              typeof draft.entityId === 'string' ? parseInt(draft.entityId) : draft.entityId as number,
              draft.data,
              draft.version
            );
          }
          break;

        case 'wbs_task':
          if (draft.operation === 'create') {
            // 使用 wbsTaskApiService 创建任务
            const createdTask = await wbsTaskApiService.createTask(draft.data);
            result = createdTask;
          } else if (draft.operation === 'update' && draft.entityId) {
            // 使用 wbsTaskApiService 更新任务
            const updatedTask = await wbsTaskApiService.updateTask(
              String(draft.entityId),
              draft.data,
              draft.version
            );
            result = updatedTask;
          }
          break;

        default:
          throw new Error(`未知的实体类型: ${draft.entityType}`);
      }

      // 同步成功，删除草稿
      await this.db.deleteDraft(draft.id);
      console.log('[OfflineDraftService] 草稿同步成功:', draft.id);
      return true;

    } catch (error: any) {
      console.error('[OfflineDraftService] 同步草稿失败:', draft.id, error);

      // 检查是否是版本冲突
      if (error.message?.includes('版本冲突') || error.message?.includes('409')) {
        await this.handleVersionConflict(draft, error);
      } else {
        // 更新同步状态
        await this.db.updateDraftSyncStatus(draft.id, false, error.message);
      }

      return false;
    }
  }

  /**
   * 处理版本冲突
   */
  private async handleVersionConflict(draft: DraftData, error: any): Promise<void> {
    console.warn('[OfflineDraftService] 检测到版本冲突:', draft.id);

    // 冲突解决策略：
    // 1. 检查草稿数据是否较新
    // 2. 如果是用户主动编辑，保留草稿
    // 3. 否则标记为需要用户确认

    const conflictResolution = {
      strategy: 'keep_draft', // 或 'use_server' 或 'manual_merge'
      serverData: error.latestData,
      reason: '版本冲突，需要用户确认'
    };

    await this.db.updateDraft(draft.id, {
      ...draft,
      syncError: `版本冲突: ${error.message}`,
      conflictResolution
    });

    // 触发冲突事件
    window.dispatchEvent(new CustomEvent('draftConflict', {
      detail: { draftId: draft.id, conflict: conflictResolution }
    }));
  }

  /**
   * 同步所有未同步的草稿
   */
  async syncAllDrafts(): Promise<DraftSyncResult> {
    if (this.syncInProgress) {
      console.log('[OfflineDraftService] 同步正在进行中，跳过');
      return { success: false, draftsSynced: 0, draftsFailed: 0, errors: [] };
    }

    if (!navigator.onLine) {
      console.log('[OfflineDraftService] 离线状态，跳过同步');
      return { success: false, draftsSynced: 0, draftsFailed: 0, errors: [] };
    }

    this.syncInProgress = true;

    try {
      const drafts = await this.getUnsyncedDrafts();
      console.log(`[OfflineDraftService] 开始同步 ${drafts.length} 个草稿`);

      let draftsSynced = 0;
      let draftsFailed = 0;
      const errors: Array<{ draftId: string; error: string }> = [];

      for (const draft of drafts) {
        const success = await this.syncDraft(draft);
        if (success) {
          draftsSynced++;
        } else {
          draftsFailed++;
          errors.push({
            draftId: draft.id,
            error: draft.syncError || '未知错误'
          });
        }
      }

      const result: DraftSyncResult = {
        success: draftsFailed === 0,
        draftsSynced,
        draftsFailed,
        errors
      };

      console.log('[OfflineDraftService] 同步完成:', result);

      // 触发自定义事件通知UI
      window.dispatchEvent(new CustomEvent('draftsSynced', { detail: result }));

      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 删除草稿
   */
  async deleteDraft(draftId: string): Promise<void> {
    await this.db.deleteDraft(draftId);
  }

  /**
   * 清理过期草稿
   */
  async cleanupExpiredDrafts(): Promise<number> {
    const now = Date.now();
    const drafts = await this.db.getAllDrafts();

    let cleanedCount = 0;

    for (const draft of drafts) {
      let shouldDelete = false;
      let expiryTime = 0;

      // 根据草稿状态确定过期时间
      if (draft.synced) {
        expiryTime = draft.updatedAt + DRAFT_EXPIRY.synced;
        shouldDelete = now > expiryTime;
      } else if (draft.syncError && draft.retryCount >= RETRY_CONFIG.maxRetries) {
        expiryTime = draft.updatedAt + DRAFT_EXPIRY.failed;
        shouldDelete = now > expiryTime;
      } else {
        expiryTime = draft.updatedAt + DRAFT_EXPIRY.default;
        shouldDelete = now > expiryTime;
      }

      if (shouldDelete) {
        await this.db.deleteDraft(draft.id);
        cleanedCount++;
        console.log(`[OfflineDraftService] 清理过期草稿: ${draft.id}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[OfflineDraftService] 共清理 ${cleanedCount} 个过期草稿`);
    }

    return cleanedCount;
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts(): Promise<void> {
    await this.db.clearAllDrafts();
  }

  /**
   * 启动自动同步
   */
  private startAutoSync(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAllDrafts();
      }
    }, 60000); // 每分钟同步一次
  }

  /**
   * 停止自动同步
   */
  private stopAutoSync(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    // 每小时清理一次过期草稿
    setInterval(async () => {
      try {
        await this.cleanupExpiredDrafts();
      } catch (error) {
        console.error('[OfflineDraftService] 自动清理失败:', error);
      }
    }, 60 * 60 * 1000);

    // 启动时也执行一次清理
    this.cleanupExpiredDrafts().catch(error => {
      console.error('[OfflineDraftService] 启动清理失败:', error);
    });
  }

  /**
   * 处理网络恢复
   */
  private handleNetworkOnline = (): void => {
    console.log('[OfflineDraftService] 网络已恢复，开始同步草稿');
    this.syncAllDrafts();
  };

  /**
   * 处理网络断开
   */
  private handleNetworkOffline = (): void => {
    console.log('[OfflineDraftService] 网络已断开，草稿将保存到本地');
  };

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // 页面隐藏时，尝试同步所有草稿
      console.log('[OfflineDraftService] 页面隐藏，尝试同步草稿');
      this.syncAllDrafts();
    }
  };

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleNetworkOnline);
    window.removeEventListener('offline', this.handleNetworkOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.db.close();
  }
}

// 导出单例
export const offlineDraftService = new OfflineDraftService();
export default offlineDraftService;
