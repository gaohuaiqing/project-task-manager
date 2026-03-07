/**
 * 个人信息设置组件
 *
 * 功能：
 * 1. 显示用户基本信息
 * 2. 编辑用户姓名
 * 3. 修改密码入口
 *
 * @module components/settings/SettingsProfile
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, ShieldCheck, Edit3, Check, X, Lock, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, type AuthUser } from '@/types/auth';

export interface SettingsProfileProps {
  /** 当前用户 */
  user?: AuthUser;
  /** 是否是管理员 */
  isAdmin: boolean;
  /** 更新用户信息 */
  onUpdateName: (name: string) => void;
  /** 打开密码修改对话框 */
  onChangePassword: () => void;
}

/**
 * 个人信息设置组件
 *
 * @example
 * ```tsx
 * <SettingsProfile
 *   user={user}
 *   isAdmin={isAdmin}
 *   onUpdateName={(name) => updateUserProfile({ name })}
 *   onChangePassword={() => setIsPasswordDialogOpen(true)}
 * />
 * ```
 */
export function SettingsProfile({
  user,
  isAdmin,
  onUpdateName,
  onChangePassword,
}: SettingsProfileProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');

  // 同步用户名称
  useEffect(() => {
    if (user) {
      setEditName(user.name);
    }
  }, [user?.name]);

  /**
   * 保存姓名
   */
  const handleSaveName = () => {
    if (editName.trim()) {
      onUpdateName(editName.trim());
      setIsEditingName(false);
    }
  };

  /**
   * 取消编辑
   */
  const handleCancelNameEdit = () => {
    setEditName(user?.name || '');
    setIsEditingName(false);
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          {isAdmin ? (
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          ) : (
            <User className="w-5 h-5 text-blue-400" />
          )}
          {isAdmin ? '管理员信息' : '个人信息'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 用户头像和信息 */}
        <div className="p-4 rounded-lg bg-slate-800">
          <div className="flex items-center gap-4">
            {/* 头像 */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <div className="text-white font-bold text-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex-1">
              {/* 姓名编辑 */}
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

              {/* 用户详细信息 */}
              <p className="text-sm text-slate-400 mt-1">
                <IdCard className="w-3 h-3 inline mr-1" />
                工号:{' '}
                <span className="font-mono text-slate-300 inline">
                  {user?.username || '-'}
                </span>
              </p>
              <p className="text-sm text-slate-400">
                <User className="w-3 h-3 inline mr-1" />
                当前身份:{' '}
                <span
                  className={cn(
                    'font-medium inline',
                    user?.role === 'admin' ? 'text-amber-400' : 'text-blue-400'
                  )}
                >
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
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={onChangePassword}
            >
              <Lock className="w-4 h-4 mr-2" />
              修改密码
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsProfile;
