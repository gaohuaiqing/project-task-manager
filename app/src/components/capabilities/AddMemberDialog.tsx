/**
 * 添加成员对话框
 * 优化版本：纯数字工号、角色选择、职级属性、双列布局
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, AlertCircle, CheckSquare, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { UserRole } from '@/types/auth';
import { getAllTechGroups } from '@/utils/organizationManager';

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  employeeId?: string;
  name?: string;
  role?: string;
  level?: string;
}

// 角色选项
const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'engineer', label: '工程师' },
  { value: 'tech_manager', label: '技术经理' },
  { value: 'dept_manager', label: '部门经理' },
];

// 职级选项 E5-E14
const levelOptions = Array.from({ length: 10 }, (_, i) => {
  const level = `E${i + 5}`;
  return { value: level, label: level };
});

// 生成安全密码
const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  // 确保包含至少一个大写字母、一个小写字母、一个数字、一个特殊字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // 填充剩余长度
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < length; i++) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    password += allChars[randomArray[0] % allChars.length];
  }
  
  // 打乱密码字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// 验证纯数字工号
const validateEmployeeId = (employeeId: string): { valid: boolean; message: string } => {
  if (!employeeId || employeeId.trim() === '') {
    return { valid: false, message: '工号为必填项' };
  }
  
  const trimmed = employeeId.trim();
  
  // 纯数字验证
  const numericPattern = /^\d+$/;
  if (!numericPattern.test(trimmed)) {
    return { valid: false, message: '工号必须为纯数字' };
  }
  
  // 长度验证
  if (trimmed.length < 3) {
    return { valid: false, message: '工号长度至少为3位数字' };
  }
  
  if (trimmed.length > 10) {
    return { valid: false, message: '工号长度不能超过10位数字' };
  }
  
  return { valid: true, message: '' };
};

// 检查工号是否已存在
const isEmployeeIdExists = (employeeId: string): boolean => {
  const usersJson = localStorage.getItem('app_users') || '{}';
  const users = JSON.parse(usersJson);
  return Object.values(users).some((user: any) => 
    user.employeeId === employeeId.trim() || user.username === employeeId.trim()
  );
};

export function AddMemberDialog({ isOpen, onClose, onSuccess }: AddMemberDialogProps) {
  // 表单数据
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('engineer');
  const [level, setLevel] = useState('E5');

  // 技术组数据
  const [techGroups, setTechGroups] = useState<any[]>([]);

  // 加载技术组数据
  useEffect(() => {
    if (isOpen) {
      setTechGroups(getAllTechGroups());
    }
  }, [isOpen]);

  // 表单验证错误
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 生成的密码
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 复制反馈
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 重置表单
  const resetForm = useCallback(() => {
    setEmployeeId('');
    setName('');
    setRole('engineer');
    setLevel('E5');
    setErrors({});
    setTouched({});
    setGeneratedPassword('');
    setShowPassword(false);
    setSubmitError('');
    setSubmitSuccess(false);
    setCopiedField(null);
  }, []);

  // 关闭对话框
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 验证单个字段
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'employeeId':
        const validation = validateEmployeeId(value);
        if (!validation.valid) {
          return validation.message;
        }
        if (isEmployeeIdExists(value)) {
          return '该工号已被使用';
        }
        break;
      case 'name':
        if (!value.trim()) {
          return '姓名为必填项';
        }
        if (value.trim().length < 2) {
          return '姓名至少需要2个字符';
        }
        break;
      case 'role':
        if (!value) {
          return '请选择角色';
        }
        break;
      case 'level':
        if (!value) {
          return '请选择职级';
        }
        break;
    }
    return undefined;
  };

  // 字段失焦处理
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = field === 'employeeId' ? employeeId :
                  field === 'name' ? name :
                  field === 'role' ? role :
                  field === 'level' ? level :
                  '';
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // 字段变化处理
  const handleChange = (field: string, value: string) => {
    if (field === 'employeeId') {
      // 只允许输入数字
      const numericValue = value.replace(/\D/g, '');
      setEmployeeId(numericValue);
    } else if (field === 'name') {
      setName(value);
    } else if (field === 'role') {
      setRole(value as UserRole);
    } else if (field === 'level') {
      setLevel(value);
    }
    
    // 如果已经触碰过该字段，实时验证
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // 验证整个表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const employeeIdError = validateField('employeeId', employeeId);
    if (employeeIdError) newErrors.employeeId = employeeIdError;
    
    const nameError = validateField('name', name);
    if (nameError) newErrors.name = nameError;
    
    const roleError = validateField('role', role);
    if (roleError) newErrors.role = roleError;
    
    const levelError = validateField('level', level);
    if (levelError) newErrors.level = levelError;

    setErrors(newErrors);
    setTouched({
      employeeId: true,
      name: true,
      role: true,
      level: true
    });
    
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async () => {
    setSubmitError('');
    
    // 验证表单
    if (!validateForm()) {
      // 聚焦第一个错误字段
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // 生成密码
      const password = generateSecurePassword();
      setGeneratedPassword(password);

      // 创建用户数据
      const usersJson = localStorage.getItem('app_users') || '{}';
      const users = JSON.parse(usersJson);
      
      const trimmedEmployeeId = employeeId.trim();
      
      users[trimmedEmployeeId] = {
        id: trimmedEmployeeId,
        username: trimmedEmployeeId,
        name: name.trim(),
        role: role,
        level: level,
        employeeId: trimmedEmployeeId,
        password: password,
        createdAt: Date.now(),
      };

      localStorage.setItem('app_users', JSON.stringify(users));
      
      setSubmitSuccess(true);
      onSuccess();
    } catch (error) {
      setSubmitError('网络连接失败，请检查网络后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 获取技术组名称
  const getTechGroupName = (id: string) => {
    return techGroups.find(g => g.id === id)?.name || '';
  };

  // 获取角色标签
  const getRoleLabel = (roleValue: string) => {
    return roleOptions.find(r => r.value === roleValue)?.label || roleValue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            添加新成员
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            填写成员信息，系统将自动生成初始密码
          </DialogDescription>
        </DialogHeader>

        {!submitSuccess ? (
          <div className="space-y-4">
            {/* 全局错误提示 */}
            {submitError && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* 第一行：工号 + 姓名 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 工号输入 */}
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-foreground">
                  工号 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="employeeId"
                  type="text"
                  inputMode="numeric"
                  value={employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  onBlur={() => handleBlur('employeeId')}
                  placeholder="纯数字"
                  className={`bg-slate-700 border-slate-600 text-white ${
                    touched.employeeId && errors.employeeId ? 'border-red-500' : ''
                  }`}
                />
                {touched.employeeId && errors.employeeId && (
                  <p className="text-red-400 text-xs">{errors.employeeId}</p>
                )}
              </div>

              {/* 姓名输入 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  姓名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="请输入姓名"
                  className={`bg-slate-700 border-slate-600 text-white ${
                    touched.name && errors.name ? 'border-red-500' : ''
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="text-red-400 text-xs">{errors.name}</p>
                )}
              </div>
            </div>

            {/* 第二行：角色 + 职级 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 角色选择 */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-foreground">
                  角色 <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={role}
                  onValueChange={(value) => handleChange('role', value)}
                  onOpenChange={() => handleBlur('role')}
                >
                  <SelectTrigger
                    id="role"
                    className={`bg-slate-700 border-slate-600 text-white ${
                      touched.role && errors.role ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.role && errors.role && (
                  <p className="text-red-400 text-xs">{errors.role}</p>
                )}
              </div>

              {/* 职级选择 */}
              <div className="space-y-2">
                <Label htmlFor="level" className="text-foreground">
                  职级 <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={level}
                  onValueChange={(value) => handleChange('level', value)}
                  onOpenChange={() => handleBlur('level')}
                >
                  <SelectTrigger
                    id="level"
                    className={`bg-slate-700 border-slate-600 text-white ${
                      touched.level && errors.level ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue placeholder="选择职级" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[200px]">
                    {levelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.level && errors.level && (
                  <p className="text-red-400 text-xs">{errors.level}</p>
                )}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '添加成员'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-900/50 border-green-700">
              <CheckSquare className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">
                成员添加成功！
              </AlertDescription>
            </Alert>

            {/* 账户信息展示 */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-sm">姓名</span>
                  <p className="text-white font-medium">{name}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">角色</span>
                  <p className="text-white font-medium">{getRoleLabel(role)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-sm">职级</span>
                  <p className="text-white font-medium">{level}</p>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">登录账号（工号）</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium font-mono">{employeeId.trim()}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(employeeId.trim(), 'employeeId')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400 text-sm">初始密码</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-medium font-mono">
                      {showPassword ? generatedPassword : '••••••••••••'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(generatedPassword, 'password')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 复制反馈 */}
            {copiedField && (
              <Alert className="bg-blue-900/50 border-blue-700">
                <AlertDescription className="text-blue-200 text-sm">
                  {copiedField === 'password' ? '密码' : '工号'}已复制到剪贴板
                </AlertDescription>
              </Alert>
            )}

            {/* 安全提示 */}
            <Alert className="bg-yellow-900/30 border-yellow-700">
              <AlertDescription className="text-yellow-200 text-sm">
                请妥善保管初始密码，建议首次登录后立即修改密码。
              </AlertDescription>
            </Alert>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={handleClose}
              >
                完成
              </Button>
              <Button
                className="flex-1"
                onClick={resetForm}
              >
                继续添加
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AddMemberDialog;
