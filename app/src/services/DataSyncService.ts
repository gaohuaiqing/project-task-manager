import type { Member } from '@/types';
// 跨标签页同步（注意：仅限同一浏览器的不同标签页之间）
// 真正的跨浏览器/跨设备同步由后端WebSocket实现
import { syncDataUpdated } from '@/utils/crossTabSync';
import { getDeviceId } from '@/utils/deviceId';
import {
  logSyncError,
  logConsistencyCheck,
  logConsistencyFix
} from '@/utils/syncLogger';
import { broadcastService } from './BroadcastChannelService';
import { operationQueue, type OperationResult } from './OperationQueue';
import { indexedDBOperationQueue } from './IndexedDBOperationQueue';
import { unifiedStorage, type StorageDataType } from './UnifiedStorage';
import { conflictManager } from './ConflictManager';
import { wsService } from './WebSocketService';

// 数据类型定义
export interface SyncData {
  members: Member[];
  projects: any[];
  wbsTasks: any[];
  lastUpdated: number;
  version: number;
}

// 变更记录
export interface ChangeRecord {
  key: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  version: number;
}

// 同步配置
export interface SyncConfig {
  syncInterval: number; // 同步间隔（毫秒）
  conflictResolution: 'lastWriteWins' | 'manual'; // 冲突解决策略
  enableIncrementalSync: boolean; // 是否启用增量同步
}

// 默认配置
const DEFAULT_CONFIG: SyncConfig = {
  syncInterval: 30000, // 优化：增加同步间隔到30秒，减少数据库压力（从5秒优化到30秒，减少6倍请求量）
  conflictResolution: 'lastWriteWins',
  enableIncrementalSync: true
};

// 存储键定义
const STORAGE_KEYS = {
  SYNC_DATA: 'sync_data',
  CHANGE_LOG: 'sync_change_log',
  DEVICE_ID: 'sync_device_id',
  LAST_SYNC: 'sync_last_sync'
};

// 数据同步服务
export class DataSyncService {
  private config: SyncConfig;
  private deviceId: string;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private consistencyCheckInterval: ReturnType<typeof setInterval> | null = null;
  private syncListeners: Set<() => void> = new Set();
  private pendingChanges: ChangeRecord[] = [];
  private lastNotifiedData: string = '';
  private operationQueue: typeof operationQueue;
  private isReadOnlyCache: boolean = true; // 只读缓存模式

  // 生命周期管理属性
  private initTimeout: ReturnType<typeof setTimeout> | null = null;
  private storageChangeHandler: ((e: StorageEvent) => void) | null = null;
  private broadcastDataUpdateUnsubscribe: (() => void) | null = null;
  private isDestroyed: boolean = false;
  private isInitialized: boolean = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.deviceId = getDeviceId();
    this.operationQueue = operationQueue;

    // 初始化BroadcastChannel服务
    broadcastService.init();

    // 监听其他浏览器的数据更新（保存取消订阅函数）
    this.broadcastDataUpdateUnsubscribe = broadcastService.onDataUpdate((data, dataType) => {
      if (this.isDestroyed) return;

      console.log('[DataSyncService] 收到BroadcastChannel数据更新:', dataType, data);
      // 修复：data参数实际上是一个包含dataType和data属性的对象
      if (data && data.dataType) {
        const actualDataType = data.dataType;
        const actualData = data.data;
        this.saveToLocalStorage(actualDataType, actualData);
      } else if (dataType) {
        // 兼容旧格式
        this.saveToLocalStorage(dataType, data);
      }
      // 触发本地同步
      this.notifyListeners();
    });

