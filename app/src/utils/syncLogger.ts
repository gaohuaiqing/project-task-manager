// 同步日志接口
interface SyncLogEntry {
  timestamp: number;
  type: 'login' | 'logout' | 'sync' | 'data_change' | 'consistency_check' | 'consistency_fix' | 'error';
  message: string;
  details?: any;
  syncStatus?: {
    lastSync: number;
    pendingChanges: number;
    deviceId: string;
    version: number;
  };
  dataChanges?: {
    projects?: number;
    members?: number;
    wbsTasks?: number;
  };
}

// 存储键
const SYNC_LOG_KEY = 'sync_log';
const MAX_LOG_ENTRIES = 1000;

// 保存日志条目
const saveLogEntry = (entry: SyncLogEntry): void => {
  try {
    const logs = getSyncLogs();
    logs.push(entry);
    
    // 限制日志条目数量
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
    
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('[SyncLogger] Failed to save log entry:', error);
  }
};

// 获取所有同步日志
const getSyncLogs = (): SyncLogEntry[] => {
  try {
    const logs = localStorage.getItem(SYNC_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('[SyncLogger] Failed to get sync logs:', error);
    return [];
  }
};

// 清除同步日志
const clearSyncLogs = (): void => {
  try {
    localStorage.removeItem(SYNC_LOG_KEY);
  } catch (error) {
    console.error('[SyncLogger] Failed to clear sync logs:', error);
  }
};

// 记录登录同步
const logLoginSync = (success: boolean, username?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'login',
    message: success ? `User ${username} logged in successfully` : `Login failed for ${username}`,
    details: { username, success }
  });
};

// 记录登出同步
const logLogoutSync = (username?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'logout',
    message: `User ${username} logged out`,
    details: { username }
  });
};

// 记录用户注册同步
const logRegisterSync = (employeeId: string, name: string, success: boolean, error?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'data_change',
    message: success ? `User ${name} (${employeeId}) registered successfully` : `Failed to register user ${name} (${employeeId})`,
    details: { employeeId, name, success, error }
  });
};

// 记录用户更新同步
const logUpdateSync = (employeeId: string, updates: any, success: boolean, error?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'data_change',
    message: success ? `User ${employeeId} updated successfully` : `Failed to update user ${employeeId}`,
    details: { employeeId, updates, success, error }
  });
};

// 记录用户删除同步
const logDeleteSync = (employeeId: string, name: string, success: boolean, error?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'data_change',
    message: success ? `User ${name} (${employeeId}) deleted successfully` : `Failed to delete user ${name} (${employeeId})`,
    details: { employeeId, name, success, error }
  });
};

// 记录手动同步
const logManualSync = (success: boolean, syncedCount: number, error?: string): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'sync',
    message: success ? `Manual sync completed successfully (${syncedCount} items)` : `Manual sync failed`,
    details: { success, syncedCount, error }
  });
};

// 记录数据一致性检查
const logConsistencyCheck = (isConsistent: boolean, details?: any): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'consistency_check',
    message: isConsistent ? 'Data consistency check passed' : 'Data consistency check failed',
    details
  });
};

// 记录数据一致性修复
const logConsistencyFix = (success: boolean, details?: any): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'consistency_fix',
    message: success ? 'Data consistency fixed successfully' : 'Failed to fix data consistency',
    details
  });
};

// 记录同步错误
const logSyncError = (message: string, error: any): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'error',
    message: `Sync error: ${message}`,
    details: { error: error.message || error }
  });
};

// 记录数据变更
const logDataChange = (changes: {
  projects?: number;
  members?: number;
  wbsTasks?: number;
}): void => {
  saveLogEntry({
    timestamp: Date.now(),
    type: 'data_change',
    message: 'Data changed',
    dataChanges: changes
  });
};

// 设置同步状态
let isSyncing = false;

const setSyncing = (syncing: boolean): void => {
  isSyncing = syncing;
};

const getSyncing = (): boolean => {
  return isSyncing;
};

export {
  saveLogEntry,
  getSyncLogs,
  clearSyncLogs,
  logLoginSync,
  logLogoutSync,
  logRegisterSync,
  logUpdateSync,
  logDeleteSync,
  logManualSync,
  logConsistencyCheck,
  logConsistencyFix,
  logSyncError,
  logDataChange,
  setSyncing,
  getSyncing,
};
