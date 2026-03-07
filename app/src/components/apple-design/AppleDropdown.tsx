/**
 * 苹果风格下拉菜单组件
 * Apple Style Dropdown Component
 *
 * 符合苹果设计规范的下拉菜单，支持键盘导航
 */

import React, { useRef, useState, useEffect } from 'react';
import cn from 'classnames';

export interface AppleDropdownItem {
  /**
   * 菜单项唯一标识
   */
  key: string;

  /**
   * 菜单项标签
   */
  label: string;

  /**
   * 菜单项图标
   */
  icon?: React.ReactNode;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 是否为危险操作
   */
  danger?: boolean;

  /**
   * 点击事件
   */
  onClick?: () => void;

  /**
   * 分隔线（在此项前显示）
   */
  divider?: boolean;
}

export interface AppleDropdownProps {
  /**
   * 触发元素
   */
  trigger: React.ReactNode;

  /**
   * 菜单项列表
   */
  items: AppleDropdownItem[];

  /**
   * 菜单对齐方式
   */
  align?: 'start' | 'end' | 'center';

  /**
   * 菜单宽度
   */
  width?: 'auto' | 'trigger' | number;

  /**
   * 是否禁用
   */
  disabled?: boolean;

  /**
   * 菜单打开/关闭回调
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 菜单容器自定义样式类名
   */
  menuClassName?: string;
}

/**
 * 苹果风格下拉菜单组件
 *
 * @example
 * ```tsx
 * const items = [
 *   { key: '1', label: '编辑', icon: <EditIcon />, onClick: () => {} },
 *   { key: '2', label: '删除', danger: true, onClick: () => {} },
 * ];
 *
 * <AppleDropdown trigger={<button>操作</button>} items={items} />
 * ```
 */
export const AppleDropdown: React.FC<AppleDropdownProps> = ({
  trigger,
  items,
  align = 'start',
  width = 'trigger',
  disabled = false,
  onOpenChange,
  className = '',
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 同步外部状态
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // 关闭菜单
  const closeMenu = () => {
    setOpen(false);
    setFocusedIndex(-1);
  };

  // 切换菜单
  const toggleMenu = () => {
    if (disabled) return;
    setOpen(!open);
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 键盘导航
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const enabledItems = items.filter((item) => !item.disabled);
            const newIndex = Math.min(prev + 1, enabledItems.length - 1);
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const enabledItems = items.filter((item) => !item.disabled);
            const newIndex = Math.max(prev - 1, 0);
            return newIndex;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          const enabledItems = items.filter((item) => !item.disabled);
          const focusedItem = enabledItems[focusedIndex];
          if (focusedItem) {
            focusedItem.onClick?.();
            closeMenu();
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeMenu();
          triggerRef.current?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, focusedIndex, items]);

  // 处理菜单项点击
  const handleItemClick = (item: AppleDropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    closeMenu();
  };

  // 菜单对齐样式
  const alignClasses: Record<string, string> = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  // 菜单宽度样式
  const getWidthStyle = (): React.CSSProperties => {
    if (width === 'trigger') {
      return { width: triggerRef.current?.offsetWidth };
    }
    if (typeof width === 'number') {
      return { width: `${width}px` };
    }
    return {};
  };

  const enabledItems = items.filter((item) => !item.disabled);

  return (
    <div
      ref={triggerRef}
      className={cn('relative', 'inline-block', className)}
    >
      {/* 触发器 */}
      <div
        onClick={toggleMenu}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMenu();
          }
        }}
        className={cn(
          'cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {/* 下拉菜单 */}
      {open && (
        <div
          ref={menuRef}
          className={cn(
            'absolute',
            'top-full',
            'mt-2',
            'z-dropdown',
            'bg-background',
            'rounded-apple-alert',
            'shadow-apple-dropdown',
            'border',
            'border-border',
            'py-1',
            'min-w-[160px]',
            'animate-scale-fade-in',
            alignClasses[align],
            menuClassName
          )}
          style={getWidthStyle()}
          role="menu"
        >
          {items.map((item, index) => {
            const itemEnabled = !item.disabled;
            const isFocused = focusedIndex === index;

            return (
              <React.Fragment key={item.key}>
                {item.divider && (
                  <div
                    className="my-1 h-px bg-border"
                    role="separator"
                  />
                )}
                <div
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => {
                    if (itemEnabled) {
                      setFocusedIndex(index);
                    }
                  }}
                  className={cn(
                    'flex',
                    'items-center',
                    'gap-3',
                    'px-4',
                    'py-2.5',
                    'cursor-pointer',
                    'transition-colors',
                    'duration-fast',
                    'timing-apple-out',
                    itemEnabled && [
                      'hover:bg-muted',
                      'text-foreground',
                    ],
                    item.disabled && [
                      'cursor-not-allowed',
                      'opacity-50',
                      'text-muted-foreground',
                    ],
                    item.danger && [
                      'text-system-red',
                      'hover:bg-system-red/10',
                    ],
                    isFocused && itemEnabled && 'bg-muted'
                  )}
                  role="menuitem"
                  tabIndex={itemEnabled ? -1 : undefined}
                  aria-disabled={item.disabled}
                >
                  {item.icon && (
                    <span className="flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppleDropdown;
