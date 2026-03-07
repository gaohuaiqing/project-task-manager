/**
 * 苹果风格徽章组件
 * Apple Style Badge Component
 *
 * 用于展示状态、标签、计数等小型信息标识
 */

import React from 'react';

export interface AppleBadgeProps {
  /**
   * 徽章文本内容
   */
  children: React.ReactNode;

  /**
   * 徽章变体
   */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

  /**
   * 徽章尺寸
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 是否为圆点样式
   */
  dot?: boolean;

  /**
   * 是否显示计数徽章
   */
  count?: number;

  /**
   * 计数徽章最大显示值（超过显示 99+）
   */
  maxCount?: number;

  /**
   * 自定义样式类名
   */
  className?: string;
}

/**
 * 苹果风格徽章组件
 *
 * @example
 * ```tsx
 * <AppleBadge variant="success">已完成</AppleBadge>
 * <AppleBadge variant="primary" count={5} />
 * <AppleBadge variant="danger" dot />
 * ```
 */
export const AppleBadge: React.FC<AppleBadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  count,
  maxCount = 99,
  className = '',
}) => {
  // 基础样式类
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-full',
    'transition-all',
    'duration-fast',
    'timing-apple-out',
  ];

  // 变体样式
  const variantClasses: Record<string, string[]> = {
    default: [
      'bg-muted',
      'text-muted-foreground',
      'border',
      'border-border',
    ],
    primary: [
      'bg-system-blue',
      'text-white',
      'shadow-blue-glow',
    ],
    success: [
      'bg-system-green',
      'text-white',
      'shadow-green-glow',
    ],
    warning: [
      'bg-system-orange',
      'text-white',
    ],
    danger: [
      'bg-system-red',
      'text-white',
      'shadow-red-glow',
    ],
    info: [
      'bg-system-indigo',
      'text-white',
    ],
  };

  // 尺寸样式
  const sizeClasses: Record<string, string[]> = {
    small: [
      'text-xs',
      'px-2',
      'py-0.5',
      'min-h-[20px]',
    ],
    medium: [
      'text-sm',
      'px-2.5',
      'py-1',
      'min-h-[24px]',
    ],
    large: [
      'text-base',
      'px-3',
      'py-1.5',
      'min-h-[28px]',
    ],
  };

  // 圆点样式
  const dotSizeClasses: Record<string, string> = {
    small: 'w-2 h-2',
    medium: 'w-2.5 h-2.5',
    large: 'w-3 h-3',
  };

  // 计数徽章样式
  const countSizeClasses: Record<string, string> = {
    small: 'min-w-[16px] h-4 text-[10px]',
    medium: 'min-w-[20px] h-5 text-xs',
    large: 'min-w-[24px] h-6 text-sm',
  };

  // 圆点模式
  if (dot) {
    return (
      <span
        className={cn(
          'rounded-full',
          dotSizeClasses[size],
          variantClasses[variant],
          'animate-pulse-slow',
          className
        )}
        aria-label="状态指示"
      />
    );
  }

  // 计数徽章模式
  if (count !== undefined) {
    const displayCount = count > maxCount ? `${maxCount}+` : count;
    return (
      <span
        className={cn(
          'rounded-full',
          countSizeClasses[size],
          variantClasses[variant],
          'flex',
          'items-center',
          'justify-center',
          'px-1.5',
          'font-semibold',
          className
        )}
        aria-label={`计数: ${count}`}
      >
        {displayCount}
      </span>
    );
  }

  // 默认文本徽章
  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

// 辅助函数：合并类名
function cn(...classes: (string | string[] | undefined | false)[]): string {
  return classes
    .flat()
    .filter(Boolean)
    .join(' ');
}

export default AppleBadge;
