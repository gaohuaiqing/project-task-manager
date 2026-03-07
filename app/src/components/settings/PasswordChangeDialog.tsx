/**
 * 密码修改对话框组件
 *
 * 功能：
 * 1. 统一的密码修改对话框
 * 2. 支持普通用户和管理员
 * 3. 表单验证和错误提示
 *
 * @module components/settings/PasswordChangeDialog
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Check, AlertCircle, Save } from 'lucide-react';
import { usePasswordDialog, type PasswordDialogState } from '@/hooks/usePasswordDialog';

export interface PasswordChangeDialogProps {
  /** 对话框是否打开 */
  isOpen: boolean;
  /** 关闭对话框回调 */
  onClose: () => void;
  /** 对话框标题 */
  title?: string;
  /** 密码修改函数 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

/**
 * 密码修改对话框组件
 *
 * @example
 * ```tsx
 * <PasswordChangeDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   changePassword={async (old, new) => {
 *     const result = await api.changePassword(old, new);
 *     return result.success;
 *   }}
 *   title="修改密码"
 * />
 * ```
 */
export function PasswordChangeDialog({
  isOpen,
  onClose,
  title = '修改密码',
  changePassword,
}: PasswordChangeDialogProps) {
  const passwordDialog = usePasswordDialog({
    changePassword,
    onClose,
  });

  // 同步外部打开状态
  React.useEffect(() => {
    if (isOpen && !passwordDialog.dialog.isOpen) {
      passwordDialog.openDialog();
    } else if (!isOpen && passwordDialog.dialog.isOpen) {
      passwordDialog.closeDialog();
    }
  }, [isOpen, passwordDialog]);

  return (
    <Dialog open={passwordDialog.dialog.isOpen} onOpenChange={passwordDialog.closeDialog}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 错误提示 */}
          {passwordDialog.dialog.error && (
            <Alert variant="destructive" className="bg-red-900 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{passwordDialog.dialog.error}</AlertDescription>
            </Alert>
          )}

          {/* 成功提示 */}
          {passwordDialog.dialog.success && (
            <Alert className="bg-green-900 border-green-700">
              <Check className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">
                {passwordDialog.dialog.success}
              </AlertDescription>
            </Alert>
          )}

          {/* 原密码 */}
          <div className="space-y-2">
            <Label className="text-white">原密码</Label>
            <Input
              type="password"
              placeholder="请输入原密码"
              value={passwordDialog.dialog.oldPassword}
              onChange={(e) => passwordDialog.setOldPassword(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label className="text-white">新密码</Label>
            <Input
              type="password"
              placeholder="请输入新密码（至少6位）"
              value={passwordDialog.dialog.newPassword}
              onChange={(e) => passwordDialog.setNewPassword(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <Label className="text-white">确认新密码</Label>
            <Input
              type="password"
              placeholder="请再次输入新密码"
              value={passwordDialog.dialog.confirmPassword}
              onChange={(e) => passwordDialog.setConfirmPassword(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={passwordDialog.closeDialog}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-secondary text-white"
              onClick={passwordDialog.handleSubmit}
              disabled={
                !passwordDialog.dialog.oldPassword ||
                !passwordDialog.dialog.newPassword ||
                !passwordDialog.dialog.confirmPassword
              }
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PasswordChangeDialog;
