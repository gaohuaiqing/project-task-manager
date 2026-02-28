import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Edit3, 
  Trash2, 
  Lock, 
  AlertCircle, 
  Check,
  Briefcase,
  User,
  Code,
  Copy,
  UserPlus,
  ShieldCheck,
  IdCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, type UserRole } from '@/types/auth';
import { validateEmployeeId, isEmployeeIdExists } from '@/utils/employeeValidation';

interface UserData {
  username: string;
  role: UserRole;
  name: string;
}

interface UserManagementProps {
  users: UserData[];
  onRefresh: () => void;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const { adminUpdateUser, adminResetPassword, adminDeleteUser, adminCreateUser } = useAuth();
  
  // 编辑用户弹窗状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('engineer');

  // 重置密码弹窗状态
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 删除确认弹窗状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  
  // 增加成员弹窗状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('engineer');
  const [createdUserInfo, setCreatedUserInfo] = useState<{ username: string; tempPassword: string } | null>(null);
  const [employeeIdError, setEmployeeIdError] = useState('');
  
  // 消息状态
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 角色筛选状态
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // 根据角色筛选用户
  const filteredUsers = roleFilter === 'all' 
    ? users 
    : users.filter(user => user.role === roleFilter);

  // 打开增加成员弹窗
  const openAddDialog = () => {
    setAddName('');
    setAddEmployeeId('');
    setAddRole('engineer');
    setCreatedUserInfo(null);
    setError('');
    setSuccess('');
    setEmployeeIdError('');
    setIsAddDialogOpen(true);
  };

  // 验证工号输入 - 统一使用 employeeValidation.ts 的规则
  const validateEmployeeIdInput = (value: string): boolean => {
    // 使用统一的验证函数，保持与 employeeValidation.ts 一致
    const validation = validateEmployeeId(value);
    return validation.valid;
  };

  // 处理工号输入变化 - 统一使用 employeeValidation.ts 的规则
  const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddEmployeeId(value);

