/**
 * 统一数据服务 - 从 global_data 统一架构获取数据
 * 实现新旧架构的平滑过渡
 */

import { indexedDBSyncService } from './IndexedDBSyncService';

// 统一数据类型
export type UnifiedDataType = 'organization_units' | 'projects' | 'wbs_tasks' | 'holidays' | 'members';

// 数据项接口
export interface UnifiedDataItem<T = any> {
  id?: number;
  data_type: string;
  data_id: string;
  data_json: T;
  version: number;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
}

// API 响应接口
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}

/**
 * 统一数据服务类
 * 负责从 global_data 表获取和保存数据
 * 支持降级到旧表 API
 */
class UnifiedDataService {
  private readonly API_BASE = 'http://localhost:3001/api';

  /**
   * 获取指定类型的所有数据
   */
  async getData<T = any>(dataType: UnifiedDataType): Promise<T[]> {
    try {
      // 优先从后端 global_data 获取
      const response = await fetch(`${this.API_BASE}/global-data/get?dataType=${dataType}`);

      if (response.ok) {
        const result: ApiResponse<UnifiedDataItem<T>[]> = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          console.log(`[UnifiedDataService] 从 global_data 获取到 ${dataType}，共 ${result.data.length} 条`);

          // 提取实际数据
          const items = result.data.map(item => item.data_json);

          // 同步到 localStorage
          localStorage.setItem(`sync_${dataType}`, JSON.stringify(items));

          // 同步到 IndexedDB（跨浏览器）
          indexedDBSyncService.init().then(() => {
            indexedDBSyncService.saveData(dataType, items);
          });

          return items;
        }
      }

      console.warn(`[UnifiedDataService] 从 global_data 未获取到 ${dataType} 数据，尝试降级方案`);
      return this.getLegacyData<T>(dataType);

    } catch (error) {
      console.error(`[UnifiedDataService] 获取 ${dataType} 失败:`, error);
      // 降级：从旧 API 获取
      return this.getLegacyData<T>(dataType);
    }
  }

  /**
   * 获取单个数据项
   */
  async getDataItem<T = any>(dataType: UnifiedDataType, dataId: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.API_BASE}/global-data/get?dataType=${dataType}&dataId=${dataId}`);

      if (response.ok) {
        const result: ApiResponse<UnifiedDataItem<T>[]> = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          return result.data[0].data_json;
        }
      }

      return null;
    } catch (error) {
      console.error(`[UnifiedDataService] 获取 ${dataType}/${dataId} 失败:`, error);
      return null;
    }
  }

  /**
   * 保存数据（创建或更新）
   */
  async saveData(dataType: UnifiedDataType, dataId: string, data: any, changeReason: string = '数据更新'): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/global-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType,
          dataId: dataId || 'default',
          data,
          changeReason
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[UnifiedDataService] 保存 ${dataType}/${dataId} 成功，版本: ${result.version}`);

        // 更新本地缓存
        const allData = await this.getData(dataType);
        return true;
      } else {
        console.error(`[UnifiedDataService] 保存失败:`, result.message);
        return false;
      }
    } catch (error) {
      console.error(`[UnifiedDataService] 保存 ${dataType}/${dataId} 失败:`, error);
      return false;
    }
  }

  /**
   * 创建新数据
   */
  async createData(dataType: UnifiedDataType, dataId: string, data: any): Promise<boolean> {
    return this.saveData(dataType, dataId, data, '创建新数据');
  }

  /**
   * 删除数据
   */
  async deleteData(dataType: UnifiedDataType, dataId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/global-data/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType,
          dataId,
          changeReason: '删除数据'
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[UnifiedDataService] 删除 ${dataType}/${dataId} 成功`);

        // 从本地缓存中移除
        const allData = await this.getData<any>(dataType);
        const filteredData = allData.filter(item => {
          if (dataType === 'projects') {
            return item.id !== parseInt(dataId.replace('project_', ''));
          } else if (dataType === 'holidays') {
            return item.id !== parseInt(dataId.replace('holiday_', ''));
          } else if (dataType === 'wbs_tasks') {
            return item.id !== parseInt(dataId.replace('task_', ''));
          }
          return true;
        });

        localStorage.setItem(`sync_${dataType}`, JSON.stringify(filteredData));
        return true;
      } else {
        console.error(`[UnifiedDataService] 删除失败:`, result.message);
        return false;
      }
    } catch (error) {
      console.error(`[UnifiedDataService] 删除 ${dataType}/${dataId} 失败:`, error);
      return false;
    }
  }

  /**
   * 降级方案：从旧 API 获取数据
   */
  private async getLegacyData<T>(dataType: UnifiedDataType): Promise<T[]> {
    try {
      console.log(`[UnifiedDataService] 使用降级方案获取 ${dataType}`);

      switch (dataType) {
        case 'projects':
          const projectsResponse = await fetch(`${this.API_BASE}/projects`);
          if (projectsResponse.ok) {
            const projects = await projectsResponse.json();
            return Array.isArray(projects) ? projects : [];
          }
          break;

        case 'holidays':
          const holidaysResponse = await fetch(`${this.API_BASE}/holidays`);
          if (holidaysResponse.ok) {
            const holidays = await holidaysResponse.json();
            return Array.isArray(holidays) ? holidays : [];
          }
          break;

        case 'wbs_tasks':
          const tasksResponse = await fetch(`${this.API_BASE}/wbs/tasks`);
          if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            return Array.isArray(tasks) ? tasks : [];
          }
          break;

        case 'members':
          const membersResponse = await fetch(`${this.API_BASE}/members`);
          if (membersResponse.ok) {
            const members = await membersResponse.json();
            return Array.isArray(members) ? members : [];
          }
          break;

        case 'organization_units':
          // 组织架构从 localStorage 获取
          const orgData = localStorage.getItem('org_structure');
          if (orgData) {
            return [JSON.parse(orgData)];
          }
          break;
      }

      console.warn(`[UnifiedDataService] 降级方案也无法获取 ${dataType}，返回空数组`);
      return [];

    } catch (error) {
      console.error(`[UnifiedDataService] 降级方案失败:`, error);
      return [];
    }
  }

  /**
   * 监听数据变更（通过 WebSocket）
   */
  onDataChanged(callback: (dataType: UnifiedDataType, data: any) => void): () => void {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'global_data_updated' && message.data) {
          const { dataType, data } = message.data;
          callback(dataType as UnifiedDataType, data);
        }
      } catch (error) {
        // 忽略非 JSON 消息
      }
    };

    // 监听 window 消息（来自 WebSocketService）
    window.addEventListener('message', handleMessage);

    // 返回取消监听函数
    return () => window.removeEventListener('message', handleMessage);
  }
}

// 导出单例
export const unifiedDataService = new UnifiedDataService();
