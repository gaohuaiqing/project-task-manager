/**
 * 设置导航 Hook
 *
 * 功能：
 * 1. 管理设置页面导航状态
 * 2. 提供当前选中区域判断
 * 3. 支持路由参数解析
 *
 * @module hooks/useSettingsNavigation
 */

import { useMemo } from 'react';

export type SettingsSection =
  | 'profile'
  | 'holidays'
  | 'task-types'
  | 'project-types'
  | 'permissions'
  | 'organization'
  | 'logs';

/**
 * 路由到设置区域的映射
 */
const ROUTE_SECTION_MAP: Record<string, SettingsSection> = {
  'settings-profile': 'profile',
  'settings-holidays': 'holidays',
  'settings-task-types': 'task-types',
  'settings-project-types': 'project-types',
  'settings-permissions': 'permissions',
  'settings-organization': 'organization',
  'settings-logs': 'logs',
};

/**
 * 区域标题配置
 */
export const SECTION_TITLES: Record<SettingsSection, { title: string; icon: string }> = {
  profile: { title: '个人信息', icon: 'user' },
  holidays: { title: '节假日管理', icon: 'calendar' },
  'task-types': { title: '任务类型设置', icon: 'list-todo' },
  'project-types': { title: '项目类型管理', icon: 'folder' },
  permissions: { title: '权限配置', icon: 'shield' },
  organization: { title: '组织架构设置', icon: 'users' },
  logs: { title: '事件日志', icon: 'file-text' },
};

export interface UseSettingsNavigationOptions {
  /** 初始区域（路由参数） */
  initialSection?: string;
}

export interface UseSettingsNavigationReturn {
  /** 当前区域 */
  currentSection: SettingsSection;
  /** 区域标题 */
  sectionTitle: string;
  /** 区域图标 */
  sectionIcon: string;
  /** 是否是当前区域 */
  isCurrentSection: (section: SettingsSection) => boolean;
}

/**
 * 设置导航 Hook
 *
 * @example
 * ```tsx
 * const navigation = useSettingsNavigation({ initialSection: 'settings-profile' });
 *
 * console.log(navigation.currentSection); // 'profile'
 * console.log(navigation.sectionTitle); // '个人信息'
 * ```
 */
export function useSettingsNavigation(
  options: UseSettingsNavigationOptions = {}
): UseSettingsNavigationReturn {
  const { initialSection = 'settings' } = options;

  /**
   * 解析当前区域
   */
  const currentSection = useMemo<SettingsSection>(() => {
    return ROUTE_SECTION_MAP[initialSection] || 'profile';
  }, [initialSection]);

  /**
   * 获取区域标题
   */
  const sectionTitle = useMemo(() => {
    return SECTION_TITLES[currentSection]?.title || '设置';
  }, [currentSection]);

  /**
   * 获取区域图标
   */
  const sectionIcon = useMemo(() => {
    return SECTION_TITLES[currentSection]?.icon || 'settings';
  }, [currentSection]);

  /**
   * 检查是否是当前区域
   */
  const isCurrentSection = (section: SettingsSection): boolean => {
    return currentSection === section;
  };

  return {
    currentSection,
    sectionTitle,
    sectionIcon,
    isCurrentSection,
  };
}

export default useSettingsNavigation;
