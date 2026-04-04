/**
 * 报表分析模块主页面
 * 包含5个Tab：项目进度、任务统计、延期分析、成员任务分析、资源效能分析
 * 符合需求文档 REQ_07_analytics.md 要求
 */
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/api/client';
import { ReportFilterBar } from './components/ReportFilterBar';
import { ProjectProgressTab } from './components/ProjectProgressTab';
import { TaskStatisticsTab } from './components/TaskStatisticsTab';
import { DelayAnalysisTab } from './components/DelayAnalysisTab';
import { MemberAnalysisTab } from './components/MemberAnalysisTab';
import { ResourceEfficiencyTab } from './components/ResourceEfficiencyTab';
import { useProjectsForReport, useMembersForReport } from './hooks/useReportData';
import type { ReportFilters, ReportTab } from './types';

// Tab 配置
const REPORT_TABS: { value: ReportTab; label: string; path: string }[] = [
  { value: 'project-progress', label: '项目进度报表', path: '/reports/project-progress' },
  { value: 'task-statistics', label: '任务统计报表', path: '/reports/task-statistics' },
  { value: 'delay-analysis', label: '延期分析报表', path: '/reports/delay-analysis' },
  { value: 'member-analysis', label: '成员任务分析', path: '/reports/member-analysis' },
  { value: 'resource-efficiency', label: '资源效能分析', path: '/reports/resource-efficiency' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 筛选条件状态
  const [filters, setFilters] = useState<ReportFilters>({});

  // 获取项目和成员列表（用于筛选器）
  const { data: projectsData, isLoading: projectsLoading } = useProjectsForReport();
  const { data: membersData, isLoading: membersLoading } = useMembersForReport();

  // 根据 URL 确定当前 Tab
  const currentTab = useMemo(() => {
    const path = location.pathname;
    const tab = REPORT_TABS.find(t => path.includes(t.value));
    return tab?.value || 'project-progress';
  }, [location.pathname]);

  const isLoading = projectsLoading || membersLoading;

  // Tab 切换处理
  const handleTabChange = (value: string) => {
    const tab = REPORT_TABS.find(t => t.value === value);
    if (tab) {
      navigate(tab.path);
    }
  };

  // 刷新处理
  const handleRefresh = () => {
    // 强制刷新当前数据
    setFilters({ ...filters });
  };

  // 导出处理
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', 'xlsx');
      if (filters.projectId) params.set('project_id', filters.projectId);
      if (filters.assigneeId) params.set('assignee_id', String(filters.assigneeId));
      if (filters.startDate) params.set('start_date', filters.startDate);
      if (filters.endDate) params.set('end_date', filters.endDate);

      const response = await fetch(`/api/analytics/export/${currentTab}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  // 项目列表（用于筛选器）
  // 注：响应拦截器会自动转换 snake_case -> camelCase
  const projects = useMemo(() => {
    if (!projectsData) return [];
    if (Array.isArray(projectsData)) {
      return projectsData.map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
    }
    return [];
  }, [projectsData]);

  // 成员列表（用于筛选器）
  const members = useMemo(() => {
    if (!membersData) return [];
    if (Array.isArray(membersData)) {
      return membersData.map((m: any) => ({
        id: m.id,
        name: m.name || m.displayName || m.username,
      }));
    }
    if (membersData.members) {
      return membersData.members.map((m: any) => ({
        id: m.id,
        name: m.name || m.displayName || m.username,
      }));
    }
    return [];
  }, [membersData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">报表分析</h1>
          <p className="text-muted-foreground">查看项目进度、任务统计、延期分析、成员任务情况</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <ReportFilterBar
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
        <TabsList className="grid grid-cols-5 w-full max-w-[750px]">
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="project-progress">
          <ProjectProgressTab filters={filters} />
        </TabsContent>

        <TabsContent value="task-statistics">
          <TaskStatisticsTab filters={filters} />
        </TabsContent>

        <TabsContent value="delay-analysis">
          <DelayAnalysisTab filters={filters} />
        </TabsContent>

        <TabsContent value="member-analysis">
          <MemberAnalysisTab
            filters={filters}
            onFiltersChange={setFilters}
          />
        </TabsContent>

        <TabsContent value="resource-efficiency">
          <ResourceEfficiencyTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
