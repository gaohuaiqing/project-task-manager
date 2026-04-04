# 仪表盘模块修复实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复仪表盘模块与需求文档的不一致问题，统一前后端数据结构，新增3个缺失组件

**Architecture:** 扩展后端API返回完整统计字段，新增获取所有项目进度端点，统一前后端类型定义，新增任务列表/通知中心/快捷操作组件

**Tech Stack:** TypeScript, Express, MySQL, React, TanStack Query, Recharts, shadcn/ui

---

## 文件结构

### 后端文件
| 文件 | 职责 |
|------|------|
| `app/server/src/modules/analytics/types.ts` | 扩展类型定义 |
| `app/server/src/modules/analytics/repository.ts` | 扩展统计查询、新增项目进度方法 |
| `app/server/src/modules/analytics/service.ts` | 新增服务方法 |
| `app/server/src/modules/analytics/routes.ts` | 新增API路由 |

### 前端文件
| 文件 | 职责 |
|------|------|
| `app/src/features/dashboard/types.ts` | 统一类型定义 |
| `app/src/lib/api/analytics.api.ts` | 更新API调用 |
| `app/src/features/dashboard/hooks/useDashboardData.ts` | 更新Hooks |
| `app/src/features/dashboard/index.tsx` | 更新页面组件 |
| `app/src/features/dashboard/components/TaskListPanel.tsx` | 新增：任务列表组件 |
| `app/src/features/dashboard/components/NotificationCenter.tsx` | 新增：通知中心组件 |
| `app/src/features/dashboard/components/QuickActions.tsx` | 新增：快捷操作组件 |

---

## Chunk 1: 后端类型定义与Repository修改

### Task 1: 扩展后端类型定义

**Files:**
- Modify: `app/server/src/modules/analytics/types.ts`

- [ ] **Step 1: 更新 DashboardStats 接口**

打开 `app/server/src/modules/analytics/types.ts`，找到 `DashboardStats` 接口，替换为：

```typescript
// ============ 仪表板统计相关 ============

export interface DashboardStats {
  // 项目统计
  total_projects: number;
  active_projects: number;
  completed_projects: number;

  // 任务统计（按状态细分）
  total_tasks: number;
  pending_tasks: number;        // not_started
  in_progress_tasks: number;    // in_progress
  completed_tasks: number;      // early_completed + on_time_completed + overdue_completed
  delay_warning_tasks: number;  // delay_warning
  overdue_tasks: number;        // delayed

  // 其他统计
  total_members: number;
  avg_progress: number;
}
```

- [ ] **Step 2: 新增 TrendDataPoint 接口**

在 `DashboardStats` 接口后添加：

```typescript
export interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
  delayed: number;
}
```

- [ ] **Step 3: 新增 ProjectProgressItem 接口**

添加：

```typescript
export interface ProjectProgressItem {
  project_id: string;
  project_name: string;
  status: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  deadline: string | null;
  members: MemberInfo[];
}

export interface MemberInfo {
  id: number;
  name: string;
  avatar: string | null;
}
```

- [ ] **Step 4: 更新 UrgentTask 接口**

将 `UrgentTask` 接口的 `end_date` 类型改为 `string | null`：

```typescript
export interface UrgentTask {
  id: string;
  description: string;
  project_name: string;
  assignee_name: string;
  end_date: string | null;
  priority: string;
}
```

---

### Task 2: 扩展 Repository 查询方法

**Files:**
- Modify: `app/server/src/modules/analytics/repository.ts`

- [ ] **Step 1: 导入新类型**

在文件顶部导入区域添加新类型：

```typescript
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig,
  MilestoneProgress, AssigneeTaskCount, DelayReasonCount, MemberTask,
  TrendDataPoint, ProjectProgressItem, MemberInfo
} from './types';
```

- [ ] **Step 2: 重写 getDashboardStats 方法**

找到 `getDashboardStats` 方法（约第14-36行），替换为：

