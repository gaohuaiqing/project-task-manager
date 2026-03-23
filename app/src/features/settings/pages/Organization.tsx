/**
 * 组织架构设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, ChevronRight, ChevronDown, MoreVertical, Edit, Trash2, Loader2, Users, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDepartmentTree, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useMembers } from '@/features/org/hooks/useOrg';
import { useMemberCapabilities } from '@/features/assignment/hooks/useCapabilities';
import { useToast } from '@/hooks/use-toast';
import { MemberCapabilities } from '@/features/assignment/components/MemberCapabilities';
import { MemberCapabilityDialog } from '@/features/settings/components/MemberCapabilityDialog';
import type { Department, Member } from '@/lib/api/org.api';

interface DepartmentFormData {
  name: string;
  managerId: number | null;
}

function buildDepartmentTree(departments: Department[]): Department[] {
  const map = new Map<number, Department>();
  const roots: Department[] = [];

  // 初始化映射
  departments.forEach(dept => {
    map.set(dept.id, { ...dept, children: [] });
  });

  // 构建树结构
  departments.forEach(dept => {
    const node = map.get(dept.id)!;
    if (dept.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(dept.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  return roots;
}

export function OrganizationSettings() {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [capabilityDialogOpen, setCapabilityDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({ name: '', managerId: null });

  // 查询
  const { data: departments = [], isLoading, error } = useDepartmentTree();
  const { data: membersData } = useMembers({ pageSize: 1000 });
  const { data: memberCapabilities, isLoading: isLoadingCapabilities } = useMemberCapabilities(selectedMember?.id);

  // 变更
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(selectedDept?.id || 0);
  const deleteMutation = useDeleteDepartment();

  // 构建部门树
  const departmentTree = buildDepartmentTree(departments);
  const allMembers = membersData?.items || [];

  // 按部门分组成员
  const membersByDepartment = new Map<number | null, Member[]>();
  allMembers.forEach(member => {
    const deptId = member.departmentId;
    if (!membersByDepartment.has(deptId)) {
      membersByDepartment.set(deptId, []);
    }
    membersByDepartment.get(deptId)!.push(member);
  });

  // 查看成员能力
  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setMemberDetailOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = (parentId: number | null = null) => {
    setSelectedParentId(parentId);
    setFormData({ name: '', managerId: null });
    setCreateDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({ name: dept.name, managerId: dept.managerId });
    setEditDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setSelectedDept(dept);
    setDeleteDialogOpen(true);
  };

  const submitCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: '错误', description: '请输入部门名称', variant: 'destructive' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        parentId: selectedParentId,
        managerId: formData.managerId,
      });
      toast({ title: '成功', description: '部门创建成功' });
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '创建失败', variant: 'destructive' });
    }
  };

  const submitEdit = async () => {
    if (!selectedDept || !formData.name.trim()) {
      toast({ title: '错误', description: '请输入部门名称', variant: 'destructive' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        name: formData.name.trim(),
        managerId: formData.managerId,
      });
      toast({ title: '成功', description: '部门更新成功' });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '更新失败', variant: 'destructive' });
    }
  };

  const submitDelete = async () => {
    if (!selectedDept) return;

    try {
      await deleteMutation.mutateAsync(selectedDept.id);
      toast({ title: '成功', description: '部门删除成功' });
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '删除失败', variant: 'destructive' });
    }
  };

  // 渲染部门树
  const renderDepartment = (dept: Department, level: number = 0) => {
    const hasChildren = (dept.children?.length ?? 0) > 0;
    const isExpanded = expandedIds.has(dept.id);
    const deptMembers = membersByDepartment.get(dept.id) || [];

    return (
      <div key={dept.id}>
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors',
            level > 0 && 'ml-6'
          )}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(dept.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <span className="w-6" />
            )}
            <div>
              <p className="font-medium">{dept.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {dept.memberCount} 人
                </Badge>
                {dept.managerName && (
                  <span>负责人: {dept.managerName}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCreate(dept.id)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加子部门
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(dept)}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(dept)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 部门成员列表 */}
        {deptMembers.length > 0 && (
          <div className={cn('mt-2 ml-6', level > 0 && 'ml-12')}>
            <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
              {deptMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1.5 px-3"
                  onClick={() => handleMemberClick(member)}
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                    <AvatarFallback className="text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 子部门 */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {dept.children!.map((child) => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
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
          <Building2 className="h-12 w-12 mb-2 opacity-50" />
          <p>加载部门数据失败</p>
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
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                组织架构
              </CardTitle>
              <CardDescription>
                管理公司的部门和团队结构
              </CardDescription>
            </div>
            <Button onClick={() => handleCreate(null)}>
              <Plus className="h-4 w-4 mr-2" />
              添加部门
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {departmentTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-2 opacity-50" />
              <p>暂无部门数据</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleCreate(null)}
              >
                创建第一个部门
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {departmentTree.map((dept) => renderDepartment(dept))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建部门对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId ? '添加子部门' : '添加部门'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">部门名称</Label>
              <Input
                id="deptName"
                placeholder="请输入部门名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">部门负责人</Label>
              <Select
                value={formData.managerId?.toString() || 'none'}
                onValueChange={(val) => setFormData({ ...formData, managerId: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {allMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑部门对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑部门</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDeptName">部门名称</Label>
              <Input
                id="editDeptName"
                placeholder="请输入部门名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editManager">部门负责人</Label>
              <Select
                value={formData.managerId?.toString() || 'none'}
                onValueChange={(val) => setFormData({ ...formData, managerId: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {allMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除部门</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              确定要删除部门 "{selectedDept?.name}" 吗？此操作无法撤销。
            </p>
            {selectedDept && selectedDept.memberCount > 0 && (
              <p className="mt-2 text-sm text-destructive">
                该部门下有 {selectedDept.memberCount} 名成员，请先转移或删除成员。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员能力详情对话框 */}
      <Dialog open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              成员详情 - {selectedMember?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`} />
                  <AvatarFallback>{selectedMember.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-lg">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedMember.departmentName || '未分配部门'}</Badge>
                    <Badge variant="secondary">{selectedMember.role}</Badge>
                  </div>
                </div>
              </div>

              {/* 能力档案 */}
              <MemberCapabilities
                memberId={selectedMember.id}
                capabilities={memberCapabilities?.capabilities || []}
                overallScore={memberCapabilities?.overallScore || 0}
                lastAssessmentDate={memberCapabilities?.lastAssessmentDate || null}
                isLoading={isLoadingCapabilities}
              />

              {/* 添加评定按钮 */}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setCapabilityDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加能力评定
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 能力评定对话框 */}
      <MemberCapabilityDialog
        open={capabilityDialogOpen}
        onOpenChange={setCapabilityDialogOpen}
        member={selectedMember}
      />
    </div>
  );
}
