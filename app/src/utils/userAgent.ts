/**
 * User-Agent 解析工具
 * 用于从 User-Agent 字符串中提取设备信息
 *
 * 注意：此模块目前使用简化的正则匹配实现
 * 后续可替换为 ua-parser-js 库以获得更精确的解析
 */

export interface DeviceInfo {
  browser: string;
  os: string;
  display: string;
}

/**
 * 浏览器名称映射
 * 键为 User-Agent 中的标识符，值为显示名称
 */
const BROWSER_MAP: Record<string, string> = {
  'Edg/': 'Edge',
  'Edge/': 'Edge',
  'Chrome/': 'Chrome',
  'Firefox/': 'Firefox',
  'Safari/': 'Safari',
  'Opera/': 'Opera',
  'OPR/': 'Opera',
  'MSIE': 'IE',
  'Trident/': 'IE',
};

/**
 * 操作系统名称映射
 * 键为 User-Agent 中的标识符，值为显示名称
 */
const OS_MAP: Record<string, string> = {
  'Windows NT 10.0': 'Windows 10/11',
  'Windows NT 6.3': 'Windows 8.1',
  'Windows NT 6.2': 'Windows 8',
  'Windows NT 6.1': 'Windows 7',
  'Windows NT 6.0': 'Windows Vista',
  'Windows NT 5.1': 'Windows XP',
  'Windows': 'Windows',
  'Mac OS X': 'macOS',
  'Macintosh': 'macOS',
  'iPhone': 'iOS',
  'iPad': 'iOS',
  'Android': 'Android',
  'Linux': 'Linux',
  'Ubuntu': 'Ubuntu',
  'Fedora': 'Fedora',
};

/**
 * 解析 User-Agent 字符串提取浏览器信息
 * @param userAgent User-Agent 字符串
 * @returns 浏览器名称
 */
function parseBrowser(userAgent: string): string {
  for (const [key, value] of Object.entries(BROWSER_MAP)) {
    if (userAgent.includes(key)) {
      return value;
    }
  }
  return '未知浏览器';
}

/**
 * 解析 User-Agent 字符串提取操作系统信息
 * @param userAgent User-Agent 字符串
 * @returns 操作系统名称
 */
function parseOS(userAgent: string): string {
  // 按优先级顺序检查（更具体的匹配优先）
  const orderedKeys = Object.keys(OS_MAP);
  for (const key of orderedKeys) {
    if (userAgent.includes(key)) {
      return OS_MAP[key];
    }
  }
  return '未知系统';
}

/**
 * 解析 User-Agent 字符串
 * @param userAgent User-Agent 字符串
 * @returns 设备信息对象
 */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) {
    return { browser: '未知', os: '未知', display: '未知设备' };
  }

  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);

  return {
    browser,
    os,
    display: `${browser} / ${os}`,
  };
}

/**
 * 脱敏 IP 地址（隐藏最后一段）
 * @param ip IP 地址（可能是后端已脱敏的值）
 * @returns 脱敏后的 IP 地址
 */
export function maskIPAddress(ip: string | null | undefined): string {
  if (!ip) {
    return '未知';
  }

  // 后端已经处理过的本地 IP
  if (ip === '本地' || ip === '本机') {
    return ip;
  }

  // 后端已经脱敏过的地址（包含 *）
  if (ip.includes('*')) {
    return ip;
  }

  // IPv6 本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('::ffff:127.')) {
    return '本地';
  }

  // IPv4 本地地址
  if (ip === '127.0.0.1' || ip.startsWith('127.')) {
    return '本地';
  }

  // IPv4 地址
  const ipv4Match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.*`;
  }

  // IPv6 地址（简化显示）
  if (ip.includes(':')) {
    const parts = ip.split(':');
    // 处理 IPv6 映射的 IPv4 地址
    if (parts.length === 6 && parts[0] === '' && parts[1] === '' && parts[2] === 'ffff') {
      return `::ffff:${parts[5].split('.')[0]}.*`;
    }
    return parts.slice(0, 3).join(':') + ':*';
  }

  return ip;
}

/**
 * 格式化相对时间
 * @param timestamp Unix 时间戳（秒）
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) {
    return '未知';
  }

  const now = Date.now();
  const diff = now - timestamp * 1000;

  // 处理未来的时间
  if (diff < 0) {
    return '未来时间';
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  if (hours < 24) {
    return `${hours}小时前`;
  }
  if (days < 7) {
    return `${days}天前`;
  }

  // 超过7天显示具体日期
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN');
}
