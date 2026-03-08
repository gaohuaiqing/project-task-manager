/**
 * 时间轴缩放管理 Hook
 *
 * 管理多时间轴编辑器的缩放状态和操作
 * 支持日/周/月三种预设视图
 *
 * @module hooks/useTimelineZoom
 */

import { useState, useCallback, useMemo } from 'react';
import type { TimelineZoomLevel, ZoomConfig } from '@/types/timeline';
import { TIMELINE_ZOOM_CONFIGS } from '@/types/timeline';
import { calculateTickInterval, getTickFormat } from '@/utils/ganttGeometry';

/**
 * Hook 选项
 */
export interface UseTimelineZoomOptions {
  /** 初始缩放级别 */
  initialLevel?: TimelineZoomLevel;
  /** 缩放变化回调 */
  onZoomChange?: (config: ZoomConfig) => void;
}

/**
 * 使用时间轴缩放管理
 */
export function useTimelineZoom(options: UseTimelineZoomOptions = {}) {
  const {
    initialLevel = 'week',
    onZoomChange,
  } = options;

  const [zoomLevel, setZoomLevelState] = useState<TimelineZoomLevel>(initialLevel);

  // 计算缩放配置
  const config = useMemo((): ZoomConfig => {
    const preset = TIMELINE_ZOOM_CONFIGS[zoomLevel];
    const tickInterval = calculateTickInterval(preset.dayWidth);
    const tickFormat = getTickFormat(preset.dayWidth);

    return {
      level: zoomLevel,
      dayWidth: preset.dayWidth,
      zoomValue: preset.dayWidth, // 直接使用dayWidth作为zoomValue
    };
  }, [zoomLevel]);

  /**
   * 设置缩放级别
   */
  const setZoom = useCallback((level: TimelineZoomLevel) => {
    setZoomLevelState(level);
  }, []);

  /**
   * 放大
   */
  const zoomIn = useCallback(() => {
    const levels: TimelineZoomLevel[] = ['month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoom(levels[currentIndex + 1]);
    }
  }, [zoomLevel]);

  /**
   * 缩小
   */
  const zoomOut = useCallback(() => {
    const levels: TimelineZoomLevel[] = ['month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoom(levels[currentIndex - 1]);
    }
  }, [zoomLevel]);

  /**
   * 设置为日视图
   */
  const setDayView = useCallback(() => {
    setZoom('day');
  }, [setZoom]);

  /**
   * 设置为周视图
   */
  const setWeekView = useCallback(() => {
    setZoom('week');
  }, [setZoom]);

  /**
   * 设置为月视图
   */
  const setMonthView = useCallback(() => {
    setZoom('month');
  }, [setZoom]);

  /**
   * 获取当前视图标签
   */
  const getViewLabel = useCallback(() => {
    return TIMELINE_ZOOM_CONFIGS[zoomLevel].label;
  }, [zoomLevel]);

  /**
   * 获取刻度间隔
   */
  const getTickInterval = useCallback(() => {
    return calculateTickInterval(config.dayWidth);
  }, [config]);

  /**
   * 获取刻度格式
   */
  const getTickFormatFn = useCallback(() => {
    return getTickFormat(config.dayWidth);
  }, [config]);

  return {
    config,
    zoomLevel,
    setZoom,
    zoomIn,
    zoomOut,
    setDayView,
    setWeekView,
    setMonthView,
    getViewLabel,
    getTickInterval,
    getTickFormat: getTickFormatFn,
  };
}
