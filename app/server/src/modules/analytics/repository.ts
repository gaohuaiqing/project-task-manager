// app/server/src/modules/analytics/repository.ts
import { getPool } from '../../core/db';
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
import { buildTaskScopeFilter, buildProjectScopeFilter, ScopeFilter } from './query-builder';
import type { User } from '../../core/types';

export class AnalyticsRepository {
  // ========== 仪表板统计（优化版：角色感知数据隔离）==========

  async getDashboardStats(user: User): Promise<DashboardStats> {
    const pool = getPool();

    // 构建角色感知的项目过滤条件
    const projectScope = await buildProjectScopeFilter(user, 'p');

    const [projectRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_projects,
        SUM(CASE WHEN p.status = 'in_progress' THEN 1 ELSE 0 END) as active_projects,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
        COALESCE(AVG(CASE WHEN p.status = 'in_progress' THEN p.progress ELSE NULL END), 0) as avg_progress
       FROM projects p
       WHERE ${projectScope.clause}`,
      projectScope.params
    );

    // 构建角色感知的任务过滤条件
    const taskScope = await buildTaskScopeFilter(user, 't', true);

    const [taskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.status = 'not_started' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'delay_warning' THEN 1 ELSE 0 END) as delay_warning_tasks,
        SUM(CASE WHEN t.status = 'delayed' THEN 1 ELSE 0 END) as overdue_tasks
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${taskScope.clause}`,
      taskScope.params
    );

    // 查询3：成员统计（简单的单查询）
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total_members FROM users WHERE is_active = 1',
      []
    );

    const projectResult = projectRows[0];
    const taskResult = taskRows[0];
    const memberResult = memberRows[0];