```typescript
  async getDashboardStats(userId: number, isAdmin: boolean): Promise<DashboardStats> {
    const pool = getPool();

    const projectFilter = isAdmin ? '' : 'AND FIND_IN_SET(?, p.member_ids) > 0';
    const taskFilter = isAdmin ? '' : 'AND FIND_IN_SET(?, p.member_ids) > 0';
    const projectParams = isAdmin ? [] : [userId.toString()];
    const taskParams = isAdmin ? [] : [userId.toString()];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM projects p WHERE 1=1 ${projectFilter}) as total_projects,
        (SELECT COUNT(*) FROM projects p WHERE p.status = 'in_progress' ${projectFilter}) as active_projects,
        (SELECT COUNT(*) FROM projects p WHERE p.status = 'completed' ${projectFilter}) as completed_projects,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE 1=1 ${taskFilter}) as total_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'not_started' ${taskFilter}) as pending_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'in_progress' ${taskFilter}) as in_progress_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') ${taskFilter}) as completed_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'delay_warning' ${taskFilter}) as delay_warning_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'delayed' ${taskFilter}) as overdue_tasks,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_members,
        (SELECT COALESCE(AVG(p2.progress), 0) FROM projects p2 WHERE p2.status = 'in_progress' ${projectFilter}) as avg_progress`,
      isAdmin
        ? [...projectParams, ...projectParams, ...projectParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...projectParams]
        : [...projectParams, ...projectParams, ...projectParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...taskParams, ...projectParams]
    );

    const result = rows[0] as DashboardStats;
    return {
      total_projects: result.total_projects || 0,
      active_projects: result.active_projects || 0,
      completed_projects: result.completed_projects || 0,
      total_tasks: result.total_tasks || 0,
      pending_tasks: result.pending_tasks || 0,
      in_progress_tasks: result.in_progress_tasks || 0,
      completed_tasks: result.completed_tasks || 0,
      delay_warning_tasks: result.delay_warning_tasks || 0,
      overdue_tasks: result.overdue_tasks || 0,
      total_members: result.total_members || 0,
      avg_progress: Math.round(result.avg_progress || 0),
    };
  }
```

- [ ] **Step 3: 添加 getProjectMembers 私有方法**

在类中添加私有辅助方法：

```typescript
  private async getProjectMembers(memberIds: string | null): Promise<MemberInfo[]> {
    if (!memberIds) return [];
    const pool = getPool();
    const ids = memberIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) return [];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, real_name as name, avatar FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    return rows.map(r => ({ id: r.id, name: r.name, avatar: r.avatar }));
  }
