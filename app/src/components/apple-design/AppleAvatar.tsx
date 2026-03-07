/**
 * 苹果风格头像组件
 * Apple Style Avatar Component
 *
 * 用于展示用户头像、组织标志等
 */

import React from 'react';

export interface AppleAvatarProps {
  /**
   * 头像图片地址
   */
  src?: string;

  /**
   * 备选文本（用户名首字母）
   */
  alt?: string;

  /**
   * 头像尺寸
   */
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

  /**
   * 头像形状
   */
  shape?: 'circle' | 'square';

  /**
   * 是否显示在线状态
   */
  status?: 'online' | 'offline' | 'away' | 'busy';

  /**
   * 是否可点击
   */
  clickable?: boolean;

  /**
   * 点击事件
   */
  onClick?: () => void;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 图片加载失败的回退组件
   */
  fallback?: React.ReactNode;
}

/**
 * 苹果风格头像组件
 *
 * @example
 * ```tsx
 * <AppleAvatar src="/avatar.jpg" alt="用户名" size="large" status="online" />
 * <AppleAvatar alt="张三" size="medium" />
 * ```
 */
export const AppleAvatar: React.FC<AppleAvatarProps> = ({
  src,
  alt = '',
  size = 'medium',
  shape = 'circle',
  status,
  clickable = false,
  onClick,
  className = '',
  fallback,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // 尺寸样式
  const sizeClasses: Record<string, string> = {
    xsmall: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
    xlarge: 'w-16 h-16 text-xl',
  };

  // 状态指示器尺寸
  const statusSizeClasses: Record<string, string> = {
    xsmall: 'w-1.5 h-1.5',
    small: 'w-2 h-2',
    medium: 'w-2.5 h-2.5',
    large: 'w-3 h-3',
    xlarge: 'w-3.5 h-3.5',
  };

  // 状态颜色
  const statusColorClasses: Record<string, string> = {
    online: 'bg-system-green shadow-green-glow',
    offline: 'bg-muted-foreground',
    away: 'bg-system-orange',
    busy: 'bg-system-red shadow-red-glow',
  };

  // 获取用户名首字母
  const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // 生成随机背景色（基于用户名）
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-system-blue',
      'bg-system-green',
      'bg-system-orange',
      'bg-system-red',
      'bg-system-purple',
      'bg-system-pink',
      'bg-system-indigo',
      'bg-system-yellow',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // 渲染头像内容
  const renderContent = () => {
    // 图片加载失败或没有图片源
    if (imageError || !src) {
      if (fallback) {
        return fallback;
      }
      return (
        <span
          className={cn(
            'font-semibold',
            'text-white',
            'flex',
            'items-center',
            'justify-center',
            'w-full',
            'h-full'
          )}
        >
          {alt ? getInitials(alt) : '?'}
        </span>
      );
    }

    // 图片加载中
    if (!imageLoaded) {
      return (
        <div className="animate-pulse bg-muted w-full h-full" />
      );
    }

    // 正常显示图片
    return null;
  };

  const baseClasses = [
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'flex-shrink-0',
    'overflow-hidden',
    'transition-all',
    'duration-fast',
    'timing-apple-out',
    sizeClasses[size],
  ];

  const shapeClasses = shape === 'circle' ? ['rounded-full'] : ['rounded-apple-card'];

  const interactiveClasses = clickable
    ? [
        'cursor-pointer',
        'hover:scale-105',
        'active:scale-95',
      ]
    : [];

  const containerClasses = cn(
    baseClasses,
    shapeClasses,
    interactiveClasses,
    className
  );

  const content = (
    <>
      {/* 背景色（仅在没有图片时显示） */}
      {(!src || imageError) && (
        <div
          className={cn(
            'absolute',
            'inset-0',
            getAvatarColor(alt)
          )}
        />
      )}

      {/* 图片 */}
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full',
            'h-full',
            'object-cover',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'transition-opacity',
            'duration-base'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* 回退内容 */}
      {renderContent()}

      {/* 在线状态指示器 */}
      {status && (
        <span
          className={cn(
            'absolute',
            'bottom-0',
            'right-0',
            'rounded-full',
            'border-2',
            'border-background',
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
          aria-label={`状态: ${status}`}
        />
      )}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className={containerClasses}
        onClick={onClick}
        aria-label={`${alt}的头像`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={containerClasses}>
      {content}
    </div>
  );
};

// 辅助函数：合并类名
function cn(...classes: (string | string[] | undefined | false)[]): string {
  return classes
    .flat()
    .filter(Boolean)
    .join(' ');
}

export default AppleAvatar;
