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

          {/* 基本信息 - 两列布局 */}
          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2 md:col-span-2">
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