    // ❌ 移除自动初始化
    // this.initializeSync(); // 不再自动调用
  }

  // 初始化同步
  private async initializeSync(): Promise<void> {
    if (this.isDestroyed || this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // 初始化持久化操作队列
    try {
      await indexedDBOperationQueue.init();
      console.log('[DataSyncService] 持久化操作队列初始化成功');

      // 恢复未完成的操作
      await this.recoverPendingOperations();
    } catch (error) {
      console.error('[DataSyncService] 持久化操作队列初始化失败:', error);
    }

    // 确保基础数据结构存在
    this.ensureSyncDataExists();

    // 监听localStorage变化，实现跨标签页同步
    this.startStorageListener();

    // 启动数据一致性检查
    this.startConsistencyCheck();

    // 初始数据一致性验证（保存定时器引用）
    this.initTimeout = setTimeout(() => {
      if (!this.isDestroyed && !this.validateDataConsistency()) {
        console.log('[DataSyncService] Initial data inconsistency detected, attempting to fix...');
        this.fixDataConsistency();
      }
    }, 2000);
  }

  /**
   * 恢复未完成的操作
   */
  private async recoverPendingOperations(): Promise<void> {
    try {
      const pendingOps = await indexedDBOperationQueue.getPendingOperations();
      console.log(`[DataSyncService] 恢复 ${pendingOps.length} 个未完成的操作`);

      // 尝试发送所有待发送的操作
      for (const op of pendingOps) {
        if (wsService.isConnected()) {
          await this.sendOperation(op);
        }
      }

      // 重试失败的操作
      await indexedDBOperationQueue.retryFailedOperations();
    } catch (error) {
      console.error('[DataSyncService] 恢复操作失败:', error);
    }
  }
  
  // 监听localStorage变化
  private startStorageListener(): void {
    // 保存事件处理器引用以便后续清理
    this.storageChangeHandler = (e: StorageEvent) => {
      if (this.isDestroyed) return;

      if (!e.key || e.newValue === null) return;

      // 监听关键数据的变化
      const watchedKeys = ['projects', 'members', 'wbsTasks', 'tasks'];
      if (watchedKeys.includes(e.key)) {
        console.log('[DataSyncService] 检测到数据变化:', e.key);

        // 立即触发同步
        this.notifyListeners();

        // 通过BroadcastChannel广播变化
        try {
          const data = JSON.parse(e.newValue);
          const dataType = e.key;
          broadcastService.broadcastDataUpdate(dataType, data);
        } catch (error) {
          console.error('[DataSyncService] 解析变化数据失败:', error);
        }
      }
    };

    // 监听其他标签页的存储变化
    window.addEventListener('storage', this.storageChangeHandler);
  }

  // 确保同步数据存在
  private ensureSyncDataExists(): void {
    const syncData = this.getSyncData();
    if (!syncData) {
      const initialData: SyncData = {
        members: this.loadFromLocalStorage('members') || [],
        projects: this.loadFromLocalStorage('projects') || [],
        wbsTasks: this.loadFromLocalStorage('wbsTasks') || [],
        lastUpdated: Date.now(),
        version: 1
      };
      this.saveSyncData(initialData);
    }
  }

  // 从LocalStorage加载数据
  private loadFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return null;
    }
  }

  // 保存到LocalStorage（缓存模式 - 带前缀）
  private saveToLocalStorage(key: string, data: any): boolean {
    try {
      const cacheKey = `cache_${key}`;
      const serialized = JSON.stringify(data);

      // 检查数据大小（Chrome 限制约 5-10MB）
      const dataSize = new Blob([serialized]).size;
      if (dataSize > 4 * 1024 * 1024) { // 超过 4MB 警告
        console.warn(`[DataSyncService] 数据过大 (${(dataSize / 1024 / 1024).toFixed(2)}MB)，可能导致Chrome浏览器存储失败`);
      }

      localStorage.setItem(cacheKey, serialized);
      return true;
    } catch (error: any) {
      // Chrome 通常会在配额超限时抛出 QuotaExceededError
      if (error.name === 'QuotaExceededError') {
        console.error(`[DataSyncService] localStorage 配额已满 (${key})，请清理缓存或使用 IndexedDB`);
        // 尝试清理旧数据
        this.cleanupOldStorage();
      } else {
        console.error(`[DataSyncService] 保存 ${key} 到 localStorage 失败:`, error);
      }
      return false;
    }
  }

  // 清理旧的存储数据
  private cleanupOldStorage(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      // 删除一半的旧数据
      keysToRemove.slice(0, Math.floor(keysToRemove.length / 2)).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log(`[DataSyncService] 清理了 ${Math.floor(keysToRemove.length / 2)} 个旧存储项`);
    } catch (error) {
      console.error('[DataSyncService] 清理存储失败:', error);
    }
  }

  /**
   * 修改数据（通过持久化操作队列）
   * 所有修改都通过操作队列发送到服务器，本地只保留缓存
   */
  async modifyData(
    dataType: string,
    dataId: string,
    changes: any,
    operationType: 'create' | 'update' | 'delete' = 'update',
    expectedVersion?: number
  ): Promise<string> {
    // 入队到持久化队列
    const operationId = await indexedDBOperationQueue.enqueue({
      type: operationType,
      dataType,
      dataId,
      data: changes,
      expectedVersion
    });

    // 获取操作并发送到服务器
    const operation = await indexedDBOperationQueue.getOperation(operationId);
    if (operation) {
      await this.sendOperation(operation);
    }

    return operationId;
  }

  /**
   * 发送操作到服务器
   */
  private async sendOperation(operation: any): Promise<void> {
    try {
      if (!wsService.isConnected()) {
        console.warn('[DataSyncService] WebSocket未连接，操作将等待重连');
        return;
      }

      // 标记为已发送
      await indexedDBOperationQueue.markAsSent(operation.id);

      const response = await wsService.request({
        type: 'data_operation',
        data: {
          operationId: operation.id,
          operationType: operation.type,
          dataType: operation.dataType,
          dataId: operation.dataId,
          data: operation.data,
          expectedVersion: operation.expectedVersion
        }
      });

      // 处理响应（通过持久化队列）
      await indexedDBOperationQueue.handleResponse(operation.id, response);

      // 更新本地缓存（只读）
      if (response.success) {
        this.updateLocalCache(operation.dataType, response.data);
      } else if (response.conflict) {
        // 处理数据冲突
        const localData = this.getFromCache(operation.dataType);
        conflictManager.addConflict({
          dataType: operation.dataType,
          dataId: operation.dataId,
          message: response.message || '数据版本冲突',
          localData: localData,
          serverData: response.data,
          serverVersion: response.version
        });

        console.warn(`[DataSyncService] 数据冲突: ${operation.dataType}/${operation.dataId}`);
      }

      // 通知监听器
      this.notifyListeners();
    } catch (error) {
      console.error('[DataSyncService] 发送操作失败:', error);
      // 标记操作失败
      await indexedDBOperationQueue.handleResponse(operation.id, { success: false, message: String(error) });
    }
  }

  /**
   * 更新本地缓存（使用统一存储）
   */
  private updateLocalCache(dataType: string, data: any): void {
    try {
      unifiedStorage.set(dataType as StorageDataType, data, {
        version: 1,
        ttl: 60 * 60 * 1000 // 1小时TTL
      });
      console.log(`[DataSyncService] 缓存已更新: ${dataType}`);
    } catch (error) {
      console.error(`[DataSyncService] 更新缓存失败: ${dataType}`, error);
    }
  }

  /**
   * 从本地缓存读取（使用统一存储）
   */
  getFromCache(dataType: string): any | null {
    try {
      const storageData = unifiedStorage.get(dataType as StorageDataType);
      return storageData?.data || null;
    } catch (error) {
      console.error(`[DataSyncService] 读取缓存失败: ${dataType}`, error);
      return null;
    }
  }

  /**
   * 刷新数据（从服务器获取最新数据）
   */
  async refreshFromServer(): Promise<void> {
    try {
      if (!wsService.isConnected()) {
        console.warn('[DataSyncService] WebSocket未连接，无法刷新数据');
        return;
      }

      const response = await wsService.request({
        type: 'request_sync',
        data: {}
      });

      if (response && response.data) {
        // 更新所有数据类型的缓存
        const dataTypes = ['members', 'projects', 'wbsTasks', 'tasks'];
        for (const dataType of dataTypes) {
          if (response.data[dataType]) {
            this.updateLocalCache(dataType, response.data[dataType]);
          }
        }

        console.log('[DataSyncService] 数据刷新成功');
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[DataSyncService] 刷新数据失败:', error);
    }
  }

  // 获取同步数据
  getSyncData(): SyncData | null {
    return this.loadFromLocalStorage(STORAGE_KEYS.SYNC_DATA);
  }

  // 保存同步数据
  saveSyncData(data: SyncData): void {
    this.saveToLocalStorage(STORAGE_KEYS.SYNC_DATA, data);
  }

  // 获取变更记录
  getChangeLog(): ChangeRecord[] {
    return this.loadFromLocalStorage(STORAGE_KEYS.CHANGE_LOG) || [];
  }

  // 保存变更记录
  saveChangeLog(changes: ChangeRecord[]): void {
    this.saveToLocalStorage(STORAGE_KEYS.CHANGE_LOG, changes);
  }

  // 记录数据变更
  recordChange(key: string, operation: 'create' | 'update' | 'delete', data: any): void {
    const change: ChangeRecord = {
      key,
      operation,
      data,
      timestamp: Date.now(),
      version: this.getNextVersion()
    };

    const changeLog = this.getChangeLog();
    changeLog.push(change);
    
    // 限制变更记录数量
    const MAX_CHANGES = 1000;
    if (changeLog.length > MAX_CHANGES) {
      changeLog.splice(0, changeLog.length - MAX_CHANGES);
    }

    this.saveChangeLog(changeLog);
    this.pendingChanges.push(change);
  }

  // 获取下一个版本号
  private getNextVersion(): number {
    const syncData = this.getSyncData();
    return (syncData?.version || 0) + 1;
  }

  // 开始同步
  startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.config.syncInterval);
  }

  // 停止同步
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.consistencyCheckInterval) {
      clearInterval(this.consistencyCheckInterval);
      this.consistencyCheckInterval = null;
    }
  }

  // 执行同步
  async sync(): Promise<void> {
    try {
      // 1. 收集本地变更
      const localChanges = this.pendingChanges;
      this.pendingChanges = [];

      // 2. 检查其他可能的存储位置
      this.checkAlternativeStorage();

      // 3. 应用变更
      if (localChanges.length > 0) {
        this.applyChanges(localChanges);
      }

      // 4. 验证数据一致性
      if (!this.validateDataConsistency()) {
        console.log('[DataSyncService] Data inconsistency detected during sync, attempting to fix...');
        this.fixDataConsistency();
      }

      // 5. 更新同步时间
      this.saveToLocalStorage(STORAGE_KEYS.LAST_SYNC, Date.now());

      // 6. 通知监听器
      this.notifyListeners();
    } catch (error) {
      console.error('Sync error:', error);
      logSyncError('Sync failed', error);
    }
  }

  // 检查其他存储位置
  private checkAlternativeStorage(): void {
    // 尝试从不同的存储键读取数据
    const alternativeKeys = [
      'sync_data_edge',
      'sync_data_chrome',
      'sync_data_firefox',
      'shared_sync_data',
      'cross_browser_sync_data',
      'global_sync_data',
      'sync_data'
    ];

    let latestData: SyncData | null = null;
    let latestTimestamp = 0;

    // 检查所有可能的存储键
    for (const key of alternativeKeys) {
      const data = this.loadFromLocalStorage(key);
      if (data && data.lastUpdated > latestTimestamp) {
        latestData = data;
        latestTimestamp = data.lastUpdated;
      }
    }

    // 检查单个数据类型的存储键
    const singleDataKeys = ['projects', 'members', 'wbsTasks'];
    for (const key of singleDataKeys) {
      const data = this.loadFromLocalStorage(key);
      if (data && Array.isArray(data)) {
        // 如果找到单个数据类型，创建临时SyncData对象进行比较
        const tempData: SyncData = {
          members: key === 'members' ? data : this.loadFromLocalStorage('members') || [],
          projects: key === 'projects' ? data : this.loadFromLocalStorage('projects') || [],
          wbsTasks: key === 'wbsTasks' ? data : this.loadFromLocalStorage('wbsTasks') || [],
          lastUpdated: Date.now(),
          version: this.getNextVersion()
        };
        
        if (tempData.lastUpdated > latestTimestamp) {
          latestData = tempData;
          latestTimestamp = tempData.lastUpdated;
        }
      }
    }

    // 如果找到更新的数据，应用它
    if (latestData) {
      this.mergeSyncData(latestData);
    }
  }

  // 合并同步数据
  private mergeSyncData(externalData: SyncData): void {
    const localData = this.getSyncData() || this.createInitialSyncData();

    // 冲突解决
    if (externalData.version > localData.version) {
      // 外部数据更新，应用它
      this.saveSyncData(externalData);
      this.applySyncDataToLocalStorage(externalData);
      console.log('[DataSyncService] Applied newer external data (version:', externalData.version, ')');
    } else if (externalData.version < localData.version) {
      // 本地数据更新，保存到主存储键
      this.saveSyncData(localData);
      console.log('[DataSyncService] Saved newer local data (version:', localData.version, ')');
    } else {
      // 版本相同，根据时间戳决定
      if (externalData.lastUpdated > localData.lastUpdated) {
        this.saveSyncData(externalData);
        this.applySyncDataToLocalStorage(externalData);
        console.log('[DataSyncService] Applied newer external data by timestamp');
      } else if (externalData.lastUpdated < localData.lastUpdated) {
        // 本地数据更新，保存到主存储键
        this.saveSyncData(localData);
        console.log('[DataSyncService] Saved newer local data by timestamp');
      }
    }
  }

  // 创建初始同步数据
  private createInitialSyncData(): SyncData {
    return {
      members: this.loadFromLocalStorage('members') || [],
      projects: this.loadFromLocalStorage('projects') || [],
      wbsTasks: this.loadFromLocalStorage('wbsTasks') || [],
      lastUpdated: Date.now(),
      version: 1
    };
  }

  // 应用同步数据到LocalStorage
  private applySyncDataToLocalStorage(data: SyncData): void {
    this.saveToLocalStorage('members', data.members);
    this.saveToLocalStorage('projects', data.projects);
    this.saveToLocalStorage('wbsTasks', data.wbsTasks);
  }

  // 应用变更
  private applyChanges(changes: ChangeRecord[]): void {
    const syncData = this.getSyncData() || this.createInitialSyncData();

    for (const change of changes) {
      switch (change.key) {
        case 'members':
          this.applyMemberChange(syncData, change);
          break;
        case 'projects':
          this.applyProjectChange(syncData, change);
          break;
        case 'wbsTasks':
          this.applyWbsTaskChange(syncData, change);
          break;
      }
    }

    // 更新同步数据
    syncData.lastUpdated = Date.now();
    syncData.version = Math.max(...changes.map(c => c.version), syncData.version);
    this.saveSyncData(syncData);

    // 保存到主存储键（删除多余的多重存储）
    this.saveSyncData(syncData);

    // 应用到本地存储
    this.applySyncDataToLocalStorage(syncData);
    
    // 通过BroadcastChannel立即广播到所有浏览器（跨浏览器实时同步）
    changes.forEach(change => {
      broadcastService.broadcastDataUpdate(change.key, change.data);
    });
    
    // 通知其他浏览器数据已更新
    syncDataUpdated({
      key: 'all_data',
      timestamp: syncData.lastUpdated,
      version: syncData.version,
      data: {
        projects: syncData.projects.length,
        members: syncData.members.length,
        wbsTasks: syncData.wbsTasks.length
      }
    });

    console.log('[DataSyncService] Data synchronized:', {
      projects: syncData.projects.length,
      members: syncData.members.length,
      wbsTasks: syncData.wbsTasks.length,
      version: syncData.version,
      timestamp: syncData.lastUpdated
    });
  }

  // 应用成员变更
  private applyMemberChange(syncData: SyncData, change: ChangeRecord): void {
    switch (change.operation) {
      case 'create':
        if (!syncData.members.some(m => m.id === change.data.id)) {
          syncData.members.push(change.data);
        }
        break;
      case 'update':
        const memberIndex = syncData.members.findIndex(m => m.id === change.data.id);
        if (memberIndex !== -1) {
          syncData.members[memberIndex] = change.data;
        }
        break;
      case 'delete':
        syncData.members = syncData.members.filter(m => m.id !== change.data.id);
        break;
    }
  }


  // 应用项目变更
  private applyProjectChange(syncData: SyncData, change: ChangeRecord): void {
    switch (change.operation) {
      case 'create':
        if (!syncData.projects.some(p => p.id === change.data.id)) {
          syncData.projects.push(change.data);
        }
        break;
      case 'update':
        const projectIndex = syncData.projects.findIndex(p => p.id === change.data.id);
        if (projectIndex !== -1) {
          syncData.projects[projectIndex] = change.data;
        }
        break;
      case 'delete':
        syncData.projects = syncData.projects.filter(p => p.id !== change.data.id);
        break;
    }
  }

  // 应用任务变更
  private applyWbsTaskChange(syncData: SyncData, change: ChangeRecord): void {
    switch (change.operation) {
      case 'create':
        if (!syncData.wbsTasks.some(t => t.id === change.data.id)) {
          syncData.wbsTasks.push(change.data);
        }
        break;
      case 'update':
        const taskIndex = syncData.wbsTasks.findIndex(t => t.id === change.data.id);
        if (taskIndex !== -1) {
          syncData.wbsTasks[taskIndex] = change.data;
        }
        break;
      case 'delete':
        syncData.wbsTasks = syncData.wbsTasks.filter(t => t.id !== change.data.id);
        break;
    }
  }

  // 注册同步监听器
  onSync(callback: () => void): void {
    this.syncListeners.add(callback);
  }

  // 移除同步监听器
  offSync(callback: () => void): void {
    this.syncListeners.delete(callback);
  }

  // 通知监听器
  private notifyListeners(): void {
    const syncData = this.getSyncData();
    if (syncData) {
      const dataKey = `${syncData.version}-${syncData.lastUpdated}-${syncData.members.length}-${syncData.projects.length}`;
      if (dataKey === this.lastNotifiedData) {
        return;
      }
      this.lastNotifiedData = dataKey;
    }
    
    for (const callback of this.syncListeners) {
      try {
        callback();
      } catch (error) {
        console.error('Listener error:', error);
      }
    }
  }

  // 手动触发同步
  triggerSync(): Promise<void> {
    return this.sync();
  }

  // 获取同步状态
  getSyncStatus(): {
    lastSync: number;
    pendingChanges: number;
    deviceId: string;
    version: number;
    syncData: SyncData | null;
  } {
    return {
      lastSync: this.loadFromLocalStorage(STORAGE_KEYS.LAST_SYNC) || 0,
      pendingChanges: this.pendingChanges.length,
      deviceId: this.deviceId,
      version: this.getSyncData()?.version || 0,
      syncData: this.getSyncData()
    };
  }

  // 验证数据一致性（简化版 - 使用统一存储）
  validateDataConsistency(): boolean {
    // 使用统一存储后，数据一致性由 CacheManager 保证
    // 这里只检查关键数据类型是否存在
    const dataTypes: StorageDataType[] = ['projects', 'members', 'wbs_tasks'];
    let isConsistent = true;

    for (const dataType of dataTypes) {
      if (!unifiedStorage.has(dataType)) {
        console.warn(`[DataSyncService] 缺少数据: ${dataType}`);
        isConsistent = false;
      }
    }

    return isConsistent;
  }

  // 修复数据一致性
  fixDataConsistency(): boolean {
    console.log('[DataSyncService] Attempting to fix data consistency...');
    
    try {
      // 1. 收集所有可能的数据源
      let bestData: SyncData | null = null;
      let bestTimestamp = 0;
      
      // 检查所有可能的存储位置
      const allStorageKeys = [
        'sync_data',
        'shared_sync_data',
        'cross_browser_sync_data',
        'global_sync_data',
        'sync_data_edge',
        'sync_data_chrome',
        'sync_data_firefox'
      ];
      
      for (const key of allStorageKeys) {
        const data = this.loadFromLocalStorage(key);
        if (data && data.lastUpdated && data.lastUpdated > bestTimestamp) {
          bestData = data;
          bestTimestamp = data.lastUpdated;
        }
      }
      
      // 如果没有找到最佳数据，使用当前同步数据或创建初始数据
      const syncData = bestData || this.getSyncData() || this.createInitialSyncData();
      
      // 2. 确保项目数据的完整性
      if (!syncData.projects) {
        syncData.projects = [];
      }
      
      // 3. 应用同步数据到本地存储
      this.applySyncDataToLocalStorage(syncData);
      
      // 4. 保存到主存储键（删除多余的多重存储）
      this.saveSyncData(syncData);

      // 5. 通知其他浏览器数据已更新
      syncDataUpdated({
        key: 'consistency_fix',
        timestamp: syncData.lastUpdated,
        version: syncData.version,
        data: {
          projects: syncData.projects.length,
          members: syncData.members.length,
          wbsTasks: syncData.wbsTasks.length,
          message: 'Data consistency fixed'
        }
      });

      // 7. 额外发送一个项目数据更新通知，确保所有浏览器都能接收到
      try {
        localStorage.setItem('projects_updated', JSON.stringify({
          timestamp: Date.now(),
          projectCount: syncData.projects.length,
          version: syncData.version
        }));
        setTimeout(() => {
          localStorage.removeItem('projects_updated');
        }, 100);
      } catch (error) {
        console.error('[DataSyncService] Failed to emit projects updated event:', error);
      }

      const fixDetails = {
        projects: syncData.projects.length,
        members: syncData.members.length,
        wbsTasks: syncData.wbsTasks.length,
        version: syncData.version,
        source: bestData ? 'external_storage' : 'local_sync_data'
      };

      console.log('[DataSyncService] Data consistency fixed:', fixDetails);
      logConsistencyFix(true, fixDetails);

      return true;
    } catch (error: unknown) {
      console.error('[DataSyncService] Failed to fix data consistency:', error);
      logConsistencyFix(false, { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  // 定期验证和修复数据一致性
  startConsistencyCheck(): void {
    // 添加标志防止重复修复
    let isFixing = false;

    this.consistencyCheckInterval = setInterval(() => {
      if (this.isDestroyed || isFixing) return; // 如果正在修复，跳过本次检查

      if (!this.validateDataConsistency()) {
        console.log('[DataSyncService] Data inconsistency detected, attempting to fix...');
        isFixing = true;
        this.fixDataConsistency().finally(() => {
          // 修复完成后延迟重置标志，避免立即重复检查
          setTimeout(() => {
            isFixing = false;
          }, 5000);
        });
      }
    }, 30000); // 增加到30秒检查一次，减少性能消耗
  }

  /**
   * 销毁服务，清理所有资源
   * 这个方法应该只在应用卸载时调用
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isInitialized = false;

    // 停止所有定时器
    this.stopSync();

    // 清理初始化定时器
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }

    // 移除存储事件监听器
    if (this.storageChangeHandler) {
      window.removeEventListener('storage', this.storageChangeHandler);
      this.storageChangeHandler = null;
    }

    // 取消 BroadcastChannel 订阅
    if (this.broadcastDataUpdateUnsubscribe) {
      this.broadcastDataUpdateUnsubscribe();
      this.broadcastDataUpdateUnsubscribe = null;
    }

    // 清空所有监听器
    this.syncListeners.clear();
    this.pendingChanges = [];

    console.log('[DataSyncService] 数据同步服务已销毁');
  }

  /**
   * 检查服务是否已销毁
   */
  isServiceDestroyed(): boolean {
    return this.isDestroyed;
  }
} 

// 导出单例
export const dataSyncService = new DataSyncService();
export default dataSyncService;