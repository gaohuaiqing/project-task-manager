// app/server/src/modules/analytics/repository.ts
import { getPool } from '../../core/db';
import { sanitizeString } from '../../core/utils/sanitize';
import { wbsCodeCache } from '../../core/wbs';
import type { RowDataPacket } from 'mysql2/promise';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig,
  MilestoneProgress, AssigneeTaskCount, DelayReasonCount, MemberTask,
  TrendDataPoint, ProjectProgressItem, MemberInfo,
  TrendIndicator, StatsWithTrend, TimeSeriesPoint,
  TaskTypeDistributionItem, TaskTypeStats, EstimationAccuracyStats,
  ResourceEfficiencyReport, ResourceEfficiencyQueryOptions,
  MemberEfficiencyItem, ProductivityTrendItem, TeamEfficiencyItem,
  MemberAnalysisExtendedResponse, MemberSummaryItem,
  WorkloadDistributionItem, EstimationDistributionItem, StatusDistributionItem,
  WorkloadTrendPoint, AllocationSuggestionItem, MemberAnalysisQueryOptions,
  AdminDashboardDetailResponse, DeptManagerDashboardDetailResponse,
  TechManagerDashboardDetailResponse, EngineerDashboardDetailResponse,
  DepartmentEfficiencyItem, DepartmentDelayTrendPoint, UtilizationTrendPoint,
  HighRiskProjectItem, GroupEfficiencyItem, MemberStatusItem,
  GroupActivityTrendPoint, MemberActivityTrendPoint, TodoTaskItem,
} from './types';
import { buildTaskScopeFilter, buildProjectScopeFilter, buildUserDepartmentScopeFilter, ScopeFilter, getManagedDepartmentIds as getManagedDepartmentIdsSafe, getTechManagerGroupIds as getTechManagerGroupIdsSafe } from './query-builder';
import { QUERY_LIMITS, TIME_INTERVALS, ACTIVITY_PERCENTAGES, STATUS_THRESHOLDS, ESTIMATION_THRESHOLDS, WBS_COMPLEXITY, DEFAULTS, STATUS_CONDITIONS, MUTEX_STATUS_CONDITIONS } from './constants';
import type { User } from '../../core/types';
import CacheService from '../../services/CacheService';

export class AnalyticsRepository {
  /**
   * 获取任务的 WBS 编码映射
   * 从缓存获取，若缓存不存在则触发计算并填充缓存
   *
   * 设计原则：
   * - WBS 编码统一计算，确保全局一致性
   * - 优先使用缓存，缓存不存在时自动填充
   * - 任务变更时由任务管理模块更新缓存
   *
   * @param user 当前用户（用于权限过滤和缓存键）
   * @returns taskId -> wbsCode 映射
   */
  private async getWbsCodesFromCache(user: User): Promise<Map<string, string>> {
    // 尝试从缓存获取
    const cached = await wbsCodeCache.get(user.id, 'global');
    if (cached && cached.codeMap.size > 0) {
      return cached.codeMap;
    }

    // 缓存不存在，需要计算并填充
    // 获取用户可访问的项目ID列表（与任务管理模块保持一致）
    // admin 返回 undefined 表示不过滤（查询所有任务）
    const { TaskService } = await import('../task/service');
    const taskService = new TaskService();
    const accessibleProjectIds = await taskService.getAccessibleProjectIds(user);

    // 查询任务数据用于计算 WBS 编码
    const pool = getPool();
    let tasksForCalculation: Array<{
      id: string;
      parent_id: string | null;
      wbs_level: number;
      sort_order: number | null;
      created_at: Date;
      project_id: string;
    }> = [];

    if (accessibleProjectIds === undefined) {
      // admin 用户：查询所有任务
      const [taskRows] = await pool.execute<RowDataPacket[]>(
        `SELECT t.id, t.parent_id, t.wbs_level, t.sort_order, t.created_at, t.project_id
         FROM wbs_tasks t
         ORDER BY t.project_id, t.sort_order ASC, t.created_at ASC`
      );
      tasksForCalculation = taskRows as typeof tasksForCalculation;
    } else if (accessibleProjectIds.length > 0) {
      // 非 admin 用户：查询可访问项目的任务
      const placeholders = accessibleProjectIds.map(() => '?').join(',');
      const [taskRows] = await pool.execute<RowDataPacket[]>(
        `SELECT t.id, t.parent_id, t.wbs_level, t.sort_order, t.created_at, t.project_id
         FROM wbs_tasks t
         WHERE t.project_id IN (${placeholders})
         ORDER BY t.project_id, t.sort_order ASC, t.created_at ASC`,
        accessibleProjectIds
      );
      tasksForCalculation = taskRows as typeof tasksForCalculation;
    }

    // 计算 WBS 编码
    const { WbsCodeService } = await import('../../core/wbs/WbsCodeService');
    const wbsCodeService = new WbsCodeService();
    const { codeMap } = wbsCodeService.calculateCodes(tasksForCalculation);

    // 填充缓存
    await wbsCodeCache.set(user.id, 'global', { codeMap, idMap: new Map() });

    return codeMap;
  }
  // ========== 仪表板统计（优化版：角色感知数据隔离 + 缓存）==========

  async getDashboardStats(user: User): Promise<DashboardStats> {
    // 尝试从缓存获取（缓存键基于用户角色和部门）
    const cacheKey = `dashboard:stats:${user.role}:${user.id}`;
    const cached = CacheService.get<DashboardStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const pool = getPool();

    // 构建角色感知的项目过滤条件
    const projectScope = await buildProjectScopeFilter(user, 'p');

    const [projectRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_projects,
        SUM(CASE WHEN p.status IN ('in_progress', 'planning') THEN 1 ELSE 0 END) as active_projects,
        SUM(CASE WHEN p.status = 'delayed' THEN 1 ELSE 0 END) as delayed_projects,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
        COALESCE(AVG(p.progress), 0) as avg_progress
       FROM projects p
       WHERE ${projectScope.clause}`,
      projectScope.params
    );

    // 构建角色感知的任务过滤条件（assignee_id 为 NULL 的任务对所有人可见）
    const taskScope = await buildTaskScopeFilter(user, 't', true);

    const [taskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.pendingApproval} THEN 1 ELSE 0 END) as pending_approval_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.notStarted} THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.inProgress} THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.delayWarning} THEN 1 ELSE 0 END) as delay_warning_tasks,
        SUM(CASE WHEN ${MUTEX_STATUS_CONDITIONS.delayed} THEN 1 ELSE 0 END) as overdue_tasks,
        SUM(CASE WHEN t.assignee_id IS NULL THEN 1 ELSE 0 END) as unassigned_tasks,
        SUM(CASE WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY) THEN 1 ELSE 0 END) as active_tasks,
        SUM(CASE WHEN (${MUTEX_STATUS_CONDITIONS.notStarted} OR ${MUTEX_STATUS_CONDITIONS.inProgress})
            AND t.end_date IS NOT NULL
            AND t.end_date >= CURDATE()
            AND t.end_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_due_tasks
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${taskScope.clause}`,
      taskScope.params
    );

    // 成员统计: admin 显示全局，其他角色按部门/组过滤
    let memberCount = 0;
    if (user.role === 'admin') {
      const [memberRows] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total_members FROM users WHERE is_active = 1',
        []
      );
      memberCount = memberRows[0].total_members || 0;
    } else if (user.department_id) {
      const deptIds = await this.getVisibleDepartmentIds(user);
      if (deptIds.length > 0) {
        const placeholders = deptIds.map(() => '?').join(',');
        const [memberRows] = await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT id) as total_members FROM users WHERE is_active = 1 AND department_id IN (${placeholders})`,
          deptIds
        );
        memberCount = memberRows[0].total_members || 0;
      }
    }

    const projectResult = projectRows[0];
    const taskResult = taskRows[0];

    // 活跃度计算（从合并查询结果中获取）
    const activityRate = (Number(taskResult.total_tasks) || 0) > 0
      ? Math.round((Number(taskResult.active_tasks) / Number(taskResult.total_tasks)) * 100)
      : 0;

    // 资源利用率（保留独立查询，因为涉及子查询和不同的 GROUP BY）
    const [utilizationRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(AVG(member_load), 0) as utilization_rate
       FROM (
         SELECT t2.assignee_id, COALESCE(SUM(t2.full_time_ratio), 0) as member_load
         FROM wbs_tasks t2
         JOIN projects p2 ON t2.project_id = p2.id
         WHERE t2.assignee_id IS NOT NULL
           AND ${STATUS_CONDITIONS.notCompleted.replace(/t\./g, 't2.')}
           AND ${taskScope.clause.replace(/t\./g, 't2.').replace(/p\./g, 'p2.')}
         GROUP BY t2.assignee_id
       ) sub`,
      taskScope.params
    );
    const utilizationRate = Math.min(100, Math.round(Number(utilizationRows[0]?.utilization_rate) || 0));

    const weekDueTasks = Number(taskResult.week_due_tasks) || 0;

    const result: DashboardStats = {
      total_projects: Number(projectResult.total_projects) || 0,
      active_projects: Number(projectResult.active_projects) || 0,
      delayed_projects: Number(projectResult.delayed_projects) || 0,
      completed_projects: Number(projectResult.completed_projects) || 0,
      total_tasks: Number(taskResult.total_tasks) || 0,
      pending_approval_tasks: Number(taskResult.pending_approval_tasks) || 0,
      pending_tasks: Number(taskResult.pending_tasks) || 0,
      in_progress_tasks: Number(taskResult.in_progress_tasks) || 0,
      completed_tasks: Number(taskResult.completed_tasks) || 0,
      delay_warning_tasks: Number(taskResult.delay_warning_tasks) || 0,
      overdue_tasks: Number(taskResult.overdue_tasks) || 0,
      unassigned_tasks: Number(taskResult.unassigned_tasks) || 0,
      total_members: memberCount,
      avg_progress: Math.round(Number(projectResult.avg_progress) || 0),
      activity_rate: activityRate,
      utilization_rate: utilizationRate,
      week_due_tasks: weekDueTasks,
    };

    // 缓存结果（3分钟，仪表板数据更新频繁）
    CacheService.set(cacheKey, result, 180);

