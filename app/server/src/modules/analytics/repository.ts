// app/server/src/modules/analytics/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig,
  MilestoneProgress, AssigneeTaskCount, DelayReasonCount, MemberTask
} from './types';

export class AnalyticsRepository {
  // ========== 仪表板统计 ==========

  async getDashboardStats(userId: number, isAdmin: boolean): Promise<DashboardStats> {
    const pool = getPool();

    const projectFilter = isAdmin ? '' : 'AND FIND_IN_SET(?, p.member_ids) > 0';
    const params = isAdmin ? [] : [userId.toString()];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM projects p WHERE 1=1 ${projectFilter}) as total_projects,
        (SELECT COUNT(*) FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.status = 'in_progress' ${isAdmin ? '' : `AND FIND_IN_SET(?, p.member_ids) > 0`}) as active_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') ${isAdmin ? '' : `AND FIND_IN_SET(?, p.member_ids) > 0`}) as completed_tasks,
        (SELECT COUNT(*) FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.status = 'delay_warning' ${isAdmin ? '' : `AND FIND_IN_SET(?, p.member_ids) > 0`}) as delay_warning_count`,
      isAdmin ? params : [userId.toString(), userId.toString(), userId.toString(), userId.toString()]
    );

    return rows[0] as DashboardStats;
  }

  async getUrgentTasks(userId: number, isAdmin: boolean): Promise<unknown[]> {
    const pool = getPool();
    const projectFilter = isAdmin ? '' : 'AND FIND_IN_SET(?, p.member_ids) > 0';
    const params = isAdmin ? [] : [userId.toString()];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, t.end_date, t.priority,
              p.name as project_name, u.real_name as assignee_name
       FROM wbs_tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.priority = 'urgent' AND t.status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')
       ${projectFilter}
       ORDER BY t.end_date ASC
       LIMIT 10`,
      params
    );
    return rows;
  }

  async getTaskTrend(startDate: string, endDate: string, projectId?: string): Promise<unknown[]> {
    const pool = getPool();
    const conditions = ['t.created_at BETWEEN ? AND ?'];
    const params: (string | number)[] = [startDate, endDate];

    if (projectId) {
      conditions.push('t.project_id = ?');
      params.push(projectId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(t.created_at) as date, COUNT(*) as count
       FROM wbs_tasks t
       WHERE ${conditions.join(' AND ')}
       GROUP BY DATE(t.created_at)
       ORDER BY date`,
      params
    );
    return rows;
  }

  // ========== 项目进度报表 ==========

  async getProjectProgressReport(projectId: string): Promise<ProjectProgressReport | null> {
    const pool = getPool();

    // 获取项目基本信息
    const [projectRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name FROM projects WHERE id = ?',
      [projectId]
    );
    if (projectRows.length === 0) return null;
    const project = projectRows[0];

    // 获取任务统计
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 1 ELSE 0 END) as completed_tasks
       FROM wbs_tasks WHERE project_id = ?`,
      [projectId]
    );
    const stats = statsRows[0];

    // 获取里程碑
    const [milestones] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, target_date, status, completion_percentage
       FROM milestones WHERE project_id = ? ORDER BY target_date`,
      [projectId]
    );

    return {
      project_id: project.id,
      project_name: project.name,
      progress: stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0,
      total_tasks: stats.total_tasks,
      completed_tasks: stats.completed_tasks,
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

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as total_tasks,
        AVG(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 100 ELSE 0 END) as avg_completion_rate,
        SUM(CASE WHEN status IN ('delay_warning', 'delayed') THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as delay_rate,
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

    return {
      total_tasks: stats.total_tasks,
      avg_completion_rate: Math.round(stats.avg_completion_rate || 0),
      delay_rate: Math.round(stats.delay_rate || 0),
      urgent_count: stats.urgent_count,
      priority_distribution,
      assignee_distribution: assigneeRows as AssigneeTaskCount[]
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

    return {
      total_delayed: stats.total_delayed,
      warning_count: stats.warning_count,
      delayed_count: stats.delayed_count,
      overdue_completed_count: stats.overdue_completed_count,
      delay_reasons: reasonRows as DelayReasonCount[],
      delay_trend: [] // 简化实现
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

    // 获取任务统计
    const [statsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) as current_tasks,
        SUM(full_time_ratio) as total_full_time_ratio,
        AVG(CASE WHEN status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 100 ELSE 0 END) as avg_completion_rate
       FROM wbs_tasks WHERE assignee_id = ? AND status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')`,
      [memberId]
    );
    const stats = statsRows[0];

    // 获取任务列表
    const [taskRows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.description, p.name as project_name, t.status, t.full_time_ratio,
              CASE WHEN t.status IN ('early_completed', 'on_time_completed', 'overdue_completed') THEN 100 ELSE 0 END as progress
       FROM wbs_tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assignee_id = ?
       ORDER BY t.status, t.end_date
       LIMIT 20`,
      [memberId]
    );

    return {
      member_id: member.id,
      member_name: member.real_name,
      current_tasks: stats.current_tasks,
      total_full_time_ratio: stats.total_full_time_ratio || 0,
      avg_completion_rate: Math.round(stats.avg_completion_rate || 0),
      task_list: taskRows as MemberTask[]
    };
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
        'SELECT date, name, type FROM holidays WHERE YEAR(date) = ? ORDER BY date',
        [year]
      );
      return rows as HolidayConfig[];
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT date, name, type FROM holidays ORDER BY date'
    );
    return rows as HolidayConfig[];
  }

  async createHoliday(holiday: HolidayConfig): Promise<void> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO holidays (date, name, type) VALUES (?, ?, ?)',
      [holiday.date, holiday.name, holiday.type]
    );
  }

  async deleteHoliday(date: string): Promise<void> {
    const pool = getPool();
    await pool.execute('DELETE FROM holidays WHERE date = ?', [date]);
  }

  // ========== 审计日志 ==========

  async getAuditLogs(options: import('./types').AuditLogQueryOptions): Promise<{ items: unknown[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options.user_id) {
      conditions.push('al.user_id = ?');
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
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }
}
