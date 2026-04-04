/**
 * 通知 Hook
 * 提供全局通知功能
 */

import { useCallback } from 'react';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
}

/**
 * 通知 Hook
 * @returns 通知方法
 */
export function useNotification() {
  const showSuccess = useCallback((message: string, options?: NotificationOptions) => {
    console.log('[Success]', message, options);
    // 简单实现，可接入 toast 组件
  }, []);

  const showError = useCallback((message: string, options?: NotificationOptions) => {
    console.error('[Error]', message, options);
  }, []);

  const showWarning = useCallback((message: string, options?: NotificationOptions) => {
    console.warn('[Warning]', message, options);
  }, []);

  const showInfo = useCallback((message: string, options?: NotificationOptions) => {
    console.info('[Info]', message, options);
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
