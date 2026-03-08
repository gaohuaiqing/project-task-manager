/**
 * 组织架构详情面板组件
 *
 * 职责：
 * 1. 显示选中节点的详细信息
 * 2. 支持编辑（部门经理/管理员）
 * 3. 成员节点显示能力模型雷达图
 * 4. 只读模式（技术经理）
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, User, Mail, Phone, Edit3, Trash2, Save, X, Plus, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import RadarChart from '@/components/common/RadarChart';
import { findNodeById, updateNode, deleteNode, updateMemberCapabilities, createDepartment, createTechGroup, createMember, getOrganization, saveOrganization, getAllTechGroups } from '@/utils/organizationManager';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/hooks/useDialog';
import type { OrgLevelType, OrganizationStructure, MemberCapabilities, Member, TechGroup, Department } from '@/types/organization';

interface OrganizationDetailPanelProps {
  selectedNodeId: string | null;
  selectedNodeType: OrgLevelType | null;
  orgStructure: OrganizationStructure | null;
  onNodeUpdate: () => void;
  onNodeDelete: () => void;
  readOnly?: boolean;
  // 从父组件控制对话框状态
  addDialogOpen?: 'department' | 'tech_group' | 'member' | null;
  setAddDialogOpen?: (open: 'department' | 'tech_group' | 'member' | null) => void;
}

export function OrganizationDetailPanel({
  selectedNodeId,
  selectedNodeType,
  orgStructure,
  onNodeUpdate,
  onNodeDelete,
  readOnly = false,
  addDialogOpen: externalAddDialogOpen,
  setAddDialogOpen: externalSetAddDialogOpen
}: OrganizationDetailPanelProps) {
  const { user } = useAuth();
  const dialog = useDialog();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editManagerName, setEditManagerName] = useState('');
  const [editDirectSupervisorId, setEditDirectSupervisorId] = useState<string>('');
  const [editCapabilities, setEditCapabilities] = useState<MemberCapabilities | null>(null);

  // 判断是否可以编辑能力模型（仅部门经理和管理员可编辑）
  const canEditCapabilities = () => {
    if (readOnly) return false;
    return user?.role === 'admin' || user?.role === 'dept_manager';
  };

  // 使用外部传入的对话框状态，如果没有则使用内部状态
  const [internalAddDialogOpen, setInternalAddDialogOpen] = useState<'department' | 'tech_group' | 'member' | null>(null);
  const addDialogOpen = externalAddDialogOpen ?? internalAddDialogOpen;
  const setAddDialogOpen = externalSetAddDialogOpen ?? setInternalAddDialogOpen;
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [newDeptManagerName, setNewDeptManagerName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupLeaderName, setNewGroupLeaderName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmployeeId, setNewMemberEmployeeId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'dept_manager' | 'tech_manager' | 'engineer'>('engineer');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  const node = selectedNodeId ? findNodeById(selectedNodeId, orgStructure || undefined) : null;

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>请选择左侧节点查看详情</p>
        </div>
      </div>
    );
  }

  const getNodeIcon = () => {
    switch (node.level) {
      case 'department':
        return <Building2 className="w-6 h-6 text-amber-400" />;
      case 'tech_group':
        return <Users className="w-6 h-6 text-blue-400" />;
      case 'member':
        return <User className="w-6 h-6 text-slate-400" />;
    }
  };

  const getNodeLabel = () => {
    switch (node.level) {
      case 'department':
        return '部门';
      case 'tech_group':
        return '技术组';
      case 'member':
        return '成员';
    }
  };

  const handleEdit = () => {
    setEditName(node.name);
    setEditDescription((node as Department | TechGroup).description || '');
    setEditManagerName((node as Department).managerName || '');
    setEditDirectSupervisorId((node as Member).directSupervisorId || '');
    setEditCapabilities((node as Member).capabilities || null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const updates: any = { name: editName };
    if (node.level !== 'member') {
      updates.description = editDescription;
      if (node.level === 'department') {
        updates.managerName = editManagerName;
      }
    } else {
      // 保存直属主管（仅管理员可修改）
      if (user?.role === 'admin' && editDirectSupervisorId) {
        updates.directSupervisorId = editDirectSupervisorId;
        // 查找主管姓名
        const supervisor = findNodeById(editDirectSupervisorId, orgStructure || undefined);
        if (supervisor) {
          updates.directSupervisorName = supervisor.name;
        }
      }
      // 如果有编辑能力模型，一并保存
      if (editCapabilities) {
        updates.capabilities = editCapabilities;
      }
    }

    const result = await updateNode(node.id, updates);
    if (result.success) {
      setIsEditing(false);
      onNodeUpdate();
    }
  };

  const handleDelete = async () => {
    const confirmed = await dialog.confirm(`确定要删除 "${node.name}" 吗？`, {
      title: '确认删除',
      variant: 'danger'
    });
    if (confirmed) {
      const result = await deleteNode(node.id);
      if (result.success) {
        onNodeDelete();
      } else {
        // 显示失败消息
        await dialog.alert(result.message || '删除失败', {
          title: '操作失败',
          variant: 'error'
        });
      }
    }
  };

  const handleCapabilityChange = (key: string, value: number) => {
    if (editCapabilities) {
      const newCapabilities = { ...editCapabilities, [key]: value };
      setEditCapabilities(newCapabilities);
    }
  };

  const handleCapabilitySave = async () => {
    if (node.level === 'member' && editCapabilities) {
      const result = await updateMemberCapabilities(node.id, editCapabilities);
      if (result.success) {
        onNodeUpdate();
      }
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    const result = await createDepartment(newDeptName, selectedNodeId, newDeptManagerName.trim() || undefined, newDeptDescription.trim() || undefined);
    if (result.success) {
      setNewDeptName('');
      setNewDeptDescription('');
      setNewDeptManagerName('');
      setAddDialogOpen(null);
      onNodeUpdate();
    }
  };

  const handleAddTechGroup = async () => {
    if (!newGroupName.trim()) return;
    const result = await createTechGroup(newGroupName, selectedNodeId, newGroupLeaderName.trim() || undefined, newGroupDescription.trim() || undefined);
    if (result.success) {
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupLeaderName('');
      setAddDialogOpen(null);
      onNodeUpdate();
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberEmployeeId.trim()) return;
    // Bug-P1-004修复：只保存邮箱字段，不保存电话字段
    const result = await createMember(
      selectedNodeId,
      newMemberEmployeeId.trim(),
      newMemberName.trim(),
      newMemberRole,
      newMemberEmail.trim() || ''  // 只保存邮箱
      // 电话不保存
    );
    if (result.success) {
      setNewMemberName('');
      setNewMemberEmployeeId('');
      setNewMemberEmail('');
      setNewMemberPhone('');
      setNewMemberRole('engineer');
      setAddDialogOpen(null);
      onNodeUpdate();
    }
  };

  // 部门节点详情
  if (node.level === 'department') {
    const dept = node as Department;
    return (
      <div className="p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getNodeIcon()}
            <div>
              <CardTitle className="text-white">{dept.name}</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{getNodeLabel()}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={handleEdit}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 编辑模式 */}
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">名称</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">部门经理</Label>
              <Input
                value={editManagerName}
                onChange={(e) => setEditManagerName(e.target.value)}
                placeholder="输入部门经理姓名"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">描述</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400 text-sm">描述</Label>
                <p className="text-white mt-1">{dept.description || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">部门经理</Label>
                <p className="text-white mt-1">{dept.managerName || '-'}</p>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-white font-semibold mb-3">统计信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">技术组</p>
                  <p className="text-white text-xl font-semibold mt-1">
                    {dept.children.filter(c => c.level === 'tech_group').length}
                  </p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-slate-400 text-sm">成员总数</p>
                  <p className="text-white text-xl font-semibold mt-1">
                    {/* Bug-P1-007修复：使用递归函数统计所有成员（包括子部门） */}
                    {(() => {
                      const countMembers = (nodes: typeof dept.children): number => {
                        if (!nodes) return 0;
                        let count = 0;
                        nodes.forEach(node => {
                          if (node.level === 'member') {
                            count++;
                          } else if (node.children) {
                            count += countMembers(node.children);
                          }
                        });
                        return count;
                      };
                      return countMembers(dept.children);
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* 添加子项 */}
            {!readOnly && (
              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-white font-semibold mb-3">添加子项</h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setAddDialogOpen('department')}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    添加子部门
                  </Button>
                  <Button
                    onClick={() => setAddDialogOpen('tech_group')}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    添加技术组
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // 技术组节点详情
  if (node.level === 'tech_group') {
    const group = node as TechGroup;
    return (
      <div className="p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getNodeIcon()}
            <div>
              <CardTitle className="text-white">{group.name}</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{getNodeLabel()}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={handleEdit}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 编辑模式 */}
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">名称</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">描述</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400 text-sm">描述</Label>
                <p className="text-white mt-1">{group.description || '-'}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">技术经理</Label>
                <p className="text-white mt-1">{group.leaderName || group.leaderId || '-'}</p>
              </div>
            </div>

            {/* 成员列表 */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">成员列表</h3>
                {!readOnly && (
                  <Button
                    onClick={() => setAddDialogOpen('member')}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加成员
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {group.children.length === 0 ? (
                  <p className="text-slate-400 text-sm">暂无成员</p>
                ) : (
                  group.children.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-white text-sm">{member.name}</p>
                          <p className="text-slate-400 text-xs">{member.employeeId}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                        {member.role === 'dept_manager' && '部门经理'}
                        {member.role === 'tech_manager' && '技术经理'}
                        {member.role === 'engineer' && '工程师'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // 成员节点详情
  if (node.level === 'member') {
    const member = node as Member;
    return (
      <div className="p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getNodeIcon()}
            <div>
              <CardTitle className="text-white">{member.name}</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{member.employeeId}</p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={handleEdit}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 编辑模式 */}
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">姓名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* 直属主管选择（仅管理员可修改） */}
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label className="text-white">直属主管</Label>
                <Select value={editDirectSupervisorId} onValueChange={setEditDirectSupervisorId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="选择直属主管" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {member.role === 'engineer' && (
                      // 工程师可以选择技术经理
                      getAllTechGroups().flatMap(group =>
                        group.children
                          .filter(m => m.role === 'tech_manager')
                          .map(manager => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name} ({manager.employeeId})
                            </SelectItem>
                          ))
                      )
                    )}
                    {member.role === 'tech_manager' && (
                      // 技术经理可以选择部门经理
                      orgStructure?.departments.flatMap(dept =>
                        (dept.children || []).filter(m => m.level === 'member' && (m as Member).role === 'dept_manager')
                          .map(manager => {
                            const mgr = manager as Member;
                            return (
                              <SelectItem key={mgr.id} value={mgr.id}>
                                {mgr.name} ({mgr.employeeId})
                              </SelectItem>
                            );
                          })
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 能力模型编辑 */}
            {canEditCapabilities() && editCapabilities && (
              <div className="space-y-2 pt-4 border-t border-slate-700">
                <Label className="text-white">能力模型</Label>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <RadarChart
                    capabilities={editCapabilities}
                    onChange={handleCapabilityChange}
                    editable={true}
                    showValues={true}
                    size="medium"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 基本信息 */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-sm">角色</Label>
                  <p className="text-white">
                    {member.role === 'dept_manager' && '部门经理'}
                    {member.role === 'tech_manager' && '技术经理'}
                    {member.role === 'engineer' && '工程师'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-sm">直属主管</Label>
                  <p className="text-white">{member.directSupervisorName || '-'}</p>
                </div>
              </div>
            </div>

            {/* 能力模型 */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">能力模型</h3>
                {canEditCapabilities() && member.capabilities && (
                  <Button
                    onClick={handleEdit}
                    className="text-xs"
                    variant="outline"
                    size="sm"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                )}
              </div>
              {member.capabilities ? (
                <div className="bg-slate-800 p-4 rounded-lg">
                  <RadarChart
                    capabilities={member.capabilities}
                    showValues={true}
                    size="medium"
                  />
                  {!canEditCapabilities() && (
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {user?.role === 'tech_manager' ? '（仅部门经理和管理员可编辑）' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">暂无能力评估数据</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

export function OrganizationDetailPanelWithDialogs(props: OrganizationDetailPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = useState<'department' | 'tech_group' | 'member' | null>(null);
  const [dialogName, setDialogName] = useState('');
  const [dialogManagerEmployeeId, setDialogManagerEmployeeId] = useState('');
  const [dialogManagerName, setDialogManagerName] = useState('');
  const [dialogLeaderEmployeeId, setDialogLeaderEmployeeId] = useState('');
  const [dialogLeaderName, setDialogLeaderName] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [dialogEmployeeId, setDialogEmployeeId] = useState('');
  const [dialogEmail, setDialogEmail] = useState('');
  const [dialogPhone, setDialogPhone] = useState('');
  const [dialogRole, setDialogRole] = useState<'dept_manager' | 'tech_manager' | 'engineer'>('engineer');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 存储创建成功后的账户信息
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ username: string; password: string; roleLabel: string } | null>(null);

  const handleDialogAdd = async () => {
    // 如果已经显示了账户信息，点击确定按钮则关闭对话框
    if (createdAccountInfo) {
      props.onNodeUpdate();
      // 清空表单和状态
      setDialogName('');
      setDialogManagerEmployeeId('');
      setDialogManagerName('');
      setDialogLeaderEmployeeId('');
      setDialogLeaderName('');
      setDialogDescription('');
      setDialogEmployeeId('');
      setDialogEmail('');
      setDialogPhone('');
      setDialogRole('engineer');
      setAddDialogOpen(null);
      setSubmitSuccess(null);
      setCreatedAccountInfo(null);
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      if (addDialogOpen === 'department') {
        // 部门名称、部门经理工号和姓名都是必填
        if (!dialogName.trim() || !dialogManagerEmployeeId.trim() || !dialogManagerName.trim()) {
          setSubmitError('请填写所有必填字段');
          setIsSubmitting(false);
          return;
        }
        const result = await createDepartment(
          dialogName,
          props.selectedNodeId,
          dialogManagerEmployeeId.trim(),
          dialogManagerName.trim(),
          dialogDescription.trim() || undefined
        );
        if (result.success) {
          setCreatedAccountInfo({
            username: dialogManagerEmployeeId,
            password: result.managerPassword || '未生成',
            roleLabel: '部门经理'
          });
        } else {
          setSubmitError(result.message || '部门创建失败');
        }
      } else if (addDialogOpen === 'tech_group') {
        // 技术组名称、技术经理工号和姓名都是必填
        if (!dialogName.trim() || !dialogLeaderEmployeeId.trim() || !dialogLeaderName.trim()) {
          setSubmitError('请填写所有必填字段');
          setIsSubmitting(false);
          return;
        }
        const result = await createTechGroup(
          dialogName,
          props.selectedNodeId,
          dialogLeaderEmployeeId.trim(),
          dialogLeaderName.trim(),
          dialogDescription.trim() || undefined
        );
        if (result.success) {
          setCreatedAccountInfo({
            username: dialogLeaderEmployeeId,
            password: result.leaderPassword || '未生成',
            roleLabel: '技术经理'
          });
        } else {
          setSubmitError(result.message || '技术组创建失败');
        }
      } else if (addDialogOpen === 'member') {
        if (!dialogName.trim() || !dialogEmployeeId.trim()) {
          setSubmitError('请填写所有必填字段');
          setIsSubmitting(false);
          return;
        }
        // Bug-P1-004修复：只保存邮箱字段，不保存电话字段
        const result = await createMember(
          props.selectedNodeId,
          dialogEmployeeId.trim(),
          dialogName.trim(),
          dialogRole,
          dialogEmail.trim() || ''  // 只保存邮箱
          // 电话不保存
        );
        if (result.success) {
          setCreatedAccountInfo({
            username: dialogEmployeeId,
            password: result.tempPassword || '未生成',
            roleLabel: dialogRole === 'dept_manager' ? '部门经理' : dialogRole === 'tech_manager' ? '技术经理' : '工程师'
          });
        } else {
          setSubmitError(result.message || '成员创建失败');
        }
      }
    } catch (error) {
      console.error('[OrganizationDetailPanel] 操作失败:', error);
      setSubmitError(error instanceof Error ? error.message : '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogName('');
    setDialogManagerEmployeeId('');
    setDialogManagerName('');
    setDialogLeaderEmployeeId('');
    setDialogLeaderName('');
    setDialogDescription('');
    setDialogEmployeeId('');
    setDialogRole('engineer');
    setAddDialogOpen(null);
    setSubmitSuccess(null);
    setCreatedAccountInfo(null);
  };

  // 复制密码到剪贴板
  const handleCopyPassword = async () => {
    if (createdAccountInfo) {
      try {
        await navigator.clipboard.writeText(createdAccountInfo.password);
        setSubmitSuccess('密码已复制到剪贴板');
        setTimeout(() => setSubmitSuccess(null), 2000);
      } catch {
        setSubmitError('复制失败，请手动复制');
      }
    }
  };

  return (
    <>
      <OrganizationDetailPanel
        {...props}
        addDialogOpen={addDialogOpen}
        setAddDialogOpen={setAddDialogOpen}
      />
      {/* 添加子部门对话框 */}
      <Dialog open={addDialogOpen === 'department'} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              添加子部门
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">部门名称 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
                placeholder="例如：研发二部"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">部门经理工号 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogManagerEmployeeId}
                onChange={(e) => setDialogManagerEmployeeId(e.target.value)}
                placeholder="输入部门经理工号"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">部门经理姓名 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogManagerName}
                onChange={(e) => setDialogManagerName(e.target.value)}
                placeholder="输入部门经理姓名"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">描述</Label>
              <Textarea
                value={dialogDescription}
                onChange={(e) => setDialogDescription(e.target.value)}
                placeholder="简要描述部门的职责..."
                rows={3}
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            {/* 错误提示 */}
            {submitError && !createdAccountInfo && (
              <Alert className="bg-red-900/30 border-red-700">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-sm text-red-200">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}
            {/* 账户创建成功提示 */}
            {createdAccountInfo && (
              <Alert className="bg-green-900/30 border-green-700">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-sm text-green-200">
                  <div className="space-y-2">
                    <p className="font-semibold">{createdAccountInfo.roleLabel}账户已创建成功！</p>
                    <div className="space-y-1 text-xs">
                      <p>账号：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.username}</span></p>
                      <p>密码：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.password}</span></p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPassword}
                        className="h-7 text-xs border-green-600 text-green-300 hover:bg-green-900/30"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制密码
                      </Button>
                      <span className="text-xs text-green-400/70 flex items-center">请妥善保管密码</span>
                    </div>
                    {submitSuccess && (
                      <p className="text-xs text-green-400 mt-1">{submitSuccess}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={handleDialogClose} variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                取消
              </Button>
              <Button onClick={handleDialogAdd} disabled={!dialogName.trim() || !dialogManagerEmployeeId.trim() || !dialogManagerName.trim() || isSubmitting} className="bg-primary hover:bg-primary/90">
                {createdAccountInfo ? '确定' : (isSubmitting ? '添加中...' : '添加')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加技术组对话框 */}
      <Dialog open={addDialogOpen === 'tech_group'} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              添加技术组
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">技术组名称 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
                placeholder="例如：前端组"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">技术经理工号 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogLeaderEmployeeId}
                onChange={(e) => setDialogLeaderEmployeeId(e.target.value)}
                placeholder="输入技术经理工号"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">技术经理姓名 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogLeaderName}
                onChange={(e) => setDialogLeaderName(e.target.value)}
                placeholder="输入技术经理姓名"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">描述</Label>
              <Textarea
                value={dialogDescription}
                onChange={(e) => setDialogDescription(e.target.value)}
                placeholder="简要描述技术组的职责..."
                rows={3}
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            {/* 错误提示 */}
            {submitError && !createdAccountInfo && (
              <Alert className="bg-red-900/30 border-red-700">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-sm text-red-200">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}
            {/* 账户创建成功提示 */}
            {createdAccountInfo && (
              <Alert className="bg-green-900/30 border-green-700">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-sm text-green-200">
                  <div className="space-y-2">
                    <p className="font-semibold">{createdAccountInfo.roleLabel}账户已创建成功！</p>
                    <div className="space-y-1 text-xs">
                      <p>账号：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.username}</span></p>
                      <p>密码：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.password}</span></p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPassword}
                        className="h-7 text-xs border-green-600 text-green-300 hover:bg-green-900/30"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制密码
                      </Button>
                      <span className="text-xs text-green-400/70 flex items-center">请妥善保管密码</span>
                    </div>
                    {submitSuccess && (
                      <p className="text-xs text-green-400 mt-1">{submitSuccess}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={handleDialogClose} variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700" disabled={isSubmitting}>
                取消
              </Button>
              <Button onClick={handleDialogAdd} disabled={!dialogName.trim() || !dialogLeaderEmployeeId.trim() || !dialogLeaderName.trim() || isSubmitting} className="bg-primary hover:bg-primary/90">
                {createdAccountInfo ? '确定' : (isSubmitting ? '添加中...' : '添加')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加成员对话框 */}
      <Dialog open={addDialogOpen === 'member'} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-card border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              添加成员
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">姓名 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
                placeholder="输入成员姓名"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">工号 <span className="text-red-400">*</span></Label>
              <Input
                value={dialogEmployeeId}
                onChange={(e) => setDialogEmployeeId(e.target.value)}
                placeholder="输入成员工号"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-white">角色</Label>
              <Select value={dialogRole} onValueChange={(v) => setDialogRole(v as any)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="engineer">工程师</SelectItem>
                  <SelectItem value="tech_manager">技术经理</SelectItem>
                  <SelectItem value="dept_manager">部门经理</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Bug-P1-005修复：添加邮箱输入框，不添加电话字段 */}
            <div>
              <Label className="text-white">邮箱</Label>
              <Input
                value={dialogEmail}
                onChange={(e) => setDialogEmail(e.target.value)}
                placeholder="输入成员邮箱"
                className="bg-slate-700 border-slate-600 text-white mt-1.5"
              />
            </div>
            {/* 错误提示 */}
            {submitError && !createdAccountInfo && (
              <Alert className="bg-red-900/30 border-red-700">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-sm text-red-200">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}
            {/* 账户创建成功提示 */}
            {createdAccountInfo && (
              <Alert className="bg-green-900/30 border-green-700">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-sm text-green-200">
                  <div className="space-y-2">
                    <p className="font-semibold">{createdAccountInfo.roleLabel}账户已创建成功！</p>
                    <div className="space-y-1 text-xs">
                      <p>账号：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.username}</span></p>
                      <p>密码：<span className="font-mono bg-green-900/50 px-2 py-0.5 rounded">{createdAccountInfo.password}</span></p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyPassword}
                        className="h-7 text-xs border-green-600 text-green-300 hover:bg-green-900/30"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        复制密码
                      </Button>
                      <span className="text-xs text-green-400/70 flex items-center">请妥善保管密码</span>
                    </div>
                    {submitSuccess && (
                      <p className="text-xs text-green-400 mt-1">{submitSuccess}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={handleDialogClose} variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
                取消
              </Button>
              <Button onClick={handleDialogAdd} disabled={!dialogName.trim() || !dialogEmployeeId.trim() || isSubmitting} className="bg-primary hover:bg-primary/90">
                {createdAccountInfo ? '确定' : (isSubmitting ? '添加中...' : '添加')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
