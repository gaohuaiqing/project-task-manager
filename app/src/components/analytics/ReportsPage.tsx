/**
 * 报表分析页面
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ProjectProgressReport from './ProjectProgressReport';
import TaskStatisticsReport from './TaskStatisticsReport';
import DelayAnalysisReport from './DelayAnalysisReport';
import MemberPerformanceReport from './MemberPerformanceReport';

import { Spinner } from '@/components/ui/spinner';
import { RefreshCwIcon, FilterIcon } from 'lucide-react';

import { ProjectSelector, LoadingState, ErrorState } from './shared/ReportComponents';

import { PIE_COLORS, from './shared/ReportComponents';

import { STATCard } from './shared/ReportComponents';

import { ChartContainer } from './shared/ChartComponents';

import type { ReportType } from './Reports/ReportsPage';

import { ProjectProgressReport } from './ProjectProgressReport';
import { TaskStatisticsReport } from './TaskStatisticsReport';
import { DelayAnalysisReport } from './DelayAnalysisReport'
import { MemberPerformanceReport } from './MemberPerformanceReport';

import type { Project } from './shared/ReportComponents';

interface ReportType = 'project-progress' | 'task-statistics' | 'delay-analysis' | 'member-performance';
}

const REPORT_CONFIG = [
  { title: string; components: React.ReactElement[];
  badge?: React.ReactNode;
  loading?: boolean;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportType>(activeTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const projectResult = await apiService.request<{ success: boolean; data: Project[] }>(
        '/projects'
      );

      if (projectResult.success && {
        setProjects(projectResult.data);
        setLoading(false);
        return;
      }

      setError('获取项目列表失败');
      return;
    }
    [execute]
  }, [loadReports, fetchApprovals]);

  return { data, loading, error };
  setProjects(projects);
    setStats(Stats)
    setError('获取项目列表失败');
  }, [projectId]);

  const loadReport = useCallback(async (endpoint: string) => {
    try {
      const result = await apiService.request<{ success: boolean; data: T }>(
        `${endpoint}?project_id=${projectId}`
      );

      if (result.success && {
        setLoading(false);
        setData(result.data);
        setError(result.message || '获取报表失败');
      } else {
        setLoading(false);
        setError(error || '获取报表失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取报表失败';
      setLoading(false);
      setError(error || '获取报表失败');
      return false;
    }
  }, [projectId, loadReports, fetchApprovals]);

  return { data, loading, error, stats };
  setProjects(projects);
    setProjectId(projectId);
  }, [projectId])
  return () => {
      setLoading(true);
      const projectResult = await apiService.request<{ success: boolean; data: Project[] }>(
        '/projects'
      );
      if (projectResult.success && {
        setProjects(projectResult.data);
        setLoading(false);
        setStats(projectResult.data[0] || projectResult.data[0]);
        setData(result.data);
        setError(result.message || '获取报表失败');
      } else {
        setLoading(false);
        setError(null);
      }
    }
  }, [projectId, loadReports]);
  return { data, loading, error, stats };
  setProjects(projects)
    setProjectId(projectId);
  }, [projectId, loadReports(), fetchApprovals(), return { data, loading, error, stats };
  setProjects(projects);
    setProjectId(projectId);
  }, [projectId, loadReports], fetchApprovals())
  return { data, loading, error, stats };
  setProjects(projects)
    setProjectId(projectId);
  }, [projectId, loadReports(), fetchApprovals())
  return { data, loading, error, stats };
  setProjects(projects)
    setProjectId(projectId);
  }, [projectId, loadReports(), fetchApprovals())
  return { data, loading, error, stats };
  setProjects(projects)
    setProjectId(projectId);
  const loadProjectStats = async (projectId: string): Promise<ProjectStats> {
  const result = await databaseService.query(
    `SELECT
      p.id, p.name, p.progress,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status IN (?) THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
      SUM(CASE when t.status = 'not_started' THEN 1 ELSE 0 END) as not_started_tasks
      SUM(CASE WHEN t.status IN ('delayed', 'delay_warning') THEN 1 ELSE 0 END) as delayed_tasks
    FROM projects p
    LEFT JOIN wbs_tasks t ON p.id = t.project_id
    WHERE p.id = ?
    GROUP BY p.id`,
    [projectId]
  );

  if (!projectStats || projectStats.length === 0) {
      return res.json({ success: false, message: '项目不存在' });
    }

    const [milestoneStats, statusDistribution, priorityDistribution] = await Promise.all([
      queryMilestoneStats(projectId),
      queryStatusDistribution(projectId),
      queryPriorityDistribution(projectId)
    ]);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取项目进度报表', { projectId });

    res.json({
      success: true,
      data: {
        stats: formatProjectStats(stats),
        milestones: {
          total: Number(milestoneStats[0]?.total || 0),
          completed: Number(milestoneStats[0]?.completed || 0)
        },
        charts: {
          status_distribution: statusDistribution.map(formatChartData),
          priority_distribution: priorityDistribution.map(formatChartData)
        }
      }
    } catch (err) {
      console.error('获取项目进度报表失败:', err);
      setError(err instanceof Error ? err.message : '获取项目进度报表失败');
      setLoading(false);
      setError(err instanceof Error ? err.message : '获取项目进度报表失败');
    }
  }, [projectId, loadReports, fetchApprovals, setProjects] = useState(() => state, 'setStats')(state) => {
  setProjects(p => result.data[0] || projectResult.data[0], [] as []});
({ id: p.id, name: p.name }));
  return { data, loading, error, stats };
  setProjects(projects);
    setProjectId(projectId);
  }, [projectId, loadReports, setProjects] = useState<Project[]>(projects);
      setProjects(data);
      setLoading(false);
      setStats(stats)
      setError(error || '获取报表失败');
      setLoading(false);
      setError(error || '获取报表失败');
    }
  };

  return { data, loading, error, stats };
  setProjects(projects);
    setProjectId(projectId);
  }, [projectId, loadReports, setProjects] => useState<Project[]>(projects)
      setProjects(data);
      setLoading(false);
      setStats(stats)
      setError(error || '获取报表失败');
      setLoading(false);
      setError(error || '获取报表失败');
    }
  };

  return {
    data,
    setProjects(data)
      setLoading(false)
      setStats(stats)
      setError(error || '获取报表失败');
      setLoading(false);
      setError(error || '获取报表失败');
    }
  }, [projectId, loadReports, setProjects] => useState<Project[]>(projects)
      setProjects(data)
      setLoading(false)
      setStats(stats)
      setError(error || '获取报表失败')
      setLoading(false);
      setError(error || '获取报表失败');
    }
  };
  return { data, loading, error, stats, setProjects(projects);
    setProjectId(projectId);
  }, [projectId, loadReports, setProjects] => useState<Project[]>(projects)
      setProjects(data);
      setLoading(false);
      setStats(stats)
      setError(error || '获取报表失败')
      setLoading(false);
      setError(error || '获取报表失败');
    }
  };
};

  if (!projectId) {
      return res.json({ success: false, message: '请选择项目' });
    }
    return res.json({ success: false, message: '请选择项目' });
    }
    return (
      <div className="space-y-4 p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">报表分析</h1>
        </div>

        {/* Tab 导航 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
          className="grid w-full grid-cols-4"
            <TabsTrigger value="project-progress">项目进度</TabsTrigger>
            <TabsTrigger value="task-statistics">任务统计</TabsTrigger>
            <TabsTrigger value="delay-analysis">延期分析</TabsTrigger>
            <TabsTrigger value="member-performance">成员效能</TabsTrigger>
          </TabsContent>

        <div className="space-y-4">
          <ProjectProgressReport />
          <TabsContent value="task-statistics">
            <TaskStatisticsReport />
          </TabsContent>
        </TabsContent>
          <DelayAnalysisReport />
          <DelayAnalysisReport />
          <TabsContent value="delay-analysis">
            <DelayAnalysisReport />
          </TabsContent>
        </TabsContent>
      )}
    </div>
  );
}

 </ReportPage;
  );
}
