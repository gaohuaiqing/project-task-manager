// app/server/src/modules/org/repository.ts
import { getPool } from '../../core/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  Department, DepartmentTreeNode, Member,
  CapabilityModel, MemberCapability, AssigneeRecommendation, TaskTypeMapping
} from './types';

// ============ 部门相关 ============

interface DepartmentRow extends RowDataPacket, Department {}
interface MemberRow extends RowDataPacket, Member {}
interface CapabilityModelRow extends RowDataPacket, CapabilityModel {}
interface MemberCapabilityRow extends RowDataPacket, MemberCapability {}
interface TaskTypeMappingRow extends RowDataPacket, TaskTypeMapping {}

export class OrgRepository {
  // ========== 部门 CRUD ==========

  async getAllDepartments(): Promise<Department[]> {
    const pool = getPool();
    const [rows] = await pool.execute<DepartmentRow[]>(
      'SELECT * FROM departments ORDER BY id'
    );
    return rows;
  }

  async getDepartmentById(id: number): Promise<Department | null> {
    const pool = getPool();
    const [rows] = await pool.execute<DepartmentRow[]>(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createDepartment(data: { name: string; parent_id?: number; manager_id?: number }): Promise<number> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO departments (name, parent_id, manager_id) VALUES (?, ?, ?)',
      [data.name, data.parent_id || null, data.manager_id || null]
    );
    return result.insertId;
  }

