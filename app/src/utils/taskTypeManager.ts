/**
 * 任务类型管理工具
 * 使用后端 MySQL 数据库存储任务类型数据
 * 使用 CacheManager 统一管理本地缓存
 */

import { CacheManager } from '@/services/CacheManager';

// 任务类型接口
export interface TaskType {
  value: string;
  label: string;
  color: string;
}

const API_BASE = 'http://localhost:3001/api/global-data';
const DATA_TYPE = 'task_types';

/** 缓存键（使用统一的 cache:* 前缀） */
const CACHE_KEY = 'task_types';
/** 缓存 TTL: 30分钟（任务类型数据变更频率低） */
const CACHE_TTL = 30 * 60 * 1000;

// 从后端获取任务类型
async function fetchTaskTypes(): Promise<TaskType[]> {
  try {
    const response = await fetch(`${API_BASE}/get?dataType=${DATA_TYPE}&dataId=default`);
    if (!response.ok) {
      throw new Error('获取任务类型失败');
    }
    const result = await response.json();
    if (result.success && result.data && result.data.length > 0) {
      const data = result.data[0].data_json;
      const taskTypes = JSON.parse(data) as TaskType[];

      // 缓存到本地
      CacheManager.set(CACHE_KEY, taskTypes, { ttl: CACHE_TTL });

      return taskTypes;
    }
    return [];
  } catch (error) {
    console.error('[TaskTypeManager] 从后端获取任务类型失败:', error);
    // 降级：尝试从本地缓存读取
    const cached = CacheManager.get<TaskType[]>(CACHE_KEY);
    if (cached) {
      console.warn('[TaskTypeManager] 使用本地缓存数据');
      return cached;
    }
    return [];
  }
}

// 保存任务类型到后端
async function saveTaskTypesToBackend(taskTypes: TaskType[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataType: DATA_TYPE,
        dataId: 'default',
        data: taskTypes,
        changeReason: '任务类型更新'
      })
    });
    if (!response.ok) {
      throw new Error('保存任务类型失败');
    }
    const result = await response.json();
    if (result.success) {
      // 更新本地缓存
      CacheManager.set(CACHE_KEY, taskTypes, { ttl: CACHE_TTL });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[TaskTypeManager] 保存任务类型到后端失败:', error);
    return false;
  }
}

// 从后端获取任务类型列表（带缓存）
export async function getTaskTypes(): Promise<TaskType[]> {
  // 先尝试从缓存获取
  const cached = CacheManager.get<TaskType[]>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // 从后端获取
  const taskTypes = await fetchTaskTypes();
  if (taskTypes.length > 0) {
    return taskTypes;
  }

  // 如果后端没有数据，返回默认值
  const defaults = getDefaultTaskTypes();
  await saveTaskTypesToBackend(defaults);
  return defaults;
}

// 获取默认任务类型列表
export function getDefaultTaskTypes(): TaskType[] {
  return [
    { value: 'frontend', label: '前端开发', color: '#60a5fa' },
    { value: 'backend', label: '后端开发', color: '#4ade80' },
    { value: 'test', label: '测试', color: '#facc15' },
    { value: 'design', label: '设计', color: '#f472b6' },
    { value: 'other', label: '其他', color: '#9ca3af' },
  ];
}

// 添加任务类型
export async function addTaskType(taskType: Omit<TaskType, 'value'>): Promise<TaskType> {
  const taskTypes = await getTaskTypes();
  const newTaskType: TaskType = {
    ...taskType,
    value: `task_type_${Date.now()}`,
  };
  const updatedTaskTypes = [...taskTypes, newTaskType];
  await saveTaskTypesToBackend(updatedTaskTypes);
  return newTaskType;
}

// 删除任务类型
export async function deleteTaskType(value: string): Promise<void> {
  const taskTypes = await getTaskTypes();
  const updatedTaskTypes = taskTypes.filter(type => type.value !== value);
  await saveTaskTypesToBackend(updatedTaskTypes);
}

// 更新任务类型
export async function updateTaskType(value: string, updates: Partial<TaskType>): Promise<void> {
  const taskTypes = await getTaskTypes();
  const updatedTaskTypes = taskTypes.map(type =>
    type.value === value ? { ...type, ...updates } : type
  );
  await saveTaskTypesToBackend(updatedTaskTypes);
}

// 重置为默认任务类型
export async function resetToDefaults(): Promise<void> {
  const defaults = getDefaultTaskTypes();
  await saveTaskTypesToBackend(defaults);
}

// 根据值获取任务类型
export async function getTaskTypeByValue(value: string): Promise<TaskType | undefined> {
  const taskTypes = await getTaskTypes();
  return taskTypes.find(type => type.value === value);
}

// 批量更新任务类型
export async function batchUpdateTaskTypes(taskTypes: TaskType[]): Promise<boolean> {
  return await saveTaskTypesToBackend(taskTypes);
}

// 保存任务类型（别名，用于向后兼容）
export const saveTaskTypes = batchUpdateTaskTypes;
