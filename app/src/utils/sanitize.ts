/**
 * XSS 防护工具
 * 使用 DOMPurify 处理用户输入，防止 XSS 攻击
 */
import DOMPurify from 'dompurify';

/**
 * 允许的 HTML 标签（用于富文本输入）
 */
const ALLOWED_RICH_TEXT_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 's',
  'p', 'br', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'pre', 'code',
];

/**
 * 允许的 HTML 属性
 */
const ALLOWED_ATTRIBUTES = ['href', 'title', 'target', 'rel', 'class'];

/**
 * 净化纯文本（移除所有 HTML）
 * @param input 用户输入
 * @returns 纯文本
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  // 移除所有 HTML 标签，只保留文本
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * 净化富文本（允许安全的 HTML）
 * @param input 用户输入
 * @returns 安全的 HTML
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ALLOWED_RICH_TEXT_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    // 允许 data-* 属性
    ALLOW_DATA_ATTR: false,
    // 禁止不安全的协议
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // 移除不安全的属性
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  });
}

/**
 * 净化 URL（防止 javascript: 协议）
 * @param url URL 字符串
 * @returns 安全的 URL 或空字符串
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';

  const trimmed = url.trim();

  // 只允许安全的协议
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  const isSafe = safeProtocols.some(p => trimmed.toLowerCase().startsWith(p)) ||
    !trimmed.includes(':'); // 相对路径

  if (!isSafe) {
    console.warn('Blocked potentially unsafe URL:', url);
    return '';
  }

  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * 净化对象中的所有字符串字段
 * @param obj 输入对象
 * @param options 选项
 * @returns 净化后的对象
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    mode?: 'text' | 'html';
    excludeKeys?: string[];
  } = {}
): T {
  const { mode = 'text', excludeKeys = [] } = options;
  const sanitize = mode === 'html' ? sanitizeHtml : sanitizeText;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      result[key] = sanitize(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string' ? sanitize(item) : item
      );
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 转义 HTML 特殊字符（用于显示纯文本）
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

export default {
  sanitizeText,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeObject,
  escapeHtml,
};
