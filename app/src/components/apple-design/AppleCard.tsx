/**
 * 苹果风格卡片组件
 * Apple Style Card Component
 *
 * 展示如何使用设计令牌创建符合苹果设计规范的卡片
 */

import React from 'react';

export interface AppleCardProps {
  /**
   * 卡片标题
   */
  title?: string;

  /**
   * 卡片副标题
   */
  subtitle?: string;

  /**
   * 卡片内容
   */
  children: React.ReactNode;

  /**
   * 是否有阴影效果
   */
  elevated?: boolean;

  /**
   * 是否可悬停
   */
  hoverable?: boolean;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 点击事件
   */
  onClick?: () => void;

  /**
   * 卡片操作区域（右上角）
   */
  actions?: React.ReactNode;
}

/**
 * 苹果风格卡片组件
 *
 * @example
 * ```tsx
 * <AppleCard
 *   title="项目名称"
 *   subtitle="项目描述"
 *   elevated
 *   hoverable
 * >
 *   卡片内容
 * </AppleCard>
 * ```
 */
export const AppleCard: React.FC<AppleCardProps> = ({
  title,
  subtitle,
  children,
  elevated = false,
  hoverable = false,
  className = '',
  onClick,
  actions,
}) => {
  // 基础样式
  const baseStyle: React.CSSProperties = {
    backgroundColor: 'hsl(0, 0%, 100%)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid hsl(0, 0%, 88%)',
    transition: 'all 200ms cubic-bezier(0.33, 1, 0.68, 1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  };

  // 深色模式适配
  const isDarkMode = document.documentElement.classList.contains('dark');

  if (isDarkMode) {
    baseStyle.backgroundColor = 'hsl(0, 0%, 13%)';
    baseStyle.borderColor = 'hsl(0, 0%, 25%)';
  }

  // 浮起效果
  if (elevated) {
    baseStyle.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
  }

  // 可悬停效果
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable && !onClick) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable) {
      e.currentTarget.style.transform = 'translateY(0)';
      if (elevated) {
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
      } else {
        e.currentTarget.style.boxShadow = 'none';
      }
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // 标题区域样式
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: title || subtitle ? '16px' : '0',
  };

  const titleContentStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '24px',
    letterSpacing: '-0.01em',
    color: isDarkMode ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 13%)',
    margin: '0 0 4px 0',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
    color: isDarkMode ? 'hsl(0, 0%, 60%)' : 'hsl(0, 0%, 40%)',
    margin: '0',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  };

  const contentStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '20px',
    color: isDarkMode ? 'hsl(0, 0%, 75%)' : 'hsl(0, 0%, 40%)',
  };

  return (
    <div
      style={baseStyle}
      className={`${hoverable ? 'cursor-pointer' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {(title || subtitle || actions) && (
        <div style={headerStyle}>
          <div style={titleContentStyle}>
            {title && <h3 style={titleStyle}>{title}</h3>}
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
          </div>
          {actions && <div style={actionsStyle}>{actions}</div>}
        </div>
      )}
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

/**
 * 苹果风格卡片组组件
 * 用于展示多个相关卡片
 */
export interface AppleCardGroupProps {
  /**
   * 子卡片
   */
  children: React.ReactNode;

  /**
   * 卡片之间的间距
   */
  gap?: 'small' | 'medium' | 'large';

  /**
   * 是否等高
   */
  equalHeight?: boolean;

  /**
   * 自定义样式类名
   */
  className?: string;
}

export const AppleCardGroup: React.FC<AppleCardGroupProps> = ({
  children,
  gap = 'medium',
  equalHeight = false,
  className = '',
}) => {
  const groupStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: gap === 'small' ? '12px' : gap === 'medium' ? '16px' : '24px',
  };

  if (equalHeight) {
    groupStyle.alignItems = 'stretch';
  }

  return (
    <div style={groupStyle} className={className}>
      {children}
    </div>
  );
};

export default AppleCard;