```

- [ ] **Step 4: 添加 getAllProjectsProgress 方法**

在 `getTaskTrend` 方法后添加：

```typescript
  async getAllProjectsProgress(userId: number, isAdmin: boolean): Promise<ProjectProgressItem[]> {
    const pool = getPool();
    const projectFilter = isAdmin ? '' : 'AND FIND_IN_SET(?, p.member_ids) > 0';
    const params = isAdmin ? [] : [userId.toString()];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        p.id as project_id,
        p.name as project_name,
        p.status,
        p.deadline,
        p.progress,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        p.member_ids
       FROM projects p
       LEFT JOIN wbs_tasks t ON p.id = t.project_id
       WHERE p.status IN ('planning', 'in_progress', 'delayed') ${projectFilter}
       GROUP BY p.id, p.name, p.status, p.deadline, p.progress, p.member_ids
       ORDER BY p.deadline ASC
       LIMIT 10`,
      params
    );

    const results: ProjectProgressItem[] = [];
    for (const row of rows) {
      const members = await this.getProjectMembers(row.member_ids);
      results.push({
        project_id: row.project_id,
        project_name: row.project_name,
        status: row.status,
        progress: row.progress || (row.total_tasks > 0 ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0),
        total_tasks: row.total_tasks || 0,
        completed_tasks: row.completed_tasks || 0,
        deadline: row.deadline,
        members
      });
    }
    return results;
  }
```

- [ ] **Step 5: 更新 getTaskTrend 方法**

找到 `getTaskTrend` 方法，替换为：

```typescript
  async getTaskTrend(startDate: string, endDate: string, projectId?: string): Promise<TrendDataPoint[]> {
    const pool = getPool();

    // 设置默认日期范围（最近30天）
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const conditions = ['DATE(t.created_at) BETWEEN ? AND ?'];
    const params: (string | number)[] = [start, end];

    if (projectId && projectId !== 'all') {
      conditions.push('t.project_id = ?');
      params.push(projectId);
    }

    // 获取每日新建任务数
    const [createdRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.created_at) as date, COUNT(*) as created
       FROM wbs_tasks t
       WHERE ${conditions.join(' AND ')}
       GROUP BY DATE(t.created_at)
       ORDER BY date`,
      params
    );

    // 获取每日完成任务数
    const [completedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.updated_at) as date, COUNT(*) as completed
       FROM wbs_tasks t
       WHERE DATE(t.updated_at) BETWEEN ? AND ?
         AND t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')
         ${projectId && projectId !== 'all' ? 'AND t.project_id = ?' : ''}
       GROUP BY DATE(t.updated_at)`,
      projectId && projectId !== 'all' ? [start, end, projectId] : [start, end]
    );

    // 获取每日延期任务数
    const [delayedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.updated_at) as date, COUNT(*) as delayed
       FROM wbs_tasks t
       WHERE DATE(t.updated_at) BETWEEN ? AND ?
         AND t.status IN ('delay_warning', 'delayed')
         ${projectId && projectId !== 'all' ? 'AND t.project_id = ?' : ''}
       GROUP BY DATE(t.updated_at)`,
      projectId && projectId !== 'all' ? [start, end, projectId] : [start, end]
    );

    // 合并数据
    const dateMap = new Map<string, TrendDataPoint>();

    createdRows.forEach((r) => {
      dateMap.set(r.date.toISOString?.() || r.date, {
        date: r.date.toISOString?.() || r.date,
        created: r.created,
        completed: 0,
        delayed: 0
      });
    });

    completedRows.forEach((r) => {
      const key = r.date.toISOString?.() || r.date;
      if (dateMap.has(key)) {
        dateMap.get(key)!.completed = r.completed;
      } else {
        dateMap.set(key, { date: key, created: 0, completed: r.completed, delayed: 0 });
      }
    });

    delayedRows.forEach((r) => {
      const key = r.date.toISOString?.() || r.date;
      if (dateMap.has(key)) {
        dateMap.get(key)!.delayed = r.delayed;
      } else {
        dateMap.set(key, { date: key, created: 0, completed: 0, delayed: r.delayed });
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
```

---

### Task 3: 更新 Service 层

**Files:**
- Modify: `app/server/src/modules/analytics/service.ts`

- [ ] **Step 1: 导入新类型**

更新导入：

```typescript
import { AnalyticsRepository } from './repository';
import { ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig, AuditLogQueryOptions,
  TrendDataPoint, ProjectProgressItem
} from './types';
```

- [ ] **Step 2: 添加 getAllProjectsProgress 方法**

在 `getTaskTrend` 方法后添加：

```typescript
  async getAllProjectsProgress(userId: number, isAdmin: boolean): Promise<ProjectProgressItem[]> {
    return this.repo.getAllProjectsProgress(userId, isAdmin);
  }
```

- [ ] **Step 3: 更新 getTaskTrend 方法签名**

确保返回类型正确：

```typescript
  async getTaskTrend(startDate: string, endDate: string, projectId?: string): Promise<TrendDataPoint[]> {
    return this.repo.getTaskTrend(startDate, endDate, projectId);
  }
```

---

### Task 4: 更新路由层

**Files:**
- Modify: `app/server/src/modules/analytics/routes.ts`

- [ ] **Step 1: 添加获取所有项目进度路由**

在 `// ========== 仪表板 ==========` 注释下的 `dashboard/trends` 路由后添加：

```typescript
router.get('/dashboard/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.id || 0;
    const admin = currentUser ? isAdmin(currentUser) : false;
    const projects = await analyticsService.getAllProjectsProgress(userId, admin);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: 提交后端修改**

```bash
git add app/server/src/modules/analytics/
git commit -m "feat(analytics): 扩展仪表板统计API，新增项目进度列表端点"
```

---

## Chunk 2: 前端类型定义与API修改

### Task 5: 更新前端类型定义

**Files:**
- Modify: `app/src/features/dashboard/types.ts`

- [ ] **Step 1: 替换整个类型文件**

```typescript
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

  // 任务统计
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  delayWarningTasks: number;
  overdueTasks: number;

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
```

---

### Task 6: 更新 API 层

**Files:**
- Modify: `app/src/lib/api/analytics.api.ts`

- [ ] **Step 1: 更新导入和类型**

文件顶部：

```typescript
/**
 * 分析模块 API
 */
import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardStats,
  TrendDataPoint,
  ProjectProgressItem,
  TaskDistribution,
  DashboardQueryParams,
} from '@/features/dashboard/types';

const BASE_PATH = '/analytics';
```

- [ ] **Step 2: 更新 getDashboardStats 函数**

```typescript
/**
 * 获取仪表板统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiResponse<any>>(`${BASE_PATH}/dashboard/stats`);
  const data = response.data;

  // 映射后端 snake_case 到前端 camelCase
  return {
    totalProjects: data.total_projects ?? 0,
    activeProjects: data.active_projects ?? 0,
    completedProjects: data.completed_projects ?? 0,
    totalTasks: data.total_tasks ?? 0,
    pendingTasks: data.pending_tasks ?? 0,
    inProgressTasks: data.in_progress_tasks ?? 0,
    completedTasks: data.completed_tasks ?? 0,
    delayWarningTasks: data.delay_warning_tasks ?? 0,
    overdueTasks: data.overdue_tasks ?? 0,
    totalMembers: data.total_members ?? 0,
    avgProgress: data.avg_progress ?? 0,
  };
}
```

- [ ] **Step 3: 更新 getTaskTrend 函数**

```typescript
/**
 * 获取任务趋势数据
 */
export async function getTaskTrend(params: DashboardQueryParams = {}): Promise<TrendDataPoint[]> {
  const response = await apiClient.get<ApiResponse<TrendDataPoint[]>>(
    `${BASE_PATH}/dashboard/trends`,
    {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        project_id: params.projectId,
      }
    }
  );
  return response.data;
}
```

- [ ] **Step 4: 更新 getProjectProgress 函数**

```typescript
/**
 * 获取所有项目进度（仪表板专用）
 */
export async function getAllProjectsProgress(): Promise<ProjectProgressItem[]> {
  const response = await apiClient.get<ApiResponse<any[]>>(
    `${BASE_PATH}/dashboard/projects`
  );

  // 映射后端数据到前端格式
  return (response.data ?? []).map((item) => ({
    id: item.project_id,
    name: item.project_name,
    status: item.status,
    progress: item.progress,
    totalTasks: item.total_tasks,
    completedTasks: item.completed_tasks,
    deadline: item.deadline,
    members: (item.members ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
    })),
  }));
}
```

- [ ] **Step 5: 更新导出对象**

```typescript
export const analyticsApi = {
  getDashboardStats,
  getTaskTrend,
  getAllProjectsProgress,
  getTaskStatistics,
  getDelayAnalysis,
};
```

- [ ] **Step 6: 保留 getTaskStatistics 函数**

```typescript
/**
 * 获取任务统计报表
 */
