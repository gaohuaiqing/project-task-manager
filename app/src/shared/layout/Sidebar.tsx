import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
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

/**
 * 导航菜单项
 */
const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表板' },
  { path: '/projects', icon: FolderKanban, label: '项目管理' },
  { path: '/tasks', icon: ListTodo, label: '任务管理' },
  { path: '/assignment', icon: Users, label: '智能分配' },
  { path: '/settings', icon: Settings, label: '设置' },
];

/**
 * 侧边栏组件
 */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-sidebar transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo 区域 */}
      <div className="flex h-14 items-center justify-between border-b px-4">
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
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent',
                      isActive && 'bg-accent text-accent-foreground',
                      sidebarCollapsed && 'justify-center'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
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
