/**
 * 可调整大小的对话框内容组件
 *
 * 支持8方向调整大小，尺寸持久化到 localStorage
 * 基于 react-resizable-panels 实现
 *
 * @module components/projects/ResizableDialogContent
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Minimize2, Maximize2, Move } from 'lucide-react';

export interface ResizableDialogContentProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 对话框是否打开（用于控制显示） */
  open?: boolean;
  /** 对话框唯一标识（用于 localStorage） */
  storageKey?: string;
  /** 最小宽度（px） */
  minWidth?: number;
  /** 最小高度（px） */
  minHeight?: number;
  /** 最大宽度（px） */
  maxWidth?: number;
  /** 最大高度（px） */
  maxHeight?: number | string;
  /** 初始宽度（px） */
  defaultWidth?: number;
  /** 初始高度（px） */
  defaultHeight?: number;
  /** 初始X位置（px） */
  defaultX?: number;
  /** 初始Y位置（px） */
  defaultY?: number;
  /** 是否显示尺寸提示 */
  showSizeIndicator?: boolean;
  /** 是否可拖动移动 */
  draggable?: boolean;
  /** 尺寸变更回调 */
  onResize?: (width: number, height: number) => void;
  /** 位置变更回调 */
  onMove?: (x: number, y: number) => void;
}

/**
 * 拖拽手柄方向
 */
type HandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * localStorage 键前缀
 */
const STORAGE_WIDTH_PREFIX = 'resizableDialogWidth_';
const STORAGE_HEIGHT_PREFIX = 'resizableDialogHeight_';
const STORAGE_X_PREFIX = 'resizableDialogX_';
const STORAGE_Y_PREFIX = 'resizableDialogY_';

/**
 * 获取持久化尺寸和位置
 */
