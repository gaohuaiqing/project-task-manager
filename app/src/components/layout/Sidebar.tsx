import { useState, useEffect } from 'react';
import { broadcastService } from '@/services/BroadcastChannelService';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ChevronDown,
  UserCircle,
  CalendarDays,
  ListTodo,
  GitFork,
  Star,
  Shield,
  Building2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_CONFIG, canPerformUserManagement, canAccessDataScope, canAccessOrganization } from '@/types/auth';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  accessibleViews?: string[];
}

const navItems = [
  { id: 'dashboard', label: '任务看板', icon: LayoutDashboard },
  { id: 'task-management', label: '任务管理', icon: ClipboardList },
  { id: 'members', label: '组员信息', icon: Users },
  { id: 'projects', label: '项目管理', icon: FolderKanban },
  { id: 'task-assignment', label: '任务分配', icon: GitBranch },
];

// 设置子选项
const settingsSubItems = [
  { id: 'settings-profile', label: '个人信息', icon: UserCircle },
  { id: 'settings-holidays', label: '节假日设置', icon: CalendarDays },
  { id: 'settings-task-types', label: '任务类型设置', icon: ListTodo },
  { id: 'settings-permissions', label: '权限配置', icon: Shield },
  { id: 'settings-organization', label: '组织及人员设置', icon: Building2 },
  { id: 'settings-logs', label: '事件日志', icon: FileText },
];

export function Sidebar({ currentView, onViewChange, collapsed, onToggleCollapse, accessibleViews }: SidebarProps) {
  const { user, isAdmin } = useAuth();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // 初始化BroadcastChannel
  useEffect(() => {
    broadcastService.init();
  }, []);

  // 监听其他浏览器的设置菜单展开状态更新
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
  
  // 过滤可访问的菜单项
  const filteredNavItems = accessibleViews 
    ? navItems.filter(item => accessibleViews.includes(item.id))
    : navItems;

  // 检查当前是否在设置相关页面
  const isInSettings = currentView.startsWith('settings');

  // 处理设置按钮点击
  const handleSettingsClick = () => {
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
  };

  // 处理子选项点击
  const handleSubItemClick = (subId: string) => {
    onViewChange(subId);
  };

  // 过滤设置子选项（基于权限）
  const filteredSettingsSubItems = settingsSubItems.filter(item => {
    if (item.id === 'settings-profile') return true; // 个人信息对所有用户可见
    if (item.id === 'settings-holidays' || item.id === 'settings-task-types') {
      // 节假日设置和任务类型设置：工程师不可见
      return user?.role !== 'engineer';
    }
    if (item.id === 'settings-permissions') {
      // 权限配置：仅管理员可见
      return isAdmin;
    }
    if (item.id === 'settings-organization') {
      // 组织及人员设置：工程师不可见
      return canAccessOrganization(user);
    }
    if (item.id === 'settings-logs') {
      // 事件日志：仅管理员可见
      return isAdmin;
    }
    return false;
  });

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-semibold text-white text-sm">TechManage</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">T</span>
          </div>
        )}
      </div>



      {/* 导航菜单 */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
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
                  ? "bg-primary text-white" 
                  : "text-muted-foreground hover:bg-accent hover:text-white"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? "text-white" : "text-muted-foreground group-hover:text-white"
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
                ? "bg-primary text-white" 
                : "text-muted-foreground hover:bg-accent hover:text-white"
            )}
          >
            <Settings className={cn(
              "w-5 h-5 flex-shrink-0",
              isInSettings ? "text-white" : "text-muted-foreground group-hover:text-white"
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
            <div className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
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
                        ? "bg-slate-700 text-white" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <SubIcon className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isSubActive ? "text-white" : "text-slate-400"
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
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
