/**
 * 苹果风格模态框组件
 * Apple Style Modal Component
 *
 * 符合苹果设计规范的模态对话框，支持 backdrop-filter 效果
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';

export interface AppleModalProps {
  /**
   * 是否显示模态框
   */
  open: boolean;

  /**
   * 关闭模态框的回调
   */
  onClose: () => void;

  /**
   * 模态框标题
   */
  title?: string;

  /**
   * 模态框内容
   */
  children: React.ReactNode;

  /**
   * 底部操作按钮区域
   */
  footer?: React.ReactNode;

  /**
   * 模态框尺寸
   */
  size?: 'small' | 'medium' | 'large' | 'fullscreen';

  /**
   * 是否显示关闭按钮
   */
  showCloseButton?: boolean;

  /**
   * 点击遮罩层是否关闭
   */
  closeOnBackdropClick?: boolean;

  /**
   * 按 ESC 键是否关闭
   */
  closeOnEscape?: boolean;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 内容区域自定义样式类名
   */
  contentClassName?: string;
}

/**
 * 苹果风格模态框组件
 *
 * @example
 * ```tsx
 * <AppleModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="创建项目"
 *   size="medium"
 * >
 *   <p>模态框内容</p>
 * </AppleModal>
 * ```
 */
export const AppleModal: React.FC<AppleModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 尺寸样式
  const sizeClasses: Record<string, string> = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    fullscreen: 'max-w-full w-full h-full m-0 rounded-none',
  };

  // 处理 ESC 键关闭
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // 管理焦点
  useEffect(() => {
    if (open) {
      // 保存当前焦点元素
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 将焦点移到模态框
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);

      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    } else {
      // 恢复背景滚动
      document.body.style.overflow = '';

      // 恢复焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // 处理遮罩层点击
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* 遮罩层 */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-black/30',
          'backdrop-blur-apple-standard',
          'animate-fade-in'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* 模态框 */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative',
          'bg-background',
          'rounded-apple-modal',
          'shadow-apple-modal',
          'w-full',
          sizeClasses[size],
          'animate-scale-fade-in',
          'flex',
          'flex-col',
          'max-h-[90vh]',
          className
        )}
      >
        {/* 头部 */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex',
              'items-center',
              'justify-between',
              'p-6',
              'border-b',
              'border-border'
            )}
          >
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'w-8',
                  'h-8',
                  'rounded-full',
                  'flex',
                  'items-center',
                  'justify-center',
                  'text-muted-foreground',
                  'hover:bg-muted',
                  'hover:text-foreground',
                  'transition-colors',
                  'duration-fast',
                  'timing-apple-out'
                )}
                aria-label="关闭"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div
          className={cn(
            'flex-1',
            'overflow-y-auto',
            'p-6',
            contentClassName
          )}
        >
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div
            className={cn(
              'flex',
              'items-center',
              'justify-end',
              'gap-3',
              'p-6',
              'border-t',
              'border-border'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AppleModal;