function getPersistedSize(storageKey: string | undefined): { width?: number; height?: number; x?: number; y?: number } {
  if (!storageKey) return {};

  try {
    const width = localStorage.getItem(`${STORAGE_WIDTH_PREFIX}${storageKey}`);
    const height = localStorage.getItem(`${STORAGE_HEIGHT_PREFIX}${storageKey}`);
    const x = localStorage.getItem(`${STORAGE_X_PREFIX}${storageKey}`);
    const y = localStorage.getItem(`${STORAGE_Y_PREFIX}${storageKey}`);

    return {
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      x: x ? parseInt(x, 10) : undefined,
      y: y ? parseInt(y, 10) : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * 保存尺寸和位置到 localStorage
 */
function persistSize(storageKey: string | undefined, width?: number, height?: number, x?: number, y?: number) {
  if (!storageKey) return;

  try {
    if (width !== undefined) {
      localStorage.setItem(`${STORAGE_WIDTH_PREFIX}${storageKey}`, width.toString());
    }
    if (height !== undefined) {
      localStorage.setItem(`${STORAGE_HEIGHT_PREFIX}${storageKey}`, height.toString());
    }
    if (x !== undefined) {
      localStorage.setItem(`${STORAGE_X_PREFIX}${storageKey}`, x.toString());
    }
    if (y !== undefined) {
      localStorage.setItem(`${STORAGE_Y_PREFIX}${storageKey}`, y.toString());
    }
  } catch (error) {
    console.warn('Failed to persist dialog state:', error);
  }
}

/**
 * 拖拽手柄组件
 */
interface ResizeHandleProps {
  direction: HandleDirection;
  onMouseDown: (direction: HandleDirection) => (e: React.MouseEvent) => void;
  isDragging: boolean;
}

function ResizeHandle({ direction, onMouseDown, isDragging }: ResizeHandleProps) {
  const handleClasses: Record<HandleDirection, string> = {
    n: 'top-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-n-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-s-resize',
    e: 'right-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-e-resize',
    w: 'left-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize',
    ne: 'top-0 right-0 w-4 h-4 cursor-ne-resize',
    nw: 'top-0 left-0 w-4 h-4 cursor-nw-resize',
    se: 'bottom-0 right-0 w-4 h-4 cursor-se-resize',
    sw: 'bottom-0 left-0 w-4 h-4 cursor-sw-resize',
  };

  return (
    <div
      className={cn(
        'absolute z-10 rounded-sm bg-primary/20 opacity-0 transition-opacity hover:bg-primary/40 group-hover:opacity-100',
        handleClasses[direction],
        isDragging && 'opacity-100 bg-primary/60'
      )}
      onMouseDown={onMouseDown(direction)}
    >
      {/* 手柄图标 */}
      {direction.includes('e') || direction.includes('w') ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm bg-current" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm bg-current" />
        </div>
      )}
    </div>
  );
}

/**
 * 可调整大小的对话框内容组件
 */
export function ResizableDialogContent({
  children,
  className,
  open = true, // 默认打开，向后兼容
  storageKey = 'timePlanDialog',
  minWidth = 800,
  minHeight = 500,
  maxWidth = 1920,
  maxHeight = '95vh',
  defaultWidth = 1200,
  defaultHeight = 800,
  defaultX,
  defaultY,
  showSizeIndicator = true,
  draggable = true,
  onResize,
  onMove,
}: ResizableDialogContentProps) {
  // ==================== 状态管理 ====================
  const persistedSize = getPersistedSize(storageKey);

  // 计算默认位置（居中）
  const calculateDefaultPosition = useCallback(() => {
    if (defaultX !== undefined && defaultY !== undefined) {
      return { x: defaultX, y: defaultY };
    }

    const width = persistedSize.width || defaultWidth;
    const height = persistedSize.height || defaultHeight;

    // 居中显示
    const x = Math.max(0, (window.innerWidth - width) / 2);
    const y = Math.max(0, (window.innerHeight - height) / 2);

    return { x, y };
  }, [defaultX, defaultY, persistedSize.width, persistedSize.height, defaultWidth, defaultHeight]);

  const defaultPosition = calculateDefaultPosition();

  const [size, setSize] = useState({
    width: persistedSize.width || defaultWidth,
    height: persistedSize.height || defaultHeight,
  });
  const [position, setPosition] = useState({
    x: persistedSize.x !== undefined ? persistedSize.x : defaultPosition.x,
    y: persistedSize.y !== undefined ? persistedSize.y : defaultPosition.y,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [dragDirection, setDragDirection] = useState<HandleDirection | null>(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorSize, setIndicatorSize] = useState({ width: size.width, height: size.height });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // ==================== 尺寸约束 ====================
  const constrainSize = useCallback((width: number, height: number) => {
    const maxHeightPx = typeof maxHeight === 'string'
      ? window.innerHeight * 0.95
      : maxHeight;

    return {
      width: Math.max(minWidth, Math.min(maxWidth, width)),
      height: Math.max(minHeight, Math.min(maxHeightPx, height)),
    };
  }, [minWidth, minHeight, maxWidth, maxHeight]);

  // ==================== 拖拽处理（调整大小）====================
  const handleMouseDown = useCallback((direction: HandleDirection) => (e: React.MouseEvent) => {
    // 只阻止默认行为，不阻止事件冒泡
    e.preventDefault();

    setIsResizing(true);
    setDragDirection(direction);
    setShowIndicator(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };

    setIndicatorSize({ width: size.width, height: size.height });
  }, [size.width, size.height, position.x, position.y]);

  // ==================== 拖动处理（移动位置）====================
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;

    // 只在左键点击时启用拖动
    if (e.button !== 0) return;

    // 只阻止默认行为，不阻止事件冒泡
    e.preventDefault();

    setIsMoving(true);
    setShowIndicator(false);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  }, [draggable, size.width, size.height, position.x, position.y]);

  useEffect(() => {
    if (!isResizing && !isMoving) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && dragDirection !== null) {
        // 调整大小逻辑
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        let newWidth = dragStartRef.current.width;
        let newHeight = dragStartRef.current.height;

        // 根据方向调整尺寸
        if (dragDirection.includes('e')) {
          newWidth = dragStartRef.current.width + deltaX;
        }
        if (dragDirection.includes('w')) {
          newWidth = dragStartRef.current.width - deltaX;
        }
        if (dragDirection.includes('s')) {
          newHeight = dragStartRef.current.height + deltaY;
        }
        if (dragDirection.includes('n')) {
          newHeight = dragStartRef.current.height - deltaY;
        }

        const constrained = constrainSize(newWidth, newHeight);
        setIndicatorSize({ width: constrained.width, height: constrained.height });
      } else if (isMoving) {
        // 移动位置逻辑
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const newX = dragStartRef.current.posX + deltaX;
        const newY = dragStartRef.current.posY + deltaY;

        // 确保对话框不会完全移出屏幕
        const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - 100));
        const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - 100));

        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        const constrained = constrainSize(indicatorSize.width, indicatorSize.height);

        setSize(constrained);
        persistSize(storageKey, constrained.width, constrained.height, position.x, position.y);
        onResize?.(constrained.width, constrained.height);

        setIsResizing(false);
        setDragDirection(null);

        // 延迟隐藏指示器
        setTimeout(() => setShowIndicator(false), 500);
      } else if (isMoving) {
        persistSize(storageKey, size.width, size.height, position.x, position.y);
        onMove?.(position.x, position.y);

        setIsMoving(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isMoving, dragDirection, indicatorSize, constrainSize, storageKey, onResize, onMove, size.width, size.height, position.x, position.y]);

  // ==================== 重置尺寸 ====================
  const handleResetSize = useCallback(() => {
    const resetSize = constrainSize(defaultWidth, defaultHeight);
    const resetPosition = calculateDefaultPosition();

    setSize(resetSize);
    setPosition(resetPosition);
    persistSize(storageKey, resetSize.width, resetSize.height, resetPosition.x, resetPosition.y);
    onResize?.(resetSize.width, resetSize.height);
    onMove?.(resetPosition.x, resetPosition.y);
  }, [defaultWidth, defaultHeight, constrainSize, storageKey, onResize, onMove, calculateDefaultPosition]);

  // ==================== 尺寸和位置样式 ====================
  // 从 className 中提取 z-index，如果没有则使用默认值
  const getZIndexFromClassName = (className: string | undefined): number => {
    if (!className) return 9999;
    const match = className.match(/z-\[(\d+)\]/);
    return match ? parseInt(match[1], 10) : 9999;
  };

  const contentStyle: React.CSSProperties = {
    width: size.width,
    height: size.height,
    maxWidth: typeof maxHeight === 'string' ? undefined : maxWidth,
    maxHeight: typeof maxHeight === 'string' ? maxHeight : undefined,
    position: 'fixed',
    left: position.x,
    top: position.y,
    transform: 'none',
    margin: 0,
    // 从 className 中提取 z-index，确保正确的层级
    zIndex: getZIndexFromClassName(className),
    // 确保能够接收点击事件
    pointerEvents: 'auto',
  };

  return (
    <div className="relative group">
      {/* 对话框内容 - 只在 open 为 true 时显示 */}
      {open && (
        <>
          <div
            ref={containerRef}
            className={cn(
              'rounded-lg border bg-card shadow-lg overflow-hidden transition-shadow duration-200 flex flex-col',
              (isResizing || isMoving) && 'shadow-2xl ring-2 ring-primary/50',
              className
            )}
            style={contentStyle}
          >
            {/* 拖动标题栏 - 设计文档强调"可以移动" */}
            {draggable && (
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-muted/50 cursor-move border-b border-border",
                  "hover:bg-muted/70 transition-colors select-none"
                )}
                onMouseDown={handleMoveStart}
                onDragStart={(e) => e.preventDefault()}
                title="拖动可移动对话框"
              >
                <Move className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">按住此处拖动对话框</span>
              </div>
            )}
            {/* 内容区域 */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>

            {/* 拖拽手柄（调整大小） */}
            {!isResizing && !isMoving && (
              <>
                <ResizeHandle direction="n" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="s" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="e" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="w" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="ne" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="nw" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="se" onMouseDown={handleMouseDown} isDragging={false} />
                <ResizeHandle direction="sw" onMouseDown={handleMouseDown} isDragging={false} />
              </>
            )}
          </div>

          {/* 尺寸指示器 */}
          {showSizeIndicator && showIndicator && (
            <div className="fixed top-4 right-4 z-[10000] bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none">
              {indicatorSize.width} × {indicatorSize.height}
            </div>
          )}

          {/* 重置按钮 */}
          <button
            className={cn(
              'absolute bg-primary text-primary-foreground px-3 py-1.5 rounded-t-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity z-[10000]',
              'hover:bg-primary/90 flex items-center gap-1 pointer-events-auto'
            )}
            onClick={handleResetSize}
            title="重置为默认尺寸和位置"
            style={{
              left: position.x + size.width - 100,
              top: position.y - 40,
              position: 'fixed',
            }}
          >
            <Maximize2 className="w-3 h-3" />
            重置
          </button>

          {/* 拖拽时边框高亮 */}
          {(isResizing || isMoving) && (
            <div
              className="absolute inset-0 pointer-events-none border-2 border-primary rounded-lg z-[10000]"
              style={{
                transform: 'scale(1.02)',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                position: 'fixed',
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default ResizableDialogContent;