  async updateDepartment(id: number, data: Partial<Department>): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }
    if (data.manager_id !== undefined) { fields.push('manager_id = ?'); values.push(data.manager_id); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE departments SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async hasDepartmentMembers(departmentId: number): Promise<boolean> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE department_id = ?',
      [departmentId]
    );
    return rows[0].count > 0;
  }

  async getChildDepartmentCount(departmentId: number): Promise<number> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM departments WHERE parent_id = ?',
      [departmentId]
    );
    return rows[0].count;
  }

  // ========== 成员 CRUD ==========

  async getMembers(options: {
    department_id?: number;
    role?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Member[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (options.department_id !== undefined) {
      conditions.push('u.department_id = ?');
      params.push(options.department_id);
    }
    if (options.role) {
      conditions.push('u.role = ?');
      params.push(options.role);
    }
    if (options.is_active !== undefined) {
      conditions.push('u.is_active = ?');
      params.push(options.is_active);
    }
    if (options.search) {
      conditions.push('(u.username LIKE ? OR u.real_name LIKE ?)');
      const searchPattern = `%${options.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute<MemberRow[]>(
      `SELECT u.id, u.username, u.real_name, u.role, u.department_id, u.email, u.phone, u.is_active, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ${whereClause}
       ORDER BY u.id
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return { items: rows, total };
  }

  async getMemberById(id: number): Promise<Member | null> {
    const pool = getPool();
    const [rows] = await pool.execute<MemberRow[]>(
      `SELECT u.id, u.username, u.real_name, u.role, u.department_id, u.email, u.phone, u.is_active, u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async getDepartmentMembers(departmentId: number): Promise<Member[]> {
    const pool = getPool();
    const [rows] = await pool.execute<MemberRow[]>(
      `SELECT u.id, u.username, u.real_name, u.role, u.department_id, u.email, u.phone, u.is_active, u.created_at, u.updated_at
       FROM users u
       WHERE u.department_id = ? AND u.is_active = 1
       ORDER BY u.id`,
      [departmentId]
    );
    return rows;
  }

  // ========== 能力模型 CRUD ==========

  async getCapabilityModels(): Promise<CapabilityModel[]> {
    const pool = getPool();
    const [rows] = await pool.execute<CapabilityModelRow[]>(
      'SELECT * FROM capability_models ORDER BY name'
    );
    return rows;
  }

  async getCapabilityModelById(id: string): Promise<CapabilityModel | null> {
    const pool = getPool();
    const [rows] = await pool.execute<CapabilityModelRow[]>(
      'SELECT * FROM capability_models WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createCapabilityModel(data: {
    id: string;
    name: string;
    description?: string;
    dimensions: { name: string; weight: number }[];
  }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO capability_models (id, name, description, dimensions) VALUES (?, ?, ?, ?)',
      [data.id, data.name, data.description || null, JSON.stringify(data.dimensions)]
    );
    return data.id;
  }

  async updateCapabilityModel(id: string, data: Partial<CapabilityModel>): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.dimensions !== undefined) { fields.push('dimensions = ?'); values.push(JSON.stringify(data.dimensions)); }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE capability_models SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteCapabilityModel(id: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM capability_models WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // ========== 成员能力评定 ==========

  async getMemberCapabilities(userId: number): Promise<MemberCapability[]> {
    const pool = getPool();
    const [rows] = await pool.execute<MemberCapabilityRow[]>(
      `SELECT mc.*, cm.name as model_name
       FROM member_capabilities mc
       JOIN capability_models cm ON mc.model_id = cm.id
       WHERE mc.user_id = ?
       ORDER BY mc.evaluated_at DESC`,
      [userId]
    );
    return rows;
  }

  async getMemberCapabilityById(userId: number, capabilityId: string): Promise<MemberCapability | null> {
    const pool = getPool();
    const [rows] = await pool.execute<MemberCapabilityRow[]>(
      `SELECT mc.*, cm.name as model_name
       FROM member_capabilities mc
       JOIN capability_models cm ON mc.model_id = cm.id
       WHERE mc.id = ? AND mc.user_id = ?`,
      [capabilityId, userId]
    );
    return rows[0] || null;
  }

  async createMemberCapability(data: {
    id: string;
    user_id: number;
    model_id: string;
    model_name: string;
    association_label?: string;
    dimension_scores: { dimension_name: string; score: number }[];
    overall_score: number;
    evaluated_by: number;
    notes?: string;
  }): Promise<string> {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO member_capabilities (id, user_id, model_id, model_name, association_label, dimension_scores, overall_score, evaluated_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id, data.user_id, data.model_id, data.model_name,
        data.association_label || null, JSON.stringify(data.dimension_scores),
        data.overall_score, data.evaluated_by, data.notes || null
      ]
    );
    return data.id;
  }

  async updateMemberCapability(userId: number, capabilityId: string, data: {
    association_label?: string;
    dimension_scores?: { dimension_name: string; score: number }[];
    overall_score?: number;
    notes?: string;
  }): Promise<boolean> {
    const pool = getPool();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.association_label !== undefined) { fields.push('association_label = ?'); values.push(data.association_label); }
    if (data.dimension_scores !== undefined) { fields.push('dimension_scores = ?'); values.push(JSON.stringify(data.dimension_scores)); }
    if (data.overall_score !== undefined) { fields.push('overall_score = ?'); values.push(data.overall_score); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

    if (fields.length === 0) return false;

    fields.push('evaluated_at = NOW()');
    values.push(capabilityId, userId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE member_capabilities SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async deleteMemberCapability(userId: number, capabilityId: string): Promise<boolean> {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM member_capabilities WHERE id = ? AND user_id = ?',
      [capabilityId, userId]
    );
    return result.affectedRows > 0;
  }

  // ========== 智能推荐 ==========

  async getTaskTypeMappings(): Promise<TaskTypeMapping[]> {
    const pool = getPool();
    const [rows] = await pool.execute<TaskTypeMappingRow[]>(
      `SELECT ttm.*, cm.name as model_name
       FROM task_type_model_mapping ttm
       JOIN capability_models cm ON ttm.model_id = cm.id
       ORDER BY ttm.task_type, ttm.priority`
    );
    return rows;
  }

  async getModelsForTaskType(taskType: string): Promise<{ model_id: string; priority: number }[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT model_id, priority FROM task_type_model_mapping WHERE task_type = ? ORDER BY priority',
      [taskType]
    );
    return rows as { model_id: string; priority: number }[];
  }

  async getRecommendations(modelIds: string[]): Promise<AssigneeRecommendation[]> {
    if (modelIds.length === 0) return [];

    const pool = getPool();
    const placeholders = modelIds.map(() => '?').join(',');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        u.id as user_id,
        u.real_name,
        d.name as department_name,
        mc.model_name,
        mc.overall_score,
        (SELECT COUNT(*) FROM wbs_tasks WHERE assignee_id = u.id AND status NOT IN ('early_completed', 'on_time_completed', 'overdue_completed')) as current_tasks
       FROM member_capabilities mc
       JOIN users u ON mc.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE mc.model_id IN (${placeholders}) AND u.is_active = 1
       ORDER BY mc.overall_score DESC
       LIMIT 10`,
      modelIds
    );

    return rows.map(row => ({
      user_id: row.user_id as number,
      real_name: row.real_name as string,
      department_name: row.department_name as string,
      model_name: row.model_name as string,
      overall_score: row.overall_score as number,
      match_level: (row.overall_score >= 80 ? 'excellent' : row.overall_score >= 60 ? 'good' : 'fair') as 'excellent' | 'good' | 'fair',
      current_tasks: row.current_tasks as number
    }));
  }
}