export async function getTaskStatistics(params: DashboardQueryParams = {}): Promise<TaskDistribution> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/task-statistics`,
    {
      params: {
        project_id: params.projectId,
        start_date: params.startDate,
        end_date: params.endDate,
      }
    }
  );
  const data = response.data;

  return {
    byStatus: {
      pending: data.total_tasks || 0,
      in_progress: data.in_progress_tasks || 0,
      completed: data.completed_tasks || 0,
      delayed: data.overdue_tasks || 0,
    },
    byPriority: data.priority_distribution || {},
    byType: data.type_distribution || {},
    byAssignee: (data.assignee_distribution || []).map((item: any) => ({
      id: item.assignee_id || 0,
      name: item.assignee_name || '未分配',
      count: item.task_count || 0,
    })),
  };
}
```

- [ ] **Step 7: 保留 getDelayAnalysis 函数**

```typescript
/**
 * 获取延期分析报表
 */
export async function getDelayAnalysis(params: DashboardQueryParams = {}): Promise<{
  totalDelayed: number;
  avgDelayDays: number;
  byReason: Record<string, number>;
  tasks: Array<{ id: string; name: string; delayDays: number }>;
}> {
  const response = await apiClient.get<ApiResponse<any>>(
    `${BASE_PATH}/reports/delay-analysis`,
    {
      params: {
        project_id: params.projectId,
        start_date: params.startDate,
        end_date: params.endDate,
      }
    }
  );
  return response.data;
}
```

---

### Task 7: 更新 Hooks

**Files:**
- Modify: `app/src/features/dashboard/hooks/useDashboardData.ts`

- [ ] **Step 1: 更新 useDashboardStats**

```typescript
/**
 * 获取仪表板统计数据
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboardStats(),
    queryFn: analyticsApi.getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 分钟
    refetchOnWindowFocus: true,
  });
}
```

- [ ] **Step 2: 更新 useTaskTrend**

```typescript
/**
 * 获取任务趋势数据
 */
export function useTaskTrend(days: number = 30) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return useQuery({
    queryKey: queryKeys.analytics.taskTrend({ days, startDate, endDate }),
    queryFn: () => analyticsApi.getTaskTrend({ startDate, endDate }),
    staleTime: 10 * 60 * 1000, // 10 分钟
  });
}
```

