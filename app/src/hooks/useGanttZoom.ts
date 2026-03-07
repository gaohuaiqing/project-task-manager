/**
 * 甘特图缩放管理 Hook
 *
 * 管理时间轴的缩放状态和操作
 *
 * @module hooks/useGanttZoom
 */

import { useState, useCallback, useMemo } from 'react';
import { calculateTickInterval, getTickFormat } from '@/utils/ganttGeometry';

/**
 * 缩放配置
 */
export interface ZoomConfig {
  /** 缩放级别 (0-100) */
  level: number;
  /** 每天的像素宽度 */
  dayWidth: number;
  /** 刻度间隔（天数） */
  tickInterval: number;
  /** 刻度格式 */
  tickFormat: string;
}

/**
 * Hook 选项
 */
export interface UseGanttZoomOptions {
  /** 初始缩放级别 (0-100, 默认 30) */
  initialLevel?: number;
  /** 最小缩放级别 (默认 5) */
  minLevel?: number;
  /** 最大缩放级别 (默认 100) */
  maxLevel?: number;
  /** 缩放变化回调 */
  onZoomChange?: (config: ZoomConfig) => void;
}

/**
 * 缩放级别映射到像素宽度
 */
const ZOOM_LEVEL_TO_WIDTH: Record<number, number> = {
  0: 5,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  60: 60,
  70: 70,
  80: 80,
  90: 90,
  100: 100,
};

/**
 * 根据缩放级别计算像素宽度
 */
function levelToDayWidth(level: number): number {
  // 找到最接近的预设级别
  const levels = Object.keys(ZOOM_LEVEL_TO_WIDTH).map(Number).sort((a, b) => a - b);

  for (let i = 0; i < levels.length - 1; i++) {
    if (level >= levels[i] && level < levels[i + 1]) {
      const lower = ZOOM_LEVEL_TO_WIDTH[levels[i]];
      const upper = ZOOM_LEVEL_TO_WIDTH[levels[i + 1]];
      const ratio = (level - levels[i]) / (levels[i + 1] - levels[i]);
      return Math.round(lower + (upper - lower) * ratio);
    }
  }

  return ZOOM_LEVEL_TO_WIDTH[levels[levels.length - 1]];
}

/**
 * 使用甘特图缩放管理
 */
export function useGanttZoom(options: UseGanttZoomOptions = {}) {
  const {
    initialLevel = 30,
    minLevel = 5,
    maxLevel = 100,
    onZoomChange,
  } = options;

  const [zoomLevel, setZoomLevel] = useState(initialLevel);

  // 计算缩放配置
  const config = useMemo((): ZoomConfig => {
    const dayWidth = levelToDayWidth(zoomLevel);
    const tickInterval = calculateTickInterval(dayWidth);
    const tickFormat = getTickFormat(dayWidth);

    return {
      level: zoomLevel,
      dayWidth,
      tickInterval,
      tickFormat,
    };
  }, [zoomLevel]);

  /**
   * 设置缩放级别
   */
  const setZoom = useCallback((level: number) => {
    const clampedLevel = Math.max(minLevel, Math.min(maxLevel, level));
    setZoomLevel(clampedLevel);
  }, [minLevel, maxLevel]);

  /**
   * 放大
   */
  const zoomIn = useCallback((step: number = 10) => {
    setZoom(zoomLevel + step);
  }, [zoomLevel, setZoom]);

  /**
   * 缩小
   */
  const zoomOut = useCallback((step: number = 10) => {
    setZoom(zoomLevel - step);
  }, [zoomLevel, setZoom]);

  /**
   * 重置到初始级别
   */
  const reset = useCallback(() => {
    setZoom(initialLevel);
  }, [initialLevel, setZoom]);

  /**
   * 设置为特定级别（日视图）
   */
  const setDayView = useCallback(() => {
    setZoom(60); // ~60px/day
  }, [setZoom]);

  /**
   * 设置为特定级别（周视图）
   */
  const setWeekView = useCallback(() => {
    setZoom(25); // ~20px/day
  }, [setZoom]);

  /**
   * 设置为特定级别（月视图）
   */
  const setMonthView = useCallback(() => {
    setZoom(10); // ~10px/day
  }, [setZoom]);

  // 通知缩放变化
  if (onZoomChange) {
    onZoomChange(config);
  }

  return {
    config,
    zoomLevel,
    setZoom,
    zoomIn,
    zoomOut,
    reset,
    setDayView,
    setWeekView,
    setMonthView,
  };
}
