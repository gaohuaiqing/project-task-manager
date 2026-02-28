/**
 * 数据库查询结果类型守卫
 * 提供统一的类型判断工具，避免不一致的类型检查
 */

/**
 * 检查是否为有效的查询结果数组
 */
export function isValidQueryResult(result: any): result is any[] {
  return Array.isArray(result) && result.length >= 0;
}

/**
 * 检查查询结果是否有数据
 */
export function hasQueryData(result: any): boolean {
  return isValidQueryResult(result) && result.length > 0;
}

/**
 * 获取查询结果的第一条记录
 */
export function getFirstResult<T = any>(result: any): T | null {
  if (hasQueryData(result)) {
    return result[0] as T;
  }
  return null;
}

/**
 * 获取查询结果的第一条记录，如果不存在则返回默认值
 */
export function getFirstResultOr<T = any>(result: any, defaultValue: T): T {
  const first = getFirstResult<T>(result);
  return first !== null ? first : defaultValue;
}

/**
 * 检查是否为空查询结果
 */
export function isEmptyQueryResult(result: any): boolean {
  return !isValidQueryResult(result) || result.length === 0;
}

/**
 * 从查询结果中提取单个值（如 COUNT, SUM 等）
 */
export function extractSingleValue(result: any, defaultValue: any = 0): any {
  if (hasQueryData(result) && result[0] !== undefined && result[0] !== null) {
    const firstRow = result[0];
    const keys = Object.keys(firstRow);
    if (keys.length > 0) {
      return firstRow[keys[0]];
    }
  }
  return defaultValue;
}

/**
 * 检查插入操作是否成功（通过 insertId）
 */
export function isInsertSuccess(result: any): boolean {
  return result && result.insertId && result.insertId > 0;
}

/**
 * 检查更新/删除操作是否影响了行
 */
export function isAffectedRows(result: any): boolean {
  return result && result.affectedRows !== undefined && result.affectedRows > 0;
}

/**
 * 类型守卫：确认结果为单个对象
 */
export function isSingleObject(result: any): result is Record<string, any> {
  return result !== null && typeof result === 'object' && !Array.isArray(result);
}

/**
 * 安全地解析 JSON 字段
 */
export function parseJsonField<T = any>(value: any, defaultValue: T): T {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return defaultValue;
}

/**
 * 安全地序列化为 JSON
 */
export function stringifyJsonField(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * 检查是否为有效的 ID
 */
export function isValidId(id: any): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

/**
 * 规范化 ID（确保是数字）
 */
export function normalizeId(id: any): number | null {
  const num = Number(id);
  return Number.isInteger(num) && num > 0 ? num : null;
}
