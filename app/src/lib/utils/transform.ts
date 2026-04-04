/**
 * 命名风格转换工具
 * 用于前后端数据交互时的 snake_case <-> camelCase 转换
 * 纯原生实现，无第三方依赖
 */

/**
 * snake_case 转 camelCase
 * 例: user_name -> userName
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCase 转 snake_case
 * 例: userName -> user_name
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 检查是否是普通对象
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  // 排除数组、Date、File 等特殊对象
  if (Array.isArray(value) || value instanceof Date || value instanceof File || value instanceof Blob) {
    return false;
  }
  // 检查原型
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * 将后端 snake_case 数据转换为前端 camelCase
 * 同时将 Date 对象转换为 ISO 日期字符串 (YYYY-MM-DD)
 */
export function toFrontend<T>(data: unknown): T {
  // 处理 null 和 undefined
  if (data === null || data === undefined) {
    return data as T;
  }

  // 处理原始类型
  if (typeof data !== 'object') {
    return data as T;
  }

  // 处理 Date - 转换为 ISO 日期字符串
  if (data instanceof Date) {
    const year = data.getFullYear();
    const month = String(data.getMonth() + 1).padStart(2, '0');
    const day = String(data.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` as T;
  }

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => toFrontend(item)) as T;
  }

  // 处理二进制数据
  if (data instanceof ArrayBuffer || data instanceof Blob || data instanceof File) {
    return data as T;
  }

  // 处理普通对象
  if (isPlainObject(data)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const newKey = snakeToCamel(key);
      result[newKey] = toFrontend(value);
    }
    return result as T;
  }

  return data as T;
}

/**
 * 将前端 camelCase 数据转换为后端 snake_case
 */
export function toBackend<T>(data: unknown): T {
  // 处理 null 和 undefined
  if (data === null || data === undefined) {
    return data as T;
  }

  // 处理原始类型
  if (typeof data !== 'object') {
    return data as T;
  }

  // 处理 Date
  if (data instanceof Date) {
    return data as T;
  }

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => toBackend(item)) as T;
  }

  // 处理普通对象
  if (isPlainObject(data)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const newKey = camelToSnake(key);
      result[newKey] = toBackend(value);
    }
    return result as T;
  }

  return data as T;
}

/**
 * 批量转换数组
 */
export function toFrontendArray<T>(items: unknown[]): T[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map(item => toFrontend<T>(item));
}
