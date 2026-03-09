/**
 * 统一的对话框组件
 * 配合 useDialog Hook 使用
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

// ================================================================
// Confirm Dialog 组件
// ================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger' | 'warning';
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  options,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  // 防御性检查：确保 options 不会是 undefined
  const safeOptions = options || { message: '' };
  const title = safeOptions.title || (safeOptions.variant === 'danger' ? '确认操作' : '提示');
  const confirmText = safeOptions.confirmText || '确定';
  const cancelText = safeOptions.cancelText || '取消';

  const variantStyles = {
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    danger: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white',
    warning: 'bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white'
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {safeOptions.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-border text-foreground hover:bg-accent">
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onConfirm} className={variantStyles[safeOptions.variant || 'default']}>
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ================================================================
// Input Dialog 组件
// ================================================================

interface InputDialogProps {
  isOpen: boolean;
  options: {
    title?: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    multiline?: boolean;
  };
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InputDialog({
  isOpen,
  options,
  value,
  onValueChange,
  onConfirm,
  onCancel
}: InputDialogProps) {
  // 防御性检查：确保 options 不会是 undefined
  const safeOptions = options || { message: '' };
  const title = safeOptions.title || '输入';
  const confirmText = safeOptions.confirmText || '确定';
  const cancelText = safeOptions.cancelText || '取消';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !safeOptions.multiline) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {safeOptions.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          {safeOptions.multiline ? (
            <Textarea
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={safeOptions.placeholder}
              className="bg-background border-border text-foreground min-h-[100px]"
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={safeOptions.placeholder}
              className="bg-background border-border text-foreground"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} className="border-border text-foreground hover:bg-accent">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ================================================================
// Alert Dialog 组件
// ================================================================

interface AlertDialogProps {
  isOpen: boolean;
  options: {
    title?: string;
    message: string;
    button_text?: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  };
  onClose: () => void;
}

export function CustomAlertDialog({
  isOpen,
  options,
  onClose
}: AlertDialogProps) {
  // 防御性检查：确保 options 不会是 undefined
  const safeOptions = options || { message: '' };
  const title = safeOptions.title || '提示';
  const buttonText = safeOptions.button_text || '确定';

  const variantConfig = {
    info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600/20 dark:bg-blue-400/20' },
    success: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-600/20 dark:bg-green-400/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600/20 dark:bg-amber-400/20' },
    error: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-600/20 dark:bg-red-400/20' }
  };

  const config = variantConfig[safeOptions.variant || 'info'];
  const Icon = config.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {safeOptions.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {buttonText}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ================================================================
// Dialog Provider 组件
// ================================================================

interface DialogProviderProps {
  children: React.ReactNode;
  confirmDialog: {
    isOpen: boolean;
    options?: { title?: string; message: string; confirmText?: string; cancelText?: string; variant?: 'default' | 'danger' | 'warning' };
    handleConfirm: () => void;
    handleCancel: () => void;
  };
  inputDialog: {
    isOpen: boolean;
    options?: { title?: string; message: string; placeholder?: string; defaultValue?: string; confirmText?: string; cancelText?: string; multiline?: boolean };
    inputValue: string;
    onValueChange: (value: string) => void;
    handleConfirm: () => void;
    handleCancel: () => void;
  };
  alertDialog: {
    isOpen: boolean;
    options?: { title?: string; message: string; button_text?: string; variant?: 'info' | 'success' | 'warning' | 'error' };
    handleClose: () => void;
  };
}

export function DialogProvider({
  children,
  confirmDialog,
  inputDialog,
  alertDialog
}: DialogProviderProps) {
  return (
    <>
      {children}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        options={confirmDialog.options}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
      <InputDialog
        isOpen={inputDialog.isOpen}
        options={inputDialog.options}
        value={inputDialog.inputValue}
        onValueChange={inputDialog.onValueChange}
        onConfirm={inputDialog.handleConfirm}
        onCancel={inputDialog.handleCancel}
      />
      <CustomAlertDialog
        isOpen={alertDialog.isOpen}
        options={alertDialog.options}
        onClose={alertDialog.handleClose}
      />
    </>
  );
}

// 默认导出
export default DialogProvider;
