/**
 * 数据指纹相关类型定义
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
 * 字段冲突信息
 */
export interface FieldConflict {
  /** 冲突字段名 */
  field: string;
  /** 本地值 */
  localValue: any;
  /** 远程值 */
  remoteValue: any;
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
 * 数据变更记录
 */
export interface DataChangeRecord {
  /** 记录ID */
  id: number;
  /** 数据类型 */
  dataType: string;
  /** 数据ID */
  dataId: string;
  /** 操作类型 */
  action: 'create' | 'update' | 'delete';
  /** 旧值 */
  oldValue?: any;
  /** 新值 */
  newValue?: any;
  /** 变更者ID */
  changedBy: number;
  /** 变更原因 */
  changeReason?: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 数据合并结果
 */
export interface DataMergeResult {
  /** 合并后的数据 */
  merged: any;
  /** 冲突列表 */
  conflicts: FieldConflict[];
  /** 是否有冲突 */
  hasConflicts: boolean;
}
