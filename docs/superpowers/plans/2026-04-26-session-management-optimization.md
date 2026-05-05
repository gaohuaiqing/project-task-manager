# 会话管理功能优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化会话终止通知内容，并在个人资料页面新增登录设备管理功能

**Architecture:** 后端修改通知内容逻辑，前端在 Profile 页面新增安全设置区域，包含设备列表组件和终止操作弹窗

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, axios, ua-parser-js

---

## 文件结构

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `app/server/src/modules/auth/service.ts` | 修改 | 优化通知内容，传递新登录IP |
| `app/src/features/auth/api.ts` | 修改 | 新增会话管理API |
| `app/src/features/settings/pages/Profile.tsx` | 修改 | 新增安全设置区域 |
| `app/src/features/settings/components/SessionDeviceList.tsx` | 新增 | 设备列表组件 |
| `app/src/features/settings/components/TerminateConfirmDialog.tsx` | 新增 | 终止确认弹窗 |
| `app/src/utils/userAgent.ts` | 新增 | User-Agent 解析工具函数 |
| `app/package.json` | 修改 | 添加 ua-parser-js 依赖 |
| `Test/frontend/unit/SessionDeviceList.test.tsx` | 新增 | 设备列表组件测试 |

---

## Task 1: 后端优化通知内容

**Files:**
- Modify: `app/server/src/modules/auth/service.ts:45-70`

- [ ] **Step 1: 修改 login 方法，传递新登录IP给通知函数**

在 `login` 方法中，将新登录的 IP 地址传递给 `notifySessionTerminated`：

```typescript
// 第 58-60 行，修改为：
for (const session of sessionsToTerminate) {
  await this.notifySessionTerminated(user, session, 'max_sessions_exceeded', ip);
}
```

- [ ] **Step 2: 修改 notifySessionTerminated 方法签名和内容**

修改 `notifySessionTerminated` 方法（第 469-511 行）：

```typescript
/**
 * 发送会话终止通知
 * 当用户的其他设备会话被终止时发送通知
 */
private async notifySessionTerminated(
  user: User,
  session: Session,
  reason: string,
  newLoginIP?: string
): Promise<void> {
  try {
    // 仅在超过最大会话数场景发送通知
    if (reason !== 'max_sessions_exceeded') {
      return;
    }

    const notificationId = uuidv4();
    const title = '会话已终止';
    const content = `您在另一台设备登录（IP: ${newLoginIP || '未知'}），本设备的登录已失效`;

    await this.workflowRepo.createNotification({
      id: notificationId,
      user_id: user.id,
      type: 'session_terminated',
      title,
      content,
      link: '/settings/profile',
    });

    // WebSocket 推送
    sendToUser(user.id, 'notification', {
      id: notificationId,
      type: 'session_terminated',
      title,
      content,
      link: '/settings/profile',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    logger.info(`[Auth] 已发送会话终止通知给用户 ${user.id}`);
  } catch (error) {
    logger.error('[Auth] 发送会话终止通知失败: %s', error instanceof Error ? error.message : String(error));
  }
}
```

- [ ] **Step 3: 验证后端编译通过**

Run: `cd app/server && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交后端修改**

```bash
git add app/server/src/modules/auth/service.ts
git commit -m "refactor(auth): 优化会话终止通知内容，显示新登录设备IP"
```

---

## Task 2: 前端新增会话管理 API

**Files:**
- Modify: `app/src/features/auth/api.ts`

- [ ] **Step 1: 添加会话相关类型定义**

在 `app/src/features/auth/api.ts` 文件顶部添加类型定义：

```typescript
/**
 * 会话信息类型
 */
export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  isCurrent: boolean;
}
```

- [ ] **Step 2: 在 authApi 对象中添加会话管理 API**

在 `authApi` 对象末尾添加（第 64 行后）：

```typescript
  /**
   * 获取当前用户的所有会话
   */
  getSessions: async (): Promise<SessionInfo[]> => {
    const response = await apiClient.get<ApiResponse<SessionInfo[]>>('/auth/sessions');
    return response.data;
  },

  /**
   * 终止指定会话
   */
  terminateSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`/auth/sessions/${sessionId}`);
  },

  /**
   * 终止其他所有会话
   */
  terminateOtherSessions: async (): Promise<{ terminatedCount: number }> => {
    const response = await apiClient.post<ApiResponse<{ terminatedCount: number }>>('/auth/sessions/terminate-others');
    return response.data;
  },
