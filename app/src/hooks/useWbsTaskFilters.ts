/**
 * WBS 任务筛选逻辑 Hook
 *
 * 职责：
 * - 管理筛选条件
 * - 应用筛选逻辑
 * - 计算激活筛选数量
 */

import { useState, useMemo, useCallback } from 'react';
import type { WbsTask } from '@/types/wbs';

export interface WbsTaskFilterOptions {
  searchQuery: string;
  filterProject: string[];
  filterMember: string[];
  filterStatus: string[];
  filterPriority: string[];
}

export function useWbsTaskFilters(initialFilters: Partial<WbsTaskFilterOptions> = {}) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');
  const [filterProject, setFilterProject] = useState(initialFilters.filterProject || ['all']);
  const [filterMember, setFilterMember] = useState(initialFilters.filterMember || ['all']);
  const [filterStatus, setFilterStatus] = useState(initialFilters.filterStatus || ['all']);
  const [filterPriority, setFilterPriority] = useState(initialFilters.filterPriority || ['all']);

  // 计算激活的筛选数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (!filterProject.includes('all')) count++;
    if (!filterMember.includes('all')) count++;
    if (!filterStatus.includes('all')) count++;
    if (!filterPriority.includes('all')) count++;
    return count;
  }, [searchQuery, filterProject, filterMember, filterStatus, filterPriority]);

  // 清除所有筛选
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterProject(['all']);
    setFilterMember(['all']);
    setFilterStatus(['all']);
    setFilterPriority(['all']);
  }, []);

  // 应用筛选到任务列表
  const applyFilters = useCallback((tasks: WbsTask[]): WbsTask[] => {
    return tasks.filter((task) => {
      // 搜索筛选
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title?.toLowerCase().includes(query) ||
          task.wbsCode?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 项目筛选
      if (!filterProject.includes('all') && !filterProject.includes(task.projectId)) {
        return false;
      }

      // 成员筛选
      if (!filterMember.includes('all') && !filterMember.includes(task.assigneeId)) {
        return false;
      }

      // 状态筛选
      if (!filterStatus.includes('all') && !filterStatus.includes(task.status)) {
        return false;
      }

      // 优先级筛选
      if (!filterPriority.includes('all') && !filterPriority.includes(task.priority)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filterProject, filterMember, filterStatus, filterPriority]);

  return {
    searchQuery,
    setSearchQuery,
    filterProject,
    setFilterProject,
    filterMember,
    setFilterMember,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    activeFilterCount,
    clearFilters,
    applyFilters,
  };
}