    // 实时验证 - 使用统一的验证规则
    if (value) {
      const validation = validateEmployeeIdFormat(value);
      if (!validation.valid) {
        setEmployeeIdError(validation.message);
      } else {
        setEmployeeIdError('');
      }
    } else {
      setEmployeeIdError('');
    }
  };

  // 保存新增成员
  const handleAddUser = async () => {
    // 验证
    if (!addName.trim()) {
      setError('请输入姓名');
      return;
    }

    // 验证工号
    if (!addEmployeeId.trim()) {
      setError('请输入工号');
      setEmployeeIdError('请输入工号');
      return;
    }

    // 使用统一的工号验证规则（与 employeeValidation.ts 保持一致）
    const validation = validateEmployeeId(addEmployeeId);
    if (!validation.valid) {
      setError(validation.message);
      setEmployeeIdError(validation.message);
      return;
    }

    // 检查工号是否已存在
    if (isEmployeeIdExists(addEmployeeId)) {
      setError('该工号已被使用');
      setEmployeeIdError('该工号已被使用');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await adminCreateUser(addName, addRole, addEmployeeId);
      if (result.success && result.username && result.tempPassword) {
        setSuccess('成员添加成功');
        setCreatedUserInfo({
          username: result.username,
          tempPassword: result.tempPassword,
        });
        onRefresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError('添加失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('已复制到剪贴板');
    setTimeout(() => setSuccess(''), 1500);
  };

  // 打开编辑弹窗
  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditRole(user.role);
    setError('');
    setSuccess('');
    setIsEditDialogOpen(true);
  };

  // 保存用户编辑
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    // 验证工号
    const validation = validateEmployeeId(editUsername, editingUser.username);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await adminUpdateUser(editingUser.username, {
        name: editName,
        role: editRole,
        newUsername: editUsername !== editingUser.username ? editUsername : undefined,
      });
      
      if (result) {
        setSuccess('用户信息更新成功');
        onRefresh();
        setTimeout(() => {
          setIsEditDialogOpen(false);
          setSuccess('');
        }, 1500);
      } else {
        setError('更新失败，工号可能已存在');
      }
    } catch {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开重置密码弹窗
  const openResetPasswordDialog = (user: UserData) => {
    setResetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setIsResetPasswordDialogOpen(true);
  };

  // 执行重置密码
  const handleResetPassword = async () => {
    if (!resetUser) return;
    
    // 验证
    if (newPassword.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await adminResetPassword(resetUser.username, newPassword);
      
      if (result) {
        setSuccess('密码重置成功');
        setTimeout(() => {
          setIsResetPasswordDialogOpen(false);
          setSuccess('');
        }, 1500);
      } else {
        setError('密码重置失败');
      }
    } catch {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 打开删除确认弹窗
  const openDeleteDialog = (user: UserData) => {
    setDeleteUser(user);
    setError('');
    setSuccess('');
    setIsDeleteDialogOpen(true);
  };

  // 执行删除用户
  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await adminDeleteUser(deleteUser.username);
      
      if (result) {
        setSuccess('用户删除成功');
        onRefresh();
        setTimeout(() => {
          setIsDeleteDialogOpen(false);
          setSuccess('');
        }, 1500);
      } else {
        setError('删除失败，不能删除管理员账户');
      }
    } catch {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取角色图标
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'tech_manager':
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case 'dept_manager':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'engineer':
        return <Code className="w-4 h-4 text-green-400" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  // 获取角色颜色
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'tech_manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'dept_manager':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'engineer':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            用户管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}>
              <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white h-8 text-sm">
                <SelectValue placeholder="筛选角色" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    全部角色
                  </div>
                </SelectItem>
                <SelectItem value="tech_manager" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    技术经理
                  </div>
                </SelectItem>
                <SelectItem value="dept_manager" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    部门经理
                  </div>
                </SelectItem>
                <SelectItem value="engineer" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-green-400" />
                    工程师
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={openAddDialog}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              增加成员
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* 用户列表 - 带滚动条 */}
          <div 
            className="max-h-[400px] overflow-y-auto px-6 py-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 scrollbar-thumb-rounded-md hover:scrollbar-thumb-slate-500"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#475569 transparent'
            }}
          >
            {filteredUsers.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                {users.length === 0 ? '暂无用户数据' : '没有符合条件的用户'}
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-slate-400 font-mono">工号: {user.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className={cn("flex items-center gap-1", getRoleColor(user.role))}
                    >
                      {getRoleIcon(user.role)}
                      {ROLE_CONFIG[user.role].label}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/20"
                        onClick={() => openResetPasswordDialog(user)}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 增加成员弹窗 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              增加成员
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && !createdUserInfo && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            {!createdUserInfo ? (
              <>
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-1">
                    姓名
                    <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="请输入成员姓名"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-1">
                    <IdCard className="w-4 h-4" />
                    工号
                    <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={addEmployeeId}
                    onChange={handleEmployeeIdChange}
                    placeholder="请输入工号（3-20位，以数字开头）"
                    className={cn(
                      "bg-slate-700 border-slate-600 text-white font-mono",
                      employeeIdError && "border-red-500 focus-visible:ring-red-500"
                    )}
                    maxLength={20}
                  />
                  {employeeIdError && (
                    <p className="text-xs text-red-400 mt-1">{employeeIdError}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    工号必须为3-20位字符，以数字开头，只能包含数字、字母、下划线和连字符
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">角色</Label>
                  <Select value={addRole} onValueChange={(value: UserRole) => setAddRole(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="tech_manager" className="text-white hover:bg-slate-700">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-400" />
                          技术经理
                        </div>
                      </SelectItem>
                      <SelectItem value="dept_manager" className="text-white hover:bg-slate-700">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          部门经理
                        </div>
                      </SelectItem>
                      <SelectItem value="engineer" className="text-white hover:bg-slate-700">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-green-400" />
                          工程师
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isLoading}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={handleAddUser}
                    disabled={isLoading || !addName.trim() || !addEmployeeId.trim() || !!employeeIdError}
                  >
                    {isLoading ? '添加中...' : '添加成员'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert className="bg-green-900/50 border-green-700">
                  <Check className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    成员添加成功！请保存以下登录信息
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div>
                    <Label className="text-slate-400 text-xs">用户名</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 rounded bg-slate-900 text-white font-mono text-sm">
                        {createdUserInfo.username}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(createdUserInfo.username)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-400 text-xs">临时密码</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 rounded bg-slate-900 text-white font-mono text-sm">
                        {createdUserInfo.tempPassword}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => copyToClipboard(createdUserInfo.tempPassword)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400">
                  请将此登录信息发送给该成员。首次登录后建议修改密码。
                </p>

                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  完成
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              编辑用户
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-1">
                <User className="w-4 h-4" />
                姓名
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-1">
                <IdCard className="w-4 h-4" />
                工号
              </Label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white font-mono"
                placeholder="请输入工号（至少3位）"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                角色
              </Label>
              <Select value={editRole} onValueChange={(value: UserRole) => setEditRole(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="tech_manager" className="text-white hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      技术经理
                    </div>
                  </SelectItem>
                  <SelectItem value="dept_manager" className="text-white hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      部门经理
                    </div>
                  </SelectItem>
                  <SelectItem value="engineer" className="text-white hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-green-400" />
                      工程师
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-secondary text-white"
                onClick={handleSaveEdit}
                disabled={isLoading || !editName.trim() || !editUsername.trim()}
              >
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              重置密码
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-sm text-slate-400">正在为以下用户重置密码：</p>
              <p className="font-medium text-white mt-1">{resetUser?.name}</p>
              <p className="text-sm text-slate-500 font-mono mt-0.5">工号: {resetUser?.username}</p>
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
                onClick={() => setIsResetPasswordDialogOpen(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? '重置中...' : '重置密码'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              删除用户
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-900/50 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            <Alert className="bg-red-900/20 border-red-700/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                确定要删除用户 <strong>{deleteUser?.name}</strong> 吗？
                <p className="text-red-300/70 font-mono text-sm mt-1">工号: {deleteUser?.username}</p>
                此操作不可恢复。
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteUser}
                disabled={isLoading}
              >
                {isLoading ? '删除中...' : '确认删除'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
