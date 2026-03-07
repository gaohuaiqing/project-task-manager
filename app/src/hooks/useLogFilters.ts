/**
 * 日志过滤器 Hook
 *
 * 功能：
 * 1. 管理日志过滤状态
 * 2. 提供过滤参数验证
 * 3. 生成 API 查询参数
 *
 * @module hooks/useLogFilters
 */

import { useState, useMemo, useCallback } from 'react';
import { TIME_RANGES } from '@/components/settings/SystemLogs.types';

export type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogType = 'ALL' | 'SYSTEM' | 'USER_ACTION' | 'AUTH' | 'DATA_SYNC' | 'PERFORMANCE' | 'FRONTEND';
export type TimeRange = '7d' | '3d' | '24h' | '12h' | '6h' | '1h';

export interface LogFiltersState {
  level: LogLevel;
  type: LogType;
  searchKeyword: string;
  timeRange: TimeRange;
}

export interface UseLogFiltersOptions {
  /** 默认过滤条件 */
  defaultFilters?: Partial<LogFiltersState>;
}

export interface UseLogFiltersReturn {
  /** 当前过滤条件 */
  filters: LogFiltersState;
  /** 更新级别过滤 */
  setLevel: (level: LogLevel) => void;
  /** 更新类型过滤 */
  setType: (type: LogType) => void;
  /** 更新搜索关键词 */
  setSearchKeyword: (keyword: string) => void;
  /** 更新时间范围 */
  setTimeRange: (range: TimeRange) => void;
  /** 重置所有过滤条件 */
  resetFilters: () => void;
  /** 生成 API 查询参数 */
  buildQueryParams: (pageSize: number, page: number) => URLSearchParams;
  /** 检查是否是默认过滤条件 */
  isDefaultFilters: boolean;
}

/**
 * 默认过滤条件
 */
const DEFAULT_FILTERS: LogFiltersState = {
  level: 'ALL',
  type: 'ALL',
  searchKeyword: '',
  timeRange: '24h',
};

/**
 * 日志过滤器 Hook
 *
 * @example
 * ```tsx
 * const logFilters = useLogFilters();
 *
 * const params = logFilters.buildQueryParams(100, 0);
 * const url = `/api/logs?${params.toString()}`;
 * ```
 */
export function useLogFilters(
  options: UseLogFiltersOptions = {}
): UseLogFiltersReturn {
  const { defaultFilters = {} } = options;

  const [filters, setFilters] = useState<LogFiltersState>({
    ...DEFAULT_FILTERS,
    ...defaultFilters,
  });

  /**
   * 更新级别过滤
   */
  const setLevel = useCallback((level: LogLevel) => {
    setFilters(prev => ({ ...prev, level }));
  }, []);

  /**
   * 更新类型过滤
   */
  const setType = useCallback((type: LogType) => {
    setFilters(prev => ({ ...prev, type }));
  }, []);

  /**
   * 更新搜索关键词
   */
  const setSearchKeyword = useCallback((searchKeyword: string) => {
    setFilters(prev => ({ ...prev, searchKeyword }));
  }, []);

  /**
   * 更新时间范围
   */
  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setFilters(prev => ({ ...prev, timeRange }));
  }, []);

  /**
   * 重置所有过滤条件
   */
  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      ...defaultFilters,
    });
  }, [defaultFilters]);

  /**
   * 生成 API 查询参数
   */
  const buildQueryParams = useCallback(
    (pageSize: number, page: number): URLSearchParams => {
      const params = new URLSearchParams({
        limit: Math.min(Math.max(1, pageSize), 1000).toString(),
        offset: (Math.max(0, page) * pageSize).toString(),
      });

      // 添加级别过滤
      if (filters.level !== 'ALL') {
        params.append('level', filters.level);
      }

      // 添加类型过滤
      if (filters.type !== 'ALL') {
        params.append('type', filters.type);
      }

      // 添加时间范围
      const selectedTimeRange = TIME_RANGES.find(r => r.value === filters.timeRange);
      if (selectedTimeRange) {
        const startTime = new Date(
          Date.now() - selectedTimeRange.hours * 60 * 60 * 1000
        ).toISOString();
        params.append('startTime', startTime);
      }

      return params;
    },
    [filters]
  );

  /**
   * 检查是否是默认过滤条件
   */
  const isDefaultFilters = useMemo(() => {
    return (
      filters.level === DEFAULT_FILTERS.level &&
      filters.type === DEFAULT_FILTERS.type &&
      filters.searchKeyword === DEFAULT_FILTERS.searchKeyword &&
      filters.timeRange === DEFAULT_FILTERS.timeRange
    );
  }, [filters]);

  return {
    filters,
    setLevel,
    setType,
    setSearchKeyword,
    setTimeRange,
    resetFilters,
    buildQueryParams,
    isDefaultFilters,
  };
}

export default useLogFilters;
