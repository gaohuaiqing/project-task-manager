/**
 * 项目类型管理路由
 *
 * 提供项目类型的 CRUD 操作
 */

import express from 'express';
import { databaseService } from '../services/DatabaseService.js';

const router = express.Router();

/**
 * 获取所有项目类型
 */
router.get('/', async (req, res) => {
  try {
    const db = databaseService;

    const result = await db.query(`
      SELECT
        id,
        code,
        name,
        description,
        detail,
        icon,
        color,
        requires_dates AS requiresDates,
        requires_milestones AS requiresMilestones,
        requires_members AS requiresMembers,
        code_prefix AS codePrefix,
        field_visibility AS fieldVisibility,
        hints,
        sort_order AS sortOrder,
        is_active AS isActive
      FROM project_types
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `);

    // mysql2 返回 [rows, fields]，需要提取 rows
    const types = Array.isArray(result) && result.length > 0 ? (Array.isArray(result[0]) ? result[0] : result) : [];

    // 解析 JSON 字段
    const parsedTypes = types.map((type: any) => ({
      ...type,
      fieldVisibility: typeof type.fieldVisibility === 'string'
        ? JSON.parse(type.fieldVisibility || '{}')
        : type.fieldVisibility,
      hints: typeof type.hints === 'string'
        ? JSON.parse(type.hints || '[]')
        : type.hints,
    }));

    res.json({
      success: true,
      data: parsedTypes,
    });
  } catch (error) {
    console.error('获取项目类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目类型失败',
    });
  }
});

/**
 * 获取单个项目类型
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = databaseService;

    const result = await db.query(`
      SELECT
        id,
        code,
        name,
        description,
        detail,
        icon,
        color,
        requires_dates AS requiresDates,
        requires_milestones AS requiresMilestones,
        requires_members AS requiresMembers,
        code_prefix AS codePrefix,
        field_visibility AS fieldVisibility,
        hints,
        sort_order AS sortOrder,
        is_active AS isActive
      FROM project_types
      WHERE id = ?
    `, [id]);

    // mysql2 返回 [rows, fields]，需要提取 rows
    const types = Array.isArray(result) && result.length > 0 ? (Array.isArray(result[0]) ? result[0] : result) : [];

    if (types.length === 0) {
      return res.status(404).json({
        success: false,
        message: '项目类型不存在',
      });
    }

    const type = types[0];
    res.json({
      success: true,
      data: {
        ...type,
        fieldVisibility: typeof type.fieldVisibility === 'string'
          ? JSON.parse(type.fieldVisibility || '{}')
          : type.fieldVisibility,
        hints: typeof type.hints === 'string'
          ? JSON.parse(type.hints || '[]')
          : type.hints,
      },
    });
  } catch (error) {
    console.error('获取项目类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目类型失败',
    });
  }
});

/**
 * 创建项目类型
 */
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      detail,
      icon,
      color,
      requiresDates = false,
      requiresMilestones = false,
      requiresMembers = true,
      codePrefix,
      fieldVisibility,
      hints,
      sortOrder = 0,
    } = req.body;

    const db = databaseService;

    // 检查编码是否已存在
    const existingResult = await db.query(
      'SELECT id FROM project_types WHERE code = ?',
      [code]
    );
    const existing = Array.isArray(existingResult) && existingResult.length > 0 ? (Array.isArray(existingResult[0]) ? existingResult[0] : existingResult) : [];

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '项目类型编码已存在',
      });
    }

    const insertResult = await db.query(`
      INSERT INTO project_types (
        code, name, description, detail, icon, color,
        requires_dates, requires_milestones, requires_members,
        code_prefix, field_visibility, hints, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code,
      name,
      description,
      detail,
      icon,
      color,
      requiresDates,
      requiresMilestones,
      requiresMembers,
      codePrefix,
      JSON.stringify(fieldVisibility || {}),
      JSON.stringify(hints || []),
      sortOrder,
    ]);

    const result = Array.isArray(insertResult) && insertResult.length > 0 ? insertResult[0] : insertResult;

    res.json({
      success: true,
      data: {
        id: result.insertId,
        ...req.body,
      },
    });
  } catch (error) {
    console.error('创建项目类型失败:', error);
    res.status(500).json({
      success: false,
      message: '创建项目类型失败',
    });
  }
});

/**
 * 更新项目类型
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      detail,
      icon,
      color,
      requiresDates,
      requiresMilestones,
      requiresMembers,
      codePrefix,
      fieldVisibility,
      hints,
      sortOrder,
    } = req.body;

    const db = databaseService;

    await db.query(`
      UPDATE project_types SET
        code = ?,
        name = ?,
        description = ?,
        detail = ?,
        icon = ?,
        color = ?,
        requires_dates = ?,
        requires_milestones = ?,
        requires_members = ?,
        code_prefix = ?,
        field_visibility = ?,
        hints = ?,
        sort_order = ?
      WHERE id = ?
    `, [
      code,
      name,
      description,
      detail,
      icon,
      color,
      requiresDates,
      requiresMilestones,
      requiresMembers,
      codePrefix,
      JSON.stringify(fieldVisibility || {}),
      JSON.stringify(hints || []),
      sortOrder,
      id,
    ]);

    res.json({
      success: true,
      message: '项目类型更新成功',
    });
  } catch (error) {
    console.error('更新项目类型失败:', error);
    res.status(500).json({
      success: false,
      message: '更新项目类型失败',
    });
  }
});

/**
 * 删除项目类型（软删除）
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = databaseService;

    // 检查是否有项目在使用此类型
    const projectsResult = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE project_type = (SELECT code FROM project_types WHERE id = ?)',
      [id]
    );
    const projects = Array.isArray(projectsResult) && projectsResult.length > 0 ? (Array.isArray(projectsResult[0]) ? projectsResult[0] : projectsResult) : [];

    if (projects[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `有 ${projects[0].count} 个项目正在使用此类型，无法删除`,
      });
    }

    await db.query(
      'UPDATE project_types SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '项目类型删除成功',
    });
  } catch (error) {
    console.error('删除项目类型失败:', error);
    res.status(500).json({
      success: false,
      message: '删除项目类型失败',
    });
  }
});

export default router;
