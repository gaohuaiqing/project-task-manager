/**
 * 组织架构设置页面
 * 单页面双栏布局：左侧组织架构树，右侧详情面板
 */
import { useState, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Users,
  User,
  Search,
  Phone,
  Mail,
  Shield,
  Calendar,
  Upload,
  Download,
  Crown,
  Star,
  FileSpreadsheet,
  UserPlus,
  Copy,
  Check,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDepartmentTree, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useMembers, useCreateMember, useUpdateMember, useDeactivateMember, useHardDeleteMember, useMemberDeletionCheck } from '@/features/org/hooks/useOrg';
import { useMemberCapabilities } from '@/features/assignment/hooks/useCapabilities';
import { useToast } from '@/hooks/use-toast';
import { MemberCapabilities } from '@/features/assignment/components/MemberCapabilities';
import { MemberCapabilityDialog } from '@/features/settings/components/MemberCapabilityDialog';
import { downloadOrganizationTemplate, exportOrganization, importOrganization } from '@/lib/api/org.api';
import type { Department, Member, MemberDeletionCheck } from '@/lib/api/org.api';
import { getAvatarUrl } from '@/utils/avatar';

interface DepartmentFormData {
  name: string;
  managerId: number | null;
}

interface MemberFormData {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
  departmentId: number | null;
  position: string;
  role: Member['role'];
}

const defaultMemberFormData: MemberFormData = {
  username: '',
  displayName: '',
  email: '',
  phone: '',
  gender: null,
  departmentId: null,
  position: '',
  role: 'engineer',
};

type SelectionType = 'none' | 'department' | 'member';

interface Selection {
  type: SelectionType;
  department?: Department;
  member?: Member;
}

const genderLabels: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

const roleLabels: Record<Member['role'], string> = {
  admin: '管理员',
  tech_manager: '技术经理',
  department_manager: '部门经理',
  engineer: '工程师',
};

const roleColors: Record<Member['role'], string> = {
  admin: 'bg-red-100 text-red-700',
  tech_manager: 'bg-blue-100 text-blue-700',
  department_manager: 'bg-amber-100 text-amber-700',
  engineer: 'bg-green-100 text-green-700',
};

// 管理人员角色（需要显示特殊徽标）
const MANAGER_ROLES: Set<Member['role']> = new Set(['admin', 'tech_manager', 'department_manager']);

// 判断是否为管理人员
function isManager(role: Member['role']): boolean {
  return MANAGER_ROLES.has(role);
}

// 获取管理角色徽标组件
function getManagerBadge(role: Member['role']): React.ReactNode | null {
  switch (role) {
    case 'admin':
      return <Shield className="absolute -top-1 -right-1 h-3 w-3 text-red-500 fill-red-400" />;
    case 'department_manager':
      return <Crown className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 fill-amber-400" />;
    case 'tech_manager':
      return <Star className="absolute -top-1 -right-1 h-3 w-3 text-blue-500 fill-blue-400" />;
    default:
      return null;
  }
}

