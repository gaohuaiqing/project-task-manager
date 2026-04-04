import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '@/features/auth';

/**
 * 导航菜单项配置
 */
const ALL_NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表板', roles: ['admin', 'dept_manager', 'tech_manager', 'engineer'] },
  { path: '/projects', icon: FolderKanban, label: '项目管理', roles: ['admin', 'dept_manager', 'tech_manager', 'engineer'] },
  { path: '/tasks', icon: ListTodo, label: '任务管理', roles: ['admin', 'dept_manager', 'tech_manager', 'engineer'] },
  { path: '/assignment', icon: Users, label: '智能分配', roles: ['admin', 'dept_manager', 'tech_manager', 'engineer'] },
  { path: '/reports', icon: BarChart3, label: '报表分析', roles: ['admin', 'dept_manager', 'tech_manager'] },
  { path: '/settings', icon: Settings, label: '设置', roles: ['admin', 'dept_manager', 'tech_manager', 'engineer'] },
] as const;

/**
 * 侧边栏组件
 */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();
  const { user } = useAuth();

  // 根据用户角色过滤可见的导航项
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!user?.role) return false;
    return item.roles.includes(user.role as any);
  });

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo 区域 */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold">任务管理系统</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      // 基础样式
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      // 状态样式
                      isActive
                        ? 'bg-nav-active text-nav-active-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      // 折叠状态
                      sidebarCollapsed && 'justify-center'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </NavLink>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>

      {/* 底部区域 */}
      <div className="border-t p-2">
        {/* 可以添加用户信息、退出登录等 */}
      </div>
    </aside>
  );
}

export default Sidebar;
