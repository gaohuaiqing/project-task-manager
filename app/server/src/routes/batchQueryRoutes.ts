/**
 * 批量查询API路由
 *
 * 提供高效的批量查询接口，减少网络往返
 * 支持按ID列表或按条件批量查询
 * 集成缓存和超时控制
 *
 * @author AI Assistant
 * @since 2025-03-04
 */

import express from 'express';
import { optimizedProjectService } from '../services/OptimizedProjectService.js';
import { optimizedMemberService } from '../services/OptimizedMemberService.js';
import { optimizedWbsTaskService } from '../services/OptimizedWbsTaskService.js';
import { validateSession } from './dataRoutes.js';

const router = express.Router();

// ================================================================
// 项目批量查询
// ================================================================

/**
 * POST /api/batch/projects
 * 批量获取项目详情
 */
router.post('/batch/projects', async (req: any, res: any) => {
  const { ids, fields } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的项目ID列表'
    });
  }

  // 验证ID格式
  const validIds = ids.filter(id => typeof id === 'number' && id > 0);
  if (validIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有有效的项目ID'
    });
  }

  try {
    const startTime = Date.now();

    let result: Map<number, any>;

    if (fields && Array.isArray(fields)) {
      // 只查询指定字段
      result = await optimizedProjectService.getProjectFields(validIds, fields);
    } else {
      // 查询完整详情
      result = await optimizedProjectService.batchGetProjects(validIds);
    }

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      data: Array.from(result.values()),
      meta: {
        count: result.size,
        requested: ids.length,
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 批量获取项目失败:', error);
    res.status(500).json({
      success: false,
      message: '批量查询失败',
      error: error.message
    });
  }
});

/**
 * POST /api/batch/projects/search
 * 按条件批量查询项目
 */
router.post('/batch/projects/search', async (req: any, res: any) => {
  const { conditions } = req.body;

  if (!conditions || typeof conditions !== 'object') {
    return res.status(400).json({
      success: false,
      message: '请提供查询条件'
    });
  }

  try {
    const startTime = Date.now();
    const result = await optimizedProjectService.getProjectList(conditions);
    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      ...result,
      meta: {
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 按条件查询项目失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

// ================================================================
// 成员批量查询
// ================================================================

/**
 * POST /api/batch/members
 * 批量获取成员详情
 */
router.post('/batch/members', async (req: any, res: any) => {
  const { ids, fields } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的成员ID列表'
    });
  }

  // 验证ID格式
  const validIds = ids.filter(id => typeof id === 'number' && id > 0);
  if (validIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有有效的成员ID'
    });
  }

  try {
    const startTime = Date.now();

    let result: Map<number, any>;

    if (fields && Array.isArray(fields)) {
      // 只查询指定字段
      result = await optimizedMemberService.getMemberFields(validIds, fields);
    } else {
      // 查询完整详情
      result = await optimizedMemberService.batchGetMembers(validIds);
    }

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      data: Array.from(result.values()),
      meta: {
        count: result.size,
        requested: ids.length,
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 批量获取成员失败:', error);
    res.status(500).json({
      success: false,
      message: '批量查询失败',
      error: error.message
    });
  }
});

/**
 * POST /api/batch/members/by-department
 * 按部门批量获取成员
 */
router.post('/batch/members/by-department', async (req: any, res: any) => {
  const { departments } = req.body;

  if (!Array.isArray(departments) || departments.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供部门列表'
    });
  }

  try {
    const startTime = Date.now();
    const results = await Promise.all(
      departments.map(dept => optimizedMemberService.getMembersByDepartment(dept))
    );

    const queryTime = Date.now() - startTime;

    // 按部门组织结果
    const byDepartment: Record<string, any[]> = {};
    departments.forEach((dept, index) => {
      byDepartment[dept] = results[index];
    });

    res.json({
      success: true,
      data: byDepartment,
      meta: {
        departments: departments.length,
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 按部门获取成员失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

// ================================================================
// WBS任务批量查询
// ================================================================

/**
 * POST /api/batch/wbs-tasks
 * 批量获取任务详情
 */
router.post('/batch/wbs-tasks', async (req: any, res: any) => {
  const { ids, fields } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的任务ID列表'
    });
  }

  // 验证ID格式
  const validIds = ids.filter(id => typeof id === 'number' && id > 0);
  if (validIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '没有有效的任务ID'
    });
  }

  try {
    const startTime = Date.now();

    let result: Map<number, any>;

    if (fields && Array.isArray(fields)) {
      // 只查询指定字段
      result = await optimizedWbsTaskService.getTaskFields(validIds, fields);
    } else {
      // 查询完整详情
      result = await optimizedWbsTaskService.batchGetTasks(validIds);
    }

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      data: Array.from(result.values()),
      meta: {
        count: result.size,
        requested: ids.length,
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 批量获取任务失败:', error);
    res.status(500).json({
      success: false,
      message: '批量查询失败',
      error: error.message
    });
  }
});

/**
 * POST /api/batch/wbs-tasks/by-project
 * 按项目批量获取任务
 */
