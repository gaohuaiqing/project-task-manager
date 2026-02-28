import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo,
  Plus,
  Trash2,
  Palette,
  User,
  Shield,
  AlertCircle,
  Edit3,
  Lock,
  Check,
  X,
  Save,
  LogOut,
  ShieldCheck,
  Users,
  IdCard,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_CONFIG, type UserRole, canAccessDataScope, canAccessOrganization } from '@/types/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
}
from '@/components/ui/dialog';

import { HolidayManagement } from './HolidayManagement';
import { PermissionManagement } from './PermissionManagement';
import { OrganizationSettings } from '../organization/OrganizationSettings';
import { SystemLogs } from './SystemLogs';
import { getTaskTypes, saveTaskTypes } from '@/utils/taskTypeManager';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface SettingsPageProps {
  initialSection?: string;
}

// 任务类型接口
interface TaskType {
  value: string;
  label: string;
  color: string;
}

const colorOptions = [
  { value: '#60a5fa', label: '蓝色' },
  { value: '#4ade80', label: '绿色' },
  { value: '#facc15', label: '黄色' },
  { value: '#f472b6', label: '粉色' },
  { value: '#fb923c', label: '橙色' },
  { value: '#a78bfa', label: '紫色' },
  { value: '#f87171', label: '红色' },
  { value: '#9ca3af', label: '灰色' },
];

