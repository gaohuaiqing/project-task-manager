/**
 * 仪表板 Hooks 统一导出
 *
 * @module analytics/dashboard/hooks/index
 */

// 原有 Hooks（保留向后兼容）
export {
  useAdminDashboardData,
  useDeptManagerDashboardData,
  useTechManagerDashboardData,
  useEngineerDashboardData,
  useDashboardData,
} from './useDashboardData';

// 新 Hooks（支持 Mock 数据切换）
export {
  useAdminDashboard,
  useDeptManagerDashboard,
  useTechManagerDashboard,
  useEngineerDashboard,
} from './useDashboardData';
