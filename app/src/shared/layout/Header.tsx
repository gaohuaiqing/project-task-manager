import { useState, useCallback, useMemo, useEffect } from 'react';
import { Bell, Moon, Sun, User, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/api/websocket';
import { toast } from 'sonner';
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
import { tryGetTask } from '@/lib/api/task.api';
import { NotificationAccessDialog, type NotificationAccessError } from '@/shared/components/NotificationAccessDialog';

/**
 * 通知类型（映射 API 类型到 UI 显示类型）
 */
type NotificationUIType = 'system' | 'task' | 'task_completed' | 'warning' | 'security' | 'info';

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
  // 扩展字段（用于按项目/任务过滤等高级功能）
  projectId?: string | null;
  taskId?: string | null;
  readAt?: Date | null;
}

/** 通知数据查询键 */
const NOTIFICATION_QUERY_KEY = ['notifications', 'list'] as const;

/** 通知缓存时间：2 分钟 */
const NOTIFICATION_STALE_TIME = 2 * 60 * 1000;

/**
 * 将 API 通知类型映射为 UI 类型
 */
function mapNotificationType(apiType: string): NotificationUIType {
  switch (apiType) {
    case 'approval':
    case 'approval_result':
    case 'approval_timeout':
      return 'warning';
    case 'delay_warning':
    case 'task_delayed':
      return 'warning';
    case 'task_assigned':
      return 'task';
    case 'task_completed':
      return 'task_completed';
    case 'project_updated':
    case 'mention':
      return 'info';
    case 'daily_summary':
      return 'info';
    case 'system':
      return 'system';
    case 'new_device':
    case 'ip_change':
    case 'session_terminated':
      return 'security';
    default:
      return 'info';
  }
}

/**
 * 将 API 通知转换为 UI 通知
 */
