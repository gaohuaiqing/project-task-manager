/**
 * 密码对话框 Hook
 *
 * 功能：
 * 1. 管理密码对话框状态
 * 2. 处理密码修改逻辑
 * 3. 表单验证和错误提示
 *
 * @module hooks/usePasswordDialog
 */

import { useState, useCallback } from 'react';

export interface PasswordDialogState {
  isOpen: boolean;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  error: string;
  success: string;
}

export interface UsePasswordDialogOptions {
  /** 密码修改函数 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  /** 对话框关闭后的回调 */
  onClose?: () => void;
}

export interface UsePasswordDialogReturn {
  /** 对话框状态 */
  dialog: PasswordDialogState;
  /** 打开对话框 */
  openDialog: () => void;
  /** 关闭对话框 */
  closeDialog: () => void;
  /** 更新旧密码 */
  setOldPassword: (password: string) => void;
  /** 更新新密码 */
  setNewPassword: (password: string) => void;
  /** 更新确认密码 */
  setConfirmPassword: (password: string) => void;
  /** 提交密码修改 */
  handleSubmit: () => Promise<void>;
  /** 重置表单 */
  resetForm: () => void;
}

/**
 * 密码对话框 Hook
 *
 * @example
 * ```tsx
 * const passwordDialog = usePasswordDialog({
 *   changePassword: async (old, new) => {
 *     const result = await api.changePassword(old, new);
 *     return result.success;
 *   }
 * });
 *
 * return (
 *   <Dialog open={passwordDialog.dialog.isOpen} onOpenChange={passwordDialog.closeDialog}>
 *     <DialogContent>
 *       <Input
 *         value={passwordDialog.dialog.oldPassword}
 *         onChange={(e) => passwordDialog.setOldPassword(e.target.value)}
 *         type="password"
 *         placeholder="请输入原密码"
 *       />
 *       {/* ... 其他输入框 *\/}
 *       <Button onClick={passwordDialog.handleSubmit}>保存</Button>
 *     </DialogContent>
 *   </Dialog>
 * );
 * ```
 */
export function usePasswordDialog(options: UsePasswordDialogOptions): UsePasswordDialogReturn {
  const { changePassword, onClose } = options;

  const [dialog, setDialog] = useState<PasswordDialogState>({
    isOpen: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    error: '',
    success: '',
  });

  /**
   * 打开对话框
   */
  const openDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, isOpen: true }));
  }, []);

  /**
   * 关闭对话框
   */
  const closeDialog = useCallback(() => {
    resetForm();
    onClose?.();
  }, [onClose]);

  /**
   * 更新旧密码
   */
  const setOldPassword = useCallback((password: string) => {
    setDialog(prev => ({ ...prev, oldPassword: password, error: '', success: '' }));
  }, []);

  /**
   * 更新新密码
   */
  const setNewPassword = useCallback((password: string) => {
    setDialog(prev => ({ ...prev, newPassword: password, error: '', success: '' }));
  }, []);

  /**
   * 更新确认密码
   */
  const setConfirmPassword = useCallback((password: string) => {
    setDialog(prev => ({ ...prev, confirmPassword: password, error: '', success: '' }));
  }, []);

  /**
   * 重置表单
   */
  const resetForm = useCallback(() => {
    setDialog({
      isOpen: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      error: '',
      success: '',
    });
  }, []);

  /**
   * 提交密码修改
   */
  const handleSubmit = useCallback(async () => {
    // 清除之前的消息
    setDialog(prev => ({ ...prev, error: '', success: '' }));

    // 验证
    if (!dialog.oldPassword || !dialog.newPassword || !dialog.confirmPassword) {
      setDialog(prev => ({ ...prev, error: '请填写所有密码字段' }));
      return;
    }

    if (dialog.newPassword !== dialog.confirmPassword) {
      setDialog(prev => ({ ...prev, error: '新密码与确认密码不一致' }));
      return;
    }

    if (dialog.newPassword.length < 6) {
      setDialog(prev => ({ ...prev, error: '新密码至少需要6个字符' }));
      return;
    }

    // 执行密码修改
    const success = await changePassword(dialog.oldPassword, dialog.newPassword);

    if (success) {
      setDialog(prev => ({ ...prev, success: '密码修改成功' }));

      // 延迟关闭对话框
      setTimeout(() => {
        closeDialog();
      }, 1500);
    } else {
      setDialog(prev => ({ ...prev, error: '原密码不正确' }));
    }
  }, [dialog.oldPassword, dialog.newPassword, dialog.confirmPassword, changePassword, closeDialog]);

  return {
    dialog,
    openDialog,
    closeDialog,
    setOldPassword,
    setNewPassword,
    setConfirmPassword,
    handleSubmit,
    resetForm,
  };
}

export default usePasswordDialog;
