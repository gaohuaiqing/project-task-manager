/**
 * 时间线右键菜单组件
 *
 * @module features/projects/components/TimelineContextMenu
 * @description 右键菜单，提供编辑、 复制、 删除等操作
 */

import { useEffect, useRef } from 'react';
import {
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Props 定义 ============

export interface TimelineContextMenuProps {
  /** 菜单位置 X */
  x: number;
  /** 菜单位置 Y */
  y: number;
  /** 菜单项列表 */
  items: Array<{
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
    onClick?: () => void;
    subItems?: Array<{
      id: string;
      label: string;
      onClick?: () => void;
    }>;
  }>;
  /** 关闭回调 */
  onClose: () => void;
}

 // ============ 组件实现 ============

export function TimelineContextMenu({
  x,
  y,
  items,
  onClose,
}: TimelineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ESC 键关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // 调整菜单位置确保不超出视口
  const adjustedPosition = () => {
    const menuWidth = 180;
    const menuHeight = items.length * 36;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10;
    }

    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10;
    }

    return { x: adjustedX, y: adjustedY };
  };

  const position = adjustedPosition();

  // 获取图标组件
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'pencil':
        return <Pencil className="h-4 w-4" />;
      case 'copy':
        return <Copy className="h-4 w-4" />;
      case 'trash':
        return <Trash2 className="h-4 w-4" />;
      case 'check':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'x':
        return <XCircle className="h-4 w-4" />;
      case 'chevron':
        return <ChevronRight className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50',
        'min-w-[180px]',
        'bg-white',
        'rounded-lg',
        'shadow-lg',
        'border',
        'py-1',
        'animate-in fade-in-0',
        'duration-150'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={index}
              className="my-1 border-t"
            />
          );
        }

        return (
          <div key={item.id} className="relative group">
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2',
                'text-sm text-left',
                'hover:bg-accent',
                'transition-colors',
                item.disabled && 'opacity-50 cursor-not-allowed',
                item.danger && 'text-red-600 hover:bg-red-50'
              )}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && item.onClick) {
                  item.onClick();
                  onClose();
                }
              }}
            >
              {item.icon && (
                <span className="flex-shrink-0">
                  {getIcon(item.icon)}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-muted-foreground">
                  {item.shortcut}
                </span>
              )}
              {item.subItems && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* 子菜单 */}
            {item.subItems && (
              <div
                className={cn(
                  'absolute left-full top-0',
                  'hidden group-hover:block',
                  'min-w-[150px]',
                  'bg-white',
                  'rounded-lg',
                  'shadow-lg',
                  'border',
                  'py-1',
                  'ml-1'
                )}
              >
                {item.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2',
                      'text-sm text-left',
                      'hover:bg-accent',
                      'transition-colors'
                    )}
                    onClick={() => {
                      if (subItem.onClick) {
                        subItem.onClick();
                        onClose();
                      }
                    }}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
