/**
 * 测试数据生成器
 *
 * 用于生成随机但合规的测试数据
 */

/**
 * 生成随机字符串
 */
export function randomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机数字
 */
export function randomNumber(min: number = 1000, max: number = 9999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成带时间戳的唯一标识符
 */
export function generateUniqueId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 生成项目编码
 */
export function generateProjectCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = randomNumber(100, 999);
  return `PRJ-${timestamp}-${random}`;
}

/**
 * 生成项目名称
 */
export function generateProjectName(suffix?: string): string {
  const base = 'E2E测试项目';
  const unique = generateUniqueId();
  return suffix ? `${base}_${suffix}_${unique}` : `${base}_${unique}`;
}

/**
 * 生成任务描述
 */
export function generateTaskDescription(suffix?: string): string {
  const base = 'E2E测试任务';
  const unique = generateUniqueId();
  return suffix ? `${base}_${suffix}_${unique}` : `${base}_${unique}`;
}

/**
 * 生成日期（相对于今天）
 */
export function generateDate(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * 生成日期范围
 */
export function generateDateRange(startDays: number = 0, durationDays: number = 7): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: generateDate(startDays),
    endDate: generateDate(startDays + durationDays)
  };
}

/**
 * 生成未来的日期
 */
export function generateFutureDate(days: number = 7): string {
  return generateDate(days);
}

/**
 * 生成过去的日期
 */
export function generatePastDate(days: number = 7): string {
  return generateDate(-days);
}

/**
 * 随机选择数组中的一个元素
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成随机布尔值
 */
export function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

/**
 * 生成随机描述文本
 */
export function generateDescription(prefix: string = '测试描述'): string {
  const timestamp = new Date().toISOString();
  return `${prefix} - 创建时间: ${timestamp}`;
}
