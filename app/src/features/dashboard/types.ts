/**
 * 仪表板模块类型定义
 * 与后端 analytics/types.ts 保持一致
 */

// 仪表板统计
export interface DashboardStats {
  // 项目统计
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;

  // 任务统计（按状态细分）
  totalTasks: number;
  pendingTasks: number;        // not_started
  inProgressTasks: number;     // in_progress
  completedTasks: number;      // early_completed + on_time_completed + overdue_completed
  delayWarningTasks: number;   // delay_warning
  overdueTasks: number;        // delayed

  // 其他统计
  totalMembers: number;
  avgProgress: number;
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
  delayed: number;
}

// 任务趋势（API返回包装）
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
  status: 'planning' | 'in_progress' | 'completed' | 'delayed';
  progress: number;
  totalTasks: number;
  completedTasks: number;
  deadline: string | null;
  members: Array<{
    id: number;
    name: string;
    avatar: string | null;
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
