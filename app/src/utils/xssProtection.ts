/**
 * XSS防护工具
 * 使用DOMPurify清理用户输入，防止XSS攻击
 */

import DOMPurify from 'dompurify';

/**
 * DOMPurify配置选项
 */
const SANITIZE_CONFIG = {
  // 允许的HTML标签（根据需求调整）
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
  // 允许的HTML属性
  ALLOWED_ATTR: ['href', 'title', 'class', 'target'],
  // 是否允许注释
  ALLOW_COMMENTS: false,
};

/**
 * 清理用户输入的HTML内容
 * @param dirty 可能包含恶意代码的HTML字符串
 * @param customConfig 自定义DOMPurify配置（可选）
 * @returns 清理后的安全HTML字符串
 *
 * @example
 * ```tsx
 * // 基础使用
 * const cleanHtml = sanitizeHtml(userInput);
 *
 * // 在组件中使用
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }} />
 *
 * // 允许更多标签
 * const cleanHtml = sanitizeHtml(richText, { ALLOWED_TAGS: ['p', 'br', 'strong', 'img'] });
 * ```
 */
export function sanitizeHtml(dirty: string | undefined | null, customConfig?: DOMPurify.Config): string {
  if (dirty === undefined || dirty === null) {
    return '';
  }

  if (typeof dirty !== 'string') {
    console.warn('[sanitizeHtml] 输入不是字符串，已转换为空字符串');
    return '';
  }

  const config = {
    ...SANITIZE_CONFIG,
    ...customConfig,
  };

  return DOMPurify.sanitize(dirty, config);
}

/**
 * 清理纯文本（移除所有HTML标签）
 * @param dirty 可能包含HTML的文本
 * @returns 纯文本内容
 */
export function sanitizeText(dirty: string | undefined | null): string {
  if (dirty === undefined || dirty === null) {
    return '';
  }

  if (typeof dirty !== 'string') {
    console.warn('[sanitizeText] 输入不是字符串，已转换为空字符串');
    return '';
  }

  // 只允许文本内容，移除所有HTML标签
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * 清理URL属性（如href、src等）
 * @param url URL字符串
 * @returns 清理后的安全URL
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (url === undefined || url === null) {
    return '';
  }

  if (typeof url !== 'string') {
    return '';
  }

  // 基本URL验证
  try {
    const parsed = new URL(url);
    // 只允许http和https协议
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn('[sanitizeUrl] 不允许的协议:', parsed.protocol);
      return '';
    }
    return url;
  } catch {
    console.warn('[sanitizeUrl] 无效的URL:', url);
    return '';
  }
}

/**
 * React Hook包装函数，用于自动清理dangerouslySetInnerHTML
 * @param dirty 未清理的HTML
 * @returns 可以直接用于dangerouslySetInnerHTML的对象
 */
export function useSanitizedHtml(dirty: string | undefined | null) {
  return {
    __html: sanitizeHtml(dirty),
  };
}

// 默认导出
export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  useSanitizedHtml,
};
