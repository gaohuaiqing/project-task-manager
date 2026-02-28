// 生成唯一设备ID
const generateDeviceId = (): string => {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 获取设备ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// 重置设备ID（用于测试或特殊情况）
const resetDeviceId = (): string => {
  const deviceId = generateDeviceId();
  localStorage.setItem('device_id', deviceId);
  return deviceId;
};

export { getDeviceId, resetDeviceId };
