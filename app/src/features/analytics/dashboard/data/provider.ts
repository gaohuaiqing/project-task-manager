/**
 * 仪表板数据提供者接口
 *
 * @module analytics/dashboard/data/provider
 * @description 定义仪表板数据获取的统一接口，Mock 和 API 实现都需要遵循此接口
 */

import type {
  AdminDashboardData,
  DeptManagerDashboardData,
  TechManagerDashboardData,
  EngineerDashboardData,
} from '../types';

/**
 * 仪表板数据提供者接口
 * Mock 和 API 实现都需要遵循此接口
 */
export interface DashboardDataProvider {
  /**
   * 获取 Admin 仪表板数据
   * @param projectId 可选的项目ID筛选
   */
  getAdminDashboardData(projectId?: string): Promise<AdminDashboardData>;

  /**
   * 获取部门经理仪表板数据
   * @param projectId 可选的项目ID筛选
   */
  getDeptManagerDashboardData(projectId?: string): Promise<DeptManagerDashboardData>;

  /**
   * 获取技术经理仪表板数据
   * @param projectId 可选的项目ID筛选
   * @param groupId 可选的技术组ID筛选
   */
  getTechManagerDashboardData(projectId?: string, groupId?: number): Promise<TechManagerDashboardData>;

  /**
   * 获取工程师仪表板数据
   * @param projectId 可选的项目ID筛选
   */
  getEngineerDashboardData(projectId?: string): Promise<EngineerDashboardData>;
}