```

- [ ] **Step 3: 验证前端类型检查通过**

Run: `cd app && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交 API 修改**

```bash
git add app/src/features/auth/api.ts
git commit -m "feat(auth): 新增会话管理 API（获取列表、终止会话）"
```

---

## Task 3: 新增 User-Agent 解析工具函数

**Files:**
- Create: `app/src/utils/userAgent.ts`

- [ ] **Step 1: 安装 ua-parser-js 依赖**

Run: `cd app && npm install ua-parser-js && npm install -D @types/ua-parser-js`

- [ ] **Step 2: 创建 User-Agent 解析工具函数**

创建文件 `app/src/utils/userAgent.ts`：

```typescript
/**
 * User-Agent 解析工具
 * 用于从 User-Agent 字符串中提取设备信息
 */
import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  browser: string;
  os: string;
  display: string;
}

/**
 * 解析 User-Agent 字符串
 * @param userAgent User-Agent 字符串
 * @returns 设备信息对象
 */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) {
    return { browser: '未知', os: '未知', display: '未知设备' };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name || '未知浏览器';
  const os = result.os.name || '未知系统';

  // 处理常见浏览器的简短名称
  const browserShort: Record<string, string> = {
    'Chrome': 'Chrome',
    'Firefox': 'Firefox',
    'Safari': 'Safari',
    'Edge': 'Edge',
    'Microsoft Edge': 'Edge',
    'Opera': 'Opera',
    'IE': 'IE',
  };

  // 处理常见操作系统的简短名称
  const osShort: Record<string, string> = {
    'Windows': 'Windows',
    'Mac OS': 'macOS',
    'Linux': 'Linux',
    'Android': 'Android',
    'iOS': 'iOS',
  };

  const displayBrowser = browserShort[browser] || browser;
  const displayOS = osShort[os] || os;

  return {
    browser: displayBrowser,
    os: displayOS,
    display: `${displayBrowser} / ${displayOS}`,
  };
}

/**
 * 脱敏 IP 地址（隐藏最后一段）
 * @param ip IP 地址
 * @returns 脱敏后的 IP 地址
 */
export function maskIPAddress(ip: string | null | undefined): string {
  if (!ip) {
    return '未知';
  }

  // IPv6 本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '本地';
  }

  // IPv4 地址
  const ipv4Match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.*`;
  }

  // IPv6 地址（简化显示）
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 3).join(':') + ':*';
  }

  return ip;
}

