/**
 * 能力模型管理器
 *
 * 职责：
 * 1. 管理多组能力模型
 * 2. 每组能力模型可以包含不同的能力维度
 * 3. 支持将能力模型应用到技术组
 * 4. 提供能力模型组的 CRUD 操作
 */

import type { CapabilityModel, CapabilityDimension, MemberCapabilities } from '@/types/organization';
import { DEFAULT_CAPABILITY_DIMENSIONS } from '@/types/organization';

const CAPABILITY_MODELS_KEY = 'capability_models';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `model_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取所有能力模型组
 */
export function getCapabilityModels(): CapabilityModel[] {
  try {
    const stored = localStorage.getItem(CAPABILITY_MODELS_KEY);
    if (stored) {
      const models = JSON.parse(stored);
      if (Array.isArray(models) && models.length > 0) {
        return models;
      }
    }
  } catch (error) {
    console.error('[CapabilityModelManager] 读取能力模型失败:', error);
  }

  // 返回默认能力模型组
  return getDefaultCapabilityModels();
}

/**
 * 获取默认能力模型组
 */
export function getDefaultCapabilityModels(): CapabilityModel[] {
  return [
    {
      id: 'model_default',
      name: '通用能力模型',
      description: '适用于所有技术组的通用能力评估维度',
      dimensions: DEFAULT_CAPABILITY_DIMENSIONS,
      techGroupIds: [], // 空数组表示应用于所有技术组
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
}

/**
 * 保存能力模型组
 */
export function saveCapabilityModels(models: CapabilityModel[]): void {
  try {
    localStorage.setItem(CAPABILITY_MODELS_KEY, JSON.stringify(models));
    console.log('[CapabilityModelManager] 能力模型组已保存:', models.length);
  } catch (error) {
    console.error('[CapabilityModelManager] 保存能力模型失败:', error);
    throw error;
  }
}

/**
 * 添加能力模型组
 */
export function addCapabilityModel(
  model: Omit<CapabilityModel, 'id' | 'createdAt' | 'updatedAt'>
): { success: boolean; message: string; model?: CapabilityModel } {
  try {
    const models = getCapabilityModels();

    // 检查名称是否重复
    if (models.some(m => m.name === model.name)) {
      return { success: false, message: '模型组名称已存在' };
    }

    const newModel: CapabilityModel = {
      ...model,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    models.push(newModel);
    saveCapabilityModels(models);

    return { success: true, message: '能力模型组添加成功', model: newModel };
  } catch (error) {
    return { success: false, message: '添加失败，请重试' };
  }
}

/**
 * 更新能力模型组
 */
export function updateCapabilityModel(
  id: string,
  updates: Partial<Omit<CapabilityModel, 'id' | 'createdAt' | 'updatedAt'>>
): { success: boolean; message: string; model?: CapabilityModel } {
  try {
    const models = getCapabilityModels();
    const index = models.findIndex(m => m.id === id);

    if (index === -1) {
      return { success: false, message: '能力模型组不存在' };
    }

    // 检查名称是否与其他模型重复
    if (updates.name && models.some((m, i) => i !== index && m.name === updates.name)) {
      return { success: false, message: '模型组名称已存在' };
    }

    models[index] = {
      ...models[index],
      ...updates,
      updatedAt: Date.now()
    };

    saveCapabilityModels(models);

    return { success: true, message: '能力模型组更新成功', model: models[index] };
  } catch (error) {
    return { success: false, message: '更新失败，请重试' };
  }
}

/**
 * 删除能力模型组
 */
export function deleteCapabilityModel(
  id: string
): { success: boolean; message: string } {
  try {
    const models = getCapabilityModels();
    const modelToDelete = models.find(m => m.id === id);

    // 不能删除默认模型
    if (modelToDelete?.isDefault) {
      return { success: false, message: '不能删除默认能力模型' };
    }

    const filtered = models.filter(m => m.id !== id);

    if (filtered.length === models.length) {
      return { success: false, message: '能力模型组不存在' };
    }

    // 至少保留一个模型
    if (filtered.length === 0) {
      return { success: false, message: '至少需要保留一个能力模型组' };
    }

    saveCapabilityModels(filtered);

    return { success: true, message: '能力模型组删除成功' };
  } catch (error) {
    return { success: false, message: '删除失败，请重试' };
  }
}

/**
 * 重置为默认能力模型
 */
export function resetCapabilityModels(): { success: boolean; message: string } {
  try {
    localStorage.removeItem(CAPABILITY_MODELS_KEY);
    return { success: true, message: '已重置为默认能力模型' };
  } catch (error) {
    return { success: false, message: '重置失败，请重试' };
  }
}

/**
 * 根据技术组ID获取适用的能力模型
 */
export function getCapabilityModelForTechGroup(techGroupId: string): CapabilityModel | null {
  const models = getCapabilityModels();

  // 首先查找明确指定了该技术组的模型
  const specificModel = models.find(m => m.techGroupIds.includes(techGroupId));
  if (specificModel) {
    return specificModel;
  }

  // 如果没有找到，返回默认模型
  return models.find(m => m.isDefault) || null;
}

/**
 * 根据能力模型ID获取模型
 */
export function getCapabilityModelById(modelId: string): CapabilityModel | null {
  const models = getCapabilityModels();
  return models.find(m => m.id === modelId) || null;
}

/**
 * Bug-P1-011修复：移动维度顺序
 * @param modelId 模型ID
 * @param dimensionKey 维度key
 * @param direction 移动方向 'up' | 'down' | 'top' | 'bottom'
 */
export function moveDimension(
  modelId: string,
  dimensionKey: string,
  direction: 'up' | 'down' | 'top' | 'bottom'
): { success: boolean; message: string; model?: CapabilityModel } {
  try {
    const models = getCapabilityModels();
    const modelIndex = models.findIndex(m => m.id === modelId);

    if (modelIndex === -1) {
      return { success: false, message: '能力模型组不存在' };
    }

    const model = models[modelIndex];
    const dimIndex = model.dimensions.findIndex(d => d.key === dimensionKey);

    if (dimIndex === -1) {
      return { success: false, message: '能力维度不存在' };
    }

    const newDimensions = [...model.dimensions];
    const dimension = newDimensions[dimIndex];

    switch (direction) {
      case 'up':
        if (dimIndex > 0) {
          newDimensions.splice(dimIndex, 1);
          newDimensions.splice(dimIndex - 1, 0, dimension);
        } else {
          return { success: false, message: '已经是最前面了' };
        }
        break;
      case 'down':
        if (dimIndex < newDimensions.length - 1) {
          newDimensions.splice(dimIndex, 1);
          newDimensions.splice(dimIndex + 1, 0, dimension);
        } else {
          return { success: false, message: '已经是最后面了' };
        }
        break;
      case 'top':
        newDimensions.splice(dimIndex, 1);
        newDimensions.unshift(dimension);
        break;
      case 'bottom':
        newDimensions.splice(dimIndex, 1);
        newDimensions.push(dimension);
        break;
    }

    model.dimensions = newDimensions;
    model.updatedAt = Date.now();
    saveCapabilityModels(models);

    return { success: true, message: '维度顺序已更新', model };
  } catch (error) {
    return { success: false, message: '移动失败，请重试' };
  }
}

/**
 * 合并成员能力值（当维度变化时）
 */
export function mergeMemberCapabilities(
  oldCapabilities: MemberCapabilities,
  newDimensions: CapabilityDimension[]
): MemberCapabilities {
  const merged: MemberCapabilities = {};

  newDimensions.forEach(dim => {
    // 如果旧值存在则保留，否则使用默认值5
    merged[dim.key] = oldCapabilities[dim.key] ?? 5;
  });

  return merged;
}

/**
 * 获取默认能力值（从默认模型）
 */
export function getDefaultCapabilityValues(): MemberCapabilities {
  const defaultModel = getCapabilityModels().find(m => m.isDefault);
  if (!defaultModel) {
    return {};
  }

  const values: MemberCapabilities = {};
  defaultModel.dimensions.forEach(dim => {
    values[dim.key] = 5;
  });

  return values;
}

// ========== 以下函数保留用于向后兼容 ==========

/**
 * @deprecated 使用 getCapabilityModels() 替代
 * 获取所有能力维度（从默认模型）
 */
export function getCapabilityDimensions(): CapabilityDimension[] {
  const defaultModel = getCapabilityModels().find(m => m.isDefault);
  return defaultModel?.dimensions || DEFAULT_CAPABILITY_DIMENSIONS;
}

const CAPABILITY_DEFAULT_VALUES_KEY = 'capability_default_values';

/**
 * @deprecated 使用 getDefaultCapabilityValues() 替代
 */
export function getDefaultCapabilityValuesFromStorage(): MemberCapabilities {
  try {
    const stored = localStorage.getItem(CAPABILITY_DEFAULT_VALUES_KEY);
    if (stored) {
      const values = JSON.parse(stored);
      if (typeof values === 'object' && values !== null) {
        return values;
      }
    }
  } catch (error) {
    console.error('[CapabilityModelManager] 读取默认能力值失败:', error);
  }

  return getDefaultCapabilityValues();
}

/**
 * @deprecated 不再需要单独保存能力维度
 */
export function saveCapabilityDimensions(dimensions: CapabilityDimension[]): void {
  // 更新默认模型的维度
  const models = getCapabilityModels();
  const defaultModelIndex = models.findIndex(m => m.isDefault);

  if (defaultModelIndex !== -1) {
    models[defaultModelIndex].dimensions = dimensions;
    models[defaultModelIndex].updatedAt = Date.now();
    saveCapabilityModels(models);
  }

  // 更新默认值缓存
  const defaultValues: MemberCapabilities = {};
  dimensions.forEach(dim => {
    defaultValues[dim.key] = 5;
  });
  localStorage.setItem(CAPABILITY_DEFAULT_VALUES_KEY, JSON.stringify(defaultValues));
}

/**
 * @deprecated 使用 addCapabilityModel() 替代
 */
export function addCapabilityDimension(
  dimension: Omit<CapabilityDimension, 'key'>
): { success: boolean; message: string; dimension?: CapabilityDimension } {
  const models = getCapabilityModels();
  const defaultModel = models.find(m => m.isDefault);

  if (!defaultModel) {
    return { success: false, message: '默认模型不存在' };
  }

  // 生成唯一键
  const key = `${dimension.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10)}_${Date.now().toString(36)}`;

  // 检查名称是否重复
  if (defaultModel.dimensions.some(d => d.name === dimension.name)) {
    return { success: false, message: '维度名称已存在' };
  }

  const newDimension: CapabilityDimension = {
    ...dimension,
    key
  };

  defaultModel.dimensions.push(newDimension);
  saveCapabilityModels(models);

  return { success: true, message: '能力维度添加成功', dimension: newDimension };
}

/**
 * @deprecated 使用 updateCapabilityModel() 替代
 */
export function updateCapabilityDimension(
  key: string,
  updates: Partial<Omit<CapabilityDimension, 'key'>>
): { success: boolean; message: string; dimension?: CapabilityDimension } {
  const models = getCapabilityModels();
  const defaultModel = models.find(m => m.isDefault);

  if (!defaultModel) {
    return { success: false, message: '默认模型不存在' };
  }

  const index = defaultModel.dimensions.findIndex(d => d.key === key);

  if (index === -1) {
    return { success: false, message: '能力维度不存在' };
  }

  // 检查名称是否与其他维度重复
  if (updates.name && defaultModel.dimensions.some((d, i) => i !== index && d.name === updates.name)) {
    return { success: false, message: '维度名称已存在' };
  }

  defaultModel.dimensions[index] = {
    ...defaultModel.dimensions[index],
    ...updates
  };

  defaultModel.updatedAt = Date.now();
  saveCapabilityModels(models);

  return { success: true, message: '能力维度更新成功', dimension: defaultModel.dimensions[index] };
}

/**
 * @deprecated 使用 updateCapabilityModel() 替代
 */
export function deleteCapabilityDimension(
  key: string
): { success: boolean; message: string } {
  const models = getCapabilityModels();
  const defaultModel = models.find(m => m.isDefault);

  if (!defaultModel) {
    return { success: false, message: '默认模型不存在' };
  }

  const filtered = defaultModel.dimensions.filter(d => d.key !== key);

  if (filtered.length === defaultModel.dimensions.length) {
    return { success: false, message: '能力维度不存在' };
  }

  // 至少保留一个维度
  if (filtered.length === 0) {
    return { success: false, message: '至少需要保留一个能力维度' };
  }

  defaultModel.dimensions = filtered;
  defaultModel.updatedAt = Date.now();
  saveCapabilityModels(models);

  return { success: true, message: '能力维度删除成功' };
}
