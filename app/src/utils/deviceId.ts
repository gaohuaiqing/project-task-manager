/**
 * 设备ID工具
 * 用于生成唯一的设备标识符
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * 获取或生成设备ID
 * @returns 设备ID
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // 生成新的设备ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