/**
 * 格式化相对时间
 * @param timestamp Unix 时间戳（秒）
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return '刚刚';
  }
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  if (hours < 24) {
    return `${hours}小时前`;
  }
  if (days < 7) {
    return `${days}天前`;
  }

  // 超过7天显示具体日期
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN');
}
```

- [ ] **Step 3: 验证前端编译通过**

Run: `cd app && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交工具函数**

```bash
git add app/src/utils/userAgent.ts app/package.json app/package-lock.json
git commit -m "feat(utils): 新增 User-Agent 解析和 IP 脱敏工具函数"
```

---

## Task 4: 新增终止确认弹窗组件

**Files:**
- Create: `app/src/features/settings/components/TerminateConfirmDialog.tsx`

- [ ] **Step 1: 创建终止确认弹窗组件**

创建文件 `app/src/features/settings/components/TerminateConfirmDialog.tsx`：

```typescript
/**
 * 终止会话确认弹窗
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TerminateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}

export function TerminateConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  loading = false,
}: TerminateConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? '处理中...' : '确认终止'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: 验证前端编译通过**

Run: `cd app && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交弹窗组件**

```bash
git add app/src/features/settings/components/TerminateConfirmDialog.tsx
git commit -m "feat(settings): 新增终止会话确认弹窗组件"
```

---

## Task 5: 新增设备列表组件

**Files:**
- Create: `app/src/features/settings/components/SessionDeviceList.tsx`

- [ ] **Step 1: 创建设备列表组件**

创建文件 `app/src/features/settings/components/SessionDeviceList.tsx`：

```typescript
/**
 * 登录设备列表组件
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { authApi, type SessionInfo } from '@/features/auth/api';
import { parseUserAgent, maskIPAddress, formatRelativeTime } from '@/utils/userAgent';
import { TerminateConfirmDialog } from './TerminateConfirmDialog';
import { toast } from 'sonner';

interface SessionDeviceListProps {
  sessions: SessionInfo[];
  currentSessionId: string | null;
  onRefresh: () => void;
}

export function SessionDeviceList({ sessions, currentSessionId, onRefresh }: SessionDeviceListProps) {
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [showTerminateAll, setShowTerminateAll] = useState(false);
  const [terminateAllCount, setTerminateAllCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 当前会话
  const currentSession = sessions.find(s => s.isCurrent);
  // 其他会话
  const otherSessions = sessions.filter(s => !s.isCurrent);

  // 终止单个设备
  const handleTerminate = async (sessionId: string) => {
    setLoading(true);
    try {
      await authApi.terminateSession(sessionId);
      toast.success('设备已终止');
      onRefresh();
    } catch (error) {
      toast.error('终止失败，请重试');
    } finally {
      setLoading(false);
      setTerminatingId(null);
    }
  };

  // 终止其他所有设备
  const handleTerminateAll = async () => {
    setLoading(true);
    try {
      const result = await authApi.terminateOtherSessions();
      toast.success(`已终止 ${result.terminatedCount} 个设备`);
      onRefresh();
    } catch (error) {
      toast.error('终止失败，请重试');
    } finally {
      setLoading(false);
      setShowTerminateAll(false);
    }
  };

  // 打开终止所有确认弹窗
  const openTerminateAllDialog = () => {
    setTerminateAllCount(otherSessions.length);
    setShowTerminateAll(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">登录设备</CardTitle>
        <CardDescription>
          管理您的登录设备，如发现可疑设备请立即终止
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无登录设备</div>
        ) : (
          <>
            {/* 当前设备 */}
            {currentSession && (
              <SessionItem
                session={currentSession}
                isCurrent
              />
            )}

            {/* 其他设备 */}
            {otherSessions.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                onTerminate={() => setTerminatingId(session.id)}
              />
            ))}

            {/* 终止其他所有设备按钮 */}
            {otherSessions.length > 1 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={openTerminateAllDialog}
                className="w-full"
              >
                终止其他所有设备 ({otherSessions.length})
              </Button>
            )}
          </>
        )}

        {/* 单个设备终止确认弹窗 */}
        <TerminateConfirmDialog
          open={terminatingId !== null}
          onOpenChange={(open) => !open && setTerminatingId(null)}
          onConfirm={() => terminatingId && handleTerminate(terminatingId)}
          title="终止设备登录"
          description="确定要终止该设备的登录吗？该设备将需要重新登录。"
          loading={loading}
        />

        {/* 终止所有设备确认弹窗 */}
        <TerminateConfirmDialog
          open={showTerminateAll}
          onOpenChange={setShowTerminateAll}
          onConfirm={handleTerminateAll}
          title="终止其他所有设备"
          description={`确定要终止其他所有设备的登录吗？将终止 ${terminateAllCount} 个设备。`}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 单个会话项组件
 */
function SessionItem({
  session,
  isCurrent = false,
  onTerminate,
}: {
  session: SessionInfo;
  isCurrent?: boolean;
  onTerminate?: () => void;
}) {
  const deviceInfo = parseUserAgent(session.userAgent);
  const maskedIP = maskIPAddress(session.ipAddress);
  const loginTime = formatRelativeTime(session.createdAt);
  const lastActive = formatRelativeTime(session.lastAccessed);

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {/* 当前设备标记 */}
          <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium text-sm">
            {isCurrent ? '当前设备' : '其他设备'}
          </span>
          <span className="text-sm text-muted-foreground">
            {deviceInfo.display}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>IP: {maskedIP}</div>
          <div>登录: {loginTime} · 最后活跃: {lastActive}</div>
        </div>
      </div>
      {/* 终止按钮（仅非当前设备显示） */}
      {!isCurrent && onTerminate && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onTerminate}
        >
          终止
        </Button>
      )}
    </div>
  );
}

/**
 * 加载骨架屏
 */
export function SessionDeviceListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 验证前端编译通过**

