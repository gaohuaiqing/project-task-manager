/**
 * 数据指纹相关类型定义（改进版 - 类型安全）
 */

/**
 * 数据差异比较结果
 */
export interface DataFieldDiff {
  /** 新增的字段 */
  added: string[];
  /** 删除的字段 */
  removed: string[];
  /** 修改的字段 */
  modified: string[];
  /** 未改变的字段 */
  unchanged: string[];
}

/**
 * 字段冲突信息（泛型版本）
 */
export interface FieldConflict<T = unknown> {
  /** 冲突字段名 */
  field: string;
  /** 本地值 */
  localValue: T;
  /** 远程值 */
  remoteValue: T;
}

/**
 * 数据指纹比较结果
 */
export interface FingerprintComparison {
  /** 指纹是否相同 */
  isSame: boolean;
  /** 本地指纹 */
  localFingerprint: string;
  /** 远程指纹 */
  remoteFingerprint: string;
  /** 差异详情 */
  diff?: DataFieldDiff;
}

/**
 * 数据版本信息
 */
export interface DataVersionInfo {
  /** 版本号 */
  version: number;
  /** 数据指纹 */
  fingerprint: string;
  /** 最后修改时间 */
  lastModified: number;
  /** 修改者ID */
  modifiedBy: number;
  /** 修改者名称 */
  modifiedByName?: string;
}

/**
 * 数据变更记录（泛型版本）
 */
export interface DataChangeRecord<T = unknown> {
  /** 记录ID */
  id: number;
  /** 数据类型 */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 操作类型 */
  action: 'create' | 'update' | 'delete';
  /** 旧值 */
  oldValue?: T;
  /** 新值 */
  newValue?: T;
  /** 变更者ID */
  changedBy: number;
  /** 变更原因 */
  changeReason?: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 数据合并结果（泛型版本）
 */
export interface DataMergeResult<T = unknown> {
  /** 合并后的数据 */
  merged: T;
  /** 冲突列表 */
  conflicts: FieldConflict<T>[];
  /** 是否有冲突 */
  hasConflicts: boolean;
}

/**
 * 类型守卫：检查是否为有效的数据差异
 */
export function isValidDataFieldDiff(value: unknown): value is DataFieldDiff {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const diff = value as Record<string, unknown>;

  return (
    Array.isArray(diff.added) &&
    Array.isArray(diff.removed) &&
    Array.isArray(diff.modified) &&
    Array.isArray(diff.unchanged) &&
    diff.added.every((item: unknown) => typeof item === 'string') &&
    diff.removed.every((item: unknown) => typeof item === 'string') &&
    diff.modified.every((item: unknown) => typeof item === 'string') &&
    diff.unchanged.every((item: unknown) => typeof item === 'string')
  );
}

/**
 * 类型守卫：检查是否为有效的字段冲突
 */
export function isValidFieldConflict(value: unknown): value is FieldConflict {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const conflict = value as Record<string, unknown>;

  return (
    typeof conflict.field === 'string' &&
    'localValue' in conflict &&
    'remoteValue' in conflict
  );
}

/**
 * 类型守卫：检查是否为有效的数据版本信息
 */
export function isValidDataVersionInfo(value: unknown): value is DataVersionInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const info = value as Record<string, unknown>;

  return (
    typeof info.version === 'number' &&
    typeof info.fingerprint === 'string' &&
    typeof info.lastModified === 'number' &&
    typeof info.modifiedBy === 'number'
  );
}

/**
 * 类型守卫：检查是否为有效的数据变更记录
 */
export function isValidDataChangeRecord(value: unknown): value is DataChangeRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'number' &&
    typeof record.dataType === 'string' &&
    typeof record.dataId === 'string' &&
    ['create', 'update', 'delete'].includes(record.action as string) &&
    typeof record.changedBy === 'number' &&
    (record.oldValue === undefined || record.oldValue !== null) &&
    (record.newValue === undefined || record.newValue !== null)
  );
}

/**
 * 创建字段冲突
 */
export function createFieldConflict<T>(
  field: string,
  localValue: T,
  remoteValue: T
): FieldConflict<T> {
  return {
    field,
    localValue,
    remoteValue,
  };
}

/**
 * 创建数据合并结果
 */
export function createDataMergeResult<T>(
  merged: T,
  conflicts: FieldConflict<T>[] = []
): DataMergeResult<T> {
  return {
    merged,
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}

/**
 * 深度比较两个值是否相等
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // 基本类型比较
  if (a === b) {
    return true;
  }

  // null 或 undefined 比较
  if (a == null || b == null) {
    return a === b;
  }

  // 类型不同
  if (typeof a !== typeof b) {
    return false;
  }

  // 数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // 对象比较
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
      return false;
    }

    return keysA.every(key =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}
