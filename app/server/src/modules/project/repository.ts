// app/server/src/modules/project/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  Project, ProjectListItem, Milestone, Timeline, TimelineTask,
  ProjectMember, Holiday, ProjectStats,
  CreateProjectRequest, UpdateProjectRequest,
  CreateMilestoneRequest, UpdateMilestoneRequest,
  CreateTimelineRequest, UpdateTimelineRequest,
  CreateTimelineTaskRequest, UpdateTimelineTaskRequest,
  AddProjectMemberRequest, CreateHolidayRequest
} from './types';

// ============ 类型定义 ============

interface ProjectRow extends RowDataPacket, Project {}
interface MilestoneRow extends RowDataPacket, Milestone {}
interface TimelineRow extends RowDataPacket, Timeline {}
interface TimelineTaskRow extends RowDataPacket, TimelineTask {}
interface ProjectMemberRow extends RowDataPacket, ProjectMember {}
interface HolidayRow extends RowDataPacket, Holiday {}
interface ProjectStatsRow extends RowDataPacket, ProjectStats {}

export class ProjectRepository {
  // ========== 项目 CRUD ==========

  async getProjects(options?: {
    status?: string;
    project_type?: string;
    member_id?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ProjectListItem[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.status) {
      conditions.push('p.status = ?');
      params.push(options.status);
    }
    if (options?.project_type) {
      conditions.push('p.project_type = ?');
      params.push(options.project_type);
    }
    if (options?.member_id) {
      conditions.push('JSON_CONTAINS(p.member_ids, ?)');
      params.push(JSON.stringify(options.member_id));
    }
    if (options?.search) {
      conditions.push('(p.code LIKE ? OR p.name LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM projects p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<ProjectRow[]>(
      `SELECT p.*,
        COALESCE(JSON_LENGTH(p.member_ids), 0) as member_count_calc,
        (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id) as milestone_count_calc,
        (SELECT COUNT(*) FROM wbs_tasks t WHERE t.project_id = p.id) as task_count_calc
       FROM projects p
       ${whereClause}
       ORDER BY p.updated_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    // 获取所有项目ID
    const projectIds = rows.map(r => r.id);

    // 批量获取项目成员摘要
    const memberSummaries = projectIds.length > 0
      ? await this.getProjectMemberSummaries(projectIds)
      : new Map<string, Array<{ id: number; name: string; avatar?: string }>>();

    const items: ProjectListItem[] = rows.map(r => ({
      ...r,
      member_count: (r as any).member_count_calc || 0,
      milestone_count: (r as any).milestone_count_calc || 0,
      task_count: (r as any).task_count_calc || 0,
      members: memberSummaries.get(r.id) || [],
    }));

    return { items, total };
  }

  /**
   * 批量获取多个项目的成员摘要
   */
  private async getProjectMemberSummaries(projectIds: string[]): Promise<Map<string, Array<{ id: number; name: string; avatar?: string }>>> {
    const pool = getPool();
    const result = new Map<string, Array<{ id: number; name: string; avatar?: string }>>();

    if (projectIds.length === 0) return result;

    const placeholders = projectIds.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT pm.project_id, u.id, u.real_name as name
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id IN (${placeholders})
       ORDER BY pm.project_id, pm.role DESC, u.real_name`,
      projectIds
    );

    for (const row of rows) {
      const projectId = row.project_id;
      if (!result.has(projectId)) {
        result.set(projectId, []);
      }
      result.get(projectId)!.push({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
      });
    }

    return result;
  }

  async getProjectById(id: string): Promise<Project | null> {
    const pool = getPool();
    const [rows] = await pool.execute<ProjectRow[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async getProjectByCode(code: string): Promise<Project | null> {
    const pool = getPool();
    const [rows] = await pool.execute<ProjectRow[]>(
      'SELECT * FROM projects WHERE code = ?',
      [code]
    );
    return rows[0] || null;
  }

  async createProject(data: CreateProjectRequest): Promise<number> {
    const pool = getPool();
    const memberIdsStr = data.member_ids ? JSON.stringify(data.member_ids) : null;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO projects (code, name, description, status, project_type, planned_start_date, planned_end_date, member_ids, progress, task_count, completed_task_count, version)
       VALUES (?, ?, ?, 'planning', ?, ?, ?, ?, 0, 0, 0, 1)`,
      [data.code, data.name, data.description || null, data.project_type, data.planned_start_date || null, data.planned_end_date || null, memberIdsStr]
    );

    return result.insertId;
  }

  async updateProject(id: string, data: UpdateProjectRequest & { version: number }): Promise<{ updated: boolean; conflict: boolean }> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    // Helper function to convert ISO date to MySQL DATE format
    const toMySQLDate = (date: string | Date | null): string | null => {
      if (!date) return null;
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.project_type !== undefined) { fields.push('project_type = ?'); values.push(data.project_type); }
    if (data.planned_start_date !== undefined) { fields.push('planned_start_date = ?'); values.push(toMySQLDate(data.planned_start_date)); }
    if (data.planned_end_date !== undefined) { fields.push('planned_end_date = ?'); values.push(toMySQLDate(data.planned_end_date)); }
    if (data.actual_start_date !== undefined) { fields.push('actual_start_date = ?'); values.push(toMySQLDate(data.actual_start_date)); }
    if (data.member_ids !== undefined) {
      fields.push('member_ids = ?');
      values.push(data.member_ids.length > 0 ? JSON.stringify(data.member_ids) : null);
    }
    if (data.actual_end_date !== undefined) { fields.push('actual_end_date = ?'); values.push(toMySQLDate(data.actual_end_date)); }

    if (fields.length === 0) {
      return { updated: false, conflict: false };
    }

    fields.push('version = version + 1');
    values.push(id, data.version);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND version = ?`,
      values
    );

    return {
      updated: result.affectedRows > 0,
      conflict: result.affectedRows === 0
    };
  }

  async deleteProject(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM projects WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async hasProjectTasks(projectId: string): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM wbs_tasks WHERE project_id = ?',
      [projectId]
    );
    return rows[0].count > 0;
  }

  async updateProjectStats(projectId: string): Promise<void> {
    const pool = getPool();
    await pool.execute(
      `UPDATE projects p SET
        task_count = (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = p.id),
        completed_task_count = (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = p.id AND status IN ('early_completed', 'on_time_completed', 'overdue_completed')),
        progress = CASE
          WHEN (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = p.id) = 0 THEN 0
          ELSE ROUND((SELECT COUNT(*) FROM wbs_tasks WHERE project_id = p.id AND status IN ('early_completed', 'on_time_completed', 'overdue_completed')) * 100.0 / (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = p.id))
        END
       WHERE p.id = ?`,
      [projectId]
    );
  }

  // ========== 里程碑 CRUD ==========

  async getMilestones(projectId: string): Promise<Milestone[]> {
    const pool = getPool();
    const [rows] = await pool.execute<MilestoneRow[]>(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY target_date',
      [projectId]
    );
    return rows;
  }

  async getMilestoneById(id: string): Promise<Milestone | null> {
    const pool = getPool();
    const [rows] = await pool.execute<MilestoneRow[]>(
      'SELECT * FROM milestones WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createMilestone(data: CreateMilestoneRequest & { id: string; project_id: string }): Promise<string> {
    const pool = getPool();
    // 同时设置 target_date 和 planned_date（planned_date 是旧字段，保持兼容）
    await pool.execute(
      `INSERT INTO milestones (id, project_id, name, target_date, planned_date, description, status, completion_percentage)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [data.id, data.project_id, data.name, data.target_date, data.target_date, data.description || null, data.completion_percentage || 0]
    );
    return data.id;
  }

  async updateMilestone(id: string, data: UpdateMilestoneRequest): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.target_date !== undefined) { fields.push('target_date = ?'); values.push(data.target_date); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.completion_percentage !== undefined) {
      fields.push('completion_percentage = ?');
      values.push(data.completion_percentage);
      // 自动更新状态
      if (data.completion_percentage === 100) {
        fields.push("status = 'achieved'");
      } else if (data.completion_percentage > 0) {
        fields.push("status = 'pending'");
      }
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE milestones SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM milestones WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ========== 时间线 CRUD ==========

  async getTimelines(projectId: string): Promise<Timeline[]> {
    const pool = getPool();
    const [rows] = await pool.execute<TimelineRow[]>(
      'SELECT * FROM timelines WHERE project_id = ? ORDER BY sort_order',
      [projectId]
    );
    return rows;
  }

  async getTimelineById(id: string): Promise<Timeline | null> {
    const pool = getPool();
    const [rows] = await pool.execute<TimelineRow[]>(
      'SELECT * FROM timelines WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createTimeline(data: CreateTimelineRequest & { id: string; project_id: string }): Promise<string> {
    const pool = getPool();
    const [maxOrder] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM timelines WHERE project_id = ?',
      [data.project_id]
    );
    const sortOrder = maxOrder[0].max_order + 1;

    await pool.execute(
      `INSERT INTO timelines (id, project_id, name, start_date, end_date, type, visible, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, true, ?)`,
      [data.id, data.project_id, data.name, data.start_date, data.end_date, data.type || null, sortOrder]
    );
    return data.id;
  }

  async updateTimeline(id: string, data: UpdateTimelineRequest): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.visible !== undefined) { fields.push('visible = ?'); values.push(data.visible); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE timelines SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteTimeline(id: string): Promise<boolean> {
    const pool = getPool();
    // 先删除关联的时间线任务
    await pool.execute('DELETE FROM timeline_tasks WHERE timeline_id = ?', [id]);
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM timelines WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ========== 时间线任务 CRUD ==========

  async getTimelineTasks(timelineId: string): Promise<TimelineTask[]> {
    const pool = getPool();
    const [rows] = await pool.execute<TimelineTaskRow[]>(
      'SELECT * FROM timeline_tasks WHERE timeline_id = ? ORDER BY sort_order, start_date',
      [timelineId]
    );
    return rows;
  }

  async getTimelineTaskById(id: string): Promise<TimelineTask | null> {
    const pool = getPool();
    const [rows] = await pool.execute<TimelineTaskRow[]>(
      'SELECT * FROM timeline_tasks WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createTimelineTask(data: CreateTimelineTaskRequest & { id: string; timeline_id: string }): Promise<string> {
    const pool = getPool();
    const [maxOrder] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM timeline_tasks WHERE timeline_id = ?',
      [data.timeline_id]
    );
    const sortOrder = maxOrder[0].max_order + 1;

    await pool.execute(
      `INSERT INTO timeline_tasks (id, timeline_id, title, description, start_date, end_date, status, priority, progress, assignee_id, source_type, source_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?)`,
      [data.id, data.timeline_id, data.title, data.description || null, data.start_date, data.end_date, data.priority || 'medium', data.assignee_id || null, data.source_type || null, data.source_id || null, sortOrder]
    );
    return data.id;
  }

  async updateTimelineTask(id: string, data: UpdateTimelineTaskRequest): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
    if (data.assignee_id !== undefined) { fields.push('assignee_id = ?'); values.push(data.assignee_id); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE timeline_tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteTimelineTask(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM timeline_tasks WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ========== 项目成员管理 ==========

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const pool = getPool();
    const [rows] = await pool.execute<ProjectMemberRow[]>(
      `SELECT pm.*, u.username, u.real_name, d.name as department_name
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE pm.project_id = ?
       ORDER BY pm.role DESC, u.real_name`,
      [projectId]
    );
    return rows;
  }

  async addProjectMember(projectId: string, data: AddProjectMemberRequest): Promise<boolean> {
    const pool = getPool();
    try {
      await pool.execute(
        `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
        [projectId, data.user_id, data.role || 'member']
      );
      return true;
    } catch {
      return false; // 已存在
    }
  }

  async removeProjectMember(projectId: string, userId: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    return result.affectedRows > 0;
  }

  async isProjectMember(projectId: string, userId: number): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    );
    return rows[0].count > 0;
  }

