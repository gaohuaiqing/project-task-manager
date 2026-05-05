/**
 * 仪表板 Hooks 统一导出
 *
 * @module analytics/dashboard/hooks/index
 */

// 角色 Hooks（支持 Mock 数据切换）
export {
  useAdminDashboard,
  useDeptManagerDashboard,
  useTechManagerDashboard,
  useEngineerDashboard,
} from './useDashboardData';