- [ ] **Step 3: 更新 useProjectProgress**

```typescript
/**
 * 获取所有项目进度
 */
export function useProjectProgress() {
  return useQuery({
    queryKey: queryKeys.analytics.projectProgress('all'),
    queryFn: analyticsApi.getAllProjectsProgress,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: 更新 useTaskDistribution**

```typescript
/**
 * 获取任务分布数据
 */
export function useTaskDistribution(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.taskStatistics(params),
    queryFn: () => analyticsApi.getTaskStatistics(params),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: 更新 useDelayAnalysis**

```typescript
/**
 * 获取延期分析数据
 */
export function useDelayAnalysis(params: DashboardQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.delayAnalysis(params),
    queryFn: () => analyticsApi.getDelayAnalysis(params),
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 6: 提交前端基础修改**

```bash
git add app/src/features/dashboard/types.ts app/src/lib/api/analytics.api.ts app/src/features/dashboard/hooks/useDashboardData.ts
git commit -m "feat(dashboard): 更新前端类型定义和API层，统一数据结构"
```

---

## Chunk 3: 仪表板页面与组件更新

### Task 8: 更新仪表板主页面

**Files:**
- Modify: `app/src/features/dashboard/index.tsx`

- [ ] **Step 1: 更新导入**

文件顶部：

```typescript
/**
 * 仪表板页面
 * 符合需求文档 REQ_07_analytics.md 要求
 */
import { useNavigate } from 'react-router-dom';
import { StatsCard } from './components/StatsCard';
import { ProjectProgress } from './components/ProjectProgress';
import { TaskDistribution } from './components/TaskDistribution';
import { TrendChart } from './components/TrendChart';
import { ProgressPieChart, StatusPieChart } from './components/ProgressPieChart';
import { UrgentTaskAlert } from './components/UrgentTaskAlert';
import { TaskListPanel } from './components/TaskListPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { QuickActions } from './components/QuickActions';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import {
  useDashboardStats,
  useTaskDistribution,
  useTaskTrend,
  useProjectProgress,
} from './hooks/useDashboardData';
import type { ProjectProgressItem } from './types';
```

- [ ] **Step 2: 更新页面主体**

替换 `DashboardPage` 组件：

```typescript
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
      {stats && (stats.overdueTasks > 0 || stats.delayWarningTasks > 0) && (
        <UrgentTaskAlert
          overdueCount={stats.overdueTasks}
          warningCount={stats.delayWarningTasks}
          onJump={handleUrgentJump}
        />
      )}

      {/* 统计卡片（需求要求的4项） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="项目总数"
          value={stats?.totalProjects ?? 0}
          onClick={() => navigate('/projects')}
        />
        <StatsCard
          title="进行中任务"
          value={stats?.inProgressTasks ?? 0}
          onClick={() => navigate('/tasks?status=in_progress')}
        />
        <StatsCard
          title="已完成任务"
          value={stats?.completedTasks ?? 0}
          onClick={() => navigate('/tasks?status=completed')}
        />
        <StatsCard
          title="延期预警"
          value={stats?.delayWarningTasks ?? 0}
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
        <ProgressPieChart
          data={projectData ?? []}
          isLoading={projectLoading}
        />
      </div>

      {/* 任务状态分布饼图 + 任务分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart data={statusDistribution} />
        <TaskDistribution distribution={distribution} />
      </div>

      {/* 新增组件区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 任务列表 */}
        <div className="lg:col-span-2">
          <TaskListPanel />
        </div>
        {/* 通知中心 + 快捷操作 */}
        <div className="space-y-6">
          <NotificationCenter />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
