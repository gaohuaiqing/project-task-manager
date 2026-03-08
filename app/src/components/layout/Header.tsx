import { useState, useEffect } from 'react';
import { Bell, Search, User, Check, Trash2, LogOut, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_CONFIG } from '@/types/auth';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { HmrTimeBadge } from '@/components/layout/HmrTimeBadge';

interface HeaderProps {
  title: string;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  sidebarCollapsed: boolean;
  onLogout?: () => void;
}

export function Header({
  title,
  notifications,
  onMarkAllRead,
  onClearNotifications,
  sidebarCollapsed,
  onLogout
}: HeaderProps) {
  // 根据 sidebarCollapsed 计算左侧位置和内边距
  const headerLeftClass = sidebarCollapsed ? 'left-16' : 'left-64';
  // 工具函数：获取当前时间
  const getCurrentTime = () => new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // 获取构建时间（用于非开发模式或首次渲染）
  const getBuildTime = () => {
    try {
      return (__BUILD_TIME__ as string) || getCurrentTime();
    } catch {
      return getCurrentTime();
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hmrTime, setHmrTime] = useState<string>(getCurrentTime()); // 默认值
  const [isHmr, setIsHmr] = useState(false);
  const { user } = useAuth();

  // 调试：在控制台输出当前状态
  console.log('[Header] 渲染状态:', { hmrTime, isHmr, title });

  // 初始化构建时间和热更新检测
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    console.log('🔍 [Header] 热更新调试信息:');
    console.log('  - import.meta.env.DEV:', isDev);
    console.log('  - import.meta.hot:', import.meta.hot);
    console.log('  - __BUILD_TIME__:', (__BUILD_TIME__ as string));

    if (isDev) {
      console.log('✅ 开发模式检测成功，设置 HMR 状态');
      setIsHmr(true);
      const now = getCurrentTime();
      setHmrTime(now);
      console.log('  - 设置初始 hmrTime:', now);

      if (import.meta.hot) {
        console.log('✅ import.meta.hot 存在，监听自定义 hmr-time 事件');

        // 监听自定义 HMR 时间事件
        const handleHmrTime = (data: { time: string; type: string }) => {
          console.log('🔥 [Header] 收到 HMR 时间事件:', data);
          setHmrTime(data.time);
        };

        import.meta.hot.on('hmr-time', handleHmrTime);

        // 同时监听 Vite 的更新事件作为备用
        const handleUpdate = () => {
          const newTime = getCurrentTime();
          console.log('🔥 [Header] vite:afterUpdate 触发，更新时间:', newTime);
          setHmrTime(newTime);
        };

        import.meta.hot.on('vite:afterUpdate', handleUpdate);

        return () => {
          import.meta.hot.off('hmr-time', handleHmrTime);
          import.meta.hot.off('vite:afterUpdate', handleUpdate);
        };
      } else {
        console.warn('⚠️ import.meta.hot 不存在，热更新监听器未注册');
      }
    } else {
      console.warn('⚠️ 非开发模式，HMR 功能未启用');
      setIsHmr(false);
      setHmrTime(getBuildTime());
    }
  }, []);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // 调试标签
  const label = isHmr ? '热更新' : '构建';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'warning':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-blue-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-amber-400';
      case 'tech_manager':
        return 'text-blue-400';
      case 'dept_manager':
        return 'text-purple-400';
      case 'engineer':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 ${headerLeftClass} right-0 h-16 bg-card border-b border-border flex items-center justify-between px-6 z-50 transition-all duration-300`}
      >
        {/* 左侧：热更新时间 */}
        <div className="flex-shrink-0 mr-5">
          <HmrTimeBadge time={hmrTime} isHmr={isHmr} />
        </div>

        {/* 中间：页面标题 - 已移除 */}
        <div className="flex-1" />

        {/* 右侧：通知、用户 */}
        <div className="flex items-center gap-4">

          {/* 主题切换器 */}
          <ThemeSwitcher />

          {/* 通知按钮 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 bg-card border-border"
            >
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="text-foreground">通知中心</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onMarkAllRead}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onClearNotifications}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer hover:bg-accent",
                        !notification.read && "bg-accent/50"
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm line-clamp-2",
                          !notification.read ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 用户菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 hover:bg-accent"
              >
                <div 
                  className="flex items-center gap-2 cursor-pointer min-w-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileOpen(true);
                  }}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20portrait%20of%20a%20tech%20person%2C%20minimalist%2C%20flat%20design%2C%20blue%20background&image_size=square`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">{user?.name || '用户'}</div>
                    <div className={cn("text-xs", getRoleColor(user?.role || ''))}>
                      {user ? ROLE_CONFIG[user.role].label : ''}
                    </div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <DropdownMenuLabel className="text-foreground">
                <div className="flex flex-col">
                  <div>{user?.name || '用户'}</div>
                  <div className={cn("text-xs font-normal mt-0.5", getRoleColor(user?.role || ''))}>
                    {user ? ROLE_CONFIG[user.role].label : ''}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-red-400 hover:text-red-300 hover:bg-accent cursor-pointer"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 个人资料弹窗 */}
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </>
  );
}
