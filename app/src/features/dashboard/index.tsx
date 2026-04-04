/**
 * 仪表板页面
 * 符合需求文档 REQ_07_analytics.md 要求
 * 业务定位：异常探测器 - 快速发现核心问题
 *
 * 角色差异化：
 * - admin/dept_manager/tech_manager：显示全部组件（含分布/饼图分析）
 * - engineer：显示统计卡片（个人）、任务列表、紧急任务提醒、项目进度
 */
import { useNavigate } from 'react-router-dom';
import { StatsCard } from './components/StatsCard';
import { ProjectProgress } from './components/ProjectProgress';
import { TaskDistribution } from './components/TaskDistribution';
import { TrendChart } from './components/TrendChart';
import { ProgressPieChart, StatusPieChart } from './components/ProgressPieChart';
import { UrgentTaskAlert } from './components/UrgentTaskAlert';
import { TaskListPanel } from './components/TaskListPanel';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { calculateTrend } from '@/shared/components/TrendIndicator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useDashboardStats,
  useTaskDistribution,
  useTaskTrend,
  useProjectProgress,
  useDashboardTrends,
} from './hooks/useDashboardData';

// 管理者角色列表（可查看分析组件）
const MANAGER_ROLES = ['admin', 'dept_manager', 'tech_manager'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 判断是否为管理者角色
  const isManager = MANAGER_ROLES.includes(user?.role ?? '');

  // 获取仪表板统计数据
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // 获取趋势指标（对比当前周期 vs 上期）
  const { data: trendsData } = useDashboardTrends(7);

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

  // 趋势指标辅助函数
  const getTrend = (key: string) => {
    if (!trendsData?.[key]?.trend) return undefined;
    const t = trendsData[key].trend;
    return calculateTrend(t.value, t.previousValue, 'vs 上周');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 紧急任务提醒 */}
      {stats && (stats.overdueTasks > 0 || stats.delayWarningTasks > 0) && (
        <UrgentTaskAlert
          overdueCount={stats.overdueTasks}
          warningCount={stats.delayWarningTasks}
          onJump={handleUrgentJump}
        />
      )}

      {/* 统计卡片（含趋势指标） - 根据角色显示不同标题 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={isManager ? '项目总数' : '参与项目'}
          value={stats?.totalProjects ?? 0}
          trend={getTrend('activeProjects')}
          onClick={() => navigate('/projects')}
        />
        <StatsCard
          title={isManager ? '进行中任务' : '我的进行中'}
          value={stats?.inProgressTasks ?? 0}
          trend={getTrend('totalTasks')}
          onClick={() => navigate('/tasks?status=in_progress')}
        />
        <StatsCard
          title={isManager ? '已完成任务' : '我的已完成'}
          value={stats?.completedTasks ?? 0}
          trend={getTrend('completedTasks')}
          onClick={() => navigate('/tasks?status=completed')}
        />
        <StatsCard
          title={isManager ? '延期预警' : '我的到期/逾期'}
          value={isManager ? (stats?.delayWarningTasks ?? 0) : ((stats?.delayWarningTasks ?? 0) + (stats?.overdueTasks ?? 0))}
          trend={getTrend('delayWarning')}
          invertTrendColors
          onClick={() => navigate('/tasks?status=warning')}
        />
      </div>

      {/* 任务趋势图 */}
      <TrendChart data={trendData ?? []} isLoading={trendLoading} />

      {/* 图表区域 - 项目进度 + 项目任务分布饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectProgress
          projects={projectData ?? []}
          isLoading={projectLoading}
          onProjectClick={(project) => navigate(`/projects/${project.id}`)}
        />
        {/* 项目任务分布饼图 - 仅管理者可见 */}
        {isManager && (
          <ProgressPieChart
            data={projectData ?? []}
            isLoading={projectLoading}
          />
        )}
      </div>

      {/* 任务状态分布饼图 + 任务分布 - 仅管理者可见 */}
      {isManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusPieChart data={statusDistribution} />
          <TaskDistribution distribution={distribution} />
        </div>
      )}

      {/* 任务列表 */}
      <TaskListPanel />
    </div>
  );
}