// 获取管理角色头像边框颜色
function getManagerRingColor(role: Member['role']): string {
  switch (role) {
    case 'admin':
      return 'ring-red-400';
    case 'department_manager':
      return 'ring-amber-400';
    case 'tech_manager':
      return 'ring-blue-400';
    default:
      return '';
  }
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
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [capabilityDialogOpen, setCapabilityDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({ name: '', managerId: null });

  // 选中的节点（用于右侧详情面板）
  const [selection, setSelection] = useState<Selection>({ type: 'none' });

  // 导入导出状态
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 添加成员状态
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memberFormData, setMemberFormData] = useState<MemberFormData>(defaultMemberFormData);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // 编辑成员状态
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deletionCheckData, setDeletionCheckData] = useState<MemberDeletionCheck | null>(null);

  // 查询
  const { data: departments = [], isLoading, error } = useDepartmentTree();
  const { data: membersData } = useMembers({ pageSize: 100 });
  const { data: memberCapabilities, isLoading: isLoadingCapabilities } = useMemberCapabilities(
    selection.type === 'member' ? selection.member?.id : undefined
  );

  // 变更
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(selectedDept?.id || 0);
  const deleteMutation = useDeleteDepartment();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember(selectedMember?.id || 0);
  const deactivateMemberMutation = useDeactivateMember();
  const hardDeleteMemberMutation = useHardDeleteMember();
  const deletionCheckMutation = useMemberDeletionCheck();

  // 构建部门树
  const departmentTree = useMemo(() => buildDepartmentTree(departments), [departments]);
  const allMembers = membersData?.items || [];

  // 按部门分组成员
  const membersByDepartment = useMemo(() => {
    const map = new Map<number | null, Member[]>();
    allMembers.forEach(member => {
      const deptId = member.departmentId;
      if (!map.has(deptId)) {
        map.set(deptId, []);
      }
      map.get(deptId)!.push(member);
    });
    return map;
  }, [allMembers]);

  // 成员列表映射
  const memberMap = useMemo(() => {
    const map = new Map<number, Member>();
    allMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [allMembers]);

  // 构建带 children 的部门映射（用于快速查找）
  const departmentMapWithChildren = useMemo(() => {
    const map = new Map<number, Department>();
    const addToMap = (nodes: Department[]) => {
      nodes.forEach(node => {
        map.set(node.id, node);
        if (node.children?.length) {
          addToMap(node.children);
        }
      });
    };
    addToMap(departmentTree);
    return map;
  }, [departmentTree]);

  // 计算部门及其所有子部门的总人数
  const getDepartmentTotalCount = useMemo(() => {
    const calculate = (deptId: number): number => {
      const directMembers = membersByDepartment.get(deptId)?.length || 0;
      const dept = departmentMapWithChildren.get(deptId);
      if (!dept) return directMembers;

      const childrenCount = (dept.children || []).reduce(
        (sum, child) => sum + calculate(child.id),
        0
      );
      return directMembers + childrenCount;
    };
    return calculate;
  }, [membersByDepartment, departmentMapWithChildren]);

  // 过滤树节点（搜索）
  const filterTree = (nodes: Department[], query: string): Department[] => {
    if (!query) return nodes;
    return nodes.reduce((acc: Department[], node) => {
      const nameMatch = node.name.toLowerCase().includes(query.toLowerCase());
      const members = membersByDepartment.get(node.id) || [];
      const memberMatch = members.some(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.email?.toLowerCase().includes(query.toLowerCase())
      );
      const filteredChildren = filterTree(node.children || [], query);

      if (nameMatch || memberMatch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        });
        // 自动展开匹配的节点
        if (nameMatch || memberMatch) {
          setExpandedIds(prev => new Set(prev).add(node.id));
        }
      }
      return acc;
    }, []);
  };

  const filteredTree = searchQuery ? filterTree(departmentTree, searchQuery) : departmentTree;

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

  const handleSelectDepartment = (dept: Department) => {
    setSelection({ type: 'department', department: dept });
  };

  const handleSelectMember = (member: Member) => {
    setSelection({ type: 'member', member });
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
      // 更新选中状态
      if (selection.type === 'department' && selection.department?.id === selectedDept.id) {
        setSelection({
          type: 'department',
          department: { ...selectedDept, name: formData.name, managerId: formData.managerId }
        });
      }
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '更新失败', variant: 'destructive' });
    }
  };

  const submitDelete = async () => {
    if (!selectedDept) return;

    try {
      const result = await deleteMutation.mutateAsync(selectedDept.id);
      toast({
        title: '删除成功',
        description: `已删除 ${result.deletedDepartments} 个部门${result.deletedMembers > 0 ? `，${result.deletedMembers} 名成员` : ''}`
      });
      setDeleteDialogOpen(false);
      // 清除选中状态
      if (selection.type === 'department' && selection.department?.id === selectedDept.id) {
        setSelection({ type: 'none' });
      }
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '删除失败', variant: 'destructive' });
    }
  };

  // ========== 添加成员功能 ==========

  const handleAddMember = (departmentId: number) => {
    setMemberFormData({
      ...defaultMemberFormData,
      departmentId,
    });
    setInitialPassword(null);
    setPasswordCopied(false);
    setAddMemberDialogOpen(true);
  };

  const submitCreateMember = async () => {
    if (!memberFormData.username.trim()) {
      toast({ title: '错误', description: '请输入用户名（工号）', variant: 'destructive' });
      return;
    }
    if (!memberFormData.displayName.trim()) {
      toast({ title: '错误', description: '请输入显示名称', variant: 'destructive' });
      return;
    }
    if (!memberFormData.email.trim()) {
      toast({ title: '错误', description: '请输入邮箱', variant: 'destructive' });
      return;
    }
    if (!memberFormData.departmentId) {
      toast({ title: '错误', description: '请选择部门', variant: 'destructive' });
      return;
    }

    try {
      const result = await createMemberMutation.mutateAsync({
        username: memberFormData.username.trim(),
        displayName: memberFormData.displayName.trim(),
        email: memberFormData.email.trim(),
        phone: memberFormData.phone.trim() || undefined,
        gender: memberFormData.gender || undefined,
        departmentId: memberFormData.departmentId,
        position: memberFormData.position.trim() || undefined,
        role: memberFormData.role,
      });
      setInitialPassword(result.initialPassword);
      toast({ title: '成功', description: '成员创建成功' });
      // 不关闭对话框，显示初始密码
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '创建失败', variant: 'destructive' });
    }
  };

  const copyPassword = async () => {
    if (initialPassword) {
      await navigator.clipboard.writeText(initialPassword);
      setPasswordCopied(true);
      toast({ title: '已复制', description: '初始密码已复制到剪贴板' });
    }
  };

  const closeAddMemberDialog = () => {
    setAddMemberDialogOpen(false);
    setMemberFormData(defaultMemberFormData);
    setInitialPassword(null);
    setPasswordCopied(false);
  };

  // ========== 成员编辑和删除功能 ==========

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setMemberFormData({
      username: member.name.toLowerCase().replace(/\s+/g, '.'),
      displayName: member.name,
      email: member.email,
      phone: member.phone || '',
      gender: member.gender,
      departmentId: member.departmentId,
      position: member.position || '',
      role: member.role,
    });
    setEditMemberDialogOpen(true);
  };

  const handleDeleteMember = async (member: Member) => {
    setSelectedMember(member);
    setDeleteMemberDialogOpen(true);
    // 获取删除检查数据
    try {
      const checkData = await deletionCheckMutation.mutateAsync(member.id);
      setDeletionCheckData(checkData);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '获取删除检查数据失败', variant: 'destructive' });
    }
  };

  const submitEditMember = async () => {
    if (!selectedMember) return;
    if (!memberFormData.displayName.trim()) {
      toast({ title: '错误', description: '请输入显示名称', variant: 'destructive' });
      return;
    }
    if (!memberFormData.email.trim()) {
      toast({ title: '错误', description: '请输入邮箱', variant: 'destructive' });
      return;
    }

    try {
      await updateMemberMutation.mutateAsync({
        displayName: memberFormData.displayName.trim(),
        email: memberFormData.email.trim(),
        phone: memberFormData.phone.trim() || undefined,
        gender: memberFormData.gender || undefined,
        departmentId: memberFormData.departmentId,
        position: memberFormData.position.trim() || undefined,
        role: memberFormData.role,
      });
      toast({ title: '成功', description: '成员信息已更新' });
      setEditMemberDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
      // 更新选中状态
      if (selection.type === 'member' && selection.member?.id === selectedMember.id) {
        setSelection({
          type: 'member',
          member: { ...selection.member, name: memberFormData.displayName, ...memberFormData }
        });
      }
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '更新失败', variant: 'destructive' });
    }
  };

  const submitDeactivateMember = async () => {
    if (!selectedMember) return;

    try {
      await deactivateMemberMutation.mutateAsync(selectedMember.id);
      toast({ title: '成功', description: '成员已停用' });
      setDeleteMemberDialogOpen(false);
      // 清除选中状态
      if (selection.type === 'member' && selection.member?.id === selectedMember.id) {
        setSelection({ type: 'none' });
      }
      setSelectedMember(null);
      setDeletionCheckData(null);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '停用失败', variant: 'destructive' });
    }
  };

  const submitHardDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      await hardDeleteMemberMutation.mutateAsync(selectedMember.id);
      toast({ title: '成功', description: '成员已永久删除' });
      setDeleteMemberDialogOpen(false);
      // 清除选中状态
      if (selection.type === 'member' && selection.member?.id === selectedMember.id) {
        setSelection({ type: 'none' });
      }
      setSelectedMember(null);
      setDeletionCheckData(null);
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '删除失败', variant: 'destructive' });
    }
  };

  // ========== 导入导出功能 ==========

  const handleDownloadTemplate = async () => {
    try {
      await downloadOrganizationTemplate();
      toast({ title: '成功', description: '模板下载成功' });
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '下载模板失败', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportOrganization();
      toast({ title: '成功', description: '组织架构导出成功' });
    } catch (error: any) {
      toast({ title: '错误', description: error.message || '导出失败', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await importOrganization(file);
      toast({
        title: '导入成功',
        description: result.message || `创建 ${result.departments} 个部门，${result.members} 个成员`,
      });
      // 刷新数据 - 使用正确的查询键前缀
      queryClient.invalidateQueries({ queryKey: ['org', 'departments'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'members'] });
    } catch (error: any) {
      toast({ title: '导入失败', description: error.message || '请检查文件格式', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      // 清空文件选择
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // 响应式缩进：层级越深，每层缩进越小
  const getIndentPx = (level: number): number | undefined => {
    if (level === 0) return undefined;
    // 第1-2层：16px，第3-4层：12px，第5+层：8px
    const indentPerLevel = level <= 2 ? 16 : level <= 4 ? 12 : 8;
    const totalIndent = level * indentPerLevel;
    // 最大缩进 96px，确保内容不被挤出
    return Math.min(totalIndent, 96);
  };

  // 渲染部门树节点
  const renderDepartmentNode = (dept: Department, level: number = 0) => {
    const hasChildren = (dept.children?.length ?? 0) > 0;
    const isExpanded = expandedIds.has(dept.id);
    const isSelected = selection.type === 'department' && selection.department?.id === dept.id;
    const deptMembers = membersByDepartment.get(dept.id) || [];

    return (
      <div key={dept.id}>
        <div
          className={cn(
            'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
            isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
          )}
          style={{ marginLeft: getIndentPx(level) ? `${getIndentPx(level)}px` : undefined }}
          onClick={() => handleSelectDepartment(dept)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(dept.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <span className="w-5" />
            )}
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate font-medium text-sm">{dept.name}</span>
            <Badge variant="outline" className="text-xs ml-auto shrink-0">
              {deptMembers.length}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreate(dept.id)}>
                <Plus className="h-4 w-4 mr-2" />
                添加子部门
              </DropdownMenuItem>
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

        {/* 子部门 */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {dept.children!.map((child) => renderDepartmentNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 渲染成员节点（与子部门同级）
  const renderMemberNode = (member: Member, level: number = 0) => {
    const isSelected = selection.type === 'member' && selection.member?.id === member.id;
    const memberIsManager = isManager(member.role);
    const badge = getManagerBadge(member.role);
    const ringColor = getManagerRingColor(member.role);

    return (
      <div
        key={member.id}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
        )}
        style={{ marginLeft: getIndentPx(level) ? `${getIndentPx(level)}px` : undefined }}
        onClick={() => handleSelectMember(member)}
      >
        <span className="w-5" />
        <div className="relative shrink-0">
          <Avatar className={cn(
            "h-5 w-5",
            memberIsManager && `ring-2 ${ringColor} ring-offset-1`
          )}>
            <AvatarImage src={getAvatarUrl(member.name, member.gender)} />
            <AvatarFallback className="text-[8px]">{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {badge}
        </div>
        <span className="truncate text-sm">{member.name}</span>
        <Badge variant="secondary" className={cn(
          "text-xs ml-auto shrink-0",
          roleColors[member.role]
        )}>
          {roleLabels[member.role]}
        </Badge>
      </div>
    );
  };

  // 渲染带成员的部门树（成员与子部门同级）
  const renderTreeWithMembers = (nodes: Department[], level: number = 0) => {
    return nodes.map(dept => {
      const hasChildren = (dept.children?.length ?? 0) > 0;
      const isExpanded = expandedIds.has(dept.id);
      const deptMembers = membersByDepartment.get(dept.id) || [];
      const totalCount = getDepartmentTotalCount(dept.id);

      // 按角色排序：管理人员在前
      const sortedMembers = [...deptMembers].sort((a, b) => {
        const aIsManager = isManager(a.role) ? 0 : 1;
        const bIsManager = isManager(b.role) ? 0 : 1;
        return aIsManager - bIsManager;
      });

      return (
        <div key={dept.id} className="group">
          {/* 部门节点 */}
          <div
            className={cn(
              'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
              selection.type === 'department' && selection.department?.id === dept.id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-muted/50'
            )}
            style={{ marginLeft: getIndentPx(level) ? `${getIndentPx(level)}px` : undefined }}
            onClick={() => handleSelectDepartment(dept)}
            data-testid="org-tree-node"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(hasChildren || sortedMembers.length > 0) ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(dept.id);
                  }}
                  data-testid="org-tree-node-toggle"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              ) : (
                <span className="w-5" />
              )}
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate font-medium text-sm">{dept.name}</span>
              <Badge variant="outline" className="text-xs ml-auto shrink-0">
                {totalCount}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCreate(dept.id)} data-testid="org-btn-add-department">
                  <Plus className="h-4 w-4 mr-2" />
                  添加子部门
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(dept)} data-testid="org-btn-edit-department">
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(dept)}
                  data-testid="org-btn-delete-department"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 展开后的内容：成员 + 子部门（同级） */}
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {/* 成员节点（与子部门同级） */}
              {sortedMembers.map(member => renderMemberNode(member, level + 1))}

              {/* 子部门 */}
              {hasChildren && renderTreeWithMembers(dept.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // 渲染右侧详情面板
  const renderDetailPanel = () => {
    if (selection.type === 'none') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">请从左侧选择部门或成员</p>
          <p className="text-sm">查看详细信息和管理操作</p>
        </div>
      );
    }

    if (selection.type === 'department') {
      const dept = selection.department!;
      const deptMembers = membersByDepartment.get(dept.id) || [];
      const manager = dept.managerId ? memberMap.get(dept.managerId) : null;
      const totalMemberCount = getDepartmentTotalCount(dept.id);
      const directMemberCount = deptMembers.length;
      const childMemberCount = totalMemberCount - directMemberCount;

      return (
        <div className="space-y-6">
          {/* 部门信息 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{dept.name}</CardTitle>
                    <CardDescription>
                      共 {totalMemberCount} 人
                      {childMemberCount > 0 && (
                        <span className="text-muted-foreground">
                          {' '}(本部门 {directMemberCount} 人，下级 {childMemberCount} 人)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(dept)}>
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(dept)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">上级部门</span>
                  <p className="font-medium">
                    {dept.parentId ? departments.find(d => d.id === dept.parentId)?.name || '-' : '无'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">部门负责人</span>
                  <p className="font-medium">
                    {manager ? manager.name : '未指定'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 成员列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">成员列表</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setMemberFormData({
                        ...defaultMemberFormData,
                        departmentId: dept.id,
                      });
                      setInitialPassword(null);
                      setPasswordCopied(false);
                      setAddMemberDialogOpen(true);
                    }}
                    data-testid="org-btn-add-member"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    添加成员
                  </Button>
                  <Badge variant="outline">{deptMembers.length} 人</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {deptMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>该部门暂无成员</p>
                </div>
              ) : (
                <Table data-testid="org-table-members">
                  <TableHeader>
                    <TableRow>
                      <TableHead>成员</TableHead>
                      <TableHead>工号</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getAvatarUrl(member.name, member.gender)} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{member.name}</p>
                                {member.isBuiltin && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    内置
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{member.username}</code>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[member.role]}>
                            {roleLabels[member.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status === 'active' ? '活跃' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectMember(member)}
                          >
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (selection.type === 'member') {
      const member = selection.member!;

      return (
        <div className="space-y-6">
          {/* 人员信息 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={getAvatarUrl(member.name, member.gender)} />
                    <AvatarFallback className="text-xl">{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{member.name}</CardTitle>
                      {member.isBuiltin && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          内置用户
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Badge className={roleColors[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{member.username}</code>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status === 'active' ? '活跃' : '停用'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleEditMember(member)}>
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteMember(member)}
                    disabled={member.isBuiltin}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{member.email || '未设置'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{member.phone || '未设置'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{member.departmentName || '未分配部门'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>{genderLabels[member.gender || ''] || '未设置'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>加入时间：{member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '未知'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 能力档案 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">能力档案</CardTitle>
                <Button size="sm" onClick={() => setCapabilityDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加评定
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <MemberCapabilities
                memberId={member.id}
                capabilities={memberCapabilities?.capabilities || []}
                overallScore={memberCapabilities?.overallScore || 0}
                lastAssessmentDate={memberCapabilities?.lastAssessmentDate || null}
                isLoading={isLoadingCapabilities}
              />
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
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
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[600px]">
      {/* 左侧：组织架构树 */}
      <Card className="w-[340px] shrink-0 flex flex-col border-r-0 rounded-r-none" data-testid="org-tree-container">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              组织架构
            </CardTitle>
            <Button size="sm" onClick={() => handleCreate(null)} data-testid="org-btn-add-department">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* 搜索框 */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索部门或成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {filteredTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">暂无部门数据</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleCreate(null)}
                >
                  创建第一个部门
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {renderTreeWithMembers(filteredTree)}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        {/* 底部工具栏：导入/导出 */}
        <div className="border-t p-2 flex gap-2">
          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1" disabled={isImporting}>
                {isImporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                导入
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleImportClick} data-testid="org-btn-import">
                <Building2 className="h-4 w-4 mr-2" />
                导入组织架构
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadTemplate} data-testid="org-btn-download-template">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                下载导入模板
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1" disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExport} data-testid="org-btn-export">
                <Building2 className="h-4 w-4 mr-2" />
                导出组织架构
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* 分隔线 */}
      <Separator orientation="vertical" className="h-auto" />

      {/* 右侧：详情面板 */}
      <Card className="flex-1 flex flex-col border-l-0 rounded-l-none" data-testid="org-detail-panel">
        <CardContent className="flex-1 overflow-auto p-6">
          {renderDetailPanel()}
        </CardContent>
      </Card>

      {/* 创建部门对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} data-testid="org-dialog-add-department">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedParentId ? '添加子部门' : '添加部门'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">部门名称 <span className="text-destructive">*</span></Label>
              <Input
                id="deptName"
                placeholder="请输入部门名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="org-input-department-name"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manager">部门负责人</Label>
                <span className="text-xs text-muted-foreground">（可选）</span>
              </div>
              <Select
                value={formData.managerId?.toString() || 'none'}
                onValueChange={(val) => setFormData({ ...formData, managerId: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {allMembers
                    .filter(member => member.departmentId !== null) // 只显示已有部门的成员
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name} ({member.departmentName || '未知部门'})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {allMembers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 提示：创建部门后，可在「成员管理」中添加成员，然后再指定部门负责人
                </p>
              )}
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} data-testid="org-dialog-edit-department">
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
                data-testid="org-input-department-name"
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} data-testid="org-dialog-delete-confirm">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除部门</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              确定要删除部门 "{selectedDept?.name}" 吗？
            </p>
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                ⚠️ 此操作将级联删除：
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                <li>该部门的所有子部门（递归删除）</li>
                <li>部门及子部门的成员将移动到上级部门</li>
                <li>如果没有上级部门，成员将变为"无部门"状态</li>
              </ul>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              此操作无法撤销。
            </p>
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

      {/* 添加成员对话框 */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen} data-testid="org-dialog-add-member">
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>
              在组织架构中添加新成员，系统将自动创建登录账户
            </DialogDescription>
          </DialogHeader>

          {initialPassword ? (
            <>
              <div className="space-y-4 px-1 py-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    ✅ 成员创建成功！
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    请保存以下初始密码，此密码只会显示一次。
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm border">
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
                <Button onClick={closeAddMemberDialog}>我已保存密码</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 px-1 py-2 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberUsername">用户名（工号） *</Label>
                    <Input
                      id="memberUsername"
                      placeholder="8位数字或6位字母数字"
                      value={memberFormData.username}
                      onChange={(e) => setMemberFormData({ ...memberFormData, username: e.target.value })}
                      data-testid="org-input-member-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberDisplayName">显示名称 *</Label>
                    <Input
                      id="memberDisplayName"
                      placeholder="用户显示名"
                      value={memberFormData.displayName}
                      onChange={(e) => setMemberFormData({ ...memberFormData, displayName: e.target.value })}
                      data-testid="org-input-member-name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">邮箱 *</Label>
                    <Input
                      id="memberEmail"
                      type="email"
                      placeholder="user@example.com"
                      value={memberFormData.email}
                      onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                      data-testid="org-input-member-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberPhone">电话</Label>
                    <Input
                      id="memberPhone"
                      placeholder="手机号码"
                      value={memberFormData.phone}
                      onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                      data-testid="org-input-member-phone"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberGender">性别</Label>
                    <Select
                      value={memberFormData.gender || 'none'}
                      onValueChange={(val) =>
                        setMemberFormData({ ...memberFormData, gender: val === 'none' ? null : val as 'male' | 'female' | 'other' })
                      }
                    >
                      <SelectTrigger data-testid="org-select-member-gender">
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不指定</SelectItem>
                        <SelectItem value="male">男</SelectItem>
                        <SelectItem value="female">女</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberDepartment">部门 *</Label>
                    <Select
                      value={memberFormData.departmentId?.toString() || 'none'}
                      onValueChange={(val) =>
                        setMemberFormData({ ...memberFormData, departmentId: val === 'none' ? null : parseInt(val) })
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
                    <Label htmlFor="memberRole">角色 *</Label>
                    <Select
                      value={memberFormData.role}
                      onValueChange={(val) => setMemberFormData({ ...memberFormData, role: val as Member['role'] })}
                    >
                      <SelectTrigger data-testid="org-select-member-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="department_manager">部门经理</SelectItem>
                        <SelectItem value="tech_manager">技术经理</SelectItem>
                        <SelectItem value="engineer">工程师</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberPosition">职位</Label>
                  <Input
                    id="memberPosition"
                    placeholder="如：高级工程师"
                    value={memberFormData.position}
                    onChange={(e) => setMemberFormData({ ...memberFormData, position: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeAddMemberDialog}>
                  取消
                </Button>
                <Button onClick={submitCreateMember} disabled={createMemberMutation.isPending}>
                  {createMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  确认添加
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 能力评定对话框 */}
      <MemberCapabilityDialog
        open={capabilityDialogOpen}
        onOpenChange={setCapabilityDialogOpen}
        member={selection.type === 'member' ? selection.member : null}
      />

      {/* 编辑成员对话框 */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen} data-testid="org-dialog-edit-member">
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
            <DialogDescription>修改成员信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-1 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDisplayName">显示名称 *</Label>
                <Input
                  id="editDisplayName"
                  placeholder="用户显示名"
                  value={memberFormData.displayName}
                  onChange={(e) => setMemberFormData({ ...memberFormData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">邮箱 *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={memberFormData.email}
                  onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhone">电话</Label>
                <Input
                  id="editPhone"
                  placeholder="手机号码"
                  value={memberFormData.phone}
                  onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editGender">性别</Label>
                <Select
                  value={memberFormData.gender || 'none'}
                  onValueChange={(val) =>
                    setMemberFormData({ ...memberFormData, gender: val === 'none' ? null : val as 'male' | 'female' | 'other' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未设置</SelectItem>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDepartment">部门 *</Label>
                <Select
                  value={memberFormData.departmentId?.toString() || ''}
                  onValueChange={(val) => setMemberFormData({ ...memberFormData, departmentId: val ? parseInt(val) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">角色 *</Label>
                <Select
                  value={memberFormData.role}
                  onValueChange={(val) => setMemberFormData({ ...memberFormData, role: val as Member['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="department_manager">部门经理</SelectItem>
                    <SelectItem value="tech_manager">技术经理</SelectItem>
                    <SelectItem value="engineer">工程师</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPosition">职位</Label>
              <Input
                id="editPosition"
                placeholder="如：高级工程师"
                value={memberFormData.position}
                onChange={(e) => setMemberFormData({ ...memberFormData, position: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitEditMember} disabled={updateMemberMutation.isPending}>
              {updateMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除成员确认对话框 */}
      <Dialog open={deleteMemberDialogOpen} onOpenChange={setDeleteMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除成员</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              确定要处理成员 <strong>{selectedMember?.name}</strong> 吗？
            </p>

            {deletionCheckData && (
              <div className="space-y-4">
                {/* 警告信息 */}
                {deletionCheckData.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">注意事项</p>
                        <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 list-disc list-inside">
                          {deletionCheckData.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 阻塞原因 */}
                {deletionCheckData.blockingReasons.length > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">无法永久删除</p>
                        <ul className="text-sm text-red-700 dark:text-red-300 mt-1 list-disc list-inside">
                          {deletionCheckData.blockingReasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 关联数据统计 */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">参与项目：</span>
                    <span className="font-medium ml-1">{deletionCheckData.stats.projects}</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">负责任务：</span>
                    <span className="font-medium ml-1">{deletionCheckData.stats.tasks}</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">审批记录：</span>
                    <span className="font-medium ml-1">{deletionCheckData.stats.approvals}</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">能力记录：</span>
                    <span className="font-medium ml-1">{deletionCheckData.stats.capabilityRecords}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeleteMemberDialogOpen(false)} className="w-full sm:w-auto">
              取消
            </Button>
            <Button
              variant="secondary"
              onClick={submitDeactivateMember}
              disabled={deactivateMemberMutation.isPending}
              className="w-full sm:w-auto"
            >
              {deactivateMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserX className="h-4 w-4 mr-2" />
              停用账户
            </Button>
            {deletionCheckData?.canDelete && (
              <Button
                variant="destructive"
                onClick={submitHardDeleteMember}
                disabled={hardDeleteMemberMutation.isPending}
                className="w-full sm:w-auto"
              >
                {hardDeleteMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Trash2 className="h-4 w-4 mr-2" />
                永久删除
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