    return result;
  }

  async getUrgentTasks(user: User): Promise<unknown[]> {
    const cacheKey = `dashboard:urgent:${user.role}:${user.id}`;
    const cached = CacheService.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const pool = getPool();

    const scope = await buildProjectScopeFilter(user, 'p');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.end_date, t.priority,
              p.name as project_name, u.real_name as assignee_name
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.priority = 'urgent' AND ${STATUS_CONDITIONS.notCompleted}
       AND ${scope.clause}
       ORDER BY t.end_date ASC
       LIMIT ${QUERY_LIMITS.URGENT_TASKS}`,
      scope.params
    );
    CacheService.set(cacheKey, rows, 120);
    return rows;
  }

  async getTaskTrend(startDate: string, endDate: string, user: User, projectId?: string): Promise<TrendDataPoint[]> {
    const trendCacheKey = `dashboard:trend:${user.role}:${user.id}:${startDate}:${endDate}:${projectId || 'all'}`;
    const trendCached = CacheService.get<TrendDataPoint[]>(trendCacheKey);
    if (trendCached) return trendCached;

    const pool = getPool();

    // 设置默认日期范围（最近30天）
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - TIME_INTERVALS.MONTH_DAYS * TIME_INTERVALS.MS_PER_DAY).toISOString().split('T')[0];

    // 构建角色感知的任务过滤条件
    const scope = await buildTaskScopeFilter(user, 't', true);

    // 构建项目过滤条件（复用）
    const projectFilter = projectId && projectId !== 'all' ? 't.project_id = ?' : '1=1';
    const projectParams = projectId && projectId !== 'all' ? [projectId] : [];

    // 使用 UNION ALL 合并三个查询，减少数据库往返
    // 性能优化：使用范围查询替代 DATE() 函数，使索引可精确命中
    // DATE(col) BETWEEN a AND b → col >= a AND col < b + 1 DAY（避免函数计算导致索引失效）
    // ⚠️ 使用 MUTEX_STATUS_CONDITIONS 确保与仪表板统计一致
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT date, type, count FROM (
        -- 每日新建任务数
        SELECT DATE(t.created_at) as date, 'created' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.created_at >= ? AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND ${projectFilter}
          AND ${scope.clause}
        GROUP BY DATE(t.created_at)

        UNION ALL

        -- 每日完成任务数（排除待审批状态）
        SELECT DATE(t.updated_at) as date, 'completed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.updated_at >= ? AND t.updated_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND ${MUTEX_STATUS_CONDITIONS.completed}
          AND ${projectFilter}
          AND ${scope.clause}
        GROUP BY DATE(t.updated_at)

        UNION ALL

        -- 每日延期任务数
        SELECT DATE(t.updated_at) as date, 'delayed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.updated_at >= ? AND t.updated_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND ${STATUS_CONDITIONS.delayedOrWarning}
          AND ${projectFilter}
          AND ${scope.clause}
        GROUP BY DATE(t.updated_at)
      ) AS combined
      ORDER BY date`,
      [
        start, end, ...projectParams, ...scope.params,
        start, end, ...projectParams, ...scope.params,
        start, end, ...projectParams, ...scope.params,
      ]
    );

    // 合并数据
    const dateMap = new Map<string, TrendDataPoint>();

    rows.forEach((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0, delayed: 0 });
      }
      const point = dateMap.get(dateStr)!;
      if (r.type === 'created') point.created = r.count;
      else if (r.type === 'completed') point.completed = r.count;
      else if (r.type === 'delayed') point.delayed = r.count;
    });

    // 补全日期范围内缺失的日期（确保图表X轴连续）
    let cursor = new Date(start);
    const endDateObj = new Date(end);
    while (cursor <= endDateObj) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0, delayed: 0 });
      }
      cursor = new Date(cursor.getTime() + TIME_INTERVALS.MS_PER_DAY);
    }

    const trendResult = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    CacheService.set(trendCacheKey, trendResult, 300);
    return trendResult;
  }

  /**
   * 获取优先级完成率趋势
   * 返回按周聚合的各优先级任务完成率
   */
  async getPriorityCompletionTrend(
    startDate: string,
    endDate: string,
    user: User,
    projectId?: string
  ): Promise<Array<{ period: string; priority: string; completionRate: number; totalTasks: number; completedTasks: number }>> {
    const pool = getPool();

    // 设置默认日期范围（最近8周）
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 8 * 7 * TIME_INTERVALS.MS_PER_DAY).toISOString().split('T')[0];

    // 构建角色感知的任务过滤条件
    const scope = await buildTaskScopeFilter(user, 't', true);

    // 构建项目过滤条件
    const projectFilter = projectId && projectId !== 'all' ? 't.project_id = ?' : '1=1';
    const projectParams = projectId && projectId !== 'all' ? [projectId] : [];

    // 按周聚合各优先级的完成率
    // 使用 YEARWEEK 函数按周分组
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(MIN(DATE(t.created_at)), '%Y-%m-%d') as period_start,
        YEARWEEK(DATE(t.created_at), 1) as year_week,
        t.priority,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        ROUND(
          SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
          1
        ) as completion_rate
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.created_at >= ? AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
         AND ${projectFilter}
         AND ${scope.clause}
         AND t.priority IN ('urgent', 'high', 'medium', 'low')
       GROUP BY YEARWEEK(DATE(t.created_at), 1), t.priority
       ORDER BY year_week ASC, FIELD(t.priority, 'urgent', 'high', 'medium', 'low')`,
      [start, end, ...projectParams, ...scope.params]
    );

    return rows.map(r => ({
      period: r.period_start,
      priority: r.priority,
      completionRate: r.completion_rate || 0,
      totalTasks: r.total_tasks,
      completedTasks: r.completed_tasks,
    }));
  }

  // ========== 获取所有项目进度（仪表板专用） ==========

  async getAllProjectsProgress(user: User): Promise<ProjectProgressItem[]> {
    const projectsCacheKey = `dashboard:projects:${user.role}:${user.id}`;
    const projectsCached = CacheService.get<ProjectProgressItem[]>(projectsCacheKey);
    if (projectsCached) return projectsCached;

    const pool = getPool();
    const scope = await buildProjectScopeFilter(user, 'p');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        p.id as project_id,
        p.name as project_name,
        p.status,
        p.planned_end_date as deadline,
        p.progress,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        p.member_ids
       FROM projects p
       LEFT JOIN wbs_tasks t ON p.id = t.project_id
       WHERE p.status IN ('planning', 'in_progress', 'completed', 'delayed') AND ${scope.clause}
       GROUP BY p.id, p.name, p.status, p.planned_end_date, p.progress, p.member_ids
       ORDER BY p.planned_end_date ASC
       LIMIT ${QUERY_LIMITS.PROJECTS}`,
      scope.params
    );

    if (rows.length === 0) return [];

    // 批量获取所有需要的用户ID
    const allUserIds = new Set<number>();
    for (const row of rows) {
      if (row.member_ids) {
        const idsStr = row.member_ids instanceof Buffer ? row.member_ids.toString() : String(row.member_ids);
        const ids = idsStr.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        ids.forEach((id: number) => allUserIds.add(id));
      }
    }

    // 一次性查询所有用户
    const userMap = new Map<number, { id: number; name: string }>();
    if (allUserIds.size > 0) {
      const userIdsArray = Array.from(allUserIds);
      const [userRows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, real_name as name FROM users WHERE id IN (${userIdsArray.map(() => '?').join(',')})`,
        userIdsArray
      );
      for (const user of userRows) {
        userMap.set(user.id, { id: user.id, name: user.name });
      }
    }

    // 组装结果
    const results: ProjectProgressItem[] = [];
    for (const row of rows) {
      // 从缓存中获取成员信息
      const members: MemberInfo[] = [];
      if (row.member_ids) {
        const idsStr = row.member_ids instanceof Buffer ? row.member_ids.toString() : String(row.member_ids);
        const ids = idsStr.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
        for (const id of ids) {
          const user = userMap.get(id);
          if (user) {
            members.push({ id: user.id, name: user.name, avatar: null });
          }
        }
      }

      results.push({
        project_id: row.project_id,
        project_name: row.project_name,
        status: row.status,
        progress: (row.progress !== null && row.progress !== undefined)
          ? Number(row.progress)
          : (Number(row.total_tasks) > 0 ? Math.round((Number(row.completed_tasks) / Number(row.total_tasks)) * 100) : 0),
        total_tasks: Number(row.total_tasks) || 0,
        completed_tasks: Number(row.completed_tasks) || 0,
        deadline: row.deadline ? (row.deadline instanceof Date ? row.deadline.toISOString().split('T')[0] : String(row.deadline)) : null,
        members
      });
    }
    CacheService.set(projectsCacheKey, results, 180);
    return results;
  }

  // ========== 获取项目成员信息 ==========

  private async getProjectMembers(memberIds: string | null | Buffer): Promise<MemberInfo[]> {
    if (!memberIds) return [];
    const pool = getPool();
    // 确保 memberIds 是字符串类型
    const idsStr = memberIds instanceof Buffer ? memberIds.toString() : String(memberIds);
    const ids = idsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) return [];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, real_name as name FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    return rows.map(r => ({ id: r.id, name: r.name, avatar: null }));
  }

  // ========== 项目进度报表 ==========

  async getProjectProgressReport(projectId: string, user: User): Promise<ProjectProgressReport | null> {
    const pool = getPool();

    // 角色过滤：验证用户有权访问该项目
    const projectScope = await buildProjectScopeFilter(user, 'p');

    // 获取项目基本信息（带角色过滤）
    const [projectRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, progress FROM projects p WHERE id = ? AND ${projectScope.clause}`,
      [projectId, ...projectScope.params]
    );
    if (projectRows.length === 0) return null;
    const project = projectRows[0];

    // 获取任务统计（符合需求文档REQ_07要求）
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.inProgress} THEN 1 ELSE 0 END) as in_progress_tasks
       FROM wbs_tasks WHERE project_id = ?`,
      [projectId]
    );
    const stats = statsRows[0];

    // 获取任务状态分布（使用 MUTEX_STATUS_CONDITIONS 确保与仪表板统计一致）
    const [statusRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        CASE
          WHEN ${MUTEX_STATUS_CONDITIONS.pendingApproval} THEN 'pending_approval'
          WHEN ${MUTEX_STATUS_CONDITIONS.completed} THEN 'completed'
          WHEN ${MUTEX_STATUS_CONDITIONS.delayed} THEN 'delayed'
          WHEN ${MUTEX_STATUS_CONDITIONS.delayWarning} THEN 'delay_warning'
          WHEN ${MUTEX_STATUS_CONDITIONS.inProgress} THEN 'in_progress'
          ELSE 'not_started'
        END as status, COUNT(*) as count
       FROM wbs_tasks t WHERE t.project_id = ?
       GROUP BY status`,
      [projectId]
    );

    // 获取里程碑
    const [milestones] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, target_date, status, completion_percentage
       FROM milestones WHERE project_id = ? ORDER BY target_date`,
      [projectId]
    );

    // 进度计算：优先使用存储值，仅当 null/undefined 时才使用计算值（统一使用 Number() 包裹）
    const progress = (project.progress !== null && project.progress !== undefined)
      ? Number(project.progress)
      : (Number(stats.total_tasks) > 0 ? Math.round((Number(stats.completed_tasks) / Number(stats.total_tasks)) * 100) : 0);

    return {
      project_id: project.id,
      project_name: project.name,
      progress,
      total_tasks: stats.total_tasks,
      completed_tasks: stats.completed_tasks,
      in_progress_tasks: stats.in_progress_tasks || 0,
      status_distribution: statusRows.map(r => ({ status: r.status, count: r.count })),
      milestones: milestones as MilestoneProgress[]
    };
  }

  /**
   * 获取项目进度汇总报表（多项目对比视图）
   * 性能优化：使用 Promise.all 并行执行多个查询
   */
  async getProjectProgressSummary(user: User): Promise<import('./types').ProjectProgressSummary> {
    const pool = getPool();

    // 尝试从缓存获取（缓存键基于用户角色和部门）
    const cacheKey = `report:project_progress_summary:${user.role}:${user.department_id || 'all'}`;
    const cached = CacheService.get<import('./types').ProjectProgressSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const [projectScope, taskScope] = await Promise.all([
      buildProjectScopeFilter(user, 'p'),
      buildTaskScopeFilter(user, 't', true),
    ]);

    // 并行执行所有查询（性能优化：从4个串行查询改为并行）
    const [projectStatsRows, projects, statusRows, milestoneRows] = await Promise.all([
      // 1. 整体项目统计
      pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) as total_projects,
          SUM(CASE WHEN p.status IN ('in_progress', 'planning') THEN 1 ELSE 0 END) as active_projects,
          SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
          COALESCE(AVG(p.progress), 0) as avg_progress,
          SUM(CASE WHEN p.status = 'delayed' THEN 1 ELSE 0 END) as delayed_projects
         FROM projects p
         WHERE ${projectScope.clause}`,
        projectScope.params
      ),
      // 2. 各项目进度列表
      this.getAllProjectsProgress(user),
      // 3. 整体任务状态分布（使用 MUTEX_STATUS_CONDITIONS 确保与仪表板统计一致）
      pool.execute<RowDataPacket[]>(
        `SELECT
          CASE
            WHEN ${MUTEX_STATUS_CONDITIONS.pendingApproval} THEN 'pending_approval'
            WHEN ${MUTEX_STATUS_CONDITIONS.completed} THEN 'completed'
            WHEN ${MUTEX_STATUS_CONDITIONS.delayed} THEN 'delayed'
            WHEN ${MUTEX_STATUS_CONDITIONS.delayWarning} THEN 'delay_warning'
            WHEN ${MUTEX_STATUS_CONDITIONS.inProgress} THEN 'in_progress'
            ELSE 'not_started'
          END as status, COUNT(*) as count
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE ${taskScope.clause}
         GROUP BY status`,
        taskScope.params
      ),
      // 4. 近期里程碑（未来30天内）
      pool.execute<RowDataPacket[]>(
        `SELECT m.id, m.name, m.target_date, m.status, m.completion_percentage, p.name as project_name
         FROM milestones m
         JOIN projects p ON m.project_id = p.id
         WHERE m.target_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ${TIME_INTERVALS.MONTH_DAYS} DAY)
           AND m.status != 'achieved'
           AND ${projectScope.clause}
         ORDER BY m.target_date ASC
         LIMIT ${QUERY_LIMITS.MILESTONES}`,
        projectScope.params
      ),
    ]);

    const projectStats = projectStatsRows[0][0];
    const statusData = statusRows[0];
    const milestoneData = milestoneRows[0];

    const result: import('./types').ProjectProgressSummary = {
      total_projects: Number(projectStats.total_projects) || 0,
      active_projects: Number(projectStats.active_projects) || 0,
      completed_projects: Number(projectStats.completed_projects) || 0,
      avg_progress: Math.round(Number(projectStats.avg_progress) || 0),
      delayed_projects: Number(projectStats.delayed_projects) || 0,
      projects,
      status_distribution: statusData.map(r => ({ status: r.status, count: Number(r.count) })),
      upcoming_milestones: milestoneData.map(m => ({
        id: m.id,
        name: m.name,
        target_date: m.target_date,
        status: m.status,
        completion_percentage: Number(m.completion_percentage) || 0,
        project_name: m.project_name
      }))
    };

    // 缓存结果（5分钟）
    CacheService.set(cacheKey, result, 300);

    return result;
  }

  // ========== 任务统计报表 ==========

  async getTaskStatisticsReport(options: ReportQueryOptions, user: User): Promise<TaskStatisticsReport> {
    const pool = getPool();

    // 角色过滤：确保用户只能看到权限范围内的数据
    const scopeFilter = await buildTaskScopeFilter(user, 't', true);

    const conditions: string[] = [scopeFilter.clause];
    const params: (string | number)[] = [...scopeFilter.params];

    if (options.project_id) {
      conditions.push('t.project_id = ?');
      params.push(options.project_id);
    }
    if (options.assignee_id) {
      conditions.push('t.assignee_id = ?');
      params.push(options.assignee_id);
    }
    if (options.task_type) {
      conditions.push('t.task_type = ?');
      params.push(options.task_type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 全部任务统计
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        ROUND(AVG(t.progress), 1) as avg_completion_rate,
        ROUND(SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as delay_rate,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       ${whereClause}`,
      params
    );

    const stats = rows[0];

    // 根任务统计（双轨显示）
    const [rootTaskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_root_tasks,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_root_count
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       ${whereClause} AND t.wbs_level = 1`,
      params
    );

    const rootStats = rootTaskRows[0];

    // 获取优先级分布（基于根任务）
    const [priorityRows] = await pool.execute<RowDataPacket[]>(
      `SELECT priority, COUNT(*) as count FROM wbs_tasks t JOIN projects p ON t.project_id = p.id ${whereClause} AND t.wbs_level = 1 GROUP BY priority`,
      params
    );
    const priority_distribution: Record<string, number> = {};
    priorityRows.forEach(r => { priority_distribution[r.priority] = Number(r.count); });

    // 获取负责人分布
    const [assigneeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.assignee_id, u.real_name as assignee_name,
              COUNT(*) as task_count,
              SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_count,
              SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_count
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       ${whereClause}
       GROUP BY t.assignee_id, u.real_name`,
      params
    );

    // 获取任务明细列表（需求文档要求：任务统计明细表格）
    // 包含：WBS编码（从全局注册表获取）、延期天数计算、活跃度计算
    // 排序：与任务管理模块 WBS 表保持一致（按项目 + sort_order + 创建时间）
    // 延期天数统一逻辑：仅真正延期（已过期或超期完成）才计算正值，预警任务返回0
    const [taskListRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.project_id, t.sort_order,
              p.name as project_name, u.real_name as assignee_name,
              t.status, t.progress, t.priority, t.end_date as planned_end_date, t.task_type,
              CASE
                WHEN t.end_date IS NULL THEN 0
                WHEN t.actual_end_date IS NOT NULL AND t.actual_end_date > t.end_date
                  THEN GREATEST(0, DATEDIFF(t.actual_end_date, t.end_date))
                WHEN t.end_date < CURDATE() THEN GREATEST(0, DATEDIFF(CURDATE(), t.end_date))
                ELSE 0
              END as delay_days,
              CASE
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY) THEN ${ACTIVITY_PERCENTAGES.HIGH}
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.FORTNIGHT_DAYS} DAY) THEN ${ACTIVITY_PERCENTAGES.MEDIUM}
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.MONTH_DAYS} DAY) THEN 50
                ELSE ${ACTIVITY_PERCENTAGES.DEFAULT}
              END as activity_rate
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       ${whereClause}
       ORDER BY t.sort_order ASC, t.created_at ASC
       LIMIT ${QUERY_LIMITS.TASK_STATISTICS}`,
      params
    );

    // 从缓存获取 WBS 编码（由任务管理模块维护）
    const wbsCodeMap = await this.getWbsCodesFromCache(user);

    // 获取任务类型分布（基于根任务）
    const [taskTypeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.task_type,
        COUNT(*) as count,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_count,
        ROUND(AVG(t.duration), 1) as avg_duration
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       ${whereClause} AND t.wbs_level = 1
       GROUP BY t.task_type`,
      params
    );

    // 获取任务类型名称映射
    const taskTypeNames: Record<string, string> = {
      'firmware': '固件',
      'board': '板卡',
      'driver': '驱动',
      'interface': '接口类',
      'hw_recovery': '硬件恢复包',
      'material_import': '物料导入',
      'material_sub': '物料改代',
      'sys_design': '系统设计',
      'core_risk': '核心风险',
      'contact': '接口人',
      'func_task': '职能任务',
      'other': '其它',
    };

    const task_type_distribution: TaskTypeDistributionItem[] = taskTypeRows.map(r => ({
      task_type: r.task_type || 'other',
      task_type_name: taskTypeNames[r.task_type] || r.task_type || '其它',
      count: r.count,
      completed_count: r.completed_count,
      delayed_count: r.delayed_count,
      completion_rate: r.count > 0 ? Math.round((r.completed_count / r.count) * 100) : 0,
      delay_rate: r.count > 0 ? Math.round((r.delayed_count / r.count) * 100) : 0,
      avg_duration: r.avg_duration || 0,
    }));

    // 获取任务趋势数据（最近30天）
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - TIME_INTERVALS.MONTH_DAYS * TIME_INTERVALS.MS_PER_DAY).toISOString().split('T')[0];

    // 构建趋势查询的条件（复用现有条件，scope 已包含）
    const trendWhereClause = whereClause;

    const [trendRows] = await pool.execute<RowDataPacket[]>(
      `SELECT date, type, count FROM (
        -- 每日新建任务数
        SELECT DATE(t.created_at) as date, 'created' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.created_at >= ? AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
          ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
        GROUP BY DATE(t.created_at)

        UNION ALL

        -- 每日完成任务数
        SELECT DATE(t.updated_at) as date, 'completed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.updated_at >= ? AND t.updated_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND ${STATUS_CONDITIONS.completed}
          ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
        GROUP BY DATE(t.updated_at)

        UNION ALL

        -- 每日延期任务数
        SELECT DATE(t.updated_at) as date, 'delayed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.updated_at >= ? AND t.updated_at < DATE_ADD(?, INTERVAL 1 DAY)
          AND ${STATUS_CONDITIONS.delayedOrWarning}
          ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
        GROUP BY DATE(t.updated_at)
      ) AS combined
      ORDER BY date`,
      [
        startDate, endDate, ...params,
        startDate, endDate, ...params,
        startDate, endDate, ...params,
      ]
    );

    // 合并趋势数据
    const dateMap = new Map<string, TrendDataPoint>();
    trendRows.forEach((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0, delayed: 0 });
      }
      const point = dateMap.get(dateStr)!;
      if (r.type === 'created') point.created = r.count;
      else if (r.type === 'completed') point.completed = r.count;
      else if (r.type === 'delayed') point.delayed = r.count;
    });

    // 补全日期范围内缺失的日期（确保图表X轴连续）
    let cursor = new Date(startDate);
    const trendEndObj = new Date(endDate);
    while (cursor <= trendEndObj) {
      const dateStr = cursor.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0, delayed: 0 });
      }
      cursor = new Date(cursor.getTime() + TIME_INTERVALS.MS_PER_DAY);
    }

    const task_trend = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_tasks: Number(stats.total_tasks) || 0,
      total_root_tasks: Number(rootStats.total_root_tasks) || 0,  // 根任务数（双轨显示）
      avg_completion_rate: Math.round(Number(stats.avg_completion_rate) || 0),
      delay_rate: Math.round(Number(stats.delay_rate) || 0),
      urgent_count: Number(stats.urgent_count) || 0,
      priority_distribution,
      assignee_distribution: (assigneeRows as AssigneeTaskCount[]).map(r => ({
        ...r,
        task_count: Number(r.task_count) || 0,
        completed_count: Number(r.completed_count) || 0,
        delayed_count: Number(r.delayed_count) || 0,
      })),
      task_type_distribution,
      task_list: taskListRows.map(t => ({
        id: t.id,
        description: sanitizeString(t.description),  // XSS 防护：消毒任务描述
        wbs_code: wbsCodeMap.get(t.id) || null,  // 使用实时计算的 WBS 编码
        project_name: t.project_name || '未分配',
        assignee_name: t.assignee_name || '未分配',
        status: t.status,
        progress: t.progress || 0,
        priority: t.priority,
        planned_end_date: t.planned_end_date ? (t.planned_end_date instanceof Date ? t.planned_end_date.toISOString().split('T')[0] : String(t.planned_end_date)) : null,
        task_type: t.task_type || 'other',
        delay_days: t.delay_days || 0,
        activity_rate: t.activity_rate || ACTIVITY_PERCENTAGES.DEFAULT,
      })),
      task_trend,
    };
  }

  // ========== 延期分析报表 ==========

  async getDelayAnalysisReport(options: ReportQueryOptions, user: User): Promise<DelayAnalysisReport> {
    const pool = getPool();

    // 角色过滤：确保用户只能看到权限范围内的数据
    const scopeFilter = await buildTaskScopeFilter(user, 't', true);

    // 基于日期条件实时判断延期状态（与 calculateStatus 逻辑一致）
    // 数据库 status 字段可能未及时更新，使用日期条件保证准确性
    const DELAY_CONDITIONS = {
      delay_warning:
        `t.actual_end_date IS NULL AND t.end_date IS NOT NULL ` +
        `AND t.end_date >= CURDATE() AND DATEDIFF(t.end_date, CURDATE()) <= COALESCE(t.warning_days, 3)`,
      delayed:
        `t.actual_end_date IS NULL AND t.end_date IS NOT NULL AND t.end_date < CURDATE()`,
      overdue_completed:
        `t.actual_end_date IS NOT NULL AND t.end_date IS NOT NULL AND t.actual_end_date > t.end_date`,
    } as const;

    const allDelayCondition = `(${DELAY_CONDITIONS.delay_warning} OR ${DELAY_CONDITIONS.delayed} OR ${DELAY_CONDITIONS.overdue_completed})`;

    // 计算延期类型的 CASE 表达式（复用于多个查询）
    const delayTypeCase = `
      CASE
        WHEN ${DELAY_CONDITIONS.overdue_completed} THEN 'overdue_completed'
        WHEN ${DELAY_CONDITIONS.delayed} THEN 'delayed'
        WHEN ${DELAY_CONDITIONS.delay_warning} THEN 'delay_warning'
        ELSE NULL
      END`;

    const conditions: string[] = [scopeFilter.clause, allDelayCondition];
    const params: (string | number)[] = [...scopeFilter.params];

    if (options.project_id) {
      conditions.push('t.project_id = ?');
      params.push(options.project_id);
    }
    if (options.delay_type && DELAY_CONDITIONS[options.delay_type as keyof typeof DELAY_CONDITIONS]) {
      conditions.push(`(${DELAY_CONDITIONS[options.delay_type as keyof typeof DELAY_CONDITIONS]})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 获取统计卡片数据：基于日期条件分类统计
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_delayed,
        SUM(CASE WHEN ${DELAY_CONDITIONS.delay_warning} THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN ${DELAY_CONDITIONS.delayed} THEN 1 ELSE 0 END) as delayed_count,
        SUM(CASE WHEN ${DELAY_CONDITIONS.overdue_completed} THEN 1 ELSE 0 END) as overdue_completed_count
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       ${whereClause}`,
      params
    );

    const stats = rows[0];

    // 获取延期原因统计
    const [reasonRows] = await pool.execute<RowDataPacket[]>(
      `SELECT dr.reason, COUNT(*) as count
       FROM delay_records dr
       JOIN wbs_tasks t ON dr.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       ${whereClause}
       GROUP BY dr.reason
       ORDER BY count DESC
       LIMIT ${QUERY_LIMITS.DELAY_REASONS}`,
      params
    );

    // 获取延期任务列表：使用 CASE 表达式实时计算延期类型
    // WBS 编码从全局注册表获取
    // 排序与任务管理模块保持一致：sort_order ASC, created_at ASC
    const [delayedTaskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.project_id, t.sort_order, t.created_at,
              p.name as project_name, u.real_name as assignee_name,
              ${delayTypeCase} as delay_type,
              t.end_date as planned_end_date,
              CASE
                WHEN t.end_date IS NULL THEN 0
                WHEN t.actual_end_date IS NOT NULL THEN GREATEST(0, DATEDIFF(t.actual_end_date, t.end_date))
                WHEN t.end_date < CURDATE() THEN GREATEST(0, DATEDIFF(CURDATE(), t.end_date))
                ELSE 0
              END as delay_days,
              COALESCE(
                (SELECT dr2.reason FROM delay_records dr2 WHERE dr2.task_id = t.id ORDER BY dr2.created_at DESC LIMIT 1),
                '未填写'
              ) as reason,
              t.status
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       ${whereClause}
       ORDER BY t.sort_order ASC, t.created_at ASC
       LIMIT ${QUERY_LIMITS.DELAY_TASKS}`,
      params
    );

    // 从缓存获取 WBS 编码（自动填充缓存）
    const delayedWbsCodeMap = await this.getWbsCodesFromCache(user);

    // 获取延期趋势数据：基于日期条件的累计延期/解决统计
    const trendDays = TIME_INTERVALS.MONTH_DAYS;
    const [trendRows] = await pool.execute<RowDataPacket[]>(
      `WITH RECURSIVE date_series AS (
          SELECT DATE_SUB(CURDATE(), INTERVAL ${trendDays - 1} DAY) as date
          UNION ALL
          SELECT DATE_ADD(date, INTERVAL 1 DAY) FROM date_series WHERE date < CURDATE()
        ),
        delayed_tasks AS (
          SELECT t.end_date, t.actual_end_date, t.warning_days
          FROM wbs_tasks t
          JOIN projects p ON t.project_id = p.id
          WHERE t.end_date IS NOT NULL
            AND (${scopeFilter.clause})
            AND (${allDelayCondition})
            ${options.project_id ? 'AND t.project_id = ?' : ''}
        )
        SELECT
          ds.date,
          SUM(CASE WHEN dt.end_date <= ds.date
              AND dt.actual_end_date IS NULL THEN 1 ELSE 0 END) as created,
          SUM(CASE WHEN dt.end_date <= ds.date
              AND dt.actual_end_date IS NOT NULL AND dt.actual_end_date > dt.end_date
              AND dt.actual_end_date <= ds.date THEN 1 ELSE 0 END) as completed
        FROM date_series ds
        LEFT JOIN delayed_tasks dt ON dt.end_date <= ds.date
        GROUP BY ds.date
        ORDER BY ds.date`,
      options.project_id
        ? [...scopeFilter.params, options.project_id]
        : scopeFilter.params
    );

    const delayTrend = trendRows.map((r: RowDataPacket) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      created: r.created || 0,
      completed: r.completed || 0,
      delayed: (r.created || 0) - (r.completed || 0),  // 净增延期（未解决数）
    }));

    return {
      total_delayed: Number(stats.total_delayed) || 0,
      warning_count: Number(stats.warning_count) || 0,
      delayed_count: Number(stats.delayed_count) || 0,
      overdue_completed_count: Number(stats.overdue_completed_count) || 0,
      delay_reasons: (reasonRows as DelayReasonCount[]).map(r => ({ reason: r.reason, count: Number(r.count) })),
      delay_trend: delayTrend,
      delayed_tasks: delayedTaskRows.map(t => ({
        id: t.id,
        description: sanitizeString(t.description),  // XSS 防护：消毒任务描述
        wbs_code: delayedWbsCodeMap.get(t.id) || null,  // 使用实时计算的 WBS 编码
        project_name: t.project_name || '未分配',
        assignee_name: t.assignee_name || '未分配',
        delay_type: t.delay_type,
        planned_end_date: t.planned_end_date || null,
        delay_days: t.delay_days || 0,
        reason: t.reason || '未填写',
        status: t.status,
      })),
    };
  }

  // ========== 成员分析报表 ==========

  async getMemberAnalysisReport(memberId: number, user: User): Promise<MemberAnalysisReport | null> {
    const pool = getPool();

    // 获取成员信息
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, real_name, gender FROM users WHERE id = ?',
      [memberId]
    );
    if (memberRows.length === 0) return null;
    const member = memberRows[0];

    // 角色过滤：构建任务 scope
    const taskScope = await buildTaskScopeFilter(user, 't', true);

    // 获取任务统计（全部任务参与统计，区分进行中和已完成）
    // full_time_ratio 存储为百分比值（100=100%），需除以100转为倍率
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.notCompleted} THEN 1 ELSE 0 END) as current_tasks,
        COALESCE(SUM(full_time_ratio) / 100.0, 0) as total_full_time_ratio,
        ROUND(AVG(progress), 1) as avg_completion_rate
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ? AND (${taskScope.clause})`,
      [memberId, ...taskScope.params]
    );
    const stats = statsRows[0];

    // 获取任务列表（v1.2 增加 duration 字段用于预估准确性计算）
    const [taskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, p.name as project_name, t.status, t.full_time_ratio,
              t.progress, t.duration as planned_duration,
              CASE
                WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
                THEN DATEDIFF(t.actual_end_date, t.actual_start_date)
                ELSE NULL
              END as actual_duration
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ? AND (${taskScope.clause})
       ORDER BY t.status, t.end_date
       LIMIT ${QUERY_LIMITS.MEMBER_TASKS}`,
      [memberId, ...taskScope.params]
    );

    // 计算预估准确性（v1.2 新增）
    const estimationAccuracy = await this.calculateEstimationAccuracy(pool, memberId);

    return {
      member_id: member.id,
      member_name: member.real_name,
      current_tasks: stats.current_tasks,
      total_full_time_ratio: stats.total_full_time_ratio || 0,
      avg_completion_rate: Math.round(stats.avg_completion_rate || 0),
      task_list: taskRows.map(t => ({
        id: t.id,
        description: sanitizeString(t.description),  // XSS 防护：消毒任务描述
        project_name: t.project_name || '未分配',
        status: t.status,
        full_time_ratio: t.full_time_ratio,
        progress: t.progress,
        planned_duration: t.planned_duration,
        actual_duration: t.actual_duration,
        estimation_accuracy: this.calculateTaskEstimationAccuracy(t.planned_duration, t.actual_duration),
      })) as MemberTask[],
      capabilities: [],  // 暂时返回空数组，待能力模型模块完成后接入
      estimation_accuracy: estimationAccuracy,
    };
  }

  // 计算任务预估准确性（v1.2 新增）
  private calculateTaskEstimationAccuracy(plannedDuration: number | null, actualDuration: number | null): number | null {
    if (!plannedDuration || !actualDuration || plannedDuration === 0) {
      return null;
    }
    const deviation = Math.abs(actualDuration - plannedDuration) / plannedDuration;
    return Math.round((1 - deviation) * 100) / 100;  // 保留两位小数
  }

  // 计算成员整体预估准确性统计（v1.2 新增）
  private async calculateEstimationAccuracy(pool: ReturnType<typeof getPool>, memberId: number): Promise<EstimationAccuracyStats> {
    // 获取已完成任务（有计划和实际工期）
    const [completedTasks] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.duration as planned_duration,
        DATEDIFF(t.actual_end_date, t.actual_start_date) as actual_duration
       FROM wbs_tasks t
       WHERE t.assignee_id = ?
        AND ${STATUS_CONDITIONS.completed}
        AND t.duration IS NOT NULL
        AND t.duration > 0
        AND t.actual_start_date IS NOT NULL
        AND t.actual_end_date IS NOT NULL`,
      [memberId]
    );

    if (completedTasks.length === 0) {
      return {
        accurate_count: 0,
        slight_deviation_count: 0,
        obvious_deviation_count: 0,
        serious_deviation_count: 0,
        avg_accuracy: 0,
      };
    }

    let accurateCount = 0;       // 精准（±10%）
    let slightDeviationCount = 0;  // 轻微偏差（±10-30%）
    let obviousDeviationCount = 0;  // 明显偏差（±30-50%）
    let seriousDeviationCount = 0;  // 严重偏差（>±50%）
    let totalAccuracy = 0;

    for (const task of completedTasks) {
      const planned = task.planned_duration;
      const actual = task.actual_duration;
      const deviation = Math.abs(actual - planned) / planned;
      const accuracy = 1 - deviation;

      totalAccuracy += accuracy;

      if (deviation <= ESTIMATION_THRESHOLDS.ACCURATE) {
        accurateCount++;
      } else if (deviation <= ESTIMATION_THRESHOLDS.SLIGHT) {
        slightDeviationCount++;
      } else if (deviation <= ESTIMATION_THRESHOLDS.OBVIOUS) {
        obviousDeviationCount++;
      } else {
        seriousDeviationCount++;
      }
    }

    return {
      accurate_count: accurateCount,
      slight_deviation_count: slightDeviationCount,
      obvious_deviation_count: obviousDeviationCount,
      serious_deviation_count: seriousDeviationCount,
      avg_accuracy: Math.round((totalAccuracy / completedTasks.length) * 100) / 100,
    };
  }

  // ========== 资源效能分析报表（v1.2 新增） ==========

  async getResourceEfficiencyReport(options: ResourceEfficiencyQueryOptions, user: User): Promise<ResourceEfficiencyReport> {
    const pool = getPool();

    // 获取成员效能明细（带角色过滤）
    const memberEfficiencyList = await this.getMemberEfficiencyList(pool, options, user);

    // 计算汇总统计（过滤None值，防止NaN传播）
    const totalMembers = memberEfficiencyList.length;
    const safeSum = (arr: number[]) => arr.reduce((s, v) => s + (v ?? 0), 0);
    const avgProductivity = totalMembers > 0
      ? Math.round((safeSum(memberEfficiencyList.map(m => m.productivity)) / totalMembers) * 100) / 100
      : 0;
    const avgEstimationAccuracy = totalMembers > 0
      ? Math.round((safeSum(memberEfficiencyList.map(m => m.estimation_accuracy)) / totalMembers) * 100) / 100
      : 0;
    const avgReworkRate = totalMembers > 0
      ? Math.round((safeSum(memberEfficiencyList.map(m => m.rework_rate)) / totalMembers) * 100) / 100
      : 0;
    const avgFulltimeUtilization = totalMembers > 0
      ? Math.round((safeSum(memberEfficiencyList.map(m => m.fulltime_utilization)) / totalMembers) * 100) / 100
      : 0;

    // 获取产能趋势（带角色过滤）
    const productivityTrend = await this.getProductivityTrend(pool, options, user);

    // 获取团队效能对比（带角色过滤）
    const teamEfficiencyComparison = await this.getTeamEfficiencyComparison(pool, options, user);

    return {
      avg_productivity: avgProductivity,
      avg_estimation_accuracy: avgEstimationAccuracy,
      avg_rework_rate: avgReworkRate,
      avg_fulltime_utilization: avgFulltimeUtilization,
      member_efficiency_list: memberEfficiencyList,
      productivity_trend: productivityTrend,
      team_efficiency_comparison: teamEfficiencyComparison,
    };
  }

  // 获取成员效能明细（带角色过滤）
  private async getMemberEfficiencyList(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions, user: User): Promise<MemberEfficiencyItem[]> {
    // 角色过滤
    const scopeFilter = await buildTaskScopeFilter(user, 't', true);

    const conditions: string[] = [scopeFilter.clause];
    const params: (string | number)[] = [...scopeFilter.params];

    // 时间范围筛选
    if (options.start_date) {
      conditions.push('t.actual_end_date >= ?');
      params.push(options.start_date);
    }
    if (options.end_date) {
      conditions.push('t.actual_end_date <= ?');
      params.push(options.end_date);
    }

    // 只统计已完成的任务
    conditions.push(STATUS_CONDITIONS.completed);

    // 构建 JOIN 条件（scope + 时间 + 状态）
    const joinConditions = conditions.join(' AND ');

    // WBS等级复杂度系数
    const complexityFactor = `
      CASE
        WHEN t.wbs_level = 1 THEN ${WBS_COMPLEXITY[1]}
        WHEN t.wbs_level = 2 THEN ${WBS_COMPLEXITY[2]}
        WHEN t.wbs_level = 3 THEN ${WBS_COMPLEXITY[3]}
        ELSE ${WBS_COMPLEXITY[4]}
      END
    `;

    // 查询成员效能数据
    // 注：tech_groups 表可能不存在，使用子查询或默认值
    // 注：plan_version 列可能不存在，返工率暂时设为0
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as member_id,
        u.real_name as member_name,
        d.name as department,
        NULL as tech_group,
        COUNT(t.id) as completed_tasks,
        SUM(${complexityFactor}) as total_complexity,
        SUM(CASE WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN DATEDIFF(t.actual_end_date, t.actual_start_date) ELSE 0 END) as total_days,
        AVG(CASE WHEN t.duration IS NOT NULL AND t.duration > 0
                AND t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN GREATEST(0, 1 - ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration)
            ELSE NULL END) as estimation_accuracy,
        0 as rework_tasks,
        SUM(t.full_time_ratio) as total_fulltime_ratio
       FROM users u
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id AND t.project_id IS NOT NULL AND ${joinConditions}
       LEFT JOIN departments d ON u.department_id = d.id
       GROUP BY u.id, u.real_name, d.name
       HAVING completed_tasks > 0
       ORDER BY total_complexity DESC`,
      params
    );

    return rows.map((r: any) => {
      // 计算产能：完成任务复杂度 / 投入天数（除零保护）
      const totalDays = Number(r.total_days) || 0;
      const totalComplexity = Number(r.total_complexity) || 0;
      const completedTasks = Number(r.completed_tasks) || 0;
      const totalFulltimeRatio = Number(r.total_fulltime_ratio) || 0;
      const productivity = totalDays > 0 ? totalComplexity / totalDays : 0;

      // 计算返工率
      const reworkRate = completedTasks > 0 ? (Number(r.rework_tasks) / completedTasks) * 100 : 0;

      // 计算全职比利用率：实际全职比(百分比转小数) / 标准全职比(1.0) * 100
      const normalizedFulltime = totalFulltimeRatio / 100;
      const fulltimeUtilization = normalizedFulltime > 0 ? Math.min((normalizedFulltime / 1.0) * 100, 100) : 0;

      return {
        member_id: r.member_id,
        member_name: r.member_name,
        department: r.department || '未分配',
        tech_group: r.tech_group || '未分配',
        completed_tasks: completedTasks,
        productivity: Math.round(productivity * 100) / 100,
        estimation_accuracy: Math.round((Number(r.estimation_accuracy) || 0) * 100) / 100,
        rework_rate: Math.round(reworkRate * 100) / 100,
        fulltime_utilization: Math.round(fulltimeUtilization * 100) / 100,
        avg_task_complexity: completedTasks > 0 ? Math.round((totalComplexity / completedTasks) * 100) / 100 : 0,
      };
    });
  }

  // 获取产能趋势（按周聚合，带角色过滤）
  private async getProductivityTrend(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions, user: User): Promise<ProductivityTrendItem[]> {
    const scopeFilter = await buildTaskScopeFilter(user, 't', true);
    const conditions: string[] = [scopeFilter.clause, STATUS_CONDITIONS.completed];
    const params: (string | number)[] = [...scopeFilter.params];

    if (options.start_date) {
      conditions.push('t.actual_end_date >= ?');
      params.push(options.start_date);
    }
    if (options.end_date) {
      conditions.push('t.actual_end_date <= ?');
      params.push(options.end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const complexityFactor = `
      CASE
        WHEN t.wbs_level = 1 THEN ${WBS_COMPLEXITY[1]}
        WHEN t.wbs_level = 2 THEN ${WBS_COMPLEXITY[2]}
        WHEN t.wbs_level = 3 THEN ${WBS_COMPLEXITY[3]}
        ELSE ${WBS_COMPLEXITY[4]}
      END
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(t.actual_end_date, '%x-W%v') as period,
        COUNT(*) as task_count,
        SUM(${complexityFactor}) as total_complexity,
        SUM(CASE WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN DATEDIFF(t.actual_end_date, t.actual_start_date) ELSE 0 END) as total_days
       FROM wbs_tasks t
       ${whereClause}
       GROUP BY DATE_FORMAT(t.actual_end_date, '%x-W%v')
       ORDER BY period DESC
       LIMIT ${QUERY_LIMITS.TREND_WEEKS}`,
      params
    );

    return rows.map((r: any) => ({
      period: r.period,
      task_count: Number(r.task_count) || 0,
      productivity: Number(r.total_days) > 0 ? Math.round((Number(r.total_complexity) / Number(r.total_days)) * 100) / 100 : 0,
    })).reverse();
  }

  // 获取团队效能对比（带角色过滤）
  private async getTeamEfficiencyComparison(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions, user: User): Promise<TeamEfficiencyItem[]> {
    const scopeFilter = await buildTaskScopeFilter(user, 't', true);
    const conditions: string[] = [scopeFilter.clause, STATUS_CONDITIONS.completed];
    const params: (string | number)[] = [...scopeFilter.params];

    if (options.start_date) {
      conditions.push('t.actual_end_date >= ?');
      params.push(options.start_date);
    }
    if (options.end_date) {
      conditions.push('t.actual_end_date <= ?');
      params.push(options.end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 按部门统计，产能计算基于复杂度/天数（与成员明细一致）
    const complexityFactor = `
      CASE
        WHEN t.wbs_level = 1 THEN ${WBS_COMPLEXITY[1]}
        WHEN t.wbs_level = 2 THEN ${WBS_COMPLEXITY[2]}
        WHEN t.wbs_level = 3 THEN ${WBS_COMPLEXITY[3]}
        ELSE ${WBS_COMPLEXITY[4]}
      END
    `;
    const [deptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        d.name as team_name,
        'department' as team_type,
        COUNT(DISTINCT u.id) as member_count,
        COUNT(t.id) as total_tasks,
        SUM(${complexityFactor}) as total_complexity,
        SUM(CASE WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN DATEDIFF(t.actual_end_date, t.actual_start_date) ELSE 0 END) as total_days,
        AVG(CASE WHEN t.duration IS NOT NULL AND t.duration > 0
                AND t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN GREATEST(0, 1 - ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration)
            ELSE NULL END) as avg_estimation_accuracy,
        0 as avg_rework_rate
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id ${whereClause.replace('WHERE', 'AND')}
       GROUP BY d.id, d.name
       HAVING total_tasks > 0`,
      params
    );

    // 注：tech_groups 表可能不存在，暂时跳过技术组统计
    // 如果需要技术组统计，请先创建 tech_groups 表

    // 合并结果
    const results: TeamEfficiencyItem[] = [];

    for (const r of deptRows) {
      const totalDays = Number(r.total_days) || 0;
      const totalComplexity = Number(r.total_complexity) || 0;
      results.push({
        team_name: r.team_name,
        team_type: 'department',
        member_count: Number(r.member_count) || 0,
        avg_productivity: totalDays > 0 ? Math.round((totalComplexity / totalDays) * 100) / 100 : 0,
        avg_estimation_accuracy: Math.round((Number(r.avg_estimation_accuracy) || 0) * 100) / 100,
        avg_rework_rate: 0,
      });
    }

    return results;
  }

  // ========== 成员分析扩展（多成员对比 + 分布 + 趋势） ==========

  /**
   * 成员分析扩展：支持全部成员对比或单成员详情
   * 包含：成员汇总、分布图表、趋势数据、任务明细、分配建议
   */
  async getMemberAnalysisExtended(
    options: MemberAnalysisQueryOptions,
    currentUser: User,
  ): Promise<MemberAnalysisExtendedResponse> {
    const pool = getPool();

    // 构建 scope 过滤条件
    const scopeFilter = await buildTaskScopeFilter(currentUser, 't');
    // 同时需要基于 users 表的 scope 过滤（用于成员列表）
    const userScopeFilter = await this.buildUserScopeFilter(currentUser);

    // 构建时间范围条件
    const timeConditions: string[] = [];
    const timeParams: (string | number)[] = [];
    if (options.start_date) {
      timeConditions.push('t.start_date >= ?');
      timeParams.push(options.start_date);
    }
    if (options.end_date) {
      timeConditions.push('t.end_date <= ?');
      timeParams.push(options.end_date);
    }
    const timeClause = timeConditions.length > 0 ? ` AND ${timeConditions.join(' AND ')}` : '';

    // 单成员过滤
    const memberClause = options.member_id ? ' AND t.assignee_id = ?' : '';
    const memberParams = options.member_id ? [options.member_id] : [];

    // 并行执行所有查询
    const [
      membersSummary,
      statusDistribution,
      estimationDistribution,
      workloadTrend,
      memberTasks,
    ] = await Promise.all([
      this.getMembersSummary(pool, userScopeFilter, scopeFilter, timeClause, timeParams, memberClause, memberParams),
      this.getStatusDistribution(pool, scopeFilter, timeClause, timeParams, memberClause, memberParams),
      this.getEstimationDistribution(pool, scopeFilter, timeClause, timeParams, memberClause, memberParams),
      this.getWorkloadTrend(pool, scopeFilter, options.start_date, options.end_date),
      this.getMemberTasks(pool, scopeFilter, options.member_id, timeClause, timeParams),
    ]);

    // 从 membersSummary 计算汇总统计
    const totalMembers = membersSummary.length;
    const avgLoad = totalMembers > 0
      ? Math.round((membersSummary.reduce((s, m) => s + m.total_full_time_ratio, 0) / totalMembers) * 100) / 100
      : 0;
    const avgAccuracy = totalMembers > 0
      ? Math.round((membersSummary.reduce((s, m) => s + m.estimation_accuracy, 0) / totalMembers) * 100) / 100
      : 0;
    const overloadedMembers = membersSummary.filter(m => m.total_full_time_ratio > STATUS_THRESHOLDS.MEMBER_OVERLOAD).length;

    // 计算活跃度
    const activityRate = await this.getActivityRate(pool, userScopeFilter, scopeFilter);

    // 批量计算每个成员的活跃度（7日内有更新的任务占比）
    const memberActivityMap = await this.getMemberActivityRates(pool, userScopeFilter, scopeFilter);
    // 回写到成员数据中
    for (const m of membersSummary) {
      m.activity_rate = memberActivityMap.get(m.member_id) || 0;
    }

    // 生成分配建议
    const suggestions = this.generateAllocationSuggestions(membersSummary);

    // 构建负载分布（从 membersSummary 转换）
    const workloadDistribution = membersSummary.map(m => ({
      member_name: m.member_name,
      task_count: m.current_tasks,
      full_time_ratio: m.total_full_time_ratio,
    }));

    return {
      total_members: totalMembers,
      avg_load: avgLoad,
      avg_estimation_accuracy: avgAccuracy,
      overloaded_members: overloadedMembers,
      department_activity_rate: activityRate,
      members_summary: membersSummary,
      workload_distribution: workloadDistribution,
      status_distribution: statusDistribution,
      estimation_distribution: estimationDistribution,
      workload_trend: workloadTrend,
      member_tasks: memberTasks,
      suggestions,
    };
  }

  /**
   * 构建基于 users 表的角色 scope 过滤
   */
  private async buildUserScopeFilter(currentUser: User): Promise<{ clause: string; params: (string | number)[] }> {
    if (currentUser.role === 'admin') {
      return { clause: '1=1', params: [] };
    }

    const pool = getPool();

    // 复用 query-builder 的部门/组查找逻辑（departments 表无 is_active 列，不使用）
    if (currentUser.role === 'dept_manager' && currentUser.department_id) {
      // 复用 query-builder 的部门查找逻辑（支持 department_managers 表可选）
      const deptIds = await getManagedDepartmentIdsSafe(currentUser.id, currentUser.department_id);
      if (deptIds.length === 0 && currentUser.department_id) {
        deptIds.push(currentUser.department_id);
      }
      const placeholders = deptIds.map(() => '?').join(',');
      return { clause: `u.department_id IN (${placeholders})`, params: deptIds };
    }

    if (currentUser.role === 'tech_manager' && currentUser.department_id) {
      // 复用 query-builder 的技术组查找逻辑（支持 department_managers 表可选）
      const groupIds = await getTechManagerGroupIdsSafe(currentUser.id, currentUser.department_id);
      if (groupIds.length === 0 && currentUser.department_id) {
        groupIds.push(currentUser.department_id);
      }
      const uniqueIds = [...new Set(groupIds)];
      const placeholders = uniqueIds.map(() => '?').join(',');
      return { clause: `u.department_id IN (${placeholders})`, params: uniqueIds };
    }

    return { clause: 'u.id = ?', params: [currentUser.id] };
  }

  /**
   * 获取各成员汇总统计
   */
  private async getMembersSummary(
    pool: ReturnType<typeof getPool>,
    userScope: { clause: string; params: (string | number)[] },
    taskScope: ScopeFilter,
    timeClause: string,
    timeParams: (string | number)[] ,
    memberClause: string,
    memberParams: (string | number)[],
  ): Promise<MemberSummaryItem[]> {
    // full_time_ratio 存储为百分比值（100=100%）
    // 成员负载 = 未完成任务的 AVG(full_time_ratio) / 100，表示平均每任务的全职占用
    // 一个人的负载指标 = 平均每任务全职占用（0.x ~ 1.x 表示 x0% ~ 100%+）
    // 修复: LEFT JOIN 无匹配时 t.id 为 NULL，需先判断 t.id IS NOT NULL
    // 否则 STATUS_CONDITIONS.notCompleted (t.actual_end_date IS NULL) 会错误地将 NULL 记录计入
    // 注意：full_time_ratio 存储为百分比（100=100%），SUM 后需除以 100 转为倍率
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as member_id,
        u.real_name as member_name,
        d.name as department,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.id IS NOT NULL AND t.wbs_level = 1 THEN 1 ELSE 0 END) as root_tasks,
        SUM(CASE WHEN t.id IS NOT NULL AND t.wbs_level > 1 THEN 1 ELSE 0 END) as sub_tasks,
        SUM(CASE WHEN t.id IS NOT NULL AND ${STATUS_CONDITIONS.notCompleted}
            THEN 1 ELSE 0 END) as current_tasks,
        SUM(CASE WHEN t.id IS NOT NULL AND ${STATUS_CONDITIONS.completed}
            THEN 1 ELSE 0 END) as completed_tasks,
        COALESCE(SUM(CASE WHEN t.id IS NOT NULL AND ${STATUS_CONDITIONS.notCompleted}
            THEN t.full_time_ratio END) / 100.0, 0) as total_full_time_ratio,
        ROUND(AVG(CASE WHEN t.id IS NOT NULL AND ${STATUS_CONDITIONS.notCompleted}
            THEN t.progress ELSE NULL END), 1) as avg_completion_rate,
        AVG(CASE WHEN t.id IS NOT NULL AND t.duration IS NOT NULL AND t.duration > 0
            AND t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN GREATEST(0, 1 - ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration)
            ELSE NULL END) as estimation_accuracy
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id
        AND (${taskScope.clause})${timeClause}${memberClause}
       WHERE (${userScope.clause}) AND u.is_active = 1
       GROUP BY u.id, u.real_name, d.name
       ORDER BY total_full_time_ratio DESC`,
      [...taskScope.params, ...timeParams, ...memberParams, ...userScope.params]
    );

    // 计算每个成员的汇总数据
    return rows.map((r: any) => ({
      member_id: r.member_id,
      member_name: r.member_name,
      department: r.department || null,
      root_tasks: Number(r.root_tasks) || 0,
      sub_tasks: Number(r.sub_tasks) || 0,
      current_tasks: Number(r.current_tasks) || 0,
      completed_tasks: Number(r.completed_tasks) || 0,
      total_full_time_ratio: Math.round((Number(r.total_full_time_ratio) || 0) * 100) / 100,
      avg_completion_rate: Math.round(Number(r.avg_completion_rate) || 0),
      estimation_accuracy: Math.round((Number(r.estimation_accuracy) || 0) * 100) / 100,
      activity_rate: 0, // 将在 getMemberActivityRates 中批量回写
    }));
  }

  /**
   * 获取任务状态分布
   * 修复: 使用子查询解决 only_full_group_by 模式兼容性问题
   */
  private async getStatusDistribution(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    timeClause: string,
    timeParams: (string | number)[],
    memberClause: string,
    memberParams: (string | number)[],
  ): Promise<StatusDistributionItem[]> {
    // 使用子查询先计算状态，再聚合，符合 only_full_group_by 要求
    // 使用 MUTEX_STATUS_CONDITIONS 确保与仪表板统计一致
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM (
         SELECT
           CASE
             WHEN ${MUTEX_STATUS_CONDITIONS.pendingApproval} THEN 'pending_approval'
             WHEN ${MUTEX_STATUS_CONDITIONS.completed} THEN 'completed'
             WHEN ${MUTEX_STATUS_CONDITIONS.delayed} THEN 'delayed'
             WHEN ${MUTEX_STATUS_CONDITIONS.delayWarning} THEN 'delay_warning'
             WHEN ${MUTEX_STATUS_CONDITIONS.inProgress} THEN 'in_progress'
             ELSE 'not_started'
           END as status
         FROM wbs_tasks t
         WHERE (${taskScope.clause})${timeClause}${memberClause}
       ) sub
       GROUP BY status
       ORDER BY count DESC`,
      [...taskScope.params, ...timeParams, ...memberParams]
    );

    return rows.map((r: any) => ({
      status: r.status,
      count: r.count,
    }));
  }

  /**
   * 获取预估准确性分布（按偏差率分桶）
   */
  private async getEstimationDistribution(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    timeClause: string,
    timeParams: (string | number)[],
    memberClause: string,
    memberParams: (string | number)[],
  ): Promise<EstimationDistributionItem[]> {
    // 使用子查询先计算类别，再聚合，符合 only_full_group_by 要求
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT category, COUNT(*) as count
       FROM (
         SELECT
           CASE
             WHEN t.duration IS NULL OR t.duration = 0
               OR t.actual_start_date IS NULL OR t.actual_end_date IS NULL
               THEN NULL
             WHEN ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration <= 0.1
               THEN '精准'
             WHEN ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration <= 0.3
               THEN '轻微偏差'
             WHEN ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration <= 0.5
               THEN '明显偏差'
             ELSE '严重偏差'
           END as category
         FROM wbs_tasks t
         WHERE ${STATUS_CONDITIONS.completed}
          AND (${taskScope.clause})${timeClause}${memberClause}
       ) sub
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY FIELD(category, '精准', '轻微偏差', '明显偏差', '严重偏差')`,
      [...taskScope.params, ...timeParams, ...memberParams]
    );

    // 确保所有类别都有值
    const categories = ['精准', '轻微偏差', '明显偏差', '严重偏差'];
    const map = new Map(rows.map((r: any) => [r.category, r.count]));
    return categories.map(cat => ({ category: cat, count: map.get(cat) || 0 }));
  }

  /**
   * 获取负载趋势（按周聚合，统计每周在执行任务的累计全职比）
   */
  private async getWorkloadTrend(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    startDate?: string,
    endDate?: string,
  ): Promise<WorkloadTrendPoint[]> {
    const conditions: string[] = [`(${taskScope.clause})`];
    const params: (string | number)[] = [...taskScope.params];

    // 时间范围：默认最近12周
    const startCondition = startDate
      ? '?'
      : `DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.QUARTER_WEEKS} WEEK)`;
    if (startDate) {
      params.push(startDate);
    }

    const endCondition = endDate ? '?' : 'CURDATE()';
    if (endDate) {
      params.push(endDate);
    }

    // 统计每周在执行中（未完成）任务的累计全职比和任务数
    // full_time_ratio 存储为百分比值（100=100%），需除以100转为小数
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        CONCAT(YEAR(w.week_start), '-W', LPAD(WEEK(w.week_start, 1), 2, '0')) as period,
        COALESCE(ROUND(AVG(w.weekly_load), 2), 0) as avg_full_time_ratio,
        COALESCE(SUM(w.task_count), 0) as task_count
       FROM (
         SELECT
           DATE_SUB(DATE(t.start_date), INTERVAL WEEKDAY(t.start_date) DAY) as week_start,
           AVG(t.full_time_ratio) / 100.0 as weekly_load,
           COUNT(*) as task_count
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE (${taskScope.clause})
           AND t.start_date IS NOT NULL
           AND t.start_date <= ${endCondition}
           AND ${STATUS_CONDITIONS.notCompleted}
         GROUP BY week_start, t.assignee_id
       ) w
       WHERE w.week_start >= ${startCondition}
       GROUP BY period
       ORDER BY period ASC
       LIMIT ${QUERY_LIMITS.TREND_WEEKS}`,
      params
    );

    return rows.map((r: any) => ({
      period: r.period,
      avg_full_time_ratio: r.avg_full_time_ratio || 0,
      task_count: r.task_count,
    }));
  }

  /**
   * 计算部门/组活跃度
   */
  private async getActivityRate(
    pool: ReturnType<typeof getPool>,
    userScope: { clause: string; params: (string | number)[] },
    taskScope: ScopeFilter,
  ): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.updated_at >= DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY)
            OR EXISTS (
              SELECT 1 FROM progress_records pr
              WHERE pr.task_id = t.id AND pr.created_at >= DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY)
            )
            THEN 1 ELSE 0 END) as active_tasks
       FROM wbs_tasks t
       WHERE (${taskScope.clause})
        AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = t.assignee_id AND (${userScope.clause})
        )`,
      [...taskScope.params, ...userScope.params]
    );

    const total = Number(rows[0]?.total_tasks) || 0;
    const active = Number(rows[0]?.active_tasks) || 0;
    return total > 0 ? Math.round((active / total) * 100) : 0;
  }

  /**
   * 批量计算每个成员的活跃度（7日内有更新的任务占比）
   */
  private async getMemberActivityRates(
    pool: ReturnType<typeof getPool>,
    userScope: { clause: string; params: (string | number)[] },
    taskScope: ScopeFilter,
  ): Promise<Map<number, number>> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.assignee_id as member_id,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.updated_at >= DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY)
            THEN 1 ELSE 0 END) as active_tasks
       FROM wbs_tasks t
       WHERE (${taskScope.clause})
        AND t.assignee_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = t.assignee_id AND (${userScope.clause})
        )
       GROUP BY t.assignee_id`,
      [...taskScope.params, ...userScope.params]
    );

    const map = new Map<number, number>();
    for (const r of rows) {
      const total = Number(r.total_tasks) || 0;
      const active = Number(r.active_tasks) || 0;
      map.set(Number(r.member_id), total > 0 ? Math.round((active / total) * 100) : 0);
    }
    return map;
  }

  /**
   * 获取成员任务明细（扩展版，不限20条）
   */
  private async getMemberTasks(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    memberId: number | undefined,
    timeClause: string,
    timeParams: (string | number)[],
  ): Promise<MemberTask[]> {
    const memberFilter = memberId ? ' AND t.assignee_id = ?' : '';
    const memberParams = memberId ? [memberId] : [];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.task_type,
              p.name as project_name, t.status, t.full_time_ratio,
              t.progress, t.duration as planned_duration,
              t.end_date as planned_end_date,
              u.real_name as assignee_name,
              CASE
                WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
                THEN DATEDIFF(t.actual_end_date, t.actual_start_date)
                ELSE NULL
              END as actual_duration,
              t.updated_at as last_updated,
              CASE
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY) THEN ${ACTIVITY_PERCENTAGES.HIGH}
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.FORTNIGHT_DAYS} DAY) THEN ${ACTIVITY_PERCENTAGES.MEDIUM}
                WHEN t.updated_at >= DATE_SUB(NOW(), INTERVAL ${TIME_INTERVALS.MONTH_DAYS} DAY) THEN 50
                ELSE ${ACTIVITY_PERCENTAGES.DEFAULT}
              END as activity_rate
       FROM wbs_tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE (${taskScope.clause})${timeClause}${memberFilter}
       ORDER BY t.status, t.end_date
       LIMIT ${QUERY_LIMITS.MEMBER_TASKS_DETAIL}`,
      [...taskScope.params, ...timeParams, ...memberParams]
    );

    return rows.map((t: any) => ({
      id: t.id,
      description: sanitizeString(t.description),  // XSS 防护：消毒任务描述
      project_name: t.project_name || '未分配',
      assignee_name: t.assignee_name || '未分配',
      status: t.status,
      full_time_ratio: t.full_time_ratio,
      progress: t.progress ?? 0,
      activity_rate: t.activity_rate ?? 0,
      planned_duration: t.planned_duration,
      actual_duration: t.actual_duration,
      estimation_accuracy: this.calculateTaskEstimationAccuracy(t.planned_duration, t.actual_duration) ?? undefined,
      updated_at: t.last_updated ? (t.last_updated instanceof Date ? t.last_updated.toISOString() : String(t.last_updated)) : null,
    }));
  }

  /**
   * 生成任务分配建议
   */
  private generateAllocationSuggestions(members: MemberSummaryItem[]): AllocationSuggestionItem[] {
    const suggestions: AllocationSuggestionItem[] = [];

    for (const m of members) {
      if (m.total_full_time_ratio > STATUS_THRESHOLDS.MEMBER_OVERLOAD) {
        suggestions.push({
          type: 'overloaded',
          member_name: m.member_name,
          current_load: m.total_full_time_ratio,
          suggestion: `${m.member_name} 当前全职比 ${m.total_full_time_ratio.toFixed(2)}，负载过高，建议重新分配部分任务`,
        });
      } else if (m.current_tasks === 0) {
        suggestions.push({
          type: 'idle',
          member_name: m.member_name,
          current_load: 0,
          suggestion: `${m.member_name} 当前无进行中任务，可考虑分配新任务`,
        });
      }
    }

    // 最多返回5条建议
    return suggestions.slice(0, QUERY_LIMITS.ALLOCATION_SUGGESTIONS);
  }

  // ========== 系统配置 ==========

  async getProjectTypes(): Promise<ProjectTypeConfig[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT code, name, description FROM config_project_types ORDER BY id'
    );
    return rows as ProjectTypeConfig[];
  }

  async updateProjectTypes(types: ProjectTypeConfig[]): Promise<void> {
    const pool = getPool();
    await pool.execute('DELETE FROM config_project_types');
    for (const type of types) {
      await pool.execute(
        'INSERT INTO config_project_types (code, name, description) VALUES (?, ?, ?)',
        [type.code, type.name, type.description || null]
      );
    }
  }

  async getTaskTypes(): Promise<TaskTypeConfig[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT code, name, description FROM config_task_types ORDER BY id'
    );
    return rows as TaskTypeConfig[];
  }

  async updateTaskTypes(types: TaskTypeConfig[]): Promise<void> {
    const pool = getPool();
    await pool.execute('DELETE FROM config_task_types');
    for (const type of types) {
      await pool.execute(
        'INSERT INTO config_task_types (code, name, description) VALUES (?, ?, ?)',
        [type.code, type.name, type.description || null]
      );
    }
  }

  async getHolidays(year?: number): Promise<HolidayConfig[]> {
    const pool = getPool();
    if (year) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT holiday_date as date, holiday_name as name, is_working_day as type FROM holidays WHERE YEAR(holiday_date) = ? ORDER BY holiday_date',
        [year]
      );
      return rows as HolidayConfig[];
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT holiday_date as date, holiday_name as name, is_working_day as type FROM holidays ORDER BY holiday_date'
    );
    return rows as HolidayConfig[];
  }

  async createHoliday(holiday: HolidayConfig): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO holidays (holiday_date, holiday_name, is_working_day) VALUES (?, ?, ?)',
      [holiday.date, holiday.name, holiday.type === 'workday']
    );
  }

  async deleteHoliday(date: string): Promise<void> {
    const pool = getPool();
    await pool.execute('DELETE FROM holidays WHERE holiday_date = ?', [date]);
  }

  // ========== 审计日志 ==========

  async getAuditLogs(options: import('./types').AuditLogQueryOptions): Promise<{ items: unknown[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.user_id) {
      conditions.push('al.actor_user_id = ?');
      params.push(options.user_id);
    }
    if (options.action) {
      conditions.push('al.action = ?');
      params.push(options.action);
    }
    if (options.table_name) {
      conditions.push('al.table_name = ?');
      params.push(options.table_name);
    }
    if (options.start_date) {
      conditions.push('al.created_at >= ?');
      params.push(options.start_date);
    }
    if (options.end_date) {
      conditions.push('al.created_at <= ?');
      params.push(options.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const page = options.page || 1;
    const pageSize = options.pageSize || QUERY_LIMITS.DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT al.*, u.real_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }

  // ========== 趋势指标 ==========

  /**
   * 计算统计卡片的趋势指标
   * 对比当前周期和上一个同等周期，计算变化趋势
   */
  async getStatsWithTrend(
    user: User,
    metric: 'active_projects' | 'total_tasks' | 'completed_tasks' | 'delay_warning' | 'overdue',
    currentStart: string,
    currentEnd: string,
  ): Promise<StatsWithTrend> {
    const pool = getPool();

    // 计算上一个周期的日期范围
    const currentStartMs = new Date(currentStart).getTime();
    const currentEndMs = new Date(currentEnd).getTime();
    const periodDays = Math.round((currentEndMs - currentStartMs) / 86400000);
    const prevEnd = new Date(currentStartMs - 86400000).toISOString().split('T')[0];
    const prevStart = new Date(currentStartMs - (periodDays + 1) * 86400000).toISOString().split('T')[0];

    // 根据指标类型选择查询方式
    const currentValue = await this.queryMetricValue(pool, user, metric, currentStart, currentEnd);
    const previousValue = await this.queryMetricValue(pool, user, metric, prevStart, prevEnd);

    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? Math.round((change / previousValue) * 1000) / 10 : (currentValue > 0 ? 100 : 0);
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat' as const;

    // 延期类指标：下降为正向；其他：上升为正向
    const isDelayMetric = metric === 'delay_warning' || metric === 'overdue';
    const isPositive = isDelayMetric ? change <= 0 : change >= 0;

    return {
      current: currentValue,
      trend: {
        value: currentValue,
        previousValue,
        change,
        changePercent,
        direction,
        isPositive,
      },
    };
  }

  /**
   * 查询指定指标在指定时间范围内的值
   */
  private async queryMetricValue(
    pool: ReturnType<typeof getPool>,
    user: User,
    metric: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    if (metric === 'active_projects') {
      const scope = await buildProjectScopeFilter(user, 'p');
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as cnt FROM projects p
         WHERE p.status IN ('in_progress', 'planning')
         AND p.updated_at BETWEEN ? AND ?
         AND ${scope.clause}`,
        [startDate, endDate, ...scope.params]
      );
      return rows[0].cnt || 0;
    }

    // 构建角色感知的任务过滤条件
    const scope = await buildTaskScopeFilter(user, 't', true);

    let statusCondition = '';
    switch (metric) {
      case 'total_tasks':
        statusCondition = "1=1";
        break;
      case 'completed_tasks':
        statusCondition = STATUS_CONDITIONS.completed;
        break;
      case 'delay_warning':
        statusCondition = STATUS_CONDITIONS.delayWarning;
        break;
      case 'overdue':
        statusCondition = STATUS_CONDITIONS.delayed;
        break;
      default:
        statusCondition = "1=1";
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${statusCondition}
       AND t.updated_at BETWEEN ? AND ?
       AND ${scope.clause}`,
      [startDate, endDate, ...scope.params]
    );
    return rows[0].cnt || 0;
  }

  /**
   * 获取时间序列数据（按天/周/月粒度）
   */
  async getTimeSeries(
    user: User,
    metric: 'tasks_created' | 'tasks_completed' | 'tasks_delayed' | 'project_progress',
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'week',
    projectId?: string,
  ): Promise<TimeSeriesPoint[]> {
    const pool = getPool();

    // 构建角色感知的任务过滤条件
    const scope = await buildTaskScopeFilter(user, 't', true);

    // 按粒度确定分组表达式
    const groupExpr = granularity === 'day'
      ? 'DATE(t.created_at)'
      : granularity === 'week'
        ? "DATE_SUB(DATE(t.created_at), INTERVAL WEEKDAY(t.created_at) DAY)"
        : "DATE_FORMAT(t.created_at, '%Y-%m-01')";

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // 日期范围（性能优化：范围查询替代 DATE() 函数，使索引可命中）
    const dateColumn = metric === 'tasks_created' ? 't.created_at'
      : metric === 'tasks_completed' ? 't.updated_at'
      : 't.updated_at';
    conditions.push(`${dateColumn} >= ? AND ${dateColumn} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(startDate, endDate);

    // 状态过滤
    switch (metric) {
      case 'tasks_completed':
        conditions.push(STATUS_CONDITIONS.completed);
        break;
      case 'tasks_delayed':
        conditions.push(STATUS_CONDITIONS.delayedOrWarning);
        break;
    }

    // 项目过滤
    if (projectId && projectId !== 'all') {
      conditions.push('t.project_id = ?');
      params.push(projectId);
    }

    // 角色过滤
    conditions.push(scope.clause);
    params.push(...scope.params);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ${groupExpr} as date, COUNT(*) as value
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY ${groupExpr}
       ORDER BY date`,
      params
    );

    return rows.map((r: RowDataPacket) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      value: r.value,
    }));
  }

  // ========== 辅助方法 ==========

  /**
   * 获取角色可见范围内的部门ID列表
   * - dept_manager: 管理部门及所有子部门
   * - tech_manager: 本组 + 授权组
   * - engineer: 本部门
   */
  private async getVisibleDepartmentIds(user: User): Promise<number[]> {
    if (!user.department_id) return [];
    const pool = getPool();

    if (user.role === 'dept_manager') {
      const cacheKey = `scope:dept_ids:managed:${user.id}`;
      const cached = CacheService.get<number[]>(cacheKey);
      if (cached) return cached;

      // 复用 query-builder 的安全方法（department_managers 表可选）
      const deptIds = await getManagedDepartmentIdsSafe(user.id, user.department_id!);
      if (deptIds.length === 0 && user.department_id) {
        deptIds.push(user.department_id);
      }
      CacheService.set(cacheKey, deptIds, 300);
      return deptIds;
    }

    if (user.role === 'tech_manager') {
      const cacheKey = `scope:dept_ids:tech:${user.id}`;
      const cached = CacheService.get<number[]>(cacheKey);
      if (cached) return cached;

      // 复用 query-builder 的安全方法（department_managers 表可选）
      const deptIds = await getTechManagerGroupIdsSafe(user.id, user.department_id!);
      if (deptIds.length === 0 && user.department_id) {
        deptIds.push(user.department_id);
      }
      CacheService.set(cacheKey, deptIds, 300);
      return deptIds;
    }

    // engineer: 仅本部门
    return [user.department_id];
  }

  // ========== 仪表板 Detail API（按角色聚合） ==========

  // --- 任务类型名称映射 ---
  private static TASK_TYPE_NAMES: Record<string, string> = {
    'firmware': '固件',
    'board': '板卡',
    'driver': '驱动',
    'interface': '接口类',
    'hw_recovery': '硬件恢复包',
    'material_import': '物料导入',
    'material_sub': '物料改代',
    'sys_design': '系统设计',
    'core_risk': '核心风险',
    'contact': '接口人',
    'func_task': '职能任务',
    'other': '其它',
  };

  /**
   * Admin 仪表板详情
   * projectId 用于项目筛选
   */
  async getDashboardAdminDetail(user: User, projectId?: string): Promise<AdminDashboardDetailResponse> {
    const detailCacheKey = `dashboard:detail:admin:${user.id}:${projectId || 'all'}`;
    const detailCached = CacheService.get<AdminDashboardDetailResponse>(detailCacheKey);
    if (detailCached) return detailCached;

    const pool = getPool();

    // 构建一次 scope filter，复用给所有子查询
    const taskScope = await buildTaskScopeFilter(user, 't', true, projectId);
    const projectScope = await buildProjectScopeFilter(user, 'p', projectId);

    const [departmentEfficiency, taskTypeDistribution, allocationSuggestions, departmentDelayTrends, utilizationTrends, highRiskProjects] =
      await Promise.all([
        this.getAdminDepartmentEfficiency(pool, taskScope),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user),
        this.getDepartmentDelayTrends(pool, taskScope),
        this.getUtilizationTrends(pool, taskScope),
        this.getHighRiskProjects(pool, projectScope),
      ]);

    const result = {
      department_efficiency: departmentEfficiency,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      department_delay_trends: departmentDelayTrends,
      utilization_trends: utilizationTrends,
      high_risk_projects: highRiskProjects,
    };
    CacheService.set(detailCacheKey, result, 180);
    return result;
  }

  /**
   * DeptManager 仪表板详情
   * projectId 用于项目筛选
   */
  async getDashboardDeptManagerDetail(user: User, projectId?: string): Promise<DeptManagerDashboardDetailResponse> {
    const detailCacheKey = `dashboard:detail:dept_manager:${user.id}:${projectId || 'all'}`;
    const detailCached = CacheService.get<DeptManagerDashboardDetailResponse>(detailCacheKey);
    if (detailCached) return detailCached;

    const pool = getPool();

    const taskScope = await buildTaskScopeFilter(user, 't', true, projectId);

    const [groupEfficiency, memberStatus, taskTypeDistribution, allocationSuggestions, groupActivityTrends] =
      await Promise.all([
        this.getGroupEfficiencyByParentDept(pool, user, taskScope),
        this.getMemberStatusForScope(pool, user, taskScope),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user),
        this.getGroupActivityTrends(pool, user, taskScope),
      ]);

    const result = {
      group_efficiency: groupEfficiency,
      member_status: memberStatus,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      group_activity_trends: groupActivityTrends,
    };
    CacheService.set(detailCacheKey, result, 180);
    return result;
  }

  /**
   * TechManager 仪表板详情
   * groupId 参数用于组切换，过滤成员范围
   * projectId 用于项目筛选
   */
  async getDashboardTechManagerDetail(user: User, groupId?: number, projectId?: string): Promise<TechManagerDashboardDetailResponse> {
    const detailCacheKey = `dashboard:detail:tech_manager:${user.id}:${groupId || 'all'}:${projectId || 'all'}`;
    const detailCached = CacheService.get<TechManagerDashboardDetailResponse>(detailCacheKey);
    if (detailCached) return detailCached;

    const pool = getPool();

    const taskScope = await buildTaskScopeFilter(user, 't', true, projectId);

    const [memberStatus, taskTypeDistribution, allocationSuggestions, availableGroups, memberActivityTrends] =
      await Promise.all([
        this.getMemberStatusForScope(pool, user, taskScope, groupId),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user, groupId),
        this.getAvailableGroups(pool, user),
        this.getMemberActivityTrendsForScope(pool, user, taskScope, groupId),
      ]);

    const result = {
      member_status: memberStatus,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      available_groups: availableGroups,
      member_activity_trends: memberActivityTrends,
    };
    CacheService.set(detailCacheKey, result, 180);
    return result;
  }

  /**
   * Engineer 仪表板详情
   * projectId 用于项目筛选
   */
  async getDashboardEngineerDetail(user: User, projectId?: string): Promise<EngineerDashboardDetailResponse> {
    const detailCacheKey = `dashboard:detail:engineer:${user.id}:${projectId || 'all'}`;
    const detailCached = CacheService.get<EngineerDashboardDetailResponse>(detailCacheKey);
    if (detailCached) return detailCached;

    const pool = getPool();

    const [todoTasks, needUpdateTasks, taskStatusDistribution] = await Promise.all([
      this.getTodoTasks(pool, user.id, projectId),
      this.getStaleTasks(pool, user.id, projectId),
      this.getUserTaskStatusDistribution(pool, user.id, projectId),
    ]);

    const result = {
      todo_tasks: todoTasks,
      need_update_tasks: needUpdateTasks,
      task_status_distribution: taskStatusDistribution,
    };
    CacheService.set(detailCacheKey, result, 180);
    return result;
  }

  // ========== Detail API 辅助方法 ==========

  /**
   * Admin: 部门效能对比
   */
  private async getAdminDepartmentEfficiency(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<DepartmentEfficiencyItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        d.id, d.name,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_tasks,
        AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.full_time_ratio / 100.0 END) as avg_utilization,
        AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.progress END) as avg_activity
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       GROUP BY d.id, d.name
       HAVING total_tasks > 0
       ORDER BY completed_tasks DESC`,
      taskScope.params
    );

    return rows.map((r: RowDataPacket) => {
      const completionRate = r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0;
      const delayRate = r.total_tasks > 0 ? Math.round((r.delayed_tasks / r.total_tasks) * 100) : 0;
      const utilizationRate = Math.round((r.avg_utilization || 0) * 100);
      const activity = Math.round(r.avg_activity || 0);

      let status: 'healthy' | 'warning' | 'risk' = 'healthy';
      if (delayRate > 30 || completionRate < 40) status = 'risk';
      else if (delayRate > 15 || completionRate < 60) status = 'warning';

      return {
        id: r.id,
        name: r.name,
        completion_rate: completionRate,
        delay_rate: delayRate,
        utilization_rate: utilizationRate,
        activity,
        trend: 0,
        status,
      };
    });
  }

  /**
   * 任务类型分布（通用，按 scope 过滤）
   * 只计算根任务（wbs_level = 1）
   */
  private async getTaskTypeDistribution(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<TaskTypeDistributionItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.task_type,
        COUNT(*) as count,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_count,
        ROUND(AVG(t.duration), 1) as avg_duration
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE (${taskScope.clause}) AND t.wbs_level = 1
       GROUP BY t.task_type`,
      taskScope.params
    );

    return rows.map((r: RowDataPacket) => ({
      task_type: r.task_type || 'other',
      task_type_name: AnalyticsRepository.TASK_TYPE_NAMES[r.task_type] || r.task_type || '其它',
      count: r.count,
      completed_count: r.completed_count,
      delayed_count: r.delayed_count,
      completion_rate: r.count > 0 ? Math.round((r.completed_count / r.count) * 100) : 0,
      delay_rate: r.count > 0 ? Math.round((r.delayed_count / r.count) * 100) : 0,
      avg_duration: r.avg_duration || 0,
    }));
  }

  /**
   * 资源调配建议（通用，基于成员分析）
   * groupId 用于技术经理切换组时过滤成员范围
   */
  private async getAllocationSuggestionsForScope(pool: ReturnType<typeof getPool>, user: User, groupId?: number): Promise<AllocationSuggestionItem[]> {
    const taskScope = await buildTaskScopeFilter(user, 't', true);

    // 构建成员过滤条件
    const memberConditions: string[] = ['u.is_active = 1'];
    const memberParams: (string | number)[] = [];
    if (groupId) {
      memberConditions.push('u.department_id = ?');
      memberParams.push(groupId);
    }
    const memberClause = memberConditions.join(' AND ');

    // full_time_ratio 存储为百分比值（100=100%），需除以100转为小数
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as member_id,
        u.real_name as member_name,
        COALESCE(AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.full_time_ratio END) / 100.0, 0) as total_load,
        SUM(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN 1 ELSE 0 END) as current_tasks
       FROM users u
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE ${memberClause}
       GROUP BY u.id, u.real_name
       ORDER BY total_load DESC`,
      [...taskScope.params, ...memberParams]
    );

    const suggestions: AllocationSuggestionItem[] = [];
    for (const r of rows) {
      const load = Math.round((r.total_load || 0) * 100) / 100;
      if (load > 1.5) {
        suggestions.push({
          type: 'overloaded',
          member_name: r.member_name,
          current_load: load,
          suggestion: `${r.member_name} 当前全职比 ${load.toFixed(2)}，负载过高，建议重新分配部分任务`,
        });
      } else if (r.current_tasks === 0) {
        suggestions.push({
          type: 'idle',
          member_name: r.member_name,
          current_load: 0,
          suggestion: `${r.member_name} 当前无进行中任务，可考虑分配新任务`,
        });
      }
    }
    return suggestions.slice(0, QUERY_LIMITS.ALLOCATION_SUGGESTIONS);
  }

  /**
   * Admin: 部门延期率趋势（30天，按日期+部门聚合）
   * 统计每天各部门的延期任务比例（未完成 + 已过截止日）
   */
  private async getDepartmentDelayTrends(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<DepartmentDelayTrendPoint[]> {
    // 使用简化的查询：统计每天每个部门的延期任务数和总任务数
    // 延期定义：未完成 + end_date < 当天
    const [rows] = await pool.execute<RowDataPacket[]>(
      `WITH RECURSIVE date_series AS (
          SELECT DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.MONTH_DAYS - 1} DAY) as date
          UNION ALL
          SELECT DATE_ADD(date, INTERVAL 1 DAY) FROM date_series WHERE date < CURDATE()
        )
        SELECT
          ds.date,
          COALESCE(d.name, '未知部门') as dept_name,
          COUNT(DISTINCT CASE WHEN t.end_date IS NOT NULL THEN t.id END) as total,
          COUNT(DISTINCT CASE WHEN t.actual_end_date IS NULL AND t.end_date IS NOT NULL AND t.end_date < ds.date THEN t.id END) as delayed_count
        FROM date_series ds
        CROSS JOIN departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        LEFT JOIN wbs_tasks t ON t.assignee_id = u.id
          AND t.end_date IS NOT NULL
          AND (${taskScope.clause.replace(/t\./g, 't.')})
        WHERE d.id IN (SELECT DISTINCT department_id FROM users WHERE is_active = 1)
        GROUP BY ds.date, d.name
        HAVING total > 0
        ORDER BY ds.date`,
      taskScope.params
    );

    // 生成完整30天日期序列（前端图表需要连续X轴）
    const today = new Date();
    const allDates: string[] = [];
    for (let i = TIME_INTERVALS.MONTH_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDates.push(d.toISOString().split('T')[0]);
    }

    // 收集所有出现过的部门名称
    const deptNames = new Set<string>();
    for (const r of rows) {
      if (r.dept_name) {
        deptNames.add(r.dept_name);
      }
    }

    // 构建宽表：30天 × N部门，缺失值补0
    const result: Record<string, string | number>[] = allDates.map(date => {
      const entry: Record<string, string | number> = { date };
      for (const dept of deptNames) {
        entry[dept] = 0;
      }
      return entry;
    });

    // 填充实际数据
    const dateEntryMap = new Map(result.map(e => [e.date as string, e]));
    for (const r of rows) {
      const date = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      const entry = dateEntryMap.get(date);
      if (entry && r.dept_name && r.total > 0) {
        entry[r.dept_name] = Math.round((r.delayed_count / r.total) * 100);
      }
    }

    return result as DepartmentDelayTrendPoint[];
  }

  /**
   * Admin: 资源利用率趋势（30天）
   * 统计每日活跃成员的平均全职比总和（人均负载率）
   */
  private async getUtilizationTrends(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<UtilizationTrendPoint[]> {
    // 统计每天：有未完成任务的成员的平均全职比总和
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        ds.date,
        ROUND(COALESCE(AVG(member_load), 0), 1) as utilization
       FROM (
         SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) as date
         FROM (
           SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
           UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
           UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
           UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
           UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
         ) nums
         WHERE n < ${TIME_INTERVALS.MONTH_DAYS}
       ) ds
       LEFT JOIN (
         SELECT
           t.assignee_id,
           COALESCE(SUM(t.full_time_ratio), 0) as member_load
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE ${STATUS_CONDITIONS.notCompleted}
           AND t.assignee_id IS NOT NULL
           AND (${taskScope.clause})
         GROUP BY t.assignee_id
       ) ml ON 1=1
       GROUP BY ds.date
       ORDER BY ds.date`,
      taskScope.params
    );

    return rows.map((r: RowDataPacket) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      utilization: Math.min(100, r.utilization || 0),
      target: DEFAULTS.TARGET_UTILIZATION,
    }));
  }

  /**
   * Admin: 高风险项目
   */
  private async getHighRiskProjects(pool: ReturnType<typeof getPool>, projectScope: ScopeFilter): Promise<HighRiskProjectItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        p.id, p.name, p.progress,
        COUNT(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 END) as delayed_tasks,
        u.real_name as manager
       FROM projects p
       LEFT JOIN wbs_tasks t ON p.id = t.project_id
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE (${projectScope.clause})
         AND p.status NOT IN ('completed')
       GROUP BY p.id, p.name, p.progress, u.real_name
       HAVING (p.progress < ${STATUS_THRESHOLDS.PROJECT_LOW_PROGRESS} AND delayed_tasks > 0) OR delayed_tasks > ${STATUS_THRESHOLDS.PROJECT_MANY_DELAYED}
       ORDER BY p.progress ASC
       LIMIT ${QUERY_LIMITS.HIGH_RISK_PROJECTS}`,
      projectScope.params
    );

    return rows.map((r: RowDataPacket) => {
      const riskFactors: string[] = [];
      if (r.progress < 30) riskFactors.push('进度严重滞后');
      else if (r.progress < 50) riskFactors.push('进度偏低');
      if (r.delayed_tasks > 3) riskFactors.push(`延期任务${r.delayed_tasks}个`);
      if (r.delayed_tasks > 0 && r.progress < 50) riskFactors.push('延期+低进度');

      return {
        id: String(r.id),
        name: r.name,
        risk_factors: riskFactors,
        completion_rate: Math.round(r.progress || 0),
        delayed_tasks: r.delayed_tasks || 0,
        manager: r.manager || '未指定',
      };
    });
  }

  /**
   * DeptManager: 组效能（使用子部门作为"组"，无子部门时将本部门作为唯一组）
   */
  private async getGroupEfficiencyByParentDept(pool: ReturnType<typeof getPool>, user: User, taskScope: ScopeFilter): Promise<GroupEfficiencyItem[]> {
    // 获取用户管理的部门ID列表
    let managedDeptIds = await getManagedDepartmentIdsSafe(user.id, user.department_id!);
    if (managedDeptIds.length === 0 && user.department_id) {
      managedDeptIds = [...managedDeptIds, user.department_id];
    }

    // 查找子部门作为"组"
    const [childDepts] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name FROM departments WHERE parent_id IN (${managedDeptIds.map(() => '?').join(',')})`,
      managedDeptIds
    );

    // 如果没有子部门，将管理的部门本身作为"组"
    let groupIds: number[];

    if (childDepts.length === 0) {
      const [depts] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name FROM departments WHERE id IN (${managedDeptIds.map(() => '?').join(',')})`,
        managedDeptIds
      );
      groupIds = depts.map((d: RowDataPacket) => d.id);
    } else {
      groupIds = childDepts.map((d: RowDataPacket) => d.id);
    }

    if (groupIds.length === 0) return [];

    const placeholders = groupIds.map(() => '?').join(',');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        d.id, d.name,
        COUNT(DISTINCT u.id) as member_count,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_tasks,
        AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.full_time_ratio / 100.0 END) as avg_load,
        AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.progress END) as avg_activity
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
       LEFT JOIN (wbs_tasks t JOIN projects p ON t.project_id = p.id)
         ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE d.id IN (${placeholders})
       GROUP BY d.id, d.name
       ORDER BY completed_tasks DESC`,
      [...taskScope.params, ...groupIds]
    );

    return rows.map((r: RowDataPacket) => {
      const completionRate = r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0;
      const delayRate = r.total_tasks > 0 ? Math.round((r.delayed_tasks / r.total_tasks) * 100) : 0;
      const loadRate = Math.round((r.avg_load || 0) * 100);
      const activity = Math.round(r.avg_activity || 0);

      let status: 'healthy' | 'warning' | 'risk' = 'healthy';
      if (delayRate > 30 || completionRate < 40) status = 'risk';
      else if (delayRate > 15 || completionRate < 60) status = 'warning';

      return {
        id: r.id,
        name: r.name,
        completion_rate: completionRate,
        delay_rate: delayRate,
        load_rate: loadRate,
        activity,
        member_count: r.member_count || 0,
        trend: 0,
        status,
      };
    });
  }

  /**
   * 成员状态（通用，按 scope 过滤）
   * groupId 用于技术经理切换组时过滤成员范围
   */
  private async getMemberStatusForScope(
    pool: ReturnType<typeof getPool>,
    user: User,
    taskScope: ScopeFilter,
    groupId?: number
  ): Promise<MemberStatusItem[]> {
    // 获取用户可见范围内的成员
    // 使用嵌套 JOIN: tasks INNER JOIN projects 保证 p 别名可用，外层 LEFT JOIN 保留无任务用户
    let userScope = await buildUserDepartmentScopeFilter(user);

    // 如果指定了 groupId，进一步过滤成员范围
    const conditions: string[] = [userScope.clause];
    const params: (string | number)[] = [...userScope.params];

    if (groupId) {
      conditions.push('u.department_id = ?');
      params.push(groupId);
    }

    const userFilterClause = conditions.join(' AND ');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id, u.real_name as name,
        COUNT(DISTINCT t.id) as total_tasks,
        SUM(CASE WHEN ${STATUS_CONDITIONS.inProgress} THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ${STATUS_CONDITIONS.delayedOrWarning} THEN 1 ELSE 0 END) as delayed_count,
        ROUND(COALESCE(AVG(CASE WHEN ${STATUS_CONDITIONS.notCompleted}
            THEN t.full_time_ratio END) / 100.0, 0), 2) as load_rate,
        ROUND(AVG(t.progress), 1) as activity
       FROM users u
       LEFT JOIN (wbs_tasks t JOIN projects p ON t.project_id = p.id)
         ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE u.is_active = 1 AND (${userFilterClause})
       GROUP BY u.id, u.real_name
       ORDER BY load_rate DESC`,
      [...taskScope.params, ...params]
    );

    return rows.map((r: RowDataPacket) => {
      const load = r.load_rate || 0;
      let status: 'healthy' | 'warning' | 'risk' | 'idle' = 'healthy';
      if (r.total_tasks === 0) status = 'idle';
      else if (load > 150 || r.delayed_count > 3) status = 'risk';
      else if (load > 120 || r.delayed_count > 1) status = 'warning';

      return {
        id: r.id,
        name: r.name,
        avatar: null,
        in_progress: r.in_progress || 0,
        completed: r.completed || 0,
        delayed: r.delayed_count || 0,
        load_rate: Math.round(load),
        activity: Math.round(r.activity || 0),
        trend: 0,
        status,
      };
    });
  }

  /**
   * DeptManager: 组活跃度趋势（12周，按子部门聚合）
   */
  private async getGroupActivityTrends(pool: ReturnType<typeof getPool>, user: User, taskScope: ScopeFilter): Promise<GroupActivityTrendPoint[]> {
    const [deptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT department_id FROM users WHERE id = ?`,
      [user.id]
    );
    const deptId = deptRows[0]?.department_id;
    if (!deptId) return [];

    const [childDepts] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name FROM departments WHERE parent_id = ?`,
      [deptId]
    );
    if (childDepts.length === 0) return [];

    const childIds = childDepts.map((d: RowDataPacket) => d.id);
    const placeholders = childIds.map(() => '?').join(',');

    // 基于任务更新时间的活跃度统计：每周每个组有多少任务被更新过
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        CONCAT(YEAR(t.updated_at), '-W', LPAD(WEEK(t.updated_at, 1), 2, '0')) as period,
        d.name as group_name,
        COUNT(DISTINCT t.id) as activity
       FROM wbs_tasks t
       JOIN users u ON t.assignee_id = u.id
       JOIN departments d ON u.department_id = d.id
       JOIN projects p ON t.project_id = p.id
       WHERE d.id IN (${placeholders})
         AND t.updated_at >= DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.QUARTER_WEEKS} WEEK)
         AND (${taskScope.clause})
       GROUP BY period, d.name
       ORDER BY period`,
      [...childIds, ...taskScope.params]
    );

    // 按周期聚合为宽表
    const periodMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      if (!periodMap.has(r.period)) periodMap.set(r.period, { date: r.period });
      periodMap.get(r.period)![r.group_name] = r.activity || 0;
    }
    return Array.from(periodMap.values()) as GroupActivityTrendPoint[];
  }

  /**
   * TechManager: 可用组列表（使用 getTechManagerGroupIds 获取管理的组）
   */
  private async getAvailableGroups(pool: ReturnType<typeof getPool>, user: User): Promise<Array<{ id: number; name: string }>> {
    if (!user.department_id) return [];

    // 使用统一的组ID获取逻辑
    const groupIds = await getTechManagerGroupIdsSafe(user.id, user.department_id);
    if (groupIds.length === 0) return [];

    const placeholders = groupIds.map(() => '?').join(',');
    const [groups] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name FROM departments WHERE id IN (${placeholders})`,
      groupIds
    );

    return groups.map((d: RowDataPacket) => ({ id: d.id, name: d.name }));
  }

  /**
   * TechManager: 成员活跃度趋势（12周）
   * groupId 用于技术经理切换组时过滤成员范围
   */
  private async getMemberActivityTrendsForScope(
    pool: ReturnType<typeof getPool>,
    user: User,
    taskScope: ScopeFilter,
    groupId?: number
  ): Promise<MemberActivityTrendPoint[]> {
    // 构建成员过滤条件
    const memberConditions: string[] = ['u.is_active = 1'];
    const memberParams: (string | number)[] = [];
    if (groupId) {
      memberConditions.push('u.department_id = ?');
      memberParams.push(groupId);
    }
    const memberClause = memberConditions.join(' AND ');

    // 获取范围内活跃成员（取 top 6）
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.real_name as name
       FROM users u
       JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE ${memberClause}
       GROUP BY u.id, u.real_name
       ORDER BY COUNT(t.id) DESC
       LIMIT ${QUERY_LIMITS.TOP_MEMBERS}`,
      [...taskScope.params, ...memberParams]
    );
    if (memberRows.length === 0) return [];

    const memberIds = memberRows.map((m: RowDataPacket) => m.id);
    const placeholders = memberIds.map(() => '?').join(',');

    // 基于任务更新时间的活跃度统计：每周每个成员有多少任务被更新过
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        CONCAT(YEAR(t.updated_at), '-W', LPAD(WEEK(t.updated_at, 1), 2, '0')) as period,
        u.real_name as member_name,
        COUNT(DISTINCT t.id) as activity
       FROM wbs_tasks t
       JOIN users u ON t.assignee_id = u.id
       JOIN projects p ON t.project_id = p.id
       WHERE u.id IN (${placeholders})
         AND t.updated_at >= DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.QUARTER_WEEKS} WEEK)
         AND (${taskScope.clause})
       GROUP BY period, u.real_name
       ORDER BY period`,
      [...memberIds, ...taskScope.params]
    );

    const periodMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      if (!periodMap.has(r.period)) periodMap.set(r.period, { date: r.period });
      periodMap.get(r.period)![r.member_name] = r.activity || 0;
    }
    return Array.from(periodMap.values()) as MemberActivityTrendPoint[];
  }

  /**
   * Engineer: 待办任务（未完成，按优先级和到期日排序）
   * projectId 用于项目筛选
   */
  private async getTodoTasks(pool: ReturnType<typeof getPool>, userId: number, projectId?: string): Promise<TodoTaskItem[]> {
    const priorityOrder = "CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END";
    const projectFilter = projectId ? 'AND t.project_id = ?' : '';
    const params: (string | number)[] = [userId];
    if (projectId) params.push(projectId);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.id, t.description as name, p.name as project_name,
        t.end_date as due_date, t.progress, t.priority,
        CASE WHEN t.end_date IS NOT NULL AND t.end_date < CURDATE()
          THEN DATEDIFF(CURDATE(), t.end_date) ELSE 0 END as days_overdue,
        t.updated_at as last_updated
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
         AND ${STATUS_CONDITIONS.notCompleted}
         ${projectFilter}
       ORDER BY ${priorityOrder}, t.end_date ASC
       LIMIT ${QUERY_LIMITS.TODO_TASKS}`,
      params
    );

    return rows.map((r: RowDataPacket) => ({
      id: String(r.id),
      name: r.name || '',
      project_name: r.project_name || '',
      due_date: r.due_date instanceof Date ? r.due_date.toISOString().split('T')[0] : (r.due_date || null),
      progress: r.progress || 0,
      priority: r.priority || 'medium',
      days_overdue: r.days_overdue > 0 ? r.days_overdue : undefined,
      last_updated: r.last_updated instanceof Date ? r.last_updated.toISOString() : (r.last_updated || undefined),
    }));
  }

  /**
   * Engineer: 需要更新的任务（7天未更新）
   * 包含已分配未开始但超7天未更新的任务
   * projectId 用于项目筛选
   */
  private async getStaleTasks(pool: ReturnType<typeof getPool>, userId: number, projectId?: string): Promise<TodoTaskItem[]> {
    const projectFilter = projectId ? 'AND t.project_id = ?' : '';
    const params: (string | number)[] = [userId];
    if (projectId) params.push(projectId);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.id, t.description as name, p.name as project_name,
        t.end_date as due_date, t.progress, t.priority,
        DATEDIFF(CURDATE(), t.updated_at) as days_since_update,
        t.updated_at as last_updated
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
         AND ${STATUS_CONDITIONS.notCompleted}
         AND t.updated_at < DATE_SUB(CURDATE(), INTERVAL ${TIME_INTERVALS.WEEK_DAYS} DAY)
         ${projectFilter}
       ORDER BY t.updated_at ASC
       LIMIT ${QUERY_LIMITS.STALE_TASKS}`,
      params
    );

    return rows.map((r: RowDataPacket) => ({
      id: String(r.id),
      name: r.name || '',
      project_name: r.project_name || '',
      due_date: r.due_date instanceof Date ? r.due_date.toISOString().split('T')[0] : (r.due_date || null),
      progress: r.progress || 0,
      priority: r.priority || 'medium',
      days_overdue: (r.days_since_update || 0) > 0 ? r.days_since_update : undefined,
      last_updated: r.last_updated instanceof Date ? r.last_updated.toISOString() : (r.last_updated || undefined),
    }));
  }

  /**
   * Engineer: 用户任务状态分布
   * projectId 用于项目筛选
   */
  private async getUserTaskStatusDistribution(pool: ReturnType<typeof getPool>, userId: number, projectId?: string): Promise<StatusDistributionItem[]> {
    const projectFilter = projectId ? 'AND project_id = ?' : '';
    const params: (string | number)[] = [userId];
    if (projectId) params.push(projectId);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM wbs_tasks
       WHERE assignee_id = ?
         ${projectFilter}
       GROUP BY status
       ORDER BY count DESC`,
      params
    );

    return rows.map((r: RowDataPacket) => ({
      status: r.status,
      count: r.count,
    }));
  }
}
