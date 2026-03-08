/**
 * 侧边栏常量配置
 *
 * @module components/layout/Sidebar.constants
 */

import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GitBranch,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  CalendarDays,
  ListTodo,
  Shield,
  Building2,
  FileText,
  Tags,
  Palette
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 导航项接口
 */
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * 主导航项配置
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '任务看板', icon: LayoutDashboard },
  { id: 'task-management', label: '任务管理', icon: ClipboardList },
  { id: 'members', label: '组员信息', icon: Users },
  { id: 'projects', label: '项目管理', icon: FolderKanban },
  { id: 'task-assignment', label: '任务分配', icon: GitBranch },
  { id: 'design-system', label: '设计系统演示', icon: Palette },
] as const;

/**
 * 设置子选项配置
 */
export const SETTINGS_SUB_ITEMS: NavItem[] = [
  { id: 'settings-profile', label: '个人信息', icon: UserCircle },
  { id: 'settings-holidays', label: '节假日设置', icon: CalendarDays },
  { id: 'settings-task-types', label: '任务类型设置', icon: ListTodo },
  { id: 'settings-permissions', label: '权限配置', icon: Shield },
  { id: 'settings-organization', label: '组织及人员设置', icon: Building2 },
  { id: 'settings-logs', label: '事件日志', icon: FileText },
] as const;

/**
 * 权限配置映射
 *
 * 键：设置项 ID
 * 值：权限检查函数
 */
export type PermissionChecker = (user: any, isAdmin: boolean) => boolean;

export const SETTINGS_PERMISSIONS: Record<string, PermissionChecker> = {
  'settings-profile': () => true, // 对所有用户可见
  'settings-holidays': (user) => user?.role !== 'engineer', // 工程师不可见
  'settings-task-types': (user) => user?.role !== 'engineer', // 工程师不可见
  'settings-permissions': (_user, isAdmin) => isAdmin, // 仅管理员可见
  'settings-organization': (user) => {
    // 组织及人员设置：工程师不可见
    import('@/types/auth').then(({ canAccessOrganization }) => {
      return canAccessOrganization(user);
    });
    return user?.role !== 'engineer';
  },
  'settings-logs': (_user, isAdmin) => isAdmin, // 仅管理员可见
} as const;

/**
 * 权限检查辅助函数
 */
export function checkSettingsPermission(
  itemId: string,
  user: any,
  isAdmin: boolean
): boolean {
  const checker = SETTINGS_PERMISSIONS[itemId];
  if (!checker) return false;
  return checker(user, isAdmin);
}
