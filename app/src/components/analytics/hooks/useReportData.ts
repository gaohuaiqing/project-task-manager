/**
 * 报表数据通用 Hook
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/ApiService';

// ==================== 类型定义 ====================

interface Project {
  id: number | string;
  name: string;
}

interface ReportDataState<T> {
  projectId: string;
  projects: Project[];
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseReportDataOptions<T> {
  endpoint: string;
}

// ==================== Hook ====================

export function useReportData<T>(options: UseReportDataOptions<T>) {
  const { endpoint } = options;

  const [state, setState] = useState<ReportDataState<T>>({
    projectId: '',
    projects: [],
    data: null,
    loading: false,
    error: null
  });

  /** 加载项目列表 */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const result = await apiService.request<{ success: boolean; data: Project[] }>('/projects');
        if (result.success) {
          setState((prev) => ({ ...prev, projects: result.data || [] }));
        }
      } catch (err) {
        console.error('获取项目列表失败:', err);
      }
    };
    fetchProjects();
  }, []);

  /** 加载报表数据 */
  useEffect(() => {
    if (!state.projectId) return;

    const fetchReport = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiService.request<{ success: boolean; data: T }>(
          `${endpoint}?project_id=${state.projectId}`
        );

        if (result.success) {
          setState((prev) => ({ ...prev, data: result.data, loading: false }));
        } else {
          setState((prev) => ({ ...prev, error: '获取报表数据失败', loading: false }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '获取报表数据失败';
        setState((prev) => ({ ...prev, error: message, loading: false }));
      }
    };

    fetchReport();
  }, [state.projectId, endpoint]);

  /** 设置项目ID */
  const setProjectId = useCallback((projectId: string) => {
    setState((prev) => ({ ...prev, projectId }));
  }, []);

  return {
    ...state,
    setProjectId
  };
}

// ==================== 公共组件类型 ====================

export interface ChartDataItem {
  name: string;
  value: number;
}

export interface TrendDataItem {
  date: string;
  value: number;
}