```

---

### Task 9: 更新 ProjectProgress 组件

**Files:**
- Modify: `app/src/features/dashboard/components/ProjectProgress.tsx`

- [ ] **Step 1: 添加 isLoading 属性支持**

更新接口和组件：

```typescript
/**
 * 项目进度组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FolderKanban, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_CONFIG } from '@/shared/constants';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import type { ProjectProgressItem } from '../types';

interface ProjectProgressProps {
  projects: ProjectProgressItem[];
  isLoading?: boolean;
  className?: string;
  onProjectClick?: (project: ProjectProgressItem) => void;
}

export function ProjectProgress({ projects, isLoading, className, onProjectClick }: ProjectProgressProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            项目进度
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            项目进度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
            <p>暂无项目数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          项目进度
          <span className="text-sm font-normal text-muted-foreground">
            ({projects.length} 个项目)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.slice(0, 5).map((project) => (
          <div
            key={project.id}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              onProjectClick && 'cursor-pointer hover:bg-accent'
            )}
            onClick={() => onProjectClick?.(project)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{project.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={cn('text-white text-xs', PROJECT_STATUS_CONFIG[project.status]?.bgColor)}
                  >
                    {PROJECT_STATUS_CONFIG[project.status]?.label || project.status}
                  </Badge>
                  {project.deadline && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex -space-x-2 ml-2">
                {project.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={member.avatar ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                    +{project.members.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {project.completedTasks}/{project.totalTasks} 任务
                </span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

### Task 10: 更新 TrendChart 组件

**Files:**
- Modify: `app/src/features/dashboard/components/TrendChart.tsx`

- [ ] **Step 1: 更新数据点接口**

确保 `TrendDataPoint` 接口与 types.ts 一致：

```typescript
interface TrendDataPoint {
  date: string;
  created: number;
  completed: number;
  delayed: number;
}
```

（组件其余部分保持不变，已经正确使用 `created`、`completed`、`delayed` 字段）

---

### Task 11: 创建 TaskListPanel 组件

**Files:**
- Create: `app/src/features/dashboard/components/TaskListPanel.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
/**
 * 任务列表面板组件
 * 显示当前用户的近期任务
 */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListTodo, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';

interface TaskItem {
  id: string;
  description: string;
  projectName: string;
  status: string;
  priority: string;
  endDate: string | null;
  progress: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '已延期',
  delay_warning: '延期预警',
};

export function TaskListPanel() {
  const navigate = useNavigate();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboard', 'my-tasks'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TaskItem[]>>('/tasks', {
        params: { limit: 5, sort: 'end_date', order: 'asc' }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          我的任务
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          查看全部
          <ExternalLink className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.description}</p>
                  <p className="text-sm text-muted-foreground truncate">{task.projectName}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="outline" className={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low}>
                    {task.priority}
                  </Badge>
                  <Badge variant="secondary">
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 12: 创建 NotificationCenter 组件

**Files:**
- Create: `app/src/features/dashboard/components/NotificationCenter.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
/**
 * 通知中心组件
 * 显示系统通知和提醒
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  time: string;
}

// TODO: 后续对接真实通知API
const mockNotifications: Notification[] = [
  { id: '1', type: 'warning', message: '任务"固件开发"即将到期', time: '10分钟前' },
  { id: '2', type: 'success', message: '项目"新产品研发"已完成', time: '1小时前' },
  { id: '3', type: 'info', message: '您被分配了新任务', time: '2小时前' },
];

const NOTIFICATION_ICONS = {
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

export function NotificationCenter() {
  const notifications = mockNotifications;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          通知中心
          {notifications.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {notifications.length}
            </span>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
          全部已读
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            暂无新通知
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                {NOTIFICATION_ICONS[notification.type]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 13: 创建 QuickActions 组件

**Files:**
- Create: `app/src/features/dashboard/components/QuickActions.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
/**
 * 快捷操作组件
 * 提供常用功能的快速入口
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FolderPlus,
  Users,
  BarChart3,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { icon: Plus, label: '新建任务', path: '/tasks?action=create', color: 'text-blue-500' },
  { icon: FolderPlus, label: '新建项目', path: '/projects?action=create', color: 'text-green-500' },
  { icon: Users, label: '团队成员', path: '/settings/users', color: 'text-purple-500' },
  { icon: BarChart3, label: '报表分析', path: '/analytics', color: 'text-amber-500' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          快捷操作
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-accent"
              onClick={() => navigate(action.path)}
            >
              <action.icon className={cn('h-5 w-5', action.color)} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Task 14: 最终提交

- [ ] **Step 1: 提交所有前端修改**

```bash
git add app/src/features/dashboard/
git commit -m "feat(dashboard): 更新仪表板页面，新增任务列表/通知中心/快捷操作组件"
```

- [ ] **Step 2: 验证构建**

```bash
cd app && npm run build
```

---

## 验收标准

1. **统计卡片**：显示"项目总数、进行中任务、已完成任务、延期预警"4项
2. **项目进度**：正确显示项目列表及成员头像
3. **趋势图表**：显示新建、完成、延期三条数据线
4. **新增组件**：任务列表、通知中心、快捷操作正常渲染
5. **API正确性**：前后端数据正确映射，无字段缺失

---

**文档版本**: 1.0
**创建日期**: 2026-03-28
