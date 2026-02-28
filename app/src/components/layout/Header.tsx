import { useState, useEffect } from 'react';
import { Bell, Search, User, Check, Trash2, LogOut, Shield, RefreshCw, Clock } from 'lucide-react';
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
import { dataSyncService } from '@/services/DataSyncService';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hmrTime, setHmrTime] = useState<string | null>(null);
  const [isHmr, setIsHmr] = useState(false);
  const { user } = useAuth();

  const getCurrentTime = () => new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // 初始化构建时间和热更新检测
  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsHmr(true);
      setHmrTime(getCurrentTime());

      if (import.meta.hot) {
        const handleUpdate = () => {
          setHmrTime(getCurrentTime());
        };

        import.meta.hot.on('vite:afterUpdate', handleUpdate);

        return () => {
          import.meta.hot.off('vite:afterUpdate', handleUpdate);
        };
      }
    }
  }, []);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // 手动触发同步
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await dataSyncService.triggerSync();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

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
        className={cn(
          "fixed top-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-6 z-40 transition-all duration-300",
          sidebarCollapsed ? "left-16" : "left-64"
        )}
      >
        {/* 左侧：编译时间 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-xs">
              {isHmr ? (
                <>
                  热更新完成: <span className="text-blue-400 font-medium">{hmrTime || new Date().toLocaleString('zh-CN')}</span>
                </>
              ) : (
                <>
                  完整构建完成: <span className="text-blue-400 font-medium">{__BUILD_TIME__}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 右侧：同步、通知、用户 */}
        <div className="flex items-center gap-4">

          {/* 同步按钮 */}
          <Button 
            variant="ghost" 
            size="icon"
            className="relative text-muted-foreground hover:text-white hover:bg-accent"
            onClick={handleSync}
            disabled={isSyncing}
            title="同步数据"
          >
            <RefreshCw className={cn(
              "w-5 h-5",
              isSyncing && "animate-spin"
            )} />
            {/* 同步状态提示 */}
            <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </Button>

          {/* 通知按钮 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative text-muted-foreground hover:text-white hover:bg-accent"
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
                <span className="text-white">通知中心</span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-white"
                    onClick={onMarkAllRead}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-white"
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
                          "text-sm truncate",
                          !notification.read ? "text-white font-medium" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileOpen(true);
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20portrait%20of%20a%20tech%20person%2C%20minimalist%2C%20flat%20design%2C%20blue%20background&image_size=square`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <div className="text-sm text-white font-medium">{user?.name || '用户'}</div>
                    <div className={cn("text-xs", getRoleColor(user?.role || ''))}>
                      {user ? ROLE_CONFIG[user.role].label : ''}
                    </div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <DropdownMenuLabel className="text-white">
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
