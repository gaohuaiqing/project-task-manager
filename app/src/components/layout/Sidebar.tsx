/**
 * 侧边栏组件 - 优化版本
 *
 * 优化内容：
 * 1. 提取权限配置为常量对象
 * 2. 简化过滤逻辑
 * 3. 提取菜单配置为常量
 * 4. 优化组件性能
 *
 * @module components/layout/Sidebar
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { broadcastService } from '@/services/BroadcastChannelService';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessOrganization } from '@/types/auth';
import {
  MAIN_NAV_ITEMS,
  SETTINGS_SUB_ITEMS,
  checkSettingsPermission,
} from './Sidebar.constants';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  accessibleViews?: string[];
}

export function Sidebar({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  accessibleViews
}: SidebarProps) {
  const { user, isAdmin } = useAuth();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  /**
   * 初始化 BroadcastChannel
   */
  useEffect(() => {
    broadcastService.init();
  }, []);

  /**
   * 监听其他浏览器的设置菜单展开状态更新
   */
  useEffect(() => {
    const unsubscribe = broadcastService.onDataUpdate((data, dataType) => {
      if (dataType === 'sidebarSettingsExpanded' && typeof data.isExpanded === 'boolean') {
        setIsSettingsExpanded(data.isExpanded);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * 过滤可访问的菜单项
   */
  const filteredNavItems = useMemo(() => {
    return accessibleViews
      ? MAIN_NAV_ITEMS.filter(item => accessibleViews.includes(item.id))
      : MAIN_NAV_ITEMS;
  }, [accessibleViews]);

  /**
   * 过滤设置子选项（基于权限）
   */
  const filteredSettingsSubItems = useMemo(() => {
    return SETTINGS_SUB_ITEMS.filter(item => {
      if (item.id === 'settings-organization') {
        return canAccessOrganization(user);
      }
      return checkSettingsPermission(item.id, user, isAdmin);
    });
  }, [user, isAdmin]);

  /**
   * 检查当前是否在设置相关页面
   */
  const isInSettings = currentView.startsWith('settings');

  /**
   * 处理设置按钮点击
   */
  const handleSettingsClick = useCallback(() => {
    if (collapsed) {
      // 如果侧边栏折叠，直接跳转到设置页面
      onViewChange('settings');
    } else {
      // 展开/收起子选项
      const newExpandedState = !isSettingsExpanded;
      setIsSettingsExpanded(newExpandedState);
      // 广播状态更新
      broadcastService.broadcastDataUpdate('sidebarSettingsExpanded', {
        isExpanded: newExpandedState
      });
      if (!isInSettings) {
        onViewChange('settings');
      }
    }
  }, [collapsed, isSettingsExpanded, isInSettings, onViewChange]);

  /**
   * 处理子选项点击
   */
  const handleSubItemClick = useCallback((subId: string) => {
    onViewChange(subId);
  }, [onViewChange]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-semibold text-foreground text-sm">TechManage</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">T</span>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {/* 主导航项 */}
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
              )} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1 h-4 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}

        {/* 设置菜单（带子选项） */}
        <div className="mt-2">
          <button
            onClick={handleSettingsClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isInSettings
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className={cn(
              "w-5 h-5 flex-shrink-0",
              isInSettings ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
            )} />
            {!collapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left">设置</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isSettingsExpanded ? "rotate-180" : ""
                )} />
              </>
            )}
            {isInSettings && collapsed && (
              <div className="absolute right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* 设置子选项 */}
          {!collapsed && isSettingsExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-border space-y-1">
              {filteredSettingsSubItems.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = currentView === subItem.id;

                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubItemClick(subItem.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                      isSubActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <SubIcon className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isSubActive ? "text-secondary-foreground" : "text-muted-foreground"
                    )} />
                    <span className="font-medium">{subItem.label}</span>
                    {isSubActive && (
                      <div className="ml-auto w-1 h-3 bg-blue-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* 折叠按钮 */}
      <div className="p-2 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