    return {
      total_projects: projectResult.total_projects || 0,
      active_projects: projectResult.active_projects || 0,
      completed_projects: projectResult.completed_projects || 0,
      total_tasks: taskResult.total_tasks || 0,
      pending_tasks: taskResult.pending_tasks || 0,
      in_progress_tasks: taskResult.in_progress_tasks || 0,
      completed_tasks: taskResult.completed_tasks || 0,
      delay_warning_tasks: taskResult.delay_warning_tasks || 0,
      overdue_tasks: taskResult.overdue_tasks || 0,
      total_members: memberResult.total_members || 0,
      avg_progress: Math.round(projectResult.avg_progress || 0),
    };
  }

  async getUrgentTasks(user: User): Promise<unknown[]> {
    const pool = getPool();
    const scope = await buildProjectScopeFilter(user, 'p');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.end_date, t.priority,
              p.name as project_name, u.real_name as assignee_name
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.priority = 'urgent' AND t.status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
       AND ${scope.clause}
       ORDER BY t.end_date ASC
       LIMIT 10`,
      scope.params
    );
    return rows;
  }

  async getTaskTrend(startDate: string, endDate: string, user: User, projectId?: string): Promise<TrendDataPoint[]> {
    const pool = getPool();

    // 设置默认日期范围（最近30天）
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 构建角色感知的任务过滤条件
    const scope = await buildTaskScopeFilter(user, 't', true);

    // 构建项目过滤条件（复用）
    const projectFilter = projectId && projectId !== 'all' ? 't.project_id = ?' : '1=1';
    const projectParams = projectId && projectId !== 'all' ? [projectId] : [];

    // 使用 UNION ALL 合并三个查询，减少数据库往返
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT date, type, count FROM (
        -- 每日新建任务数
        SELECT DATE(t.created_at) as date, 'created' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.created_at) BETWEEN ? AND ?
          AND ${projectFilter}
          AND ${scope.clause}
        GROUP BY DATE(t.created_at)

        UNION ALL

        -- 每日完成任务数
        SELECT DATE(t.updated_at) as date, 'completed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.updated_at) BETWEEN ? AND ?
          AND t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')
          AND ${projectFilter}
          AND ${scope.clause}
        GROUP BY DATE(t.updated_at)

        UNION ALL

        -- 每日延期任务数
        SELECT DATE(t.updated_at) as date, 'delayed' as type, COUNT(*) as count
        FROM wbs_tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.updated_at) BETWEEN ? AND ?
          AND t.status IN ('delay_warning', 'delayed')
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

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ========== 获取所有项目进度（仪表板专用） ==========

  async getAllProjectsProgress(user: User): Promise<ProjectProgressItem[]> {
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
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        p.member_ids
       FROM projects p
       LEFT JOIN wbs_tasks t ON p.id = t.project_id
       WHERE p.status IN ('planning', 'active', 'completed') AND ${scope.clause}
       GROUP BY p.id, p.name, p.status, p.planned_end_date, p.progress, p.member_ids
       ORDER BY p.planned_end_date ASC
       LIMIT 10`,
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
        progress: row.progress || (row.total_tasks > 0 ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0),
        total_tasks: row.total_tasks || 0,
        completed_tasks: row.completed_tasks || 0,
        deadline: row.deadline ? (row.deadline instanceof Date ? row.deadline.toISOString().split('T')[0] : String(row.deadline)) : null,
        members
      });
    }
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

  async getProjectProgressReport(projectId: string): Promise<ProjectProgressReport | null> {
    const pool = getPool();

    // 获取项目基本信息
    const [projectRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name, progress FROM projects WHERE id = ?',
      [projectId]
    );
    if (projectRows.length === 0) return null;
    const project = projectRows[0];

    // 获取任务统计（符合需求文档REQ_07要求）
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
       FROM wbs_tasks WHERE project_id = ?`,
      [projectId]
    );
    const stats = statsRows[0];

    // 获取任务状态分布（需求文档要求：任务状态分布饼图）
    const [statusRows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM wbs_tasks WHERE project_id = ?
       GROUP BY status`,
      [projectId]
    );

    // 获取里程碑
    const [milestones] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, target_date, status, completion_percentage
       FROM milestones WHERE project_id = ? ORDER BY target_date`,
      [projectId]
    );

    return {
      project_id: project.id,
      project_name: project.name,
      progress: project.progress || (stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0),
      total_tasks: stats.total_tasks,
      completed_tasks: stats.completed_tasks,
      in_progress_tasks: stats.in_progress_tasks || 0,
      status_distribution: statusRows.map(r => ({ status: r.status, count: r.count })),
      milestones: milestones as MilestoneProgress[]
    };
  }

  // ========== 任务统计报表 ==========

  async getTaskStatisticsReport(options: ReportQueryOptions): Promise<TaskStatisticsReport> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        ROUND(AVG(t.progress), 1) as avg_completion_rate,
        ROUND(SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as delay_rate,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
       FROM wbs_tasks t
       ${whereClause}`,
      params
    );

    const stats = rows[0];

    // 获取优先级分布
    const [priorityRows] = await pool.execute<RowDataPacket[]>(
      `SELECT priority, COUNT(*) as count FROM wbs_tasks t ${whereClause} GROUP BY priority`,
      params
    );
    const priority_distribution: Record<string, number> = {};
    priorityRows.forEach(r => { priority_distribution[r.priority] = r.count; });

    // 获取负责人分布
    const [assigneeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.assignee_id, u.real_name as assignee_name,
              COUNT(*) as task_count,
              SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_count,
              SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count
       FROM wbs_tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       ${whereClause}
       GROUP BY t.assignee_id, u.real_name`,
      params
    );

    // 获取任务明细列表（需求文档要求：任务统计明细表格）
    const [taskListRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, p.name as project_name, u.real_name as assignee_name,
              t.status, t.progress, t.priority, t.end_date as planned_end_date
       FROM wbs_tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       ${whereClause}
       ORDER BY t.priority DESC, t.end_date ASC
       LIMIT 100`,
      params
    );

    // 获取任务类型分布（v1.2 新增）
    const [taskTypeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.task_type,
        COUNT(*) as count,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count,
        ROUND(AVG(t.duration), 1) as avg_duration
       FROM wbs_tasks t
       ${whereClause}
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

    return {
      total_tasks: stats.total_tasks,
      avg_completion_rate: Math.round(stats.avg_completion_rate || 0),
      delay_rate: Math.round(stats.delay_rate || 0),
      urgent_count: stats.urgent_count,
      priority_distribution,
      assignee_distribution: assigneeRows as AssigneeTaskCount[],
      task_type_distribution,
      task_list: taskListRows.map(t => ({
        id: t.id,
        description: t.description,
        project_name: t.project_name || '未分配',
        assignee_name: t.assignee_name || '未分配',
        status: t.status,
        progress: t.progress || 0,
        priority: t.priority,
        planned_end_date: t.planned_end_date ? (t.planned_end_date instanceof Date ? t.planned_end_date.toISOString().split('T')[0] : String(t.planned_end_date)) : null,
        task_type: t.task_type || 'other',
      })),
    };
  }

  // ========== 延期分析报表 ==========

  async getDelayAnalysisReport(options: ReportQueryOptions): Promise<DelayAnalysisReport> {
    const pool = getPool();
    const conditions: string[] = ["t.status IN ('delay_warning', 'delayed', 'overdue_completed')"];
    const params: (string | number)[] = [];

    if (options.project_id) {
      conditions.push('t.project_id = ?');
      params.push(options.project_id);
    }
    if (options.delay_type) {
      conditions.push('t.status = ?');
      params.push(options.delay_type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_delayed,
        SUM(CASE WHEN t.status = 'delay_warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN t.status = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
        SUM(CASE WHEN t.status = 'overdue_completed' THEN 1 ELSE 0 END) as overdue_completed_count
       FROM wbs_tasks t
       ${whereClause}`,
      params
    );

    const stats = rows[0];

    // 获取延期原因统计
    const [reasonRows] = await pool.execute<RowDataPacket[]>(
      `SELECT dr.reason, COUNT(*) as count
       FROM delay_records dr
       JOIN wbs_tasks t ON dr.task_id = t.id
       ${whereClause}
       GROUP BY dr.reason
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // 获取延期任务列表（需求文档要求：延期任务列表表格）
    const [delayedTaskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, p.name as project_name, u.real_name as assignee_name,
              t.status as delay_type,
              CASE
                WHEN t.end_date IS NULL THEN 0
                ELSE DATEDIFF(COALESCE(t.actual_end_date, NOW()), t.end_date)
              END as delay_days,
              COALESCE(dr.reason, '未填写') as reason,
              t.status
       FROM wbs_tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN delay_records dr ON t.id = dr.task_id
       ${whereClause}
       ORDER BY delay_days DESC
       LIMIT 50`,
      params
    );

    // 获取延期趋势数据（按日统计新增延期和已解决延期）
    const trendConditions = ["t.status IN ('delay_warning', 'delayed', 'overdue_completed')"];
    const trendParams: (string | number)[] = [];
    if (options.project_id) {
      trendConditions.push('t.project_id = ?');
      trendParams.push(options.project_id);
    }
    const dateFilter = options.start_date && options.end_date
      ? 'DATE(t.updated_at) BETWEEN ? AND ?'
      : 'DATE(t.updated_at) >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    trendConditions.push(dateFilter);
    if (options.start_date && options.end_date) {
      trendParams.push(options.start_date, options.end_date);
    }

    const trendWhere = `WHERE ${trendConditions.join(' AND ')}`;
    const [trendRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.updated_at) as date,
              SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as created,
              SUM(CASE WHEN t.status = 'overdue_completed' THEN 1 ELSE 0 END) as completed
       FROM wbs_tasks t
       ${trendWhere}
       GROUP BY DATE(t.updated_at)
       ORDER BY date`,
      trendParams
    );

    const delayTrend = trendRows.map((r: RowDataPacket) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      created: r.created || 0,
      completed: r.completed || 0,
      delayed: (r.created || 0) - (r.completed || 0),  // 净增延期
    }));

    return {
      total_delayed: stats.total_delayed,
      warning_count: stats.warning_count,
      delayed_count: stats.delayed_count,
      overdue_completed_count: stats.overdue_completed_count,
      delay_reasons: reasonRows as DelayReasonCount[],
      delay_trend: delayTrend,
      delayed_tasks: delayedTaskRows.map(t => ({
        id: t.id,
        description: t.description,
        project_name: t.project_name || '未分配',
        assignee_name: t.assignee_name || '未分配',
        delay_type: t.delay_type,
        delay_days: t.delay_days || 0,
        reason: t.reason || '未填写',
        status: t.status,
      })),
    };
  }

  // ========== 成员分析报表 ==========

  async getMemberAnalysisReport(memberId: number): Promise<MemberAnalysisReport | null> {
    const pool = getPool();

    // 获取成员信息
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, real_name FROM users WHERE id = ?',
      [memberId]
    );
    if (memberRows.length === 0) return null;
    const member = memberRows[0];

    // 获取任务统计（全部任务参与统计，区分进行中和已完成）
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as current_tasks,
        SUM(full_time_ratio) as total_full_time_ratio,
        ROUND(AVG(progress), 1) as avg_completion_rate
       FROM wbs_tasks WHERE assignee_id = ?`,
      [memberId]
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
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
       ORDER BY t.status, t.end_date
       LIMIT 20`,
      [memberId]
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
        description: t.description,
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
        AND t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')
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

      if (deviation <= 0.1) {
        accurateCount++;
      } else if (deviation <= 0.3) {
        slightDeviationCount++;
      } else if (deviation <= 0.5) {
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

  async getResourceEfficiencyReport(options: ResourceEfficiencyQueryOptions): Promise<ResourceEfficiencyReport> {
    const pool = getPool();

    // 获取成员效能明细
    const memberEfficiencyList = await this.getMemberEfficiencyList(pool, options);

    // 计算汇总统计
    const totalMembers = memberEfficiencyList.length;
    const avgProductivity = totalMembers > 0
      ? Math.round((memberEfficiencyList.reduce((sum, m) => sum + m.productivity, 0) / totalMembers) * 100) / 100
      : 0;
    const avgEstimationAccuracy = totalMembers > 0
      ? Math.round((memberEfficiencyList.reduce((sum, m) => sum + m.estimation_accuracy, 0) / totalMembers) * 100) / 100
      : 0;
    const avgReworkRate = totalMembers > 0
      ? Math.round((memberEfficiencyList.reduce((sum, m) => sum + m.rework_rate, 0) / totalMembers) * 100) / 100
      : 0;
    const avgFulltimeUtilization = totalMembers > 0
      ? Math.round((memberEfficiencyList.reduce((sum, m) => sum + m.fulltime_utilization, 0) / totalMembers) * 100) / 100
      : 0;

    // 获取产能趋势
    const productivityTrend = await this.getProductivityTrend(pool, options);

    // 获取团队效能对比
    const teamEfficiencyComparison = await this.getTeamEfficiencyComparison(pool, options);

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

  // 获取成员效能明细
  private async getMemberEfficiencyList(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions): Promise<MemberEfficiencyItem[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

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
    conditions.push("t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')");

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // WBS等级复杂度系数
    const complexityFactor = `
      CASE
        WHEN t.wbs_level = 1 THEN 1.0
        WHEN t.wbs_level = 2 THEN 1.2
        WHEN t.wbs_level = 3 THEN 1.5
        ELSE 2.0
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
            THEN 1 - ABS(COALESCE(DATEDIFF(t.actual_end_date, t.actual_start_date), t.duration) - t.duration) / t.duration
            ELSE NULL END) as estimation_accuracy,
        0 as rework_tasks,
        SUM(t.full_time_ratio) as total_fulltime_ratio
       FROM users u
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id ${whereClause.replace('WHERE', 'AND')}
       LEFT JOIN departments d ON u.department_id = d.id
       GROUP BY u.id, u.real_name, d.name
       HAVING completed_tasks > 0
       ORDER BY total_complexity DESC`,
      params
    );

    return rows.map((r: any) => {
      // 计算产能：完成任务复杂度 / 投入天数
      const totalDays = r.total_days || 1;
      const productivity = r.total_complexity / totalDays;

      // 计算返工率
      const reworkRate = r.completed_tasks > 0 ? (r.rework_tasks / r.completed_tasks) * 100 : 0;

      // 计算全职比利用率（假设每人标准全职比为1）
      const fulltimeUtilization = r.total_fulltime_ratio > 0 ? Math.min((r.completed_tasks / r.total_fulltime_ratio) * 100, 100) : 0;

      return {
        member_id: r.member_id,
        member_name: r.member_name,
        department: r.department || '未分配',
        tech_group: r.tech_group || '未分配',
        completed_tasks: r.completed_tasks,
        productivity: Math.round(productivity * 100) / 100,
        estimation_accuracy: Math.round((r.estimation_accuracy || 0) * 100) / 100,
        rework_rate: Math.round(reworkRate * 100) / 100,
        fulltime_utilization: Math.round(fulltimeUtilization * 100) / 100,
        avg_task_complexity: Math.round((r.total_complexity / r.completed_tasks) * 100) / 100,
      };
    });
  }

  // 获取产能趋势（按周聚合）
  private async getProductivityTrend(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions): Promise<ProductivityTrendItem[]> {
    const conditions: string[] = ["t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')"];
    const params: (string | number)[] = [];

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
        WHEN t.wbs_level = 1 THEN 1.0
        WHEN t.wbs_level = 2 THEN 1.2
        WHEN t.wbs_level = 3 THEN 1.5
        ELSE 2.0
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
       LIMIT 12`,
      params
    );

    return rows.map((r: any) => ({
      period: r.period,
      task_count: r.task_count,
      productivity: Math.round((r.total_complexity / (r.total_days || 1)) * 100) / 100,
    })).reverse();
  }

  // 获取团队效能对比
  private async getTeamEfficiencyComparison(pool: ReturnType<typeof getPool>, options: ResourceEfficiencyQueryOptions): Promise<TeamEfficiencyItem[]> {
    const conditions: string[] = ["t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')"];
    const params: (string | number)[] = [];

    if (options.start_date) {
      conditions.push('t.actual_end_date >= ?');
      params.push(options.start_date);
    }
    if (options.end_date) {
      conditions.push('t.actual_end_date <= ?');
      params.push(options.end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 按部门统计
    // 注：plan_version 列可能不存在，返工率暂时设为0
    const [deptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        d.name as team_name,
        'department' as team_type,
        COUNT(DISTINCT u.id) as member_count,
        COUNT(t.id) as total_tasks,
        AVG(CASE WHEN t.duration IS NOT NULL AND t.duration > 0
            THEN 1 - ABS(COALESCE(DATEDIFF(t.actual_end_date, t.actual_start_date), t.duration) - t.duration) / t.duration
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
      results.push({
        team_name: r.team_name,
        team_type: 'department',
        member_count: r.member_count,
        avg_productivity: Math.round((r.total_tasks / r.member_count) * 100) / 100,
        avg_estimation_accuracy: Math.round((r.avg_estimation_accuracy || 0) * 100) / 100,
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
    const overloadedMembers = membersSummary.filter(m => m.total_full_time_ratio > 1.5).length;

    // 计算活跃度
    const activityRate = await this.getActivityRate(pool, userScopeFilter, scopeFilter);

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

    // 复用 query-builder 的部门/组查找逻辑
    if (currentUser.role === 'dept_manager' && currentUser.department_id) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `WITH RECURSIVE dept_tree AS (
          SELECT id FROM departments WHERE manager_id = ? AND is_active = 1
          UNION ALL
          SELECT d.id FROM departments d JOIN dept_tree dt ON d.parent_id = dt.id WHERE d.is_active = 1
        ) SELECT id FROM dept_tree`,
        [currentUser.id]
      );
      const deptIds = rows.map((r: RowDataPacket) => r.id);
      if (deptIds.length === 0 && currentUser.department_id) {
        deptIds.push(currentUser.department_id);
      }
      const placeholders = deptIds.map(() => '?').join(',');
      return { clause: `u.department_id IN (${placeholders})`, params: deptIds };
    }

    if (currentUser.role === 'tech_manager' && currentUser.department_id) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `WITH RECURSIVE group_tree AS (
          SELECT id FROM departments WHERE manager_id = ? AND is_active = 1
          UNION ALL
          SELECT d.id FROM departments d JOIN group_tree gt ON d.parent_id = gt.id WHERE d.is_active = 1
        ) SELECT id FROM group_tree`,
        [currentUser.id]
      );
      const groupIds = rows.map((r: RowDataPacket) => r.id);
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
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as member_id,
        u.real_name as member_name,
        d.name as department,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
            THEN 1 ELSE 0 END) as current_tasks,
        COALESCE(SUM(t.full_time_ratio), 0) as total_full_time_ratio,
        ROUND(AVG(t.progress), 1) as avg_completion_rate,
        AVG(CASE WHEN t.duration IS NOT NULL AND t.duration > 0
            AND t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
            THEN 1 - ABS(DATEDIFF(t.actual_end_date, t.actual_start_date) - t.duration) / t.duration
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

    // 计算每个成员的活跃度
    return rows.map((r: any) => ({
      member_id: r.member_id,
      member_name: r.member_name,
      department: r.department || null,
      current_tasks: r.current_tasks || 0,
      total_full_time_ratio: Math.round((r.total_full_time_ratio || 0) * 100) / 100,
      avg_completion_rate: Math.round(r.avg_completion_rate || 0),
      estimation_accuracy: Math.round((r.estimation_accuracy || 0) * 100) / 100,
      activity_rate: 0, // 将在 getActivityRate 中批量计算
    }));
  }

  /**
   * 获取任务状态分布
   */
  private async getStatusDistribution(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    timeClause: string,
    timeParams: (string | number)[],
    memberClause: string,
    memberParams: (string | number)[],
  ): Promise<StatusDistributionItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.status, COUNT(*) as count
       FROM wbs_tasks t
       WHERE (${taskScope.clause})${timeClause}${memberClause}
       GROUP BY t.status
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
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
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
        END as category,
        COUNT(*) as count
       FROM wbs_tasks t
       WHERE t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')
        AND (${taskScope.clause})${timeClause}${memberClause}
       GROUP BY category
       HAVING category IS NOT NULL
       ORDER BY FIELD(category, '精准', '轻微偏差', '明显偏差', '严重偏差')`,
      [...taskScope.params, ...timeParams, ...memberParams]
    );

    // 确保所有类别都有值
    const categories = ['精准', '轻微偏差', '明显偏差', '严重偏差'];
    const map = new Map(rows.map((r: any) => [r.category, r.count]));
    return categories.map(cat => ({ category: cat, count: map.get(cat) || 0 }));
  }

  /**
   * 获取负载趋势（按周聚合）
   */
  private async getWorkloadTrend(
    pool: ReturnType<typeof getPool>,
    taskScope: ScopeFilter,
    startDate?: string,
    endDate?: string,
  ): Promise<WorkloadTrendPoint[]> {
    const conditions: string[] = [`(${taskScope.clause})`];
    const params: (string | number)[] = [...taskScope.params];

    if (startDate) {
      conditions.push('t.start_date >= ?');
      params.push(startDate);
    } else {
      // 默认最近12周
      conditions.push("t.start_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)");
    }
    if (endDate) {
      conditions.push('t.end_date <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(t.start_date, '%x-W%v') as period,
        ROUND(AVG(t.full_time_ratio), 2) as avg_full_time_ratio,
        COUNT(*) as task_count
       FROM wbs_tasks t
       ${whereClause}
       GROUP BY DATE_FORMAT(t.start_date, '%x-W%v')
       ORDER BY period ASC
       LIMIT 12`,
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
        SUM(CASE WHEN t.updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            OR EXISTS (
              SELECT 1 FROM progress_records pr
              WHERE pr.task_id = t.id AND pr.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            )
            THEN 1 ELSE 0 END) as active_tasks
       FROM wbs_tasks t
       WHERE (${taskScope.clause})
        AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = t.assignee_id AND (${userScope.clause})
        )`,
      [...taskScope.params, ...userScope.params]
    );

    const total = rows[0]?.total_tasks || 0;
    const active = rows[0]?.active_tasks || 0;
    return total > 0 ? Math.round((active / total) * 100) : 0;
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
      `SELECT t.id, t.description, t.wbs_code, t.task_type,
              p.name as project_name, t.status, t.full_time_ratio,
              t.progress, t.duration as planned_duration,
              t.end_date as planned_end_date,
              CASE
                WHEN t.actual_start_date IS NOT NULL AND t.actual_end_date IS NOT NULL
                THEN DATEDIFF(t.actual_end_date, t.actual_start_date)
                ELSE NULL
              END as actual_duration,
              t.updated_at as last_updated
       FROM wbs_tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE (${taskScope.clause})${timeClause}${memberFilter}
       ORDER BY t.status, t.end_date
       LIMIT 100`,
      [...taskScope.params, ...timeParams, ...memberParams]
    );

    return rows.map((t: any) => ({
      id: t.id,
      description: t.description,
      project_name: t.project_name || '未分配',
      status: t.status,
      full_time_ratio: t.full_time_ratio,
      progress: t.progress,
      planned_duration: t.planned_duration,
      actual_duration: t.actual_duration,
      estimation_accuracy: this.calculateTaskEstimationAccuracy(t.planned_duration, t.actual_duration) ?? undefined,
    }));
  }

  /**
   * 生成任务分配建议
   */
  private generateAllocationSuggestions(members: MemberSummaryItem[]): AllocationSuggestionItem[] {
    const suggestions: AllocationSuggestionItem[] = [];

    for (const m of members) {
      if (m.total_full_time_ratio > 1.5) {
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
    return suggestions.slice(0, 5);
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
    const pageSize = options.pageSize || 50;
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
         WHERE p.status = 'in_progress'
         AND p.updated_at BETWEEN ? AND ?
         AND ${scope.clause}`,
        [startDate, endDate, ...scope.params]
      );
      return rows[0].cnt || 0;
    }

    // 任务类指标
    const scope = await buildTaskScopeFilter(user, 't', true);
    let statusCondition = '';
    switch (metric) {
      case 'total_tasks':
        statusCondition = "1=1";
        break;
      case 'completed_tasks':
        statusCondition = "t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')";
        break;
      case 'delay_warning':
        statusCondition = "t.status = 'delay_warning'";
        break;
      case 'overdue':
        statusCondition = "t.status = 'delayed'";
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
    const scope = await buildTaskScopeFilter(user, 't', true);

    // 按粒度确定分组表达式
    const groupExpr = granularity === 'day'
      ? 'DATE(t.created_at)'
      : granularity === 'week'
        ? "DATE_SUB(DATE(t.created_at), INTERVAL WEEKDAY(t.created_at) DAY)"
        : "DATE_FORMAT(t.created_at, '%Y-%m-01')";

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // 日期范围
    const dateColumn = metric === 'tasks_created' ? 't.created_at'
      : metric === 'tasks_completed' ? 't.updated_at'
      : 't.updated_at';
    conditions.push(`DATE(${dateColumn}) BETWEEN ? AND ?`);
    params.push(startDate, endDate);

    // 状态过滤
    switch (metric) {
      case 'tasks_completed':
        conditions.push("t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')");
        break;
      case 'tasks_delayed':
        conditions.push("t.status IN ('delay_warning', 'delayed')");
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
   */
  async getDashboardAdminDetail(user: User): Promise<AdminDashboardDetailResponse> {
    const pool = getPool();

    // 构建一次 scope filter，复用给所有子查询
    const taskScope = await buildTaskScopeFilter(user, 't', true);
    const projectScope = await buildProjectScopeFilter(user, 'p');

    const [departmentEfficiency, taskTypeDistribution, allocationSuggestions, departmentDelayTrends, utilizationTrends, highRiskProjects] =
      await Promise.all([
        this.getAdminDepartmentEfficiency(pool, taskScope),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user),
        this.getDepartmentDelayTrends(pool, taskScope),
        this.getUtilizationTrends(pool, taskScope),
        this.getHighRiskProjects(pool, projectScope),
      ]);

    return {
      department_efficiency: departmentEfficiency,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      department_delay_trends: departmentDelayTrends,
      utilization_trends: utilizationTrends,
      high_risk_projects: highRiskProjects,
    };
  }

  /**
   * DeptManager 仪表板详情
   */
  async getDashboardDeptManagerDetail(user: User): Promise<DeptManagerDashboardDetailResponse> {
    const pool = getPool();

    const taskScope = await buildTaskScopeFilter(user, 't', true);

    const [groupEfficiency, memberStatus, taskTypeDistribution, allocationSuggestions, groupActivityTrends] =
      await Promise.all([
        this.getGroupEfficiencyByParentDept(pool, user),
        this.getMemberStatusForScope(pool, user, taskScope),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user),
        this.getGroupActivityTrends(pool, user),
      ]);

    return {
      group_efficiency: groupEfficiency,
      member_status: memberStatus,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      group_activity_trends: groupActivityTrends,
    };
  }

  /**
   * TechManager 仪表板详情
   */
  async getDashboardTechManagerDetail(user: User, groupId?: number): Promise<TechManagerDashboardDetailResponse> {
    const pool = getPool();

    const taskScope = await buildTaskScopeFilter(user, 't', true);

    const [memberStatus, taskTypeDistribution, allocationSuggestions, availableGroups, memberActivityTrends] =
      await Promise.all([
        this.getMemberStatusForScope(pool, user, taskScope),
        this.getTaskTypeDistribution(pool, taskScope),
        this.getAllocationSuggestionsForScope(pool, user),
        this.getAvailableGroups(pool, user),
        this.getMemberActivityTrendsForScope(pool, user, taskScope),
      ]);

    return {
      member_status: memberStatus,
      task_type_distribution: taskTypeDistribution,
      allocation_suggestions: allocationSuggestions,
      available_groups: availableGroups,
      member_activity_trends: memberActivityTrends,
    };
  }

  /**
   * Engineer 仪表板详情
   */
  async getDashboardEngineerDetail(user: User): Promise<EngineerDashboardDetailResponse> {
    const pool = getPool();

    const [todoTasks, needUpdateTasks, taskStatusDistribution] = await Promise.all([
      this.getUserTodoTasks(pool, user.id),
      this.getStaleTasks(pool, user.id),
      this.getUserTaskStatusDistribution(pool, user.id),
    ]);

    return {
      todo_tasks: todoTasks,
      need_update_tasks: needUpdateTasks,
      task_status_distribution: taskStatusDistribution,
    };
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
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_tasks,
        AVG(t.full_time_ratio) as avg_utilization,
        AVG(t.progress) as avg_activity
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
   */
  private async getTaskTypeDistribution(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<TaskTypeDistributionItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.task_type,
        COUNT(*) as count,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count,
        ROUND(AVG(t.duration), 1) as avg_duration
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE (${taskScope.clause})
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
   */
  private async getAllocationSuggestionsForScope(pool: ReturnType<typeof getPool>, user: User): Promise<AllocationSuggestionItem[]> {
    const taskScope = await buildTaskScopeFilter(user, 't', true);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as member_id,
        u.real_name as member_name,
        COALESCE(SUM(t.full_time_ratio), 0) as total_load,
        SUM(CASE WHEN t.status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
            THEN 1 ELSE 0 END) as current_tasks
       FROM users u
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE u.is_active = 1
       GROUP BY u.id, u.real_name
       ORDER BY total_load DESC`,
      taskScope.params
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
    return suggestions.slice(0, 5);
  }

  /**
   * Admin: 部门延期率趋势（30天，按日期+部门聚合）
   */
  private async getDepartmentDelayTrends(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<DepartmentDelayTrendPoint[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE(t.updated_at) as date,
        d.name as dept_name,
        COUNT(*) as total,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN users u ON t.assignee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE (${taskScope.clause})
         AND t.updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(t.updated_at), d.name
       ORDER BY date`,
      taskScope.params
    );

    // 按日期聚合为宽表格式 { date, 部门A: rate, 部门B: rate }
    const dateMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      const date = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      if (!dateMap.has(date)) dateMap.set(date, { date });
      const entry = dateMap.get(date)!;
      const rate = r.total > 0 ? Math.round((r.delayed_count / r.total) * 100) : 0;
      entry[r.dept_name || '未知部门'] = rate;
    }

    return Array.from(dateMap.values()) as DepartmentDelayTrendPoint[];
  }

  /**
   * Admin: 资源利用率趋势（30天）
   */
  private async getUtilizationTrends(pool: ReturnType<typeof getPool>, taskScope: ScopeFilter): Promise<UtilizationTrendPoint[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE(t.start_date) as date,
        ROUND(AVG(t.full_time_ratio) * 100, 1) as utilization
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE (${taskScope.clause})
         AND t.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(t.start_date)
       ORDER BY date`,
      taskScope.params
    );

    return rows.map((r: RowDataPacket) => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      utilization: r.utilization || 0,
      target: 80,
    }));
  }

  /**
   * Admin: 高风险项目
   */
  private async getHighRiskProjects(pool: ReturnType<typeof getPool>, projectScope: ScopeFilter): Promise<HighRiskProjectItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        p.id, p.name, p.progress,
        COUNT(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 END) as delayed_tasks,
        u.real_name as manager
       FROM projects p
       LEFT JOIN wbs_tasks t ON p.id = t.project_id
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE (${projectScope.clause})
         AND p.status NOT IN ('completed', 'cancelled')
       GROUP BY p.id, p.name, p.progress, u.real_name
       HAVING (p.progress < 50 AND delayed_tasks > 0) OR delayed_tasks > 3
       ORDER BY p.progress ASC
       LIMIT 5`,
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
   * DeptManager: 组效能（用子部门模拟"组"）
   */
  private async getGroupEfficiencyByParentDept(pool: ReturnType<typeof getPool>, user: User): Promise<GroupEfficiencyItem[]> {
    // 获取用户管理的部门ID
    const [deptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT department_id FROM users WHERE id = ?`,
      [user.id]
    );
    const deptId = deptRows[0]?.department_id;
    if (!deptId) return [];

    // 查找子部门作为"组"
    const [childDepts] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name FROM departments WHERE parent_id = ?`,
      [deptId]
    );
    if (childDepts.length === 0) return [];

    const childIds = childDepts.map((d: RowDataPacket) => d.id);
    const placeholders = childIds.map(() => '?').join(',');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        d.id, d.name,
        COUNT(DISTINCT u.id) as member_count,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_tasks,
        AVG(t.full_time_ratio) as avg_load,
        AVG(t.progress) as avg_activity
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id
       WHERE d.id IN (${placeholders})
       GROUP BY d.id, d.name
       ORDER BY completed_tasks DESC`,
      childIds
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
   */
  private async getMemberStatusForScope(pool: ReturnType<typeof getPool>, user: User, taskScope: ScopeFilter): Promise<MemberStatusItem[]> {
    // 获取用户可见范围内的成员
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id, u.real_name as name, u.avatar,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) as delayed_count,
        ROUND(COALESCE(SUM(t.full_time_ratio), 0), 2) as load_rate,
        ROUND(AVG(t.progress), 1) as activity
       FROM users u
       LEFT JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE u.is_active = 1
       GROUP BY u.id, u.real_name, u.avatar
       ORDER BY load_rate DESC`,
      taskScope.params
    );

    return rows.map((r: RowDataPacket) => {
      const load = r.load_rate || 0;
      let status: 'healthy' | 'warning' | 'risk' | 'idle' = 'healthy';
      if (r.total_tasks === 0) status = 'idle';
      else if (load > 1.5 || r.delayed_count > 3) status = 'risk';
      else if (load > 1.2 || r.delayed_count > 1) status = 'warning';

      return {
        id: r.id,
        name: r.name,
        avatar: r.avatar || null,
        in_progress: r.in_progress || 0,
        completed: r.completed || 0,
        delayed: r.delayed_count || 0,
        load_rate: Math.round(load * 100),
        activity: Math.round(r.activity || 0),
        trend: 0,
        status,
      };
    });
  }

  /**
   * DeptManager: 组活跃度趋势（12周，按子部门聚合）
   */
  private async getGroupActivityTrends(pool: ReturnType<typeof getPool>, user: User): Promise<GroupActivityTrendPoint[]> {
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

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(t.start_date, '%x-W%v') as period,
        d.name as group_name,
        ROUND(AVG(t.progress), 1) as avg_activity
       FROM wbs_tasks t
       JOIN users u ON t.assignee_id = u.id
       JOIN departments d ON u.department_id = d.id
       WHERE d.id IN (${placeholders})
         AND t.start_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
       GROUP BY period, d.name
       ORDER BY period`,
      childIds
    );

    // 按周期聚合为宽表
    const periodMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      if (!periodMap.has(r.period)) periodMap.set(r.period, { date: r.period });
      periodMap.get(r.period)![r.group_name] = r.avg_activity || 0;
    }
    return Array.from(periodMap.values()) as GroupActivityTrendPoint[];
  }

  /**
   * TechManager: 可用组列表（从 departments 获取子部门）
   */
  private async getAvailableGroups(pool: ReturnType<typeof getPool>, user: User): Promise<Array<{ id: number; name: string }>> {
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

    return childDepts.map((d: RowDataPacket) => ({ id: d.id, name: d.name }));
  }

  /**
   * TechManager: 成员活跃度趋势（12周）
   */
  private async getMemberActivityTrendsForScope(pool: ReturnType<typeof getPool>, user: User, taskScope: ScopeFilter): Promise<MemberActivityTrendPoint[]> {
    // 获取范围内活跃成员（取 top 6）
    const [memberRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.real_name as name
       FROM users u
       JOIN wbs_tasks t ON u.id = t.assignee_id AND (${taskScope.clause})
       WHERE u.is_active = 1
       GROUP BY u.id, u.real_name
       ORDER BY COUNT(t.id) DESC
       LIMIT 6`,
      taskScope.params
    );
    if (memberRows.length === 0) return [];

    const memberIds = memberRows.map((m: RowDataPacket) => m.id);
    const placeholders = memberIds.map(() => '?').join(',');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(t.start_date, '%x-W%v') as period,
        u.real_name as member_name,
        ROUND(AVG(t.progress), 1) as avg_activity
       FROM wbs_tasks t
       JOIN users u ON t.assignee_id = u.id
       WHERE u.id IN (${placeholders})
         AND t.start_date >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
       GROUP BY period, u.real_name
       ORDER BY period`,
      memberIds
    );

    const periodMap = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      if (!periodMap.has(r.period)) periodMap.set(r.period, { date: r.period });
      periodMap.get(r.period)![r.member_name] = r.avg_activity || 0;
    }
    return Array.from(periodMap.values()) as MemberActivityTrendPoint[];
  }

  /**
   * Engineer: 用户待办任务
   */
  private async getUserTodoTasks(pool: ReturnType<typeof getPool>, userId: number): Promise<TodoTaskItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.id, t.description as name, p.name as project_name,
        t.end_date as due_date, t.progress, t.priority,
        DATEDIFF(CURDATE(), t.end_date) as days_overdue,
        t.updated_at as last_updated
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
         AND t.status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.end_date ASC
       LIMIT 20`,
      [userId]
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
   */
  private async getStaleTasks(pool: ReturnType<typeof getPool>, userId: number): Promise<TodoTaskItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        t.id, t.description as name, p.name as project_name,
        t.end_date as due_date, t.progress, t.priority,
        DATEDIFF(CURDATE(), t.updated_at) as days_since_update,
        t.updated_at as last_updated
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
         AND t.status IN ('in_progress', 'delay_warning')
         AND t.updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY t.updated_at ASC
       LIMIT 10`,
      [userId]
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
   */
  private async getUserTaskStatusDistribution(pool: ReturnType<typeof getPool>, userId: number): Promise<StatusDistributionItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT status, COUNT(*) as count
       FROM wbs_tasks
       WHERE assignee_id = ?
       GROUP BY status
       ORDER BY count DESC`,
      [userId]
    );

    return rows.map((r: RowDataPacket) => ({
      status: r.status,
      count: r.count,
    }));
  }
}
