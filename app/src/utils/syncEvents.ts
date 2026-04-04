/**
 * 跨标签页同步事件工具
 * 用于在不同浏览器标签页之间同步用户状态变更
 */

/**
 * 发送用户注册事件
 */
export function emitUserRegistered(username: string, name: string, role: string): void {
  try {
    localStorage.setItem('sync:user_registered', JSON.stringify({
      type: 'user_registered',
      data: { username, name, role },
      timestamp: Date.now()
    }));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 发送用户更新事件
 */
export function emitUserUpdated(username: string, updates: Record<string, unknown>): void {
  try {
    localStorage.setItem('sync:user_updated', JSON.stringify({
      type: 'user_updated',
      data: { username, updates },
      timestamp: Date.now()
    }));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 发送用户删除事件
 */
export function emitUserDeleted(username: string): void {
  try {
    localStorage.setItem('sync:user_deleted', JSON.stringify({
      type: 'user_deleted',
      data: { username },
      timestamp: Date.now()
    }));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 初始化跨标签页同步
 * @returns 清理函数
 */
export function initCrossTabSync(): () => void {
  // 当前为空实现，未来可以添加事件监听
  return () => {
    // 清理逻辑
  };
}
