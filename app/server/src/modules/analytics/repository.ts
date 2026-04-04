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
  MemberEfficiencyItem, ProductivityTrendItem, TeamEfficiencyItem
} from './types';
import { buildTaskScopeFilter, buildProjectScopeFilter } from './query-builder';
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

    // 查询1: 每日新建任务数
    const createdConditions = ['DATE(t.created_at) BETWEEN ? AND ?'];
    const createdParams: (string | number)[] = [start, end, ...scope.params];
    if (projectId && projectId !== 'all') {
      createdConditions.push('t.project_id = ?');
      createdParams.splice(2, 0, projectId); // 插在 scope.params 之前
    }
    createdConditions.push(scope.clause);

    const [createdRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.created_at) as date, COUNT(*) as created
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${createdConditions.join(' AND ')}
       GROUP BY DATE(t.created_at)
       ORDER BY date`,
      createdParams
    );

    // 查询2: 每日完成任务数
    const completedConditions = [
      'DATE(t.updated_at) BETWEEN ? AND ?',
      "t.status IN ('early_completed', 'on_time_completed', 'overdue_completed')",
      scope.clause,
    ];
    const completedParams: (string | number)[] = [start, end, ...scope.params];
    if (projectId && projectId !== 'all') {
      completedConditions.splice(1, 0, 't.project_id = ?');
      completedParams.splice(2, 0, projectId);
    }
    const [completedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.updated_at) as date, COUNT(*) as completed
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${completedConditions.join(' AND ')}
       GROUP BY DATE(t.updated_at)`,
      completedParams
    );

    // 查询3: 每日延期任务数
    const delayedConditions = [
      'DATE(t.updated_at) BETWEEN ? AND ?',
      "t.status IN ('delay_warning', 'delayed')",
      scope.clause,
    ];
    const delayedParams: (string | number)[] = [start, end, ...scope.params];
    if (projectId && projectId !== 'all') {
      delayedConditions.splice(1, 0, 't.project_id = ?');
      delayedParams.splice(2, 0, projectId);
    }
    const [delayedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.updated_at) as date, COUNT(*) as \`delayed\`
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE ${delayedConditions.join(' AND ')}
       GROUP BY DATE(t.updated_at)`,
      delayedParams
    );

    // 合并数据
    const dateMap = new Map<string, TrendDataPoint>();

    createdRows.forEach((r) => {
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      dateMap.set(dateStr, { date: dateStr, created: r.created, completed: 0, delayed: 0 });
    });

    completedRows.forEach((r) => {
      const key = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      if (dateMap.has(key)) {
        dateMap.get(key)!.completed = r.completed;
      } else {
        dateMap.set(key, { date: key, created: 0, completed: r.completed, delayed: 0 });
      }
    });

    delayedRows.forEach((r) => {
      const key = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      if (dateMap.has(key)) {
        dateMap.get(key)!.delayed = r.delayed;
      } else {
        dateMap.set(key, { date: key, created: 0, completed: 0, delayed: r.delayed });
      }
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
}
