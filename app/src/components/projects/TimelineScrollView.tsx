/**
 * 时间轴滚动视图组件
 *
 * 提供统一的滚动容器
 * 同步垂直滚动，保持水平独立
 *
 * @module components/projects/TimelineScrollView
 */

import React, { useRef, useEffect, useCallback } from 'react';

interface TimelineScrollViewProps {
  /** 时间范围总宽度（像素） */
  totalWidth: number;
  /** 子元素 */
  children: React.ReactNode;
  /** 滚动位置变化回调 */
  onScrollChange?: (scrollLeft: number) => void;
  /** 初始滚动位置 */
  initialScrollLeft?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 时间轴滚动视图
 */
export function TimelineScrollView({
  totalWidth,
  children,
  onScrollChange,
  initialScrollLeft = 0,
  className = '',
  style,
}: TimelineScrollViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  // 设置初始滚动位置
  useEffect(() => {
    if (containerRef.current && initialScrollLeft > 0) {
      isProgrammaticScrollRef.current = true;
      containerRef.current.scrollLeft = initialScrollLeft;
      // 重置标志
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    }
  }, [initialScrollLeft]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!isProgrammaticScrollRef.current) {
      onScrollChange?.(e.currentTarget.scrollLeft);
    }
  }, [onScrollChange]);

  // 滚动到指定位置（外部调用）
  const scrollTo = useCallback((x: number) => {
    if (containerRef.current) {
      isProgrammaticScrollRef.current = true;
      containerRef.current.scrollLeft = x;
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    }
  }, []);

  // 滚动到指定日期
  const scrollToPercent = useCallback((percent: number) => {
    if (containerRef.current) {
      const x = (containerRef.current.scrollWidth - containerRef.current.clientWidth) * percent;
      scrollTo(x);
    }
  }, [scrollTo]);

  // 暴露滚动方法（通过ref）
  React.useImperativeHandle(useRef(), () => ({
    scrollTo,
    scrollToPercent,
    getScrollLeft: () => containerRef.current?.scrollLeft || 0,
    getScrollWidth: () => containerRef.current?.scrollWidth || 0,
  }));

  return (
    <div
      ref={containerRef}
      className={`overflow-auto overflow-y-hidden overflow-x-auto ${className}`}
      style={style}
      onScroll={handleScroll}
    >
      {/* 内容容器，设置固定宽度确保水平滚动 */}
      <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
        {children}
      </div>
    </div>
  );
}
