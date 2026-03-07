/**
 * 苹果风格标签页组件
 * Apple Style Tabs Component
 *
 * 符合苹果设计规范的标签页，支持滑动指示器
 */

import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';

export interface AppleTab {
  /**
   * 标签页唯一标识
   */
  key: string;

  /**
   * 标签页标题
   */
  label: string;

  /**
   * 标签页图标
   */
  icon?: React.ReactNode;

  /**
   * 标签页内容
   */
  content: React.ReactNode;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 徽章计数
   */
  badge?: number;
}

export interface AppleTabsProps {
  /**
   * 标签页列表
   */
  tabs: AppleTab[];

  /**
   * 默认激活的标签页
   */
  defaultActiveKey?: string;

  /**
   * 当前激活的标签页（受控）
   */
  activeKey?: string;

  /**
   * 标签页变化回调
   */
  onChange?: (key: string) => void;

  /**
   * 标签页位置
   */
  position?: 'top' | 'left' | 'right' | 'bottom';

  /**
   * 标签页样式变体
   */
  variant?: 'line' | 'enclosed' | 'soft';

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 标签页列表自定义样式类名
   */
  listClassName?: string;

  /**
   * 内容区域自定义样式类名
   */
  contentClassName?: string;
}

/**
 * 苹果风格标签页组件
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { key: '1', label: '概览', content: <div>内容1</div> },
 *   { key: '2', label: '详情', content: <div>内容2</div> },
 * ];
 *
 * <AppleTabs tabs={tabs} defaultActiveKey="1" />
 * ```
 */
export const AppleTabs: React.FC<AppleTabsProps> = ({
  tabs,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  position = 'top',
  variant = 'line',
  className = '',
  listClassName = '',
  contentClassName = '',
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(defaultActiveKey || tabs[0]?.key);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const activeKey = controlledActiveKey ?? internalActiveKey;

  const handleTabClick = (key: string) => {
    if (key === activeKey) return;
    setInternalActiveKey(key);
    onChange?.(key);
  };

  // 更新滑动指示器位置
  useEffect(() => {
    if (variant === 'line' && indicatorRef.current && activeTabRef.current) {
      const activeTab = activeTabRef.current;
      const indicator = indicatorRef.current;

      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.left = `${activeTab.offsetLeft}px`;
    }
  }, [activeKey, variant]);

  // 获取当前标签页内容
  const activeTab = tabs.find((tab) => tab.key === activeKey);

  // 布局方向
  const isVertical = position === 'left' || position === 'right';
  const directionClasses = cn(
    isVertical ? 'flex-row' : 'flex-col',
    position === 'right' && 'flex-row-reverse',
    position === 'bottom' && 'flex-col-reverse'
  );

  // 标签页列表样式
  const listVariantClasses: Record<string, string> = {
    line: cn(
      'relative',
      'border-b',
      'border-border',
      isVertical ? 'flex-col' : 'flex-row'
    ),
    enclosed: cn(
      'bg-muted',
      'p-1',
      'rounded-apple-card',
      'gap-1'
    ),
    soft: cn(
      'gap-2'
    ),
  };

  // 标签页按钮样式
  const tabVariantClasses: Record<string, Record<string, string>> = {
    line: {
      base: 'relative px-4 py-3 -mb-px transition-colors',
      active: 'text-foreground border-b-2 border-system-blue',
      inactive: 'text-muted-foreground hover:text-foreground',
    },
    enclosed: {
      base: 'flex-1 px-4 py-2 rounded-md transition-all',
      active: 'bg-background shadow-sm text-foreground',
      inactive: 'text-muted-foreground hover:text-foreground',
    },
    soft: {
      base: 'px-4 py-2 rounded-md transition-colors',
      active: 'bg-system-blue/10 text-system-blue',
      inactive: 'text-muted-foreground hover:text-foreground hover:bg-muted',
    },
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses,
        className
      )}
    >
      {/* 标签页列表 */}
      <div
        role="tablist"
        className={cn(
          'flex',
          isVertical ? 'flex-col' : 'flex-row',
          listVariantClasses[variant],
          listClassName
        )}
        style={{
          writingMode: isVertical ? 'vertical-rl' : undefined,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.key}
              ref={isActive ? activeTabRef : null}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                'flex',
                'items-center',
                'justify-center',
                'gap-2',
                'font-medium',
                'transition-all',
                'duration-fast',
                'timing-apple-out',
                'whitespace-nowrap',
                'focus:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-system-blue',
                'focus-visible:ring-offset-2',
                tabVariantClasses[variant].base,
                isActive
                  ? tabVariantClasses[variant].active
                  : tabVariantClasses[variant].inactive,
                isDisabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {tab.icon && (
                <span className="flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    'ml-1',
                    'px-1.5',
                    'min-w-[20px]',
                    'h-5',
                    'flex',
                    'items-center',
                    'justify-center',
                    'rounded-full',
                    'text-xs',
                    'font-semibold',
                    'bg-system-red',
                    'text-white'
                  )}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* 滑动指示器（仅 line 变体） */}
        {variant === 'line' && (
          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-0.5 bg-system-blue transition-all duration-300 ease-out"
            style={{ left: 0, width: 0 }}
          />
        )}
      </div>

      {/* 内容区域 */}
      <div
        role="tabpanel"
        className={cn(
          'flex-1',
          contentClassName
        )}
      >
        {activeTab?.content}
      </div>
    </div>
  );
};

export default AppleTabs;
