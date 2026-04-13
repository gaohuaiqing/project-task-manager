/**
 * API 数据提供者
 *
 * @module analytics/dashboard/data/api
 * @description 真实 API 数据获取实现，对接后端时实现此模块
 */

import type { DashboardDataProvider } from '../provider';
import type {
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
} from '../../types';

// TODO: 对接后端时，从 analytics.api.ts 导入 API 函数
// import { analyticsApi } from '@/lib/api/analytics.api';

/**
 * 创建 API 数据提供者
 *
 * 当前为占位实现，对接后端时需要：
 * 1. 导入 analyticsApi
 * 2. 实现各数据获取方法
 * 3. 处理错误和数据转换
 */
export function createApiProvider(): DashboardDataProvider {
  return {
    async getAdminDashboardData(projectId?: string): Promise<AdminDashboardData> {
      // TODO: 实现真实 API 调用
      // return analyticsApi.getAdminDashboardDetail(projectId);
      throw new Error('API provider not implemented. Please implement this method when connecting to backend.');
    },

    async getDeptManagerDashboardData(projectId?: string): Promise<DeptManagerDashboardData> {
      // TODO: 实现真实 API 调用
      // return analyticsApi.getDeptManagerDashboardDetail(projectId);
      throw new Error('API provider not implemented. Please implement this method when connecting to backend.');
    },

    async getTechManagerDashboardData(projectId?: string, groupId?: number): Promise<TechManagerDashboardData> {
      // TODO: 实现真实 API 调用
      // return analyticsApi.getTechManagerDashboardDetail(projectId, groupId);
      throw new Error('API provider not implemented. Please implement this method when connecting to backend.');
    },

    async getEngineerDashboardData(projectId?: string): Promise<EngineerDashboardData> {
      // TODO: 实现真实 API 调用
      // return analyticsApi.getEngineerDashboardDetail(projectId);
      throw new Error('API provider not implemented. Please implement this method when connecting to backend.');
    },
  };
}
