/**
 * 用户管理设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, UserPlus, Loader2, Copy, Check, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMembers, useCreateMember, useUpdateMember, useDeactivateMember, useHardDeleteMember, useMemberDeletionCheck, useDepartments } from '@/features/org/hooks/useOrg';
import { useToast } from '@/hooks/use-toast';
import { MemberCapabilityDialog } from '../components/MemberCapabilityDialog';
import type { Member, MemberDeletionCheck } from '@/lib/api/org.api';
import { AlertTriangle, Trash2, UserX } from 'lucide-react';

const roleLabels: Record<Member['role'], string> = {
  admin: '管理员',
  tech_manager: '技术经理',
  department_manager: '部门经理',
  engineer: '工程师',
};

const roleColors: Record<Member['role'], string> = {
  admin: 'bg-red-100 text-red-700',
  tech_manager: 'bg-purple-100 text-purple-700',
  department_manager: 'bg-blue-100 text-blue-700',
  engineer: 'bg-green-100 text-green-700',
};

interface MemberFormData {
  username: string;
  displayName: string;
  email: string;
  departmentId: number | null;
  position: string;
  role: Member['role'];
}

const defaultFormData: MemberFormData = {
  username: '',
  displayName: '',
  email: '',
  departmentId: null,
  position: '',
  role: 'engineer',
};

export function UsersSettings() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [capabilityDialogOpen, setCapabilityDialogOpen] = useState(false);
  const [capabilityMember, setCapabilityMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(defaultFormData);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [deletionCheckData, setDeletionCheckData] = useState<MemberDeletionCheck | null>(null);

  // 查询
  const { data: membersData, isLoading, error } = useMembers({
    search: search || undefined,
    role: roleFilter !== 'all' ? (roleFilter as Member['role']) : undefined,
    status: statusFilter !== 'all' ? (statusFilter as Member['status']) : undefined,
    pageSize: 100,
  });
  const { data: departments = [] } = useDepartments();

  // 变更
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember(selectedMember?.id || 0);
  const deactivateMutation = useDeactivateMember();
  const hardDeleteMutation = useHardDeleteMember();
  const deletionCheckMutation = useMemberDeletionCheck();

  const members = membersData?.items || [];

  const resetForm = () => {
    setFormData(defaultFormData);
    setInitialPassword(null);
    setPasswordCopied(false);
  };

  const handleCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      username: member.name.toLowerCase().replace(/\s+/g, '.'),
      displayName: member.name,
      email: member.email,
      departmentId: member.departmentId,
      position: member.position || '',
      role: member.role,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (member: Member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
    // 获取删除检查数据
    try {
      const checkData = await deletionCheckMutation.mutateAsync(member.id);
      setDeletionCheckData(checkData);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '获取删除检查数据失败', variant: 'destructive' });
    }
  };

  const handleCapability = (member: Member) => {
    setCapabilityMember(member);
    setCapabilityDialogOpen(true);
  };

  const submitCreate = async () => {
    if (!formData.username.trim()) {
      toast({ title: '错误', description: '请输入用户名', variant: 'destructive' });
      return;
    }
    if (!formData.displayName.trim()) {
      toast({ title: '错误', description: '请输入显示名称', variant: 'destructive' });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: '错误', description: '请输入邮箱', variant: 'destructive' });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        username: formData.username.trim(),
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        departmentId: formData.departmentId,
        position: formData.position.trim() || undefined,
        role: formData.role,
      });
      setInitialPassword(result.initialPassword);
      toast({ title: '成功', description: '用户创建成功' });
      // 不关闭对话框，显示初始密码
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '创建失败', variant: 'destructive' });
    }
  };

  const submitEdit = async () => {
    if (!formData.displayName.trim()) {
      toast({ title: '错误', description: '请输入显示名称', variant: 'destructive' });
      return;
    }
    if (!formData.email.trim()) {
      toast({ title: '错误', description: '请输入邮箱', variant: 'destructive' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        departmentId: formData.departmentId,
        position: formData.position.trim() || undefined,
        role: formData.role,
      });
      toast({ title: '成功', description: '用户更新成功' });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '更新失败', variant: 'destructive' });
    }
  };

  const submitDeactivate = async () => {
    if (!selectedMember) return;

    try {
      await deactivateMutation.mutateAsync(selectedMember.id);
      toast({ title: '成功', description: '用户已停用' });
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      setDeletionCheckData(null);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '停用失败', variant: 'destructive' });
    }
  };

  const submitHardDelete = async () => {
    if (!selectedMember) return;

    try {
      await hardDeleteMutation.mutateAsync(selectedMember.id);
      toast({ title: '成功', description: '用户已永久删除' });
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      setDeletionCheckData(null);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '删除失败', variant: 'destructive' });
    }
  };

  const copyPassword = async () => {
    if (initialPassword) {
      await navigator.clipboard.writeText(initialPassword);
      setPasswordCopied(true);
      toast({ title: '已复制', description: '初始密码已复制到剪贴板' });
    }
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  // 加载状态
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-destructive">
          <UserPlus className="h-12 w-12 mb-2 opacity-50" />
          <p>加载用户数据失败</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>管理系统用户账户和权限</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <UserPlus className="h-4 w-4 mr-2" />
              添加用户
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选 */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="角色筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="tech_manager">技术经理</SelectItem>
                <SelectItem value="department_manager">部门经理</SelectItem>
                <SelectItem value="engineer">工程师</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 用户列表 */}
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无用户数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.departmentName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status === 'active' ? '活跃' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(member)}>
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCapability(member)}>
                            能力评定
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            重置密码
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
          </DialogHeader>

          {initialPassword ? (
            <>
              <DialogDescription>
                用户创建成功！请保存以下初始密码，此密码只会显示一次。
              </DialogDescription>
              <div className="space-y-4 px-6 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">初始密码：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded font-mono text-sm">
                      {initialPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyPassword}
                    >
                      {passwordCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>我已保存密码</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名 *</Label>
                    <Input
                      id="username"
                      placeholder="登录用户名"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">显示名称 *</Label>
                    <Input
                      id="displayName"
                      placeholder="用户显示名"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">部门</Label>
                    <Select
                      value={formData.departmentId?.toString() || 'none'}
                      onValueChange={(val) =>
                        setFormData({ ...formData, departmentId: val === 'none' ? null : parseInt(val) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择部门" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不指定</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">角色 *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(val) => setFormData({ ...formData, role: val as Member['role'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="tech_manager">技术经理</SelectItem>
                        <SelectItem value="department_manager">部门经理</SelectItem>
                        <SelectItem value="engineer">工程师</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">职位</Label>
                  <Input
                    id="position"
                    placeholder="如：高级工程师"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>
                  取消
                </Button>
                <Button onClick={submitCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  确认添加
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">显示名称 *</Label>
              <Input
                id="editDisplayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">邮箱 *</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDepartment">部门</Label>
                <Select
                  value={formData.departmentId?.toString() || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, departmentId: val === 'none' ? null : parseInt(val) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不指定</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">角色</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val as Member['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="tech_manager">技术经理</SelectItem>
                    <SelectItem value="department_manager">部门经理</SelectItem>
                    <SelectItem value="engineer">工程师</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPosition">职位</Label>
              <Input
                id="editPosition"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除用户
            </DialogTitle>
            <DialogDescription>
              用户：{selectedMember?.name}
            </DialogDescription>
          </DialogHeader>

          {deletionCheckMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deletionCheckData ? (
            <div className="space-y-4">
              {/* 关联数据统计 */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">关联数据统计</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">参与项目：</span>
                    <span>{deletionCheckData.stats.projects} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">进行中任务：</span>
                    <span>{deletionCheckData.stats.tasks} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">审批记录：</span>
                    <span>{deletionCheckData.stats.approvals} 条</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">能力评估：</span>
                    <span>{deletionCheckData.stats.capabilityRecords} 条</span>
                  </div>
                </div>
              </div>

              {/* 阻止原因 */}
              {deletionCheckData.blockingReasons.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-destructive">无法删除</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {deletionCheckData.blockingReasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 警告信息 */}
              {deletionCheckData.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">警告</p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {deletionCheckData.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">加载删除检查数据失败</p>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setDeletionCheckData(null);
            }}>
              取消
            </Button>
            {deletionCheckData?.canDeactivate && (
              <Button
                variant="secondary"
                onClick={submitDeactivate}
                disabled={deactivateMutation.isPending}
                className="flex items-center gap-2"
              >
                {deactivateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <UserX className="h-4 w-4" />
                停用用户
              </Button>
            )}
            {deletionCheckData?.canDelete && (
              <Button
                variant="destructive"
                onClick={submitHardDelete}
                disabled={hardDeleteMutation.isPending}
                className="flex items-center gap-2"
              >
                {hardDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Trash2 className="h-4 w-4" />
                永久删除
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 能力评定对话框 */}
      <MemberCapabilityDialog
        open={capabilityDialogOpen}
        onOpenChange={setCapabilityDialogOpen}
        member={capabilityMember}
      />
    </div>
  );
}