  // ========== 节假日管理 ==========

  async getHolidays(year?: number): Promise<Holiday[]> {
    const pool = getPool();
    if (year) {
      const [rows] = await pool.execute<HolidayRow[]>(
        "SELECT id, DATE_FORMAT(holiday_date, '%Y-%m-%d') as date, name, CASE WHEN is_workday = 1 THEN 'workday' ELSE 'legal' END as type FROM holidays WHERE year = ? ORDER BY holiday_date",
        [year]
      );
      return rows;
    }
    const [rows] = await pool.execute<HolidayRow[]>(
      "SELECT id, DATE_FORMAT(holiday_date, '%Y-%m-%d') as date, name, CASE WHEN is_workday = 1 THEN 'workday' ELSE 'legal' END as type FROM holidays ORDER BY holiday_date"
    );
    return rows;
  }

  async createHoliday(data: CreateHolidayRequest): Promise<boolean> {
    const pool = getPool();
    try {
      const isWorkday = data.type === 'workday' ? 1 : 0;
      const year = new Date(data.date).getFullYear();
      await pool.execute(
        'INSERT INTO holidays (holiday_date, name, is_workday, year) VALUES (?, ?, ?, ?)',
        [data.date, data.name, isWorkday, year]
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteHoliday(date: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM holidays WHERE holiday_date = ?',
      [date]
    );
    return result.affectedRows > 0;
  }

  // ========== 统计 ==========

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const pool = getPool();
    const [rows] = await pool.execute<ProjectStatsRow[]>(
      `SELECT
        (SELECT COUNT(*) FROM timelines WHERE project_id = ?) as timeline_count,
        (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = ?) as task_count,
        (SELECT COUNT(*) FROM wbs_tasks WHERE project_id = ? AND status IN ('early_completed', 'on_time_completed', 'overdue_completed')) as completed_task_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = ?) as milestone_count,
        (SELECT COUNT(*) FROM milestones WHERE project_id = ? AND status = 'achieved') as achieved_milestone_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = ?) as member_count,
        (SELECT progress FROM projects WHERE id = ?) as progress`,
      [projectId, projectId, projectId, projectId, projectId, projectId, projectId]
    );
    return rows[0];
  }
}
