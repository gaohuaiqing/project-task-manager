/**
 * 仪表板数据层统一导出
 *
 * @module analytics/dashboard/data/index
 * @description 提供统一的数据获取接口，自动根据配置选择 Mock 或 API 数据源
 */

import { shouldUseMockData, DASHBOARD_CONFIG } from './config';
import type { DashboardDataProvider } from './provider';
import { createMockProvider } from './mock';
import { createApiProvider } from './api';

/**
 * 创建数据提供者
 * 根据配置自动选择 Mock 或 API
 * @param role 用户角色（可选，用于按角色配置数据源）
 */
export function createDataProvider(role?: string): DashboardDataProvider {
  if (shouldUseMockData(role)) {
    console.log('[Dashboard] Using mock data provider');
    return createMockProvider();
  }
  console.log('[Dashboard] Using API data provider');
  return createApiProvider();
}

// 导出配置供外部使用
export { DASHBOARD_CONFIG, shouldUseMockData };

// 导出类型
export type { DashboardDataProvider };

// 导出 Mock 数据生成函数（供测试使用）
export {
  getAdminDashboardData,
  getDeptManagerDashboardData,
  getTechManagerDashboardData,
  getEngineerDashboardData,
} from './mock';
