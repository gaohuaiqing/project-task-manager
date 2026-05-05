/**
 * 输入消毒工具函数
 * 防止存储型 XSS：剥离 HTML 标签和危险字符
 *
 * @module core/utils/sanitize
 */

import xss from 'xss';

/** 默认最大文本长度 */
const DEFAULT_MAX_LENGTH = 500;

/**
 * 剥离所有 HTML 标签，返回纯文本
 *
 * 原理：xss 库配置 ALLOWED_TAGS 为空数组，
 * 所有标签被移除，仅保留标签间的文本内容。
 *
 * @example
 * stripHtmlTags('<script>alert(1)</script>hello') // 'hello'
 * stripHtmlTags('<img onerror="alert(1)" src=x>test') // 'test'
 */
export function stripHtmlTags(input: string): string {
  return xss(input, {
    allowList: {},          // 禁止所有 HTML 标签
    stripIgnoreTag: true,   // 移除无法识别的标签
    stripIgnoreTagBody: ['script'], // 移除 <script> 标签体
  });
}

/**
 * 消毒字符串：剥离 HTML + 长度截断 + 前后空白清理
 *
 * @param input - 原始输入
 * @param maxLength - 最大长度，默认 500
 * @returns 消毒后的安全字符串
 *
 * @example
 * sanitizeString('<b>hello</b>', 100) // 'hello'
 * sanitizeString('  normal text  ', 100) // 'normal text'
 */
export function sanitizeString(input: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  // 1. 剥离 HTML 标签
  const stripped = stripHtmlTags(input);

  // 2. 清理前后空白
  const trimmed = stripped.trim();

  // 3. 长度截断
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  return trimmed;
}

/**
 * 批量消毒对象中的指定字段
 *
 * @param obj - 源对象
 * @param fields - 需要消毒的字段名列表
 * @param maxLength - 最大长度
 * @returns 消毒后的新对象（不可变，不修改原对象）
 *
 * @example
 * sanitizeFields({ name: '<b>test</b>', code: 'A1' }, ['name'])
 * // { name: 'test', code: 'A1' }
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  maxLength: number = DEFAULT_MAX_LENGTH,
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[field as string] = sanitizeString(value, maxLength);
    }
  }
  return result;
}
