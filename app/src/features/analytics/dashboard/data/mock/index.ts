/**
 * Mock 数据统一导出
 *
 * @module analytics/dashboard/data/mock/index
 */

import type { DashboardDataProvider } from '../provider';
import type {
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
} from '../../types';

import { getAdminDashboardData } from './admin.mock';
import { getDeptManagerDashboardData } from './deptManager.mock';
import { getTechManagerDashboardData } from './techManager.mock';
import { getEngineerDashboardData } from './engineer.mock';

// 导出各角色的数据生成函数
export {
  getAdminDashboardData,
  getDeptManagerDashboardData,
  getTechManagerDashboardData,
  getEngineerDashboardData,
};

// 导出通用数据生成函数
export { generateTaskTrends, generateTaskTypeDistribution } from './common.mock';

/**
 * 创建 Mock 数据提供者
 */
export function createMockProvider(): DashboardDataProvider {
  return {
    async getAdminDashboardData(projectId?: string): Promise<AdminDashboardData> {
      // Mock 数据忽略 projectId 筛选
      return getAdminDashboardData();
    },

    async getDeptManagerDashboardData(projectId?: string): Promise<DeptManagerDashboardData> {
      return getDeptManagerDashboardData();
    },

    async getTechManagerDashboardData(projectId?: string, groupId?: number): Promise<TechManagerDashboardData> {
      // Mock 数据可以根据 groupId 返回不同组的数据
      // 目前返回默认数据
      return getTechManagerDashboardData();
    },

    async getEngineerDashboardData(projectId?: string): Promise<EngineerDashboardData> {
      return getEngineerDashboardData();
    },
  };
}
