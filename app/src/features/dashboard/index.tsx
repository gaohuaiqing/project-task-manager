/**
 * 仪表板页面
 */
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FolderKanban, Users, TrendingUp } from 'lucide-react';
import { StatsCard } from './components/StatsCard';
import { ProjectProgress } from './components/ProjectProgress';
import { TaskDistribution } from './components/TaskDistribution';
import { TrendChart } from './components/TrendChart';
import { ProgressPieChart, StatusPieChart } from './components/ProgressPieChart';
import { UrgentTaskAlert } from './components/UrgentTaskAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  useDashboardStats,
  useTaskDistribution,
  useTaskTrend,
  useProjectProgress,
} from './hooks/useDashboardData';
import type { ProjectProgressItem } from './types';

export default function DashboardPage() {
  const navigate = useNavigate();

  // 获取仪表板统计数据
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // 获取任务分布数据
  const { data: distribution } = useTaskDistribution();

  // 获取任务趋势数据
  const { data: trendData, isLoading: trendLoading } = useTaskTrend(30);

  // 获取项目进度数据
  const { data: projectData, isLoading: projectLoading } = useProjectProgress();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 项目进度数据
  const projects: ProjectProgressItem[] = projectData?.map((p) => ({
    id: p.projectId,
    name: p.projectName,
    progress: p.progress,
    totalTasks: p.taskCount,
    completedTasks: p.completedCount,
  })) ?? [];

  // 任务状态分布数据
  const statusDistribution = stats
    ? [
        {
          status: 'not_started',
          label: '未开始',
          count: stats.pendingTasks,
          color: '#9ca3af',
        },
        {
          status: 'in_progress',
          label: '进行中',
          count: stats.inProgressTasks,
          color: '#3b82f6',
        },
        {
          status: 'completed',
          label: '已完成',
          count: stats.completedTasks,
          color: '#22c55e',
        },
        {
          status: 'delayed',
          label: '已延期',
          count: stats.overdueTasks,
          color: '#ef4444',
        },
      ]
    : [];

  // 处理紧急任务跳转
  const handleUrgentJump = (type: 'overdue' | 'warning') => {
    if (type === 'overdue') {
      navigate('/tasks?status=delayed');
    } else {
      navigate('/tasks?status=warning');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">仪表板</h1>
        <p className="text-muted-foreground">欢迎回来，查看您的项目概览</p>
      </div>

      {/* 紧急任务提醒 */}
      {stats && (stats.overdueTasks > 0 || (stats.warningTasks ?? 0) > 0) && (
        <UrgentTaskAlert
          overdueCount={stats.overdueTasks}
          warningCount={stats.warningTasks ?? 0}
          onJump={handleUrgentJump}
        />
      )}

      {/* 统计卡片（极简数字样式） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总任务数"
          value={stats?.totalTasks ?? 0}
          onClick={() => navigate('/tasks')}
        />
        <StatsCard
          title="进行中项目"
          value={stats?.activeProjects ?? 0}
          suffix="个"
          onClick={() => navigate('/projects')}
        />
        <StatsCard
          title="团队成员"
          value={stats?.totalMembers ?? 0}
          suffix="人"
        />
        <StatsCard
          title="平均进度"
          value={stats?.avgProgress ?? 0}
          suffix="%"
        />
      </div>

      {/* 任务趋势图 */}
      <TrendChart data={trendData ?? []} isLoading={trendLoading} />

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目进度 */}
        <ProjectProgress
          projects={projects}
          onProjectClick={(project) => navigate(`/projects/${project.id}`)}
        />
        {/* 项目任务分布饼图 */}
        <ProgressPieChart
          data={projectData ?? []}
          isLoading={projectLoading}
        />
      </div>

      {/* 任务状态分布饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart data={statusDistribution} />
        <TaskDistribution distribution={distribution} />
      </div>
    </div>
  );
}
