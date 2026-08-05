/**
 * 报表分析模块主页面
 * 包含6个Tab：项目进度、任务统计、延期分析、成员任务分析、资源效能分析、活跃度分析
 *
 * @module analytics/reports/ReportsPage
 * @see REQ_07_INDEX.md §2 模块定位
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from './components/shared';
import { getPresetDateRange } from './config';
import { TIME_PERIODS, CACHE_TIMES } from '../shared/constants';
import {
  ProjectProgressTab,
  TaskStatisticsTab,
  DelayAnalysisTab,
  MemberAnalysisTab,
  ResourceEfficiencyTab,
  ActivityTrendTab,
} from './tabs';
import { useProjectsForReport, useMembersForReport } from './data';
import type { ReportFilters, ReportTab } from './types';
import { REPORT_TABS } from './types';
import { toast } from 'sonner';

export interface ReportsPageProps {
  /** 初始 Tab */
  initialTab?: ReportTab;
}

export function ReportsPage({ initialTab }: ReportsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // 筛选条件状态（初始默认"近30天"：timeRange + 同步计算好的 startDate/endDate，
  // 确保首次请求即带时间参数；原先仅设 timeRange 未带日期，导致后端按"当前视角"处理）
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const { startDate, endDate } = getPresetDateRange('30d');
    return { timeRange: '30d', startDate, endDate };
  });

  // 获取项目和成员列表（用于筛选器）
  const { data: projectsData, isLoading: projectsLoading } = useProjectsForReport();
  const { data: membersData, isLoading: membersLoading } = useMembersForReport();

  // 根据 URL 确定当前 Tab
  const currentTab = useMemo(() => {
    if (initialTab) return initialTab;
    const path = location.pathname;
    const tab = REPORT_TABS.find((t) => path.includes(t.value));
    return tab?.value || 'project-progress';
  }, [location.pathname, initialTab]);

  const isLoading = projectsLoading || membersLoading;

  // Tab 切换处理
  const handleTabChange = useCallback(
    (value: string) => {
      const tab = REPORT_TABS.find((t) => t.value === value);
      if (tab) {
        navigate(tab.path);
      }
    },
    [navigate]
  );

  // 刷新处理 — 通过版本号触发 React Query 重新请求
  const [refreshVersion, setRefreshVersion] = useState(0);
  const handleRefresh = useCallback(() => {
    // 使 React Query 缓存失效，触发所有报表重新请求
    queryClient.invalidateQueries({ queryKey: ['task-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['delay-analysis'] });
    queryClient.invalidateQueries({ queryKey: ['member-analysis'] });
    queryClient.invalidateQueries({ queryKey: ['resource-efficiency'] });
    queryClient.invalidateQueries({ queryKey: ['project-progress'] });
    queryClient.invalidateQueries({ queryKey: ['activity-trend'] });
    setRefreshVersion((v) => v + 1);
  }, [queryClient]);

  // 导出处理
  const handleExport = useCallback(async () => {
    try {
      // 将 timeRange 转换为实际日期（与 UI 数据获取逻辑一致）
      const startDate = filters.startDate
        || new Date(Date.now() - TIME_PERIODS.month * CACHE_TIMES.dayMs).toISOString().split('T')[0];
      const endDate = filters.endDate || new Date().toISOString().split('T')[0];

      const params = new URLSearchParams();
      params.set('format', 'xlsx');
      params.set('start_date', startDate);
      params.set('end_date', endDate);
      if (filters.projectId) params.set('project_id', filters.projectId);
      if (filters.assigneeId) params.set('assignee_id', filters.assigneeId);
      if (filters.taskType) params.set('task_type', filters.taskType);
      if (filters.delayType) params.set('delay_type', filters.delayType);
      if (filters.departmentId) params.set('department_id', filters.departmentId);
      if (filters.techGroupId) params.set('tech_group_id', filters.techGroupId);

      // 使用 Cookie 认证（与 apiService 一致），无需 Bearer token
      const response = await fetch(`/api/analytics/export/${currentTab}?${params.toString()}`, {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `导出失败: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出失败，请稍后重试';
      toast.error('导出失败', { description: errorMessage });
      if (import.meta.env.DEV) console.error('导出失败:', err);
    }
  }, [currentTab, filters]);

  // 项目列表（用于筛选器）
  const projects = useMemo(() => {
    if (!projectsData) return [];
    return projectsData.map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));
  }, [projectsData]);

  // 成员列表（用于筛选器）
  const members = useMemo(() => {
    if (!membersData) return [];
    return membersData.map((m: { id: number; name: string; real_name?: string }) => ({
      id: m.id,
      name: m.name || m.real_name,
    }));
  }, [membersData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 筛选栏 */}
      <FilterBar
        activeTab={currentTab}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isLoading}
        projects={projects}
        members={members}
      />

      {/* Tab 导航和内容 */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full max-w-[900px] bg-muted/50">
          {REPORT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs md:text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="project-progress" className="mt-0">
          <ProjectProgressTab filters={filters} />
        </TabsContent>

        <TabsContent value="task-statistics" className="mt-0">
          <TaskStatisticsTab filters={filters} />
        </TabsContent>

        <TabsContent value="delay-analysis" className="mt-0">
          <DelayAnalysisTab filters={filters} />
        </TabsContent>

        <TabsContent value="member-analysis" className="mt-0">
          <MemberAnalysisTab filters={filters} />
        </TabsContent>

        <TabsContent value="resource-efficiency" className="mt-0">
          <ResourceEfficiencyTab filters={filters} />
        </TabsContent>

        <TabsContent value="activity-trend" className="mt-0">
          <ActivityTrendTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
