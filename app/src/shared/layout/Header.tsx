import { useState, useEffect, useCallback } from 'react';
import { Bell, Moon, Sun, User, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { wsClient } from '@/lib/api/websocket';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { HmrTimeBadge, useHmrTime } from '../components/HmrTimeBadge';
import { cn } from '@/lib/utils';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type Notification as ApiNotification,
} from '@/lib/api/workflow.api';

/**
 * 通知类型（映射 API 类型到 UI 显示类型）
 */
type NotificationUIType = 'system' | 'task' | 'warning' | 'info';

/**
 * 通知项接口（UI 使用）
 */
interface Notification {
  id: string;
  type: NotificationUIType;
  title: string;
  description: string;
  content?: string;
  link?: string;
  timestamp: Date;
  isRead: boolean;
}

/**
 * 将 API 通知类型映射为 UI 类型
 */
function mapNotificationType(apiType: string): NotificationUIType {
  switch (apiType) {
    case 'approval':
    case 'approval_result':
    case 'approval_timeout':
      return 'warning';
    case 'delay':
    case 'delay_warning':
    case 'task_delayed':
      return 'warning';
    case 'daily_summary':
      return 'info';
    case 'system':
      return 'system';
    case 'new_device':
    case 'ip_change':
    case 'session_terminated':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * 将 API 通知转换为 UI 通知
 */
function mapApiNotification(api: ApiNotification): Notification {
  return {
    id: api.id,
    type: mapNotificationType(api.type),
    title: api.title,
    description: api.content.slice(0, 50) + (api.content.length > 50 ? '...' : ''),
    content: api.content,
    link: api.link ?? undefined,
    timestamp: new Date(api.createdAt),
    isRead: api.isRead,
  };
}

/**
 * 格式化时间为绝对时间字符串
 * 格式：YYYY-MM-DD HH:mm:ss
 */
function formatAbsoluteTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化时间为相对时间（用于列表显示）
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatAbsoluteTime(date);
}

/**
 * 获取通知图标和颜色
 */
function getNotificationStyle(type: NotificationUIType) {
  switch (type) {
    case 'task':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-amber-500' };
    case 'system':
      return { icon: Info, color: 'text-blue-500' };
    default:
      return { icon: Info, color: 'text-muted-foreground' };
  }
}

/**
 * 头部组件
 */
export function Header() {
  const { theme, setTheme, currentUser } = useAppContext();
  const navigate = useNavigate();
  const { lastUpdate, isHmr } = useHmrTime();

  // 通知状态
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 是否为开发环境
  const isDev = import.meta.env.DEV;

  // 加载通知数据
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const result = await getNotifications({ pageSize: 20 });
      setNotifications(result.items.map(mapApiNotification));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // 初始加载
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // WebSocket 实时通知订阅
  useEffect(() => {
    const unsubscribe = wsClient.subscribe('notification', (data: any) => {
      const newNotification = mapApiNotification({
        id: data.id ?? crypto.randomUUID(),
        type: data.type ?? 'system',
        title: data.title ?? '新通知',
        content: data.content ?? '',
        link: data.link ?? null,
        isRead: false,
        createdAt: new Date().toISOString(),
        userId: 0,
      });
      setNotifications((prev) => [newNotification, ...prev]);
    });

    // 确保 WebSocket 已连接
    if (wsClient.getStatus() === 'disconnected') {
      wsClient.connect();
    }

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleViewNotification = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    } else {
      setSelectedNotification(notification);
      setIsDetailOpen(true);
    }
  };

  const handleClearNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4">
      {/* 左侧：欢迎信息 */}
      <div className="flex items-center">
        <h1 className="text-lg font-semibold">
          欢迎回来，{currentUser?.displayName ?? '用户'}
        </h1>
      </div>

      {/* 右侧：工具栏 */}
      <div className="flex items-center gap-2">
        {/* 热更新时间徽章（仅开发环境） */}
        {isDev && lastUpdate && (
          <HmrTimeBadge lastUpdate={lastUpdate} isHmr={isHmr} variant="pill" />
        )}

        {/* 通知中心 */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="header-btn-notification" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" data-testid="header-popover-notification" className="w-80 p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold">通知</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" data-testid="header-btn-mark-all-read" onClick={handleMarkAllRead}>
                  全部已读
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm">加载中...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">暂无通知</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const { icon: Icon, color } = getNotificationStyle(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex gap-3 p-3 hover:bg-accent cursor-pointer relative group',
                          !notification.isRead && 'bg-accent/50'
                        )}
                        onClick={() => handleViewNotification(notification)}
                      >
                        <div className={cn('mt-0.5', color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <div className="p-4 pt-0 mt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={async () => {
                    try {
                      const result = await getNotifications({ pageSize: 100 });
                      setNotifications(result.items.map(mapApiNotification));
                    } catch (error) {
                      console.error('Failed to load all notifications:', error);
                    }
                  }}
                >
                  查看全部通知
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="icon"
          data-testid="header-btn-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="header-menu-user" className="rounded-full">
              {currentUser?.avatar ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                  <AvatarFallback>
                    {currentUser.displayName?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{currentUser?.displayName ?? '用户'}</span>
                <span className="text-xs text-muted-foreground">
                  {currentUser?.email ?? ''}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="header-menuitem-profile" onClick={() => navigate('/settings/profile')}>
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="header-menuitem-logout" onClick={handleLogout} className="text-destructive">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 通知详情对话框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedNotification && (() => {
                const { icon: Icon, color } = getNotificationStyle(selectedNotification.type);
                return <Icon className={cn('h-5 w-5', color)} />;
              })()}
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedNotification && formatAbsoluteTime(selectedNotification.timestamp)}
            </p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {selectedNotification?.content || selectedNotification?.description}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export default Header;
