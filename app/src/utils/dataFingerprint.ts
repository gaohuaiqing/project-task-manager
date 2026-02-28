/**
 * 数据指纹工具
 * 用于计算数据指纹和比较数据差异
 */

import type {
  DataFieldDiff,
  FieldConflict,
  DataMergeResult
} from '@/types/dataFingerprint';

// 重新导出类型
export type {
  DataFieldDiff,
  FieldConflict,
  DataMergeResult
};

/**
 * 计算数据指纹
 * 使用 SHA-256 哈希算法生成唯一指纹
 */
export async function calculateFingerprint(data: any): Promise<string> {
  try {
    // 标准化数据（按键排序）
    const normalized = JSON.stringify(data, Object.keys(data).sort());

    // 使用 SHA-256 计算哈希
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('[dataFingerprint] 计算指纹失败:', error);
    return '';
  }
}

/**
 * 简化版指纹计算（同步）
 * 用于不支持 crypto.subtle 的环境
 */
export function calculateSimpleFingerprint(data: any): string {
  try {
    // 标准化数据（按键排序）
    const normalized = JSON.stringify(data, Object.keys(data).sort());

    // 简单的哈希算法（FNV-1a）
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i++) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16);
  } catch (error) {
    console.error('[dataFingerprint] 计算简化指纹失败:', error);
    return Date.now().toString(36);
  }
}

/**
 * 比较数据差异
 */
export function compareDataFields(
  base: any,
  newData: any
): DataFieldDiff {
  const baseKeys = new Set(Object.keys(base));
  const newKeys = new Set(Object.keys(newData));

  const added = [...newKeys].filter(k => !baseKeys.has(k));
  const removed = [...baseKeys].filter(k => !newKeys.has(k));
  const modified = [...newKeys].filter(k =>
    baseKeys.has(k) && !deepEqual(base[k], newData[k])
  );
  const unchanged = [...newKeys].filter(k =>
    baseKeys.has(k) && deepEqual(base[k], newData[k])
  );

  return { added, removed, modified, unchanged };
}

/**
 * 深度比较两个值是否相等
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * 合并数据（字段级）
 */
export function mergeDataFields(
  base: any,
  updates: any
): any {
  const merged = { ...base };

  for (const key of Object.keys(updates)) {
    // 如果都是对象，递归合并
    if (
      typeof merged[key] === 'object' &&
      merged[key] !== null &&
      !Array.isArray(merged[key]) &&
      typeof updates[key] === 'object' &&
      updates[key] !== null &&
      !Array.isArray(updates[key])
    ) {
      merged[key] = mergeDataFields(merged[key], updates[key]);
    } else {
      // 否则直接覆盖
      merged[key] = updates[key];
    }
  }

  return merged;
}

/**
 * 检测数据冲突
 */
export function detectConflicts(
  localChanges: any,
  remoteChanges: any
): FieldConflict[] {
  const conflicts: Array<{ field: string; localValue: any; remoteValue: any }> = [];
  const localFields = new Set(Object.keys(localChanges));
  const remoteFields = new Set(Object.keys(remoteChanges));

  // 检查共同修改的字段
  for (const field of localFields) {
    if (remoteFields.has(field)) {
      if (!deepEqual(localChanges[field], remoteChanges[field])) {
        conflicts.push({
          field,
          localValue: localChanges[field],
          remoteValue: remoteChanges[field]
        });
      }
    }
  }

  return conflicts;
}
