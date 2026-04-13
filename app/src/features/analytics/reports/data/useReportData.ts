/**
 * 报表数据Hook
 * 统一数据入口，方便切换Mock和真实API
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ReportFilters,
  ReportType,
  ProjectProgressData,
  TaskStatisticsData,
  DelayAnalysisData,
  MemberAnalysisData,
  ResourceEfficiencyData,
} from '../types';

// ==================== 配置开关 ====================

/**
 * 设置为 true 使用模拟数据，false 使用真实API
 * 删除 mock 目录后，将此值改为 false
 */
const USE_MOCK_DATA = true;

// ==================== 模拟数据导入 ====================

import {
  getMockProjectProgressData,
  getMockTaskStatisticsData,
  getMockDelayAnalysisData,
  getMockMemberAnalysisData,
  getMockResourceEfficiencyData,
} from './mock';

// ==================== 数据获取Hook ====================

interface UseReportDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 通用报表数据Hook
 */
function useReportData<T>(
  reportType: ReportType,
  filters: ReportFilters,
  mockFetcher: () => T
): UseReportDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 300));
        setData(mockFetcher());
      } else {
        // 真实API调用
        const params = new URLSearchParams();
        if (filters.projectId) params.set('project_id', filters.projectId);
        if (filters.assigneeId) params.set('assignee_id', filters.assigneeId);
        if (filters.timeRange) params.set('time_range', filters.timeRange);
        if (filters.startDate) params.set('start_date', filters.startDate);
        if (filters.endDate) params.set('end_date', filters.endDate);

        const response = await fetch(`/api/reports/${reportType}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`获取数据失败: ${response.status}`);
        }

        const result = await response.json();
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, [reportType, filters, mockFetcher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ==================== 各报表专用Hook ====================

export function useProjectProgressData(filters: ReportFilters) {
  return useReportData<ProjectProgressData>(
    'project-progress',
    filters,
    getMockProjectProgressData
  );
}

export function useTaskStatisticsData(filters: ReportFilters) {
  return useReportData<TaskStatisticsData>(
    'task-statistics',
    filters,
    getMockTaskStatisticsData
  );
}

export function useDelayAnalysisData(filters: ReportFilters) {
  return useReportData<DelayAnalysisData>(
    'delay-analysis',
    filters,
    getMockDelayAnalysisData
  );
}

export function useMemberAnalysisData(filters: ReportFilters) {
  return useReportData<MemberAnalysisData>(
    'member-analysis',
    filters,
    getMockMemberAnalysisData
  );
}

export function useResourceEfficiencyData(filters: ReportFilters) {
  return useReportData<ResourceEfficiencyData>(
    'resource-efficiency',
    filters,
    getMockResourceEfficiencyData
  );
}

// ==================== 辅助数据Hook ====================

/** 获取项目列表（用于筛选器） */
export function useProjectsForReport() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setData([
            { id: '1', name: '智能终端项目' },
            { id: '2', name: '数据平台项目' },
            { id: '3', name: '移动端优化项目' },
            { id: '4', name: '安全审计项目' },
          ]);
        } else {
          const response = await fetch('/api/projects?simple=true', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const result = await response.json();
          setData(result.data || result);
        }
      } catch (err) {
        console.error('获取项目列表失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { data, isLoading };
}

/** 获取成员列表（用于筛选器） */
export function useMembersForReport() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (USE_MOCK_DATA) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setData([
            { id: '1', name: '张三' },
            { id: '2', name: '李四' },
            { id: '3', name: '王五' },
            { id: '4', name: '赵六' },
            { id: '5', name: '钱七' },
            { id: '6', name: '孙八' },
          ]);
        } else {
          const response = await fetch('/api/users?simple=true', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const result = await response.json();
          setData(result.data || result);
        }
      } catch (err) {
        console.error('获取成员列表失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return { data, isLoading };
}
