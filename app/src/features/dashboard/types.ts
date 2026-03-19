/**
 * 仪表板模块类型定义
 */

// 仪表板统计
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalMembers: number;
  avgProgress: number;
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  completed: number;
  created: number;
  total: number;
}

// 任务趋势
export interface TaskTrend {
  data: TrendDataPoint[];
  summary: {
    totalCompleted: number;
    totalCreated: number;
    avgDailyCompleted: number;
  };
}

// 项目进度项
export interface ProjectProgressItem {
  id: string;
  name: string;
  progress: number;
  status: 'planning' | 'in_progress' | 'completed' | 'delayed';
  totalTasks: number;
  completedTasks: number;
  deadline: string | null;
  members: Array<{
    id: number;
    name: string;
    avatar?: string;
  }>;
}

// 任务分布
export interface TaskDistribution {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byAssignee: Array<{
    id: number;
    name: string;
    count: number;
  }>;
}

// 仪表板查询参数
export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}
