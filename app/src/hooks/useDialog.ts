/**
 * 统一的对话框 Hook
 * 替代原生 alert、confirm、prompt
 */

import { useState, useCallback } from 'react';

// ================================================================
// 类型定义
// ================================================================

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
}

export interface InputDialogOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  multiline?: boolean;
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  button_text?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

// ================================================================
// Confirm Dialog Hook
// ================================================================

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({ message: '' });
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(opts);
      setResolve(() => res);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolve?.(true);
    setIsOpen(false);
  }, [resolve]);

  const handleCancel = useCallback(() => {
    resolve?.(false);
    setIsOpen(false);
  }, [resolve]);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel
  };
}

// ================================================================
// Input Dialog Hook
// ================================================================

export function useInputDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<InputDialogOptions>({ message: '' });
  const [inputValue, setInputValue] = useState('');
  const [resolve, setResolve] = useState<((value: string | null) => void) | null>(null);

  const prompt = useCallback((opts: InputDialogOptions): Promise<string | null> => {
    return new Promise((res) => {
      setOptions(opts);
      setInputValue(opts.defaultValue || '');
      setResolve(() => res);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolve?.(inputValue);
    setIsOpen(false);
  }, [resolve, inputValue]);

  const handleCancel = useCallback(() => {
    resolve?.(null);
    setIsOpen(false);
  }, [resolve]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return {
    isOpen,
    options,
    inputValue,
    prompt,
    handleConfirm,
    handleCancel,
    handleInputChange
  };
}

// ================================================================
// Alert Dialog Hook
// ================================================================

export function useAlertDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertDialogOptions>({ message: '' });
  const [resolve, setResolve] = useState<(() => void) | null>(null);

  const alert = useCallback((opts: AlertDialogOptions | string): Promise<void> => {
    return new Promise((res) => {
      if (typeof opts === 'string') {
        setOptions({ message: opts });
      } else {
        setOptions(opts);
      }
      setResolve(() => res);
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    resolve?.();
    setIsOpen(false);
  }, [resolve]);

  return {
    isOpen,
    options,
    alert,
    handleClose
  };
}

// ================================================================
// 统一的对话框管理 Hook
// ================================================================

export function useDialog() {
  const confirmDialog = useConfirmDialog();
  const inputDialog = useInputDialog();
  const alertDialog = useAlertDialog();

  /**
   * 显示确认对话框
   * @example
   * const confirmed = await dialog.confirm('确定要删除吗？');
   * if (confirmed) { // 用户点击了确定 }
   */
  const confirm = useCallback((message: string, options?: Partial<ConfirmDialogOptions>) => {
    return confirmDialog.confirm({ message, ...options });
  }, [confirmDialog]);

  /**
   * 显示输入对话框
   * @example
   * const value = await dialog.prompt('请输入姓名:', { placeholder: '张三' });
   * if (value !== null) { // 用户输入了内容 }
   */
  const prompt = useCallback((message: string, options?: Partial<InputDialogOptions>) => {
    return inputDialog.prompt({ message, ...options });
  }, [inputDialog]);

  /**
   * 显示警告对话框
   * @example
   * await dialog.alert('操作成功！');
   */
  const alert = useCallback((message: string, options?: Partial<AlertDialogOptions>) => {
    const opts = typeof message === 'string'
      ? { message, ...options }
      : message;
    return alertDialog.alert(opts);
  }, [alertDialog]);

  return {
    confirm,
    prompt,
    alert,
    confirmDialog,
    inputDialog,
    alertDialog
  };
}
