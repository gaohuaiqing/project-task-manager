/**
 * 个人资料设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authApi } from '@/features/auth/api';
import { getAvatarUrl } from '@/utils/avatar';

export function ProfileSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
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
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={user?.username}
                disabled
                className="bg-muted"
                data-testid="profile-input-username"
              />
              <p className="text-xs text-muted-foreground">用户名不可修改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称</Label>
              <Input
                id="displayName"
                value={user?.realName || ''}
                disabled
                className="bg-muted"
                data-testid="profile-input-display-name"
              />
              <p className="text-xs text-muted-foreground">需要管理员或部门经理修改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
                data-testid="profile-input-email"
              />
              <p className="text-xs text-muted-foreground">需要管理员或部门经理修改</p>
            </div>

            <div className="space-y-2">
              <Label>角色</Label>
              <Input
                value={user?.role === 'admin' ? '管理员' :
                     user?.role === 'tech_manager' ? '技术经理' :
                     user?.role === 'dept_manager' ? '部门经理' : '工程师'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
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
    } catch (err: any) {
      setError(err.message || '密码修改失败');
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

      <Button onClick={handleSubmit} disabled={loading} data-testid="profile-btn-save">
        {loading ? '修改中...' : '修改密码'}
      </Button>
    </div>
  );
}
