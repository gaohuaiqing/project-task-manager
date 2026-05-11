/**
 * 仪表板模块类型定义
 * 与后端 analytics/types.ts DashboardStats 保持一致
 */

// 仪表板统计
export interface DashboardStats {
  // 项目统计
  totalProjects: number;
  activeProjects: number;      // planning + in_progress
  delayedProjects: number;     // delayed
  completedProjects: number;

  // 任务统计（按状态细分，互斥状态集）
  totalTasks: number;          // 全部任务数
  totalRootTasks: number;      // 根任务数（wbs_level=1）
  pendingApprovalTasks: number;  // pending_approval - 待审批
  pendingTasks: number;          // not_started - 未开始
  inProgressTasks: number;       // in_progress - 进行中
  completedTasks: number;        // completed - 已完成
  delayWarningTasks: number;     // delay_warning - 延期预警
  overdueTasks: number;          // delayed - 已延期
  unassignedTasks: number;       // assignee_id IS NULL - 待分配

  // 其他统计
  totalMembers: number;
  avgProgress: number;           // 项目平均进度百分比
  activityRate: number;          // 活跃度：7日内有更新的任务占比
  utilizationRate: number;       // 资源利用率：成员平均工作负荷比率
  weekDueTasks: number;          // 本周到期：未来7天到期的未完成任务数
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
