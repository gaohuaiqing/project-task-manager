/**
 * 仪表板页面
 */
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FolderKanban,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  ListTodo,
} from 'lucide-react';
import { StatsCard } from './components/StatsCard';
import { ProjectProgress } from './components/ProjectProgress';
import { TaskDistribution } from './components/TaskDistribution';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  useDashboardStats,
  useTaskDistribution,
} from './hooks/useDashboardData';
import type { ProjectProgressItem } from './types';

export default function DashboardPage() {
  const navigate = useNavigate();

  // 获取仪表板统计数据
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // 获取任务分布数据
  const { data: distribution } = useTaskDistribution();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 模拟项目进度数据（后续从 API 获取）
  const projects: ProjectProgressItem[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">仪表板</h1>
        <p className="text-muted-foreground">欢迎回来，查看您的项目概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="总任务数"
          value={stats?.totalTasks ?? 0}
          icon={CheckCircle2}
          accentColor="#60a5fa"
          onClick={() => navigate('/tasks')}
        />
        <StatsCard
          title="进行中项目"
          value={stats?.activeProjects ?? 0}
          suffix="个"
          icon={FolderKanban}
          accentColor="#4ade80"
          onClick={() => navigate('/projects')}
        />
        <StatsCard
          title="团队成员"
          value={stats?.totalMembers ?? 0}
          suffix="人"
          icon={Users}
          accentColor="#a78bfa"
        />
        <StatsCard
          title="平均进度"
          value={stats?.avgProgress ?? 0}
          suffix="%"
          icon={TrendingUp}
          accentColor="#fb923c"
        />
      </div>

      {/* 任务状态概览 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <Clock className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-muted-foreground">待处理</p>
              <p className="text-xl font-bold">{stats.pendingTasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <ListTodo className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">进行中</p>
              <p className="text-xl font-bold">{stats.inProgressTasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">已完成</p>
              <p className="text-xl font-bold">{stats.completedTasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">已延期</p>
              <p className="text-xl font-bold">{stats.overdueTasks}</p>
            </div>
          </div>
        </div>
      )}

      {/* 项目进度和任务分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectProgress
          projects={projects}
          onProjectClick={(project) => navigate(`/projects/${project.id}`)}
        />
        <TaskDistribution distribution={distribution} />
      </div>
    </div>
  );
}
