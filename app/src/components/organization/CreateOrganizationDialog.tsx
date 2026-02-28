/**
 * 新建组织架构对话框组件
 *
 * 职责：
 * 1. 收集组织基本信息
 * 2. 创建第一个部门及其经理
 * 3. 自动创建部门经理成员和登录账户
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Check, Info } from 'lucide-react';
import type { OrganizationStructure } from '@/types/organization';
import { saveOrganization } from '@/utils/organizationManager';

interface CreateOrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (org: OrganizationStructure) => void;
  userId?: string;
}

export function CreateOrganizationDialog({
  isOpen,
  onClose,
  onSuccess,
  userId
}: CreateOrganizationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const handleCreate = async () => {
    // 验证必填字段
    if (!deptName.trim() || !managerEmployeeId.trim() || !managerName.trim()) {
      return;
    }

    // 验证工号唯一性
    try {
      const USERS_STORAGE_KEY = 'app_users';
      const usersData = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersData) {
        const users = JSON.parse(usersData);
        if (users[managerEmployeeId.trim()]) {
          alert(`工号 "${managerEmployeeId.trim()}" 已存在，请使用其他工号`);
          return;
        }
      }
    } catch (error) {
      console.error('[CreateOrganizationDialog] 工号验证失败:', error);
    }

    setLoading(true);
    setGeneratedPassword(null);

    try {
      // 生成安全的随机密码（12位，包含大小写字母、数字和特殊字符）
      const generatePassword = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const array = new Uint32Array(12);
        crypto.getRandomValues(array);
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(array[i] % chars.length);
        }
        return password;
      };

      const tempPassword = generatePassword();
      setGeneratedPassword(tempPassword);

      // 创建部门经理成员节点
      const managerMember = {
        id: `member_${Date.now()}_manager`,
        employeeId: managerEmployeeId.trim(),
        name: managerName.trim(),
        level: 'member' as const,
        parentId: `dept_${Date.now()}`, // 临时ID，下面会替换
        role: 'dept_manager' as const,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 创建组织架构
      const deptId = `dept_${Date.now()}`;
      const newOrg: OrganizationStructure = {
        version: 1,
        lastUpdated: Date.now(),
        lastUpdatedBy: userId || 'unknown',
        departments: [
          {
            id: deptId,
            name: deptName.trim(),
            level: 'department',
            parentId: null,
            description: deptDescription.trim() || undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            children: [managerMember] // 部门经理作为子成员
          }
        ]
      };

      // 修正成员的 parentId
      managerMember.parentId = deptId;

      // 保存组织架构
      await saveOrganization(newOrg);

      // 自动创建系统账号
      try {
        const USERS_STORAGE_KEY = 'app_users';
        const usersData = localStorage.getItem(USERS_STORAGE_KEY);
        const users = usersData ? JSON.parse(usersData) : {};

        // 创建用户账号（账号=工号，密码=随机生成的密码）
        users[managerEmployeeId.trim()] = {
          password: tempPassword,
          role: 'dept_manager',
          name: managerName.trim()
        };

        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        console.log('[CreateOrganizationDialog] 部门经理账号已创建:', managerEmployeeId, tempPassword);
      } catch (error) {
        console.error('[CreateOrganizationDialog] 创建部门经理账号失败:', error);
      }

      onSuccess(newOrg);

      // 清空表单
      setDeptName('');
      setManagerEmployeeId('');
      setManagerName('');
      setDeptDescription('');
    } catch (error) {
      console.error('[CreateOrganizationDialog] 创建组织架构失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDeptName('');
    setManagerEmployeeId('');
    setManagerName('');
    setDeptDescription('');
    setGeneratedPassword(null);
    onClose();
  };

  const isFormValid = deptName.trim() && managerEmployeeId.trim() && managerName.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            新建组织架构
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 部门名称 */}
          <div>
            <Label htmlFor="deptName" className="text-white">
              第一个部门名称 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="deptName"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="例如：研发一部"
              className="bg-slate-700 border-slate-600 text-white mt-1.5"
            />
          </div>

          {/* 部门经理工号 */}
          <div>
            <Label htmlFor="managerEmployeeId" className="text-white">
              部门经理工号 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="managerEmployeeId"
              value={managerEmployeeId}
              onChange={(e) => setManagerEmployeeId(e.target.value)}
              placeholder="例如：E001（将作为登录账号）"
              className="bg-slate-700 border-slate-600 text-white mt-1.5"
            />
            <p className="text-xs text-slate-400 mt-1">工号将自动成为该成员的登录账号</p>
          </div>

          {/* 部门经理姓名 */}
          <div>
            <Label htmlFor="managerName" className="text-white">
              部门经理姓名 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="managerName"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="输入部门经理的真实姓名"
              className="bg-slate-700 border-slate-600 text-white mt-1.5"
            />
          </div>

          {/* 部门描述 */}
          <div>
            <Label htmlFor="deptDescription" className="text-white">
              部门描述
            </Label>
            <Textarea
              id="deptDescription"
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
              placeholder="简要描述部门的职责..."
              rows={3}
              className="bg-slate-700 border-slate-600 text-white mt-1.5"
            />
          </div>

          {/* 提示信息 */}
          <Alert className="bg-blue-900/30 border-blue-700">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-sm text-blue-200">
              <p className="font-medium mb-1">创建后将自动完成：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>创建组织架构和第一个部门</li>
                <li>创建部门经理成员节点</li>
                <li>生成随机密码（8位）</li>
                <li>创建登录账号（账号=工号）</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* 密码显示（生成后） */}
          {generatedPassword && (
            <Alert className="bg-green-900/30 border-green-700">
              <Check className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-sm text-green-200">
                <p className="font-medium">账号创建成功！</p>
                <p className="text-xs mt-1">
                  登录账号：<strong>{managerEmployeeId}</strong><br />
                  初始密码：<strong className="select-all">{generatedPassword}</strong>
                </p>
                <p className="text-xs mt-2 text-yellow-300">
                  ⚠️ 请务必记录此密码，关闭后将无法再次查看
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isFormValid || loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? '创建中...' : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  创建组织
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
