// 能力维度定义
export interface CapabilityDimension {
  id: string;
  name: string;           // 维度名称
  description: string;    // 维度描述
  sortOrder: number;      // 排序顺序
  isActive: boolean;      // 是否启用
  createdAt: number;
  updatedAt: number;
  createdBy: string;      // 创建者ID
}

// 维度存储键
const STORAGE_KEY = 'capability_dimensions';

// 获取所有维度
export const getAllDimensions = (): CapabilityDimension[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // 返回默认维度
  return getDefaultDimensions();
};

// 获取默认维度
export const getDefaultDimensions = (): CapabilityDimension[] => {
  const now = Date.now();
  return [
    {
      id: 'boardDev',
      name: '板卡开发',
      description: '硬件板卡设计、原理图绘制、PCB布局能力',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    },
    {
      id: 'firmwareDev',
      name: '固件开发',
      description: '嵌入式软件、驱动程序、底层代码开发能力',
      sortOrder: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    },
    {
      id: 'componentImport',
      name: '外购部件导入',
      description: '供应商管理、部件选型、导入验证能力',
      sortOrder: 3,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    },
    {
      id: 'systemDesign',
      name: '系统设计',
      description: '系统架构设计、方案规划、技术决策能力',
      sortOrder: 4,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    },
    {
      id: 'driverInterface',
      name: '驱动接口类',
      description: '接口设计、协议开发、系统集成能力',
      sortOrder: 5,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    },
  ];
};

// 保存维度列表
export const saveDimensions = (dimensions: CapabilityDimension[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
};

// 根据ID获取维度
export const getDimensionById = (id: string): CapabilityDimension | undefined => {
  const dimensions = getAllDimensions();
  return dimensions.find(d => d.id === id);
};

// 创建维度
export const createDimension = (
  name: string,
  description: string,
  createdBy: string
): { success: boolean; message: string; dimension?: CapabilityDimension } => {
  if (!name.trim()) {
    return { success: false, message: '维度名称不能为空' };
  }

  const dimensions = getAllDimensions();

  // 检查名称是否已存在
  if (dimensions.some(d => d.name === name.trim())) {
    return { success: false, message: '该维度名称已存在' };
  }

  const newDimension: CapabilityDimension = {
    id: `dim_${Date.now()}`,
    name: name.trim(),
    description: description?.trim() || '',
    sortOrder: dimensions.length + 1,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
  };

  dimensions.push(newDimension);
  saveDimensions(dimensions);

  return { success: true, message: '维度创建成功', dimension: newDimension };
};

// 更新维度
export const updateDimension = (
  id: string,
  updates: Partial<Pick<CapabilityDimension, 'name' | 'description' | 'isActive' | 'sortOrder'>>,
  updatedBy: string
): { success: boolean; message: string; dimension?: CapabilityDimension } => {
  const dimensions = getAllDimensions();
  const index = dimensions.findIndex(d => d.id === id);

  if (index === -1) {
    return { success: false, message: '维度不存在' };
  }

  // 如果要更新名称，检查是否与其他维度重复
  if (updates.name && updates.name !== dimensions[index].name) {
    if (dimensions.some(d => d.name === updates.name?.trim())) {
      return { success: false, message: '该维度名称已存在' };
    }
  }

  dimensions[index] = {
    ...dimensions[index],
    ...(updates.name && { name: updates.name.trim() }),
    ...(updates.description !== undefined && { description: updates.description?.trim() || '' }),
    ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    ...(updates.sortOrder !== undefined && { sortOrder: updates.sortOrder }),
    updatedAt: Date.now(),
  };

  saveDimensions(dimensions);

  return { success: true, message: '维度更新成功', dimension: dimensions[index] };
};

// 删除维度
export const deleteDimension = (id: string): { success: boolean; message: string } => {
  const dimensions = getAllDimensions();
  const index = dimensions.findIndex(d => d.id === id);

  if (index === -1) {
    return { success: false, message: '维度不存在' };
  }

  // 检查是否为系统默认维度（以保护系统稳定性）
  const systemIds = ['boardDev', 'firmwareDev', 'componentImport', 'systemDesign', 'driverInterface'];
  if (systemIds.includes(id)) {
    return { success: false, message: '系统默认维度不能删除' };
  }

  dimensions.splice(index, 1);
  
  // 重新排序
  dimensions.forEach((d, i) => {
    d.sortOrder = i + 1;
  });
  
  saveDimensions(dimensions);

  return { success: true, message: '维度删除成功' };
};

// 获取启用的维度列表
export const getActiveDimensions = (): CapabilityDimension[] => {
  return getAllDimensions().filter(d => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
};

// 检查用户是否可以管理维度
export const canManageDimensions = (userRole: string): boolean => {
  return userRole === 'admin' || userRole === 'dept_manager';
};
