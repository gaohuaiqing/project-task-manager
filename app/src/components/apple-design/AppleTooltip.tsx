/**
 * 苹果风格工具提示组件
 * Apple Style Tooltip Component
 *
 * 符合苹果设计规范的工具提示
 */

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';

export interface AppleTooltipProps {
  /**
   * 工具提示内容
   */
  content: React.ReactNode;

  /**
   * 触发元素
   */
  children: React.ReactElement;

  /**
   * 工具提示位置
   */
  placement?:
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end'
    | 'right'
    | 'right-start'
    | 'right-end';

  /**
   * 触发方式
   */
  trigger?: 'hover' | 'click' | 'focus';

  /**
   * 延迟显示时间（毫秒）
   */
  delay?: number;

  /**
   * 箭头是否显示
   */
  showArrow?: boolean;

  /**
   * 自定义样式类名
   */
  className?: string;

  /**
   * 工具提示容器自定义样式类名
   */
  tooltipClassName?: string;

  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 苹果风格工具提示组件
 *
 * @example
 * ```tsx
 * <AppleTooltip content="这是提示内容" placement="top">
 *   <button>悬停我</button>
 * </AppleTooltip>
 * ```
 */
export const AppleTooltip: React.FC<AppleTooltipProps> = ({
  content,
  children,
  placement = 'top',
  trigger = 'hover',
  delay = 300,
  showArrow = true,
  className = '',
  tooltipClassName = '',
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // 计算工具提示位置
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const gap = 8; // 与触发元素的间距

    let top = 0;
    let left = 0;

    // 水平位置
    switch (placement) {
      case 'top':
      case 'bottom':
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'top-start':
      case 'bottom-start':
        left = triggerRect.left;
        break;
      case 'top-end':
      case 'bottom-end':
        left = triggerRect.left + triggerRect.width - tooltipRect.width;
        break;
      case 'left':
      case 'right':
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left-start':
      case 'right-start':
        left = triggerRect.left;
        break;
      case 'left-end':
      case 'right-end':
        left = triggerRect.left + triggerRect.width - tooltipRect.width;
        break;
    }

    // 垂直位置
    switch (placement) {
      case 'top':
      case 'top-start':
      case 'top-end':
        top = triggerRect.top - tooltipRect.height - gap;
        break;
      case 'bottom':
      case 'bottom-start':
      case 'bottom-end':
        top = triggerRect.bottom + gap;
        break;
      case 'left':
      case 'left-start':
      case 'left-end':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
      case 'right-start':
      case 'right-end':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }

    // 边界检测和调整
    const padding = 8;
    const maxLeft = window.innerWidth - tooltipRect.width - padding;
    const maxTop = window.innerHeight - tooltipRect.height - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    setPosition({ top: top + scrollTop, left: left + scrollLeft });
  };

  // 显示工具提示
  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  // 隐藏工具提示
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  // 更新位置
  useEffect(() => {
    if (visible) {
      // 等待 DOM 更新后计算位置
      requestAnimationFrame(() => {
        updatePosition();
      });
    }
  }, [visible, placement]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 箭头样式
  const getArrowStyle = (): React.CSSProperties => {
    const arrowSize = 8;
    const gap = 8;

    switch (placement) {
      case 'top':
        return {
          bottom: -arrowSize / 2,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'top-start':
        return {
          bottom: -arrowSize / 2,
          left: '12px',
          transform: 'rotate(45deg)',
        };
      case 'top-end':
        return {
          bottom: -arrowSize / 2,
          right: '12px',
          transform: 'rotate(45deg)',
        };
      case 'bottom':
        return {
          top: -arrowSize / 2,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        };
      case 'bottom-start':
        return {
          top: -arrowSize / 2,
          left: '12px',
          transform: 'rotate(45deg)',
        };
      case 'bottom-end':
        return {
          top: -arrowSize / 2,
          right: '12px',
          transform: 'rotate(45deg)',
        };
      case 'left':
        return {
          right: -arrowSize / 2,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
      case 'left-start':
        return {
          right: -arrowSize / 2,
          top: '12px',
          transform: 'rotate(45deg)',
        };
      case 'left-end':
        return {
          right: -arrowSize / 2,
          bottom: '12px',
          transform: 'rotate(45deg)',
        };
      case 'right':
        return {
          left: -arrowSize / 2,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
        };
      case 'right-start':
        return {
          left: -arrowSize / 2,
          top: '12px',
          transform: 'rotate(45deg)',
        };
      case 'right-end':
        return {
          left: -arrowSize / 2,
          bottom: '12px',
          transform: 'rotate(45deg)',
        };
      default:
        return {};
    }
  };

  // 事件处理器
  const eventHandlers = {
    hover: {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip,
    },
    click: {
      onClick: () => {
        visible ? hideTooltip() : showTooltip();
      },
    },
    focus: {
      onFocus: showTooltip,
      onBlur: hideTooltip,
    },
  };

  const handlers = trigger === 'hover' || trigger === 'focus' ? {
    ...eventHandlers.hover,
    ...eventHandlers.focus,
  } : eventHandlers[trigger];

  // 克隆子元素并添加事件处理器
  const triggerElement = React.cloneElement(children, {
    ref: triggerRef,
    ...handlers,
    'aria-describedby': visible ? 'apple-tooltip' : undefined,
  });

  return (
    <>
      {triggerElement}
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            id="apple-tooltip"
            className={cn(
              'fixed',
              'z-tooltip',
              'px-3',
              'py-2',
              'max-w-xs',
              'bg-foreground',
              'text-background',
              'text-sm',
              'font-medium',
              'rounded-apple-alert',
              'shadow-apple-prominent',
              'animate-scale-fade-in',
              'pointer-events-none',
              className
            )}
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {content}
            {showArrow && (
              <div
                className="absolute w-2 h-2 bg-foreground shadow-apple-prominent"
                style={getArrowStyle()}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default AppleTooltip;
