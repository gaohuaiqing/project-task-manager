/**
 * 设备指纹工具
 * 用于生成稳定的设备标识符，存储在 localStorage 中
 * 不受浏览器更新影响，清除 localStorage 会生成新指纹
 */

const DEVICE_FINGERPRINT_KEY = 'device_fingerprint';

/**
 * 获取或生成设备指纹
 * @returns 设备指纹字符串
 */
export function getDeviceFingerprint(): string {
  let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);

  if (!fingerprint) {
    fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  }

  return fingerprint;
}

/**
 * @deprecated 使用 getDeviceFingerprint() 代替
 * 保持向后兼容
 */
export const getDeviceId = getDeviceFingerprint;