function mapApiNotification(api: ApiNotification): Notification {
  const MAX_DESC_LENGTH = 80;
  const description = api.content.length > MAX_DESC_LENGTH
    ? api.content.slice(0, MAX_DESC_LENGTH) + '...'
    : api.content;

  return {
    id: api.id,
    type: mapNotificationType(api.type),
    title: api.title,
    description,
    content: api.content,
    link: api.link ?? undefined,
    timestamp: new Date(api.createdAt),
    isRead: api.isRead,
    projectId: api.projectId,
    taskId: api.taskId,
    readAt: api.readAt ? new Date(api.readAt) : null,
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
 * 跨年显示年份，否则只显示月日
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

  // 跨年显示完整日期，否则显示月日时分
  if (date.getFullYear() !== now.getFullYear()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取通知图标和颜色
 */
function getNotificationStyle(type: NotificationUIType) {
  switch (type) {
    case 'task':
      return { icon: CheckCircle, color: 'text-blue-500' };
    case 'task_completed':
      return { icon: CheckCircle, color: 'text-green-500' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-amber-500' };
    case 'security':
      return { icon: AlertTriangle, color: 'text-red-500' };
    case 'system':
      return { icon: Info, color: 'text-blue-500' };
    default:
      return { icon: Info, color: 'text-muted-foreground' };
  }
}

/**
 * 头部组件
 * 通知数据使用 React Query 管理，避免路由切换时重复请求
 */
export function Header() {
  const { theme, setTheme, currentUser } = useAppContext();
  const navigate = useNavigate();
  const { lastUpdate, isHmr } = useHmrTime();
  const queryClient = useQueryClient();

  // 对话框状态
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [accessError, setAccessError] = useState<NotificationAccessError | null>(null);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);

  /** 是否已加载全部消息（含已读） */
  const [hasLoadedAll, setHasLoadedAll] = useState(false);

  // 是否为开发环境
  const isDev = import.meta.env.DEV;

  // 使用 React Query 管理通知数据，避免路由切换时重复请求
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEY, hasLoadedAll], // 添加 hasLoadedAll 到 queryKey
    queryFn: async () => {
      if (!currentUser) return [];
      // 根据 hasLoadedAll 决定是否只加载未读
      const result = await getNotifications({
        unreadOnly: !hasLoadedAll,
        pageSize: hasLoadedAll ? 50 : 20
      });
      return result.items.map(mapApiNotification);
    },
    staleTime: NOTIFICATION_STALE_TIME,
    enabled: !!currentUser,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // WebSocket 实时通知订阅（仅注册一次，通过 queryClient 更新缓存）
  const handleWsNotification = useCallback((data: unknown) => {
    // 验证消息数据结构有效性
    if (!data || typeof data !== 'object') return;
    const msg = data as Record<string, unknown>;
    if (!msg.type || typeof msg.type !== 'string') return;
    if (!msg.title && !msg.content) return;

    // 转换后端蛇形命名为前端驼峰命名
    const newNotification = mapApiNotification({
      id: (msg.id as string) ?? crypto.randomUUID(),
      userId: (msg.user_id as number) ?? (msg.userId as number) ?? 0,
      projectId: (msg.project_id as string | null) ?? (msg.projectId as string | null) ?? null,
      taskId: (msg.task_id as string | null) ?? (msg.taskId as string | null) ?? null,
      type: msg.type as string,
      title: (msg.title as string) ?? '新通知',
      content: (msg.content as string) ?? '',
      link: (msg.link as string | null) ?? null,
      isRead: (msg.is_read as boolean) ?? (msg.isRead as boolean) ?? false,
      readAt: (msg.read_at as string | null) ?? (msg.readAt as string | null) ?? null,
      createdAt: (msg.created_at as string) ?? (msg.createdAt as string) ?? new Date().toISOString(),
    });

    // 已加载全部模式：所有通知都添加；否则只添加未读
    if (!hasLoadedAll && newNotification.isRead) return;

    // 直接更新 React Query 缓存，无需触发重新获取
    queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], (old) => {
      return old ? [newNotification, ...old] : [newNotification];
    });
  }, [queryClient, hasLoadedAll]);

  // 性能优化：WebSocket订阅使用useEffect，确保组件卸载时正确清理
  useEffect(() => {
    const unsubscribe = wsClient.subscribe('notification', handleWsNotification);
    if (wsClient.getStatus() === 'disconnected') {
      wsClient.connect();
    }
    // cleanup: 组件卸载或handleWsNotification变化时取消订阅
    return unsubscribe;
  }, [handleWsNotification]);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleMarkAllRead = useCallback(async () => {
    // 保存旧数据用于回滚（使用完整的 queryKey）
    const previousData = queryClient.getQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll]);

    if (hasLoadedAll) {
      // 已加载全部：标记全部已读后更新 isRead 状态
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], (old) =>
        old ? old.map((n) => ({ ...n, isRead: true })) : old
      );
    } else {
      // 只显示未读：标记全部已读后清空列表
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], []);
    }

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // 回滚到之前状态
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], previousData);
      toast.error('标记全部已读失败，请重试');
    }
  }, [queryClient, hasLoadedAll]);

  const handleMarkRead = useCallback(async (id: string) => {
    // 保存旧数据用于回滚（使用完整的 queryKey）
    const previousData = queryClient.getQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll]);

    if (hasLoadedAll) {
      // 已加载全部：标记已读后更新 isRead 状态，不移除
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], (old) =>
        old ? old.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : old
      );
    } else {
      // 只显示未读：标记已读后从列表移除
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], (old) =>
        old ? old.filter((n) => n.id !== id) : old
      );
    }

    try {
      await markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      // 回滚到之前状态
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], previousData);
    }
  }, [queryClient, hasLoadedAll]);

  const handleViewNotification = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }

    // 审批类型通知直接跳转审批页面，无需检查任务权限
    if (notification.type === 'warning' && notification.link?.startsWith('/settings/approvals')) {
      navigate(notification.link);
      return;
    }

    if (notification.link) {
      // 解析 link 获取任务 ID（格式：/tasks/:id）
      const taskIdMatch = notification.link.match(/\/tasks\/([^/?]+)/);
      const taskId = taskIdMatch?.[1];

      if (taskId) {
        // 先尝试获取任务，检查权限
        const result = await tryGetTask(taskId);
        if (!result.success && result.error) {
          // 显示错误对话框
          setAccessError({ code: result.error.code, message: result.error.message, taskTitle: notification.title });
          setAccessDialogOpen(true);
          return;
        }
      }
      navigate(notification.link);
    } else {
      setSelectedNotification(notification);
      setIsDetailOpen(true);
    }
  }, [handleMarkRead, navigate]);

  const handleClearNotification = useCallback(async (id: string) => {
    // 保存旧数据用于回滚（使用完整的 queryKey）
    const previousData = queryClient.getQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll]);

    // 乐观更新缓存
    queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], (old) =>
      old ? old.filter((n) => n.id !== id) : old
    );

    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // 回滚到之前状态
      queryClient.setQueryData<Notification[]>([...NOTIFICATION_QUERY_KEY, hasLoadedAll], previousData);
      toast.error('删除通知失败，请重试');
    }
  }, [queryClient, hasLoadedAll]);

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
        <Popover
          open={isPopoverOpen}
          onOpenChange={(open) => {
            setIsPopoverOpen(open);
            if (!open) {
              // 关闭时重置为只显示未读模式
              setHasLoadedAll(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid="header-btn-notification"
              className="relative"
              aria-label={`通知${unreadCount > 0 ? `，${unreadCount}条未读` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  role="status"
                  aria-live="polite"
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" data-testid="header-popover-notification" className="w-80 p-0">
            <div className="flex items-center justify-between gap-4 p-4 border-b">
              <h4 className="font-semibold shrink-0">通知</h4>
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
                          notification.isRead && 'opacity-60', // 已读消息整体灰化
                          !notification.isRead && 'bg-accent/50' // 未读消息背景高亮
                        )}
                        onClick={() => handleViewNotification(notification)}
                      >
                        <div className={cn('mt-0.5', color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            notification.isRead && 'text-muted-foreground' // 已读标题灰化
                          )}>
                            {notification.title}
                          </p>
                          <p className={cn(
                            'text-xs text-muted-foreground truncate',
                            notification.isRead && 'opacity-70' // 已读描述更淡
                          )}>
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
              <div className="p-4 pt-0 mt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {hasLoadedAll
                      ? `未读 ${unreadCount} 条 / 共 ${notifications.length} 条`
                      : `未读 ${notifications.length} 条`
                    }
                  </span>
                  {!hasLoadedAll && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setHasLoadedAll(true);
                      }}
                    >
                      查看更多
                    </Button>
                  )}
                </div>
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

      {/* 通知访问错误对话框 */}
      <NotificationAccessDialog
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
        error={accessError}
      />
    </header>
  );
}

export default Header;
