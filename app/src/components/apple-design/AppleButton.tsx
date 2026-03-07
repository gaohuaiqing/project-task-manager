/**
 * 苹果风格按钮组件
 * Apple Style Button Component
 *
 * 展示如何使用设计令牌创建符合苹果设计规范的按钮
 */

import React from 'react';
import { designCombinations } from '@/styles/tokens';

export interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体
   */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

  /**
   * 按钮尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 是否加载中
   */
  loading?: boolean;

  /**
   * 按钮内容
   */
  children: React.ReactNode;
}

/**
 * 苹果风格按钮组件
 *
 * @example
 * ```tsx
 * <AppleButton variant="primary" size="medium">
 *   点击我
 * </AppleButton>
 * ```
 */
export const AppleButton: React.FC<AppleButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  children,
  className = '',
  ...props
}) => {
  // 基础样式
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '600',
    borderRadius: '10px',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    transition: 'all 200ms cubic-bezier(0.33, 1, 0.68, 1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  };

  // 尺寸样式
  const sizeStyles: Record<string, React.CSSProperties> = {
    small: {
      padding: '6px 12px',
      fontSize: '12px',
      lineHeight: '16px',
      minHeight: '28px',
    },
    medium: {
      padding: '8px 16px',
      fontSize: '14px',
      lineHeight: '20px',
      minHeight: '32px',
    },
    large: {
      padding: '10px 20px',
      fontSize: '16px',
      lineHeight: '24px',
      minHeight: '36px',
    },
  };

  // 变体样式
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'hsl(211, 98%, 52%)',
      color: '#ffffff',
      boxShadow: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'hsl(211, 98%, 52%)',
      border: '1px solid hsl(0, 0%, 88%)',
    },
    success: {
      backgroundColor: 'hsl(142, 69%, 58%)',
      color: '#ffffff',
    },
    warning: {
      backgroundColor: 'hsl(28, 93%, 62%)',
      color: '#ffffff',
    },
    danger: {
      backgroundColor: 'hsl(0, 84%, 60%)',
      color: '#ffffff',
    },
  };

  // 悬停样式
  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px hsl(211, 98%, 52% / 0.25)',
    },
    secondary: {
      transform: 'scale(1.02)',
      backgroundColor: 'hsl(211, 98%, 52% / 0.05)',
    },
    success: {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px hsl(142, 69%, 58% / 0.25)',
    },
    warning: {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px hsl(28, 93%, 62% / 0.25)',
    },
    danger: {
      transform: 'scale(1.02)',
      boxShadow: '0 4px 12px hsl(0, 84%, 60% / 0.25)',
    },
  };

  // 按下样式
  const activeStyles: React.CSSProperties = {
    transform: 'scale(0.97)',
    boxShadow: 'none',
  };

  // 禁用样式
  const disabledStyles: React.CSSProperties = {
    opacity: '0.5',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  };

  // 合并样式
  const buttonStyle: React.CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(disabled ? disabledStyles : {}),
  };

  // 处理鼠标进入事件
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, hoverStyles[variant]);
    }
  };

  // 处理鼠标离开事件
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, { transform: 'scale(1)', boxShadow: 'none' });
    }
  };

  // 处理按下事件
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, activeStyles);
    }
  };

  // 处理释放事件
  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, hoverStyles[variant]);
    }
  };

  return (
    <button
      style={buttonStyle}
      className={className}
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {loading && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
          <path
            d="M8 2A6 6 0 0 1 14 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default AppleButton;