Run: `cd app && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交设备列表组件**

```bash
git add app/src/features/settings/components/SessionDeviceList.tsx
git commit -m "feat(settings): 新增登录设备列表组件"
```

---

## Task 6: 修改 Profile 页面，集成安全设置区域

**Files:**
- Modify: `app/src/features/settings/pages/Profile.tsx`

- [ ] **Step 1: 重构 Profile 页面布局**

将 `app/src/features/settings/pages/Profile.tsx` 替换为以下内容：

```typescript
/**
 * 个人资料设置页面
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi, type SessionInfo } from '@/features/auth/api';
import { getAvatarUrl } from '@/utils/avatar';
import { SessionDeviceList, SessionDeviceListSkeleton } from '../components/SessionDeviceList';

const genderLabel = (gender?: 'male' | 'female' | 'other' | null) => {
  switch (gender) {
    case 'male': return '男';
    case 'female': return '女';
    case 'other': return '其他';
    default: return '未设置';
  }
};

const roleLabel = (role?: string) => {
  switch (role) {
    case 'admin': return '管理员';
    case 'tech_manager': return '技术经理';
    case 'dept_manager': return '部门经理';
    default: return '工程师';
  }
};

export function ProfileSettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const data = await authApi.getSessions();
      setSessions(data);
      const current = data.find(s => s.isCurrent);
      setCurrentSessionId(current?.id || null);
    } catch (error) {
      console.error('加载会话列表失败:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="space-y-6">
      {/* 个人资料 Card */}
      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>查看您的个人信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 头像 */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20" data-testid="profile-avatar">
              <AvatarImage src={user?.avatar || getAvatarUrl(user?.realName || user?.username || '', user?.gender ?? null)} />
              <AvatarFallback className="text-2xl">
                {user?.realName?.charAt(0) || user?.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" data-testid="profile-btn-change-avatar">更换头像</Button>
              <p className="text-xs text-muted-foreground">
                支持 JPG, PNG 格式，最大 2MB
              </p>
            </div>
          </div>

          <Separator />

          {/* 基本信息 */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                用户名 <span className="text-xs text-muted-foreground font-normal">（系统唯一标识）</span>
              </Label>
              <Input
                id="username"
                value={user?.username}
                disabled
                className="bg-muted"
                data-testid="profile-input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                显示名称 <span className="text-xs text-muted-foreground font-normal">（对外展示的真实姓名）</span>
              </Label>
              <Input
                id="displayName"
                value={user?.realName || ''}
                disabled
                className="bg-muted"
                data-testid="profile-input-display-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                性别 <span className="text-xs text-muted-foreground font-normal">（匹配对应头像风格）</span>
              </Label>
              <Input
                id="gender"
                value={genderLabel(user?.gender)}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                邮箱地址 <span className="text-xs text-muted-foreground font-normal">（接收系统通知）</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
                data-testid="profile-input-email"
              />
            </div>

            <div className="space-y-2">
              <Label>
                角色 <span className="text-xs text-muted-foreground font-normal">（当前系统权限身份）</span>
              </Label>
              <Input
                value={roleLabel(user?.role)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全设置 Card */}
      <Card>
        <CardHeader>
          <CardTitle>安全设置</CardTitle>
          <CardDescription>管理您的账户安全</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 修改密码 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">修改密码</h4>
            <ChangePasswordForm />
          </div>

          <Separator />

          {/* 登录设备 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">登录设备</h4>
            {sessionsLoading ? (
              <SessionDeviceListSkeleton />
            ) : (
              <SessionDeviceList
                sessions={sessions}
                currentSessionId={currentSessionId}
                onRefresh={loadSessions}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 修改密码表单
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 8) {
      setError('密码长度至少为 8 位');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      setSuccess('密码修改成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '密码修改失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">当前密码</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="请输入当前密码"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">新密码</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认新密码</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
          />
        </div>
      </div>

      <Button variant="outline" onClick={handleSubmit} disabled={loading} data-testid="profile-btn-save">
        {loading ? '修改中...' : '修改密码'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 验证前端编译通过**

Run: `cd app && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: 提交 Profile 页面修改**

```bash
git add app/src/features/settings/pages/Profile.tsx
git commit -m "feat(settings): Profile页面新增安全设置区域（修改密码+登录设备）"
```

---

## Task 7: 编写前端单元测试

**Files:**
- Create: `Test/frontend/unit/SessionDeviceList.test.tsx`

- [ ] **Step 1: 创建设备列表组件测试文件**

创建文件 `Test/frontend/unit/SessionDeviceList.test.tsx`：

```typescript
/**
 * SessionDeviceList 组件测试
 *
 * 测试范围：
 * 1. 当前设备标记显示正确
 * 2. 其他设备显示终止按钮
 * 3. 终止单个设备流程
 * 4. 终止其他所有设备流程
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionDeviceList } from '../../../../app/src/features/settings/components/SessionDeviceList';
import type { SessionInfo } from '../../../../app/src/features/auth/api';

// Mock API
vi.mock('../../../../app/src/features/auth/api', () => ({
  authApi: {
    terminateSession: vi.fn(),
    terminateOtherSessions: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { authApi } from '../../../../app/src/features/auth/api';

// 测试数据
const mockSessions: SessionInfo[] = [
  {
    id: 'session-1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    lastAccessed: Math.floor(Date.now() / 1000) - 60,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7,
    isCurrent: true,
  },
  {
    id: 'session-2',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
    createdAt: Math.floor(Date.now() / 1000) - 86400,
    lastAccessed: Math.floor(Date.now() / 1000) - 7200,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 6,
    isCurrent: false,
  },
  {
    id: 'session-3',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    lastAccessed: Math.floor(Date.now() / 1000) - 86400,
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 5,
    isCurrent: false,
  },
];

describe('SessionDeviceList', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应显示当前设备标记', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('当前设备')).toBeInTheDocument();
    expect(screen.getByText(/Chrome \/ Windows/)).toBeInTheDocument();
  });

  it('应显示其他设备', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('其他设备')).toBeInTheDocument();
    // 有两个其他设备，所以有两个"其他设备"文本
    const otherDevices = screen.getAllByText('其他设备');
    expect(otherDevices).toHaveLength(2);
  });

  it('当前设备不应显示终止按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    // 当前设备区域没有终止按钮
    const currentDeviceSection = screen.getByText('当前设备').closest('div');
    expect(currentDeviceSection).not.toHaveTextContent('终止');
  });

  it('其他设备应显示终止按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    expect(terminateButtons).toHaveLength(2);
  });

  it('有多个其他设备时应显示"终止其他所有设备"按钮', () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByRole('button', { name: /终止其他所有设备/ })).toBeInTheDocument();
  });

  it('点击终止按钮应弹出确认弹窗', async () => {
    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    await userEvent.click(terminateButtons[0]);

    expect(screen.getByText('终止设备登录')).toBeInTheDocument();
    expect(screen.getByText(/确定要终止该设备的登录吗/)).toBeInTheDocument();
  });

  it('确认终止应调用API并刷新列表', async () => {
    vi.mocked(authApi.terminateSession).mockResolvedValueOnce(undefined);

    render(
      <SessionDeviceList
        sessions={mockSessions}
        currentSessionId="session-1"
        onRefresh={mockOnRefresh}
      />
    );

    const terminateButtons = screen.getAllByRole('button', { name: '终止' });
    await userEvent.click(terminateButtons[0]);

    const confirmButton = screen.getByRole('button', { name: '确认终止' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(authApi.terminateSession).toHaveBeenCalled();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd app && npm run test:run -- --grep SessionDeviceList`

Expected: 所有测试通过

- [ ] **Step 3: 提交测试文件**

```bash
git add Test/frontend/unit/SessionDeviceList.test.tsx
git commit -m "test(settings): 新增 SessionDeviceList 组件单元测试"
```

---

## Task 8: 集成测试和最终验证

- [ ] **Step 1: 启动后端服务验证**

Run: `cd app/server && npm run dev`

- [ ] **Step 2: 启动前端服务验证**

Run: `cd app && npm run dev`

- [ ] **Step 3: 手动验证功能**

1. 登录系统
2. 进入 设置 → 个人资料
3. 查看"安全设置"区域是否显示
4. 查看当前设备是否标记正确
5. 在另一浏览器登录同一账号
6. 查看原浏览器是否收到通知
7. 验证通知内容是否显示新登录IP
8. 测试终止单个设备功能
9. 测试终止其他所有设备功能

- [ ] **Step 4: 提交最终修改**

```bash
git add -A
git commit -m "feat(session): 完成会话管理功能优化

- 优化会话终止通知内容，显示新登录设备IP
- 新增登录设备管理页面（设置→个人资料→安全设置）
- 支持查看设备列表、终止单个设备、终止其他所有设备
- 新增 User-Agent 解析和 IP 脱敏工具函数
- 新增组件单元测试
"
```

---

## 验收清单

- [ ] 后端通知内容优化：显示新登录设备IP
- [ ] 前端 Profile 页面新增安全设置区域
- [ ] 设备列表显示：当前设备标记、设备名称、IP脱敏、登录时间、最后活跃
- [ ] 终止单个设备功能正常
- [ ] 终止其他所有设备功能正常
- [ ] 终止操作有二次确认弹窗
- [ ] 单元测试通过
