# 通知"查看更多"功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现通知列表"查看更多"功能，点击后加载全部消息（含已读），未读/已读视觉区分。

**Architecture:** 前端添加状态变量 `hasLoadedAll` 控制加载模式，默认只加载未读，点击"查看更多"后加载全部。已读消息文字灰化显示。

**Tech Stack:** React Query、React State、Tailwind CSS

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/shared/layout/Header.tsx` | 修改 | 添加状态、修改查询逻辑、修改交互行为 |

---

### Task 1: 添加状态变量和修改查询逻辑

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:43-68, 213-223`

- [ ] **Step 1: 添加 `hasLoadedAll` 状态变量**

在第 68 行附近（Notification 接口定义后），添加状态变量：

```typescript
/** 是否已加载全部消息（含已读） */
const [hasLoadedAll, setHasLoadedAll] = useState(false);
```

- [ ] **Step 2: 修改 React Query 查询参数**

修改第 214-223 行的 useQuery：

```typescript
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
```

- [ ] **Step 3: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功，无类型错误

---

### Task 2: 修改"查看更多"按钮逻辑

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:474-493`

- [ ] **Step 1: 修改"查看更多"按钮点击逻辑**

找到"查看更多"按钮（约第 474-493 行），修改点击处理：

```typescript
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
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 3: 修改已读消息的视觉样式

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:426-449`

- [ ] **Step 1: 修改通知列表项样式**

修改第 426-449 行的通知项样式，已读消息文字灰化：

```typescript
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
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 4: 修改标记已读的行为逻辑

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:293-309`

- [ ] **Step 1: 修改 handleMarkRead 函数**

当 `hasLoadedAll` 为 true 时，标记已读改为更新样式而非移除：

```typescript
const handleMarkRead = useCallback(async (id: string) => {
  // 保存旧数据用于回滚
  const previousData = queryClient.getQueryData<Notification[]>(NOTIFICATION_QUERY_KEY);

  if (hasLoadedAll) {
    // 已加载全部：标记已读后更新 isRead 状态，不移除
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, (old) =>
      old ? old.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : old
    );
  } else {
    // 只显示未读：标记已读后从列表移除
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, (old) =>
      old ? old.filter((n) => n.id !== id) : old
    );
  }

  try {
    await markNotificationAsRead(id);
  } catch (error) {
    console.error('Failed to mark as read:', error);
    // 回滚到之前状态
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, previousData);
  }
}, [queryClient, hasLoadedAll]);
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 5: 修改全部已读按钮行为

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:276-291`

- [ ] **Step 1: 修改 handleMarkAllRead 函数**

当 `hasLoadedAll` 为 true 时，全部已读改为更新样式而非清空：

```typescript
const handleMarkAllRead = useCallback(async () => {
  // 保存旧数据用于回滚
  const previousData = queryClient.getQueryData<Notification[]>(NOTIFICATION_QUERY_KEY);

  if (hasLoadedAll) {
    // 已加载全部：标记全部已读后更新 isRead 状态
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, (old) =>
      old ? old.map((n) => ({ ...n, isRead: true })) : old
    );
  } else {
    // 只显示未读：标记全部已读后清空列表
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, []);
  }

  try {
    await markAllNotificationsAsRead();
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    // 回滚到之前状态
    queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, previousData);
    toast.error('标记全部已读失败，请重试');
  }
}, [queryClient, hasLoadedAll]);
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 6: 修改 WebSocket 推送逻辑

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:230-260`

- [ ] **Step 1: 修改 handleWsNotification 函数**

当 `hasLoadedAll` 为 true 时，已读通知也可以添加到列表：

```typescript
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
  queryClient.setQueryData<Notification[]>(NOTIFICATION_QUERY_KEY, (old) => {
    return old ? [newNotification, ...old] : [newNotification];
  });
}, [queryClient, hasLoadedAll]);
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 7: 修改底部信息显示

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:467-495`

- [ ] **Step 1: 修改底部统计信息**

修改底部信息，区分未读和总数：

```typescript
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
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 8: 添加 Popover 关闭时重置状态

**Files:**
- Modify: `app/src/shared/layout/Header.tsx:380`

- [ ] **Step 1: 添加 Popover 关闭时重置 hasLoadedAll**

修改 Popover 的 onOpenChange 处理，关闭时重置状态：

```typescript
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
```

- [ ] **Step 2: 验证构建**

Run: `cd app && npm run build`
Expected: 构建成功

---

### Task 9: 提交更改

- [ ] **Step 1: 提交代码**

```bash
git add app/src/shared/layout/Header.tsx
git commit -m "feat(notification): 实现查看更多功能，支持加载全部消息并区分已读未读样式"
```

---

## 完整性检查

| 需求项 | 任务覆盖 |
|--------|----------|
| 点击"查看更多"加载全部消息（含已读） | Task 2 ✅ |
| 未读/已读视觉区分（已读文字灰化） | Task 3 ✅ |
| 点击未读消息标记已读后样式变化 | Task 4 ✅ |
| 全部已读按钮行为适配 | Task 5 ✅ |
| WebSocket 推送逻辑适配 | Task 6 ✅ |
| 底部信息显示优化 | Task 7 ✅ |
| Popover 关闭时重置状态 | Task 8 ✅ |