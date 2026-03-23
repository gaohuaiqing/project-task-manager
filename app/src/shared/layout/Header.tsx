import { useState } from 'react';
import { Bell, Moon, Sun, User, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { HmrTimeBadge, useHmrTime } from '../components/HmrTimeBadge';
import { cn } from '@/lib/utils';

/**
 * 通知类型
 */
type NotificationType = 'system' | 'task' | 'warning' | 'info';

/**
 * 通知项接口
 */
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

/**
 * 模拟通知数据
 */
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: '任务延期预警',
    description: '「前端开发」任务即将到期',
    time: '2分钟前',
    isRead: false,
  },
  {
    id: '2',
    type: 'task',
    title: '任务已完成',
    description: '「需求分析」已标记为完成',
    time: '1小时前',
    isRead: false,
  },
  {
    id: '3',
    type: 'system',
    title: '系统更新',
    description: '系统已升级至最新版本',
    time: '3小时前',
    isRead: true,
  },
];

/**
 * 获取通知图标和颜色
 */
function getNotificationStyle(type: NotificationType) {
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
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 是否为开发环境
  const isDev = import.meta.env.DEV;

  const handleLogout = () => {
    navigate('/login');
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleClearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold">通知</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                  全部已读
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
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
                        onClick={() => handleMarkRead(notification.id)}
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
                            {notification.time}
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
                <Button variant="outline" className="w-full" size="sm">
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
            <Button variant="ghost" size="icon" className="rounded-full">
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
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