export function SettingsPage({ initialSection = 'settings' }: SettingsPageProps) {
  const { user, isAdmin, updateUserProfile, changePassword, logout, getAllUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminResetPassword } = useAuth();
  
  // 所有用户列表（管理员用）
  const [allUsers, setAllUsers] = useState<Array<{ username: string; role: UserRole; name: string }>>([]);

  // 任务类型列表
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#60a5fa');

  // 编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  
  // 密码修改弹窗
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 管理员密码修改弹窗
  const [isAdminPasswordDialogOpen, setIsAdminPasswordDialogOpen] = useState(false);
  const [adminOldPassword, setAdminOldPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState('');

  // 根据 initialSection 确定当前显示的内容
  const getCurrentSection = () => {
    if (initialSection === 'settings-profile') return 'profile';
    if (initialSection === 'settings-holidays') return 'holidays';
    if (initialSection === 'settings-task-types') return 'task-types';
    if (initialSection === 'settings-permissions') return 'permissions';
    if (initialSection === 'settings-organization') return 'organization';
    if (initialSection === 'settings-logs') return 'logs';
    return 'profile'; // 默认显示个人信息
  };

  // 从后端加载任务类型
  useEffect(() => {
    const loadTaskTypes = async () => {
      try {
        const types = await getTaskTypes();
        setTaskTypes(types);
      } catch (error) {
        console.error('Failed to load task types:', error);
      }
    };
    loadTaskTypes();
  }, []);

  // 加载所有用户
  useEffect(() => {
    console.log('[SettingsPage] 开始加载用户数据...');
    const users = getAllUsers();
    console.log('[SettingsPage] 加载到的用户数:', users?.length);
    setAllUsers(users);
  }, [isAdmin, getAllUsers]);

  // 刷新用户列表
  const refreshUsers = () => {
    setAllUsers(getAllUsers());
  };

  // 同步编辑名称
  useEffect(() => {
    if (user) {
      setEditName(user.name);
    }
  }, [user?.name]);

  // 添加任务类型
  const addTaskType = async () => {
    if (!newTypeName.trim()) return;

    const newType: TaskType = {
      value: `custom_${Date.now()}`,
      label: newTypeName.trim(),
      color: newTypeColor,
    };

    const updatedTypes = [...taskTypes, newType];
    setTaskTypes(updatedTypes);
    await saveTaskTypes(updatedTypes);
    setNewTypeName('');
  };

  // 删除任务类型
  const deleteTaskType = async (value: string) => {
    const updatedTypes = taskTypes.filter(t => t.value !== value);
    setTaskTypes(updatedTypes);
    await saveTaskTypes(updatedTypes);
  };

  // 保存姓名编辑
  const handleSaveName = () => {
    if (editName.trim()) {
      updateUserProfile({ name: editName.trim() });
      setIsEditingName(false);
    }
  };

  // 取消姓名编辑
  const handleCancelNameEdit = () => {
    setEditName(user?.name || '');
    setIsEditingName(false);
  };

  // 修改密码
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    // 验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('请填写所有密码字段');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('新密码与确认密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('新密码至少需要6个字符');
      return;
    }

    const success = await changePassword(oldPassword, newPassword);
    if (success) {
      setPasswordSuccess('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordDialogOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } else {
      setPasswordError('原密码不正确');
    }
  };

  // 管理员修改密码
  const handleAdminChangePassword = async () => {
    setAdminPasswordError('');
    setAdminPasswordSuccess('');

    // 验证
    if (!adminOldPassword || !adminNewPassword || !adminConfirmPassword) {
      setAdminPasswordError('请填写所有密码字段');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordError('新密码与确认密码不一致');
      return;
    }

    if (adminNewPassword.length < 6) {
      setAdminPasswordError('新密码至少需要6个字符');
      return;
    }

    const success = await changePassword(adminOldPassword, adminNewPassword);
    if (success) {
      setAdminPasswordSuccess('密码修改成功');
      setAdminOldPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setTimeout(() => {
        setIsAdminPasswordDialogOpen(false);
        setAdminPasswordSuccess('');
      }, 1500);
    } else {
      setAdminPasswordError('原密码不正确');
    }
  };

  // 渲染内容
  const renderContent = () => {
    const currentSection = getCurrentSection();
    switch (currentSection) {
      case 'profile':
        return (
          <Card key="profile-view" className="bg-card border-border h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                {isAdmin ? <ShieldCheck className="w-5 h-5 text-amber-400" /> : <User className="w-5 h-5 text-blue-400" />}
                {isAdmin ? '管理员信息' : '个人信息'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 当前身份显示 - 可编辑 */}
              <div className="p-4 rounded-lg bg-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <div className="text-white font-bold text-lg">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1">
                    {isEditingName && !isAdmin ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') handleCancelNameEdit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                          onClick={handleSaveName}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={handleCancelNameEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-medium text-white">{user?.name || '未登录'}</p>
                        {!isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-white"
                            onClick={() => setIsEditingName(true)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                      <IdCard className="w-3 h-3 inline mr-1" />
                      工号: <span className="font-mono text-slate-300 inline">{user?.username || '-'}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      <User className="w-3 h-3 inline mr-1" />
                      当前身份: <span className={cn("font-medium inline", user?.role === 'admin' ? 'text-amber-400' : 'text-blue-400')}>
                        {user ? ROLE_CONFIG[user.role].label : '-'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 账户安全 */}
              <div className="space-y-3">
                <Label className="text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  账户安全
                </Label>
                <div className="flex flex-wrap gap-3">
                  {isAdmin ? (
                    <>
                      <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                        onClick={() => setIsAdminPasswordDialogOpen(true)}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        修改密码
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      修改密码
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'holidays':
        return (
          <div key="holidays-view" className="h-full">
            <HolidayManagement />
          </div>
        );
      
      case 'task-types':
        return (
          <Card key="task-types-view" className="bg-card border-border h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-orange-400" />
                任务类型设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 添加新类型 */}
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-white">类型名称</Label>
                  <Input
                    placeholder="输入任务类型名称..."
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="bg-background border-border text-white"
                    onKeyDown={(e) => e.key === 'Enter' && addTaskType()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-1">
                    <Palette className="w-4 h-4" />
                    颜色
                  </Label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewTypeColor(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all",
                          newTypeColor === color.value 
                            ? "ring-2 ring-white" 
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={addTaskType}
                  disabled={!newTypeName.trim()}
                  className="bg-primary hover:bg-secondary text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>

              {/* 类型列表 */}
              <div className="space-y-2">
                <Label className="text-white">现有任务类型</Label>
                <div className="flex flex-wrap gap-2">
                  {taskTypes.map((type) => (
                    <Badge
                      key={type.value}
                      variant="secondary"
                      className="px-3 py-2 text-sm flex items-center gap-2"
                      style={{ 
                        backgroundColor: `${type.color}30`,
                        color: type.color,
                        border: `1px solid ${type.color}50`
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                      <button
                        onClick={() => deleteTaskType(type.value)}
                        className="ml-1 hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {taskTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无任务类型，请添加
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      
      case 'permissions':
        return (
          <div key="permissions-view" className="h-full">
            {isAdmin ? (
              <PermissionManagement />
            ) : (
              <Card className="bg-card border-border h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    权限配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[500px]">
                  <Alert variant="destructive" className="bg-red-900/30 border-red-700 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      权限不足，只有管理员可以访问权限配置模块
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'organization':
        return (
          <div key="organization-view" className="h-full">
            {canAccessOrganization(user) ? (
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('[SettingsPage] 组织架构错误:', error);
                  console.error('[SettingsPage] 组件堆栈:', errorInfo.componentStack);
                }}
              >
                <OrganizationSettings />
              </ErrorBoundary>
            ) : (
              <Card className="bg-card border-border h-full">
                <CardContent className="flex items-center justify-center h-[500px]">
                  <Alert variant="destructive" className="bg-red-900/30 border-red-700 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      权限不足，无法访问组织及人员设置
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'logs':
        return (
          <div key="logs-view" className="h-full">
            {isAdmin ? (
              <ErrorBoundary
                onError={(error, errorInfo) => {
                  console.error('[SettingsPage] 事件日志错误:', error);
                  console.error('[SettingsPage] 组件堆栈:', errorInfo.componentStack);
                }}
              >
                <SystemLogs />
              </ErrorBoundary>
            ) : (
              <Card className="bg-card border-border h-full">
                <CardContent className="flex items-center justify-center h-[500px]">
                  <Alert variant="destructive" className="bg-red-900/30 border-red-700 max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      权限不足，无法访问事件日志
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* 内容区域 */}
      <div className="flex-1 overflow-auto transition-opacity duration-300 ease-in-out">
        {renderContent()}
      </div>

      {/* 修改密码弹窗 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              修改密码
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {passwordError && (
              <Alert variant="destructive" className="bg-red-900 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            {passwordSuccess && (
              <Alert className="bg-green-900 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{passwordSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-white">原密码</Label>
              <Input
                type="password"
                placeholder="请输入原密码"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">新密码</Label>
              <Input
                type="password"
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">确认新密码</Label>
              <Input
                type="password"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white"
                onClick={handleChangePassword}
                disabled={!oldPassword || !newPassword || !confirmPassword}
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 管理员修改密码弹窗 */}
      <Dialog open={isAdminPasswordDialogOpen} onOpenChange={setIsAdminPasswordDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              修改管理员密码
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {adminPasswordError && (
              <Alert variant="destructive" className="bg-red-900 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{adminPasswordError}</AlertDescription>
              </Alert>
            )}
            {adminPasswordSuccess && (
              <Alert className="bg-green-900 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{adminPasswordSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-white">原密码</Label>
              <Input
                type="password"
                placeholder="请输入原密码"
                value={adminOldPassword}
                onChange={(e) => setAdminOldPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">新密码</Label>
              <Input
                type="password"
                placeholder="请输入新密码（至少6位）"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">确认新密码</Label>
              <Input
                type="password"
                placeholder="请再次输入新密码"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => {
                  setIsAdminPasswordDialogOpen(false);
                  setAdminPasswordError('');
                  setAdminPasswordSuccess('');
                  setAdminOldPassword('');
                  setAdminNewPassword('');
                  setAdminConfirmPassword('');
                }}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white"
                onClick={handleAdminChangePassword}
                disabled={!adminOldPassword || !adminNewPassword || !adminConfirmPassword}
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 使用 React.memo 优化组件渲染
export default React.memo(SettingsPage, (prevProps, nextProps) => {
  return prevProps.initialSection === nextProps.initialSection;
});