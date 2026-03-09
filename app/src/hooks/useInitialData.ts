/**
 * 初始数据加载 Hook（优化版本）
 *
 * 职责：
 * 1. 使用批量查询接口一次性获取所有初始数据
 * 2. 并行加载多个数据源
 * 3. 提供详细的性能监控
 * 4. 优雅的错误处理和降级
 *
 * @module hooks/useInitialData
 */

import { useState, useEffect, useCallback } from 'react';
import { mySqlDataService } from '../services/MySqlDataService';
import { getDisplayMembersMap } from '../services/MemberService';
import { getOrganization } from '../utils/organizationManager';

// ==================== 类型定义 ====================

interface InitialDataState {
  projects: any[];
  members: Map<string, any>;
  organization: any;
  loading: boolean;
  error: string | null;
  loadTime: number;
}

interface UseInitialDataReturn extends InitialDataState {
  reload: () => Promise<void>;
  clearError: () => void;
}

// ==================== Hook ====================

/**
 * 初始数据加载 Hook
 * 优化版本：使用批量查询和并行加载
 */
export function useInitialData(): UseInitialDataReturn {
  const [state, setState] = useState<InitialDataState>({
    projects: [],
    members: new Map(),
    organization: null,
    loading: true,
    error: null,
    loadTime: 0
  });

  /**
   * 加载初始数据
   * 优化策略：批量查询 + 并行加载
   */
  const loadInitialData = useCallback(async () => {
    const perfMark = `loadInitialData_${Date.now()}`;
    performance.mark(`${perfMark}_start`);

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 并行加载所有数据
      const [initialData, membersMap, organization] = await Promise.all([
        // 1. 批量获取项目和成员数据（主要数据源）
        mySqlDataService.getInitialData(),

        // 2. 获取显示成员映射（并行）
        getDisplayMembersMap().catch(() => new Map()),

        // 3. 获取组织架构（并行，可选）
        getOrganization().catch(() => null),
      ]);

      performance.mark(`${perfMark}_data_loaded`);

      // 更新状态
      setState({
        projects: initialData.projects || [],
        members: membersMap,
        organization,
        loading: false,
        error: null,
        loadTime: 0
      });

      performance.mark(`${perfMark}_complete`);
      performance.measure(perfMark, `${perfMark}_start`, `${perfMark}_complete`);

      const totalDuration = performance.getEntriesByName(perfMark)[0]?.duration || 0;
      const dataLoadDuration = performance.getEntriesByName(`${perfMark}_data_loaded`)[0]?.duration || 0;

      console.log(`[Perf] 🚀 初始数据加载完成:`);
      console.log(`[Perf] - 总耗时: ${totalDuration.toFixed(2)}ms`);
      console.log(`[Perf] - 数据获取: ${dataLoadDuration.toFixed(2)}ms`);
      console.log(`[Perf] - 项目: ${initialData.projects?.length || 0} 个`);
      console.log(`[Perf] - 成员: ${membersMap.size} 个`);
      console.log(`[Perf] - 组织架构: ${organization ? '已加载' : '未加载'}`);

      // 清理性能标记
      performance.clearMarks(perfMark);
      performance.clearMeasures(perfMark);

    } catch (error) {
      console.error('[useInitialData] 加载初始数据失败:', error);

      const errorMessage = error instanceof Error ? error.message : '加载数据失败';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('[Perf] ❌ 初始数据加载失败:', errorMessage);
    }
  }, []);

  /**
   * 重新加载数据
   */
  const reload = useCallback(async () => {
    console.log('[useInitialData] 手动触发重新加载');
    await loadInitialData();
  }, [loadInitialData]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 组件挂载时加载数据
   */
  useEffect(() => {
    console.log('[useInitialData] 组件挂载，开始加载初始数据');
    loadInitialData();
  }, [loadInitialData]);

  return {
    ...state,
    reload,
    clearError
  };
}

// ==================== 辅助 Hook ====================

/**
 * 简化版初始数据 Hook
 * 只返回加载状态和项目列表
 */
export function useQuickLoadData() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const perfMark = `quickLoad_${Date.now()}`;
    performance.mark(`${perfMark}_start`);

    let isMounted = true;

    const loadData = async () => {
      try {
        // 使用批量查询
        const data = await mySqlDataService.getInitialData();

        if (isMounted) {
          setProjects(data.projects);
          setLoading(false);

          performance.mark(`${perfMark}_complete`);
          performance.measure(perfMark, `${perfMark}_start`, `${perfMark}_complete`);

          const duration = performance.getEntriesByName(perfMark)[0]?.duration || 0;
          console.log(`[Perf] ⚡ 快速加载完成: ${duration.toFixed(2)}ms (${data.projects.length} 个项目)`);

          performance.clearMarks(perfMark);
          performance.clearMeasures(perfMark);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : '加载失败';
          setError(errorMessage);
          setLoading(false);
          console.error('[useQuickLoadData] 加载失败:', err);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { projects, loading, error };
}