router.post('/batch/wbs-tasks/by-project', async (req: any, res: any) => {
  const { projectIds, includeTree } = req.body;

  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID列表'
    });
  }

  try {
    const startTime = Date.now();

    if (includeTree) {
      // 获取任务树
      const results = await Promise.all(
        projectIds.map(projectId => optimizedWbsTaskService.getTaskTree(projectId))
      );

      const queryTime = Date.now() - startTime;

      const byProject: Record<number, any[]> = {};
      projectIds.forEach((projectId, index) => {
        byProject[projectId] = results[index];
      });

      res.json({
        success: true,
        data: byProject,
        meta: {
          projects: projectIds.length,
          queryTime
        }
      });
    } else {
      // 获取任务列表
      const results = await Promise.all(
        projectIds.map(projectId => optimizedWbsTaskService.getTasksByProject(projectId))
      );

      const queryTime = Date.now() - startTime;

      const byProject: Record<number, any[]> = {};
      projectIds.forEach((projectId, index) => {
        byProject[projectId] = results[index];
      });

      res.json({
        success: true,
        data: byProject,
        meta: {
          projects: projectIds.length,
          queryTime
        }
      });
    }
  } catch (error: any) {
    console.error('[BatchAPI] 按项目获取任务失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

// ================================================================
// 混合批量查询
// ================================================================

/**
 * POST /api/batch/mixed
 * 混合批量查询多种实体
 */
router.post('/batch/mixed', async (req: any, res: any) => {
  const { queries } = req.body;

  if (!Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供查询列表'
    });
  }

  try {
    const startTime = Date.now();
    const results: Record<string, any> = {};

    for (const query of queries) {
      const { type, ids, fields } = query;

      switch (type) {
        case 'projects':
          if (fields) {
            const projectFields = await optimizedProjectService.getProjectFields(ids, fields);
            results.projects = Array.from(projectFields.values());
          } else {
            const projects = await optimizedProjectService.batchGetProjects(ids);
            results.projects = Array.from(projects.values());
          }
          break;

        case 'members':
          if (fields) {
            const memberFields = await optimizedMemberService.getMemberFields(ids, fields);
            results.members = Array.from(memberFields.values());
          } else {
            const members = await optimizedMemberService.batchGetMembers(ids);
            results.members = Array.from(members.values());
          }
          break;

        case 'wbs_tasks':
          if (fields) {
            const taskFields = await optimizedWbsTaskService.getTaskFields(ids, fields);
            results.wbs_tasks = Array.from(taskFields.values());
          } else {
            const tasks = await optimizedWbsTaskService.batchGetTasks(ids);
            results.wbs_tasks = Array.from(tasks.values());
          }
          break;

        default:
          console.warn(`[BatchAPI] 未知的查询类型: ${type}`);
      }
    }

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      data: results,
      meta: {
        queries: queries.length,
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 混合批量查询失败:', error);
    res.status(500).json({
      success: false,
      message: '批量查询失败',
      error: error.message
    });
  }
});

// ================================================================
// 批量统计查询
// ================================================================

/**
 * POST /api/batch/stats
 * 批量获取统计信息
 */
router.post('/batch/stats', async (req: any, res: any) => {
  const { types } = req.body;

  if (!Array.isArray(types) || types.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供统计类型列表'
    });
  }

  try {
    const startTime = Date.now();
    const stats: Record<string, any> = {};

    // 项目统计
    if (types.includes('projects')) {
      const { data: projects } = await optimizedProjectService.getProjectList({
        page: 1,
        pageSize: 1
      });
      stats.projects = {
        total: projects.pagination.total,
        cacheStats: optimizedProjectService.getCacheStats()
      };
    }

    // 成员统计
    if (types.includes('members')) {
      const { data: members } = await optimizedMemberService.getMemberList({
        page: 1,
        pageSize: 1
      });
      stats.members = {
        total: members.pagination.total,
        cacheStats: optimizedMemberService.getCacheStats()
      };
    }

    // 任务统计
    if (types.includes('wbs_tasks')) {
      const { data: tasks } = await optimizedWbsTaskService.getTaskList({
        page: 1,
        pageSize: 1
      });
      stats.wbs_tasks = {
        total: tasks.pagination.total,
        cacheStats: optimizedWbsTaskService.getCacheStats()
      };
    }

    // 缓存统计
    if (types.includes('cache')) {
      stats.cache = {
        projects: optimizedProjectService.getCacheStats(),
        members: optimizedMemberService.getCacheStats(),
        wbs_tasks: optimizedWbsTaskService.getCacheStats()
      };
    }

    const queryTime = Date.now() - startTime;

    res.json({
      success: true,
      data: stats,
      meta: {
        queryTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 批量获取统计失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

// ================================================================
// 缓存预热
// ================================================================

/**
 * POST /api/batch/cache/warmup
 * 缓存预热
 */
router.post('/batch/cache/warmup', validateSession, async (req: any, res: any) => {
  const { types } = req.body;

  try {
    const startTime = Date.now();

    // 预热项目列表
    if (!types || types.includes('projects')) {
      await optimizedProjectService.getProjectList({ page: 1, pageSize: 50 });
    }

    // 预热成员列表
    if (!types || types.includes('members')) {
      await optimizedMemberService.getMemberList({ page: 1, pageSize: 50 });
    }

    // 预热任务列表
    if (!types || types.includes('wbs_tasks')) {
      await optimizedWbsTaskService.getTaskList({ page: 1, pageSize: 50 });
    }

    const warmupTime = Date.now() - startTime;

    res.json({
      success: true,
      message: '缓存预热完成',
      meta: {
        warmupTime
      }
    });
  } catch (error: any) {
    console.error('[BatchAPI] 缓存预热失败:', error);
    res.status(500).json({
      success: false,
      message: '预热失败',
      error: error.message
    });
  }
});

// ================================================================
// 导出路由
// ================================================================

export default router;
