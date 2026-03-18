/**
 * 新架构API路由
 *
 * 支持以下功能：
 * - 带版本控制的数据操作
 * - 刷新免登录验证
 * - 实时同步集成
 */

import express from 'express';
import { authService } from '../auth/index.js';
import { projectService } from '../data/index.js';
import { memberService } from '../data/index.js';
import { taskService } from '../data/index.js';
import { dataService } from '../data/index.js';
import { VersionConflictError } from '../data/types.js';
import { redisService, cacheManager } from '../cache/index.js';
import { webSocketService, messageBroker } from '../realtime/index.js';

const router = express.Router();

// ================================================================
// 认证相关路由
// ================================================================

/**
 * 刷新免登录验证
 * 检查Cookie中的session_id是否有效
 */
router.get('/auth/validate', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: '未登录'
      });
    }

    const result = await authService.validateSession(sessionId, req.ip);

    if (result.valid && result.user) {
      res.json({
        success: true,
        valid: true,
        user: result.user,
        session: result.session
      });
    } else {
      res.status(401).json({
        success: false,
        valid: false,
        message: result.reason || '会话无效'
      });
    }
  } catch (error: any) {
    console.error('[API] 验证会话失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败'
    });
  }
});

// ================================================================
// 项目相关路由（带版本控制）
// ================================================================

/**
 * 获取项目列表
 */
router.get('/projects/v2', async (req, res) => {
  try {
    const projects = await projectService.getProjects();
    res.json({
      success: true,
      data: projects
    });
  } catch (error: any) {
    console.error('[API] 获取项目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目列表失败'
    });
  }
});

/**
 * 获取项目详情
 */
router.get('/projects/v2/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await projectService.getProject(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error: any) {
    console.error('[API] 获取项目详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目详情失败'
    });
  }
});

/**
 * 创建项目
 */
router.post('/projects/v2', async (req, res) => {
  try {
    // 从会话获取用户信息
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const sessionResult = await authService.validateSession(sessionId, req.ip);
    if (!sessionResult.valid || !sessionResult.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const project = await projectService.createProject(req.body, sessionResult.user.id);

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error: any) {
    console.error('[API] 创建项目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建项目失败'
    });
  }
});

/**
 * 更新项目（带版本控制）
 */
router.put('/projects/v2/:id', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const sessionResult = await authService.validateSession(sessionId, req.ip);
    if (!sessionResult.valid || !sessionResult.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const projectId = parseInt(req.params.id);
    const { version, ...data } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: '缺少版本号'
      });
    }

    const project = await projectService.updateProject(
      projectId,
      data,
      version,
      sessionResult.user.id
    );

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return res.status(409).json({
        success: false,
        conflict: true,
        current: error.current,
        attempted: error.attempted,
        history: error.history,
        message: '版本冲突：该项目已被其他用户修改'
      });
    }

    console.error('[API] 更新项目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新项目失败'
    });
  }
});

/**
 * 删除项目（带版本控制）
 */
router.delete('/projects/v2/:id', async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const sessionResult = await authService.validateSession(sessionId, req.ip);
    if (!sessionResult.valid || !sessionResult.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const projectId = parseInt(req.params.id);
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: '缺少版本号'
      });
    }

    await projectService.deleteProject(projectId, version, sessionResult.user.id);

    res.json({
      success: true,
      message: '项目已删除'
    });
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: error.message
      });
    }

    console.error('[API] 删除项目失败:', error);
    res.status(500).json({
      success: false,
      message: '删除项目失败'
    });
  }
});

// ================================================================
// 成员相关路由（带版本控制）
// ================================================================

/**
 * 获取成员列表
 */
router.get('/members/v2', async (req, res) => {
  try {
    const members = await memberService.getMembers();
    res.json({
      success: true,
      data: members
    });
  } catch (error: any) {
    console.error('[API] 获取成员列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成员列表失败'
    });
  }
});

// ================================================================
// 任务相关路由（带版本控制）
// ================================================================

/**
 * 获取任务列表
 */
router.get('/tasks/v2', async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const tasks = await taskService.getTasks(projectId);
    res.json({
      success: true,
      data: tasks
    });
  } catch (error: any) {
    console.error('[API] 获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    });
  }
});

// ================================================================
// 统一数据接口
// ================================================================

/**
 * 获取初始数据（应用启动时调用）
 */
router.get('/initial-data/v2', async (req, res) => {
  try {
    const data = await dataService.getInitialData();
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('[API] 获取初始数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取初始数据失败'
    });
  }
});

/**
 * 获取数据统计
 */
router.get('/statistics/v2', async (req, res) => {
  try {
    const stats = await dataService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[API] 获取数据统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据统计失败'
    });
  }
});

// ================================================================
// 系统状态
// ================================================================

/**
 * 系统健康检查（含新模块状态）
 */
router.get('/system/health/v2', async (req, res) => {
  try {
    const redisHealth = await redisService.healthCheck();
    const cacheStats = cacheManager.getStats();
    const wsStats = webSocketService.getStats();
    const brokerStats = messageBroker.getStats();

    res.json({
      success: true,
      data: {
        redis: redisHealth,
        cache: cacheStats,
        websocket: wsStats,
        messageBroker: brokerStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[API] 获取系统状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统状态失败'
    });
  }
});

export default router;
