/**
 * IP 地址格式化工具
 * 将原始 IP 地址转换为用户友好的显示格式
 */

/**
 * 格式化 IP 地址为用户友好的显示格式
 *
 * @param ip - 原始 IP 地址
 * @returns 格式化后的 IP 地址显示文本
 *
 * @example
 * formatIPAddress('::1') // '本地访问'
 * formatIPAddress('127.0.0.1') // '本地访问'
 * formatIPAddress('192.168.1.100') // '192.168.1.100'
 * formatIPAddress('::ffff:192.168.1.100') // '192.168.1.100'
 */
export function formatIPAddress(ip: string | null | undefined): string {
  if (!ip) {
    return '未知';
  }

  // IPv6 localhost
  if (ip === '::1') {
    return '本地访问';
  }

  // IPv4 localhost
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return '本地访问';
  }

  // IPv6 映射的 IPv4 地址 (::ffff:192.168.1.100)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  // IPv4 地址 - 直接返回
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return ip;
  }

  // 其他 IPv6 地址 - 缩短显示
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:...:${parts[parts.length - 1]}`;
    }
  }

  return ip;
}

/**
 * 判断是否为本地 IP
 */
export function isLocalIP(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return ip === '::1' || ip === '127.0.0.1' || ip === 'localhost';
}
