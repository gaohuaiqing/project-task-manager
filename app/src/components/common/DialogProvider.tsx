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
    default: 'bg-primary hover:bg-primary/90 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white'
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {safeOptions.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
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
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            {safeOptions.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          {safeOptions.multiline ? (
            <Textarea
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={safeOptions.placeholder}
              className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={safeOptions.placeholder}
              className="bg-slate-700 border-slate-600 text-white"
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} className="border-slate-600 text-white hover:bg-slate-700">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} className="bg-primary hover:bg-primary/90 text-white">
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
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' }
  };

  const config = variantConfig[safeOptions.variant || 'info'];
  const Icon = config.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {safeOptions.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90 text-white">
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
