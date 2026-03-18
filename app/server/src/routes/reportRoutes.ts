/**
 * 报表分析 API 路由
 *
 * 功能：
 * 1. 项目进度报表
 * 2. 任务统计报表
 * 3. 延期分析报表
 * 4. 成员效能报表
 *
 * @author AI Assistant
 * @since 2026-03-17
 */

import express from 'express';
import type { Request, Response } from 'express';
import { databaseService } from '../services/DatabaseService.js';
import { logger, LOG_CATEGORIES } from '../logging/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError } from '../errors/index.js';

const router = express.Router();

// ==================== 常量 ====================

/** 已完成状态列表 */
const COMPLETED_STATUSES = ['early_completed', 'on_time_completed', 'overdue_completed'];

/** 延期状态列表 */
const DELAYED_STATUSES = ['delayed', 'delay_warning', 'overdue_completed'];

// ==================== 项目进度报表 ====================

/**
 * GET /api/reports/project-progress
 * 项目进度报表
 */
router.get(
  '/project-progress',
  asyncHandler(async (req: Request, res: Response) => {
    const { project_id } = req.query;
    if (!project_id) {
      throw new ValidationError('请提供项目ID');
    }
    const projectId = Number(project_id);

    const stats = await queryProjectStats(projectId);
    if (!stats || stats.length === 0) {
      return res.json({ success: false, message: '项目不存在' });
    }

    const [milestoneStats, statusDistribution, priorityDistribution] = await Promise.all([
      queryMilestoneStats(projectId),
      queryStatusDistribution(projectId),
      queryPriorityDistribution(projectId)
    ]);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取项目进度报表', { projectId });

    res.json({
      success: true,
      data: {
        stats: formatProjectStats(stats[0]),
        milestones: milestoneStats[0] || { total: 0, completed: 0 },
        charts: {
          status_distribution: statusDistribution.map(formatStatusData),
          priority_distribution: priorityDistribution.map(formatPriorityData)
        }
      }
    });
  })
);

// ==================== 任务统计报表 ====================

/**
 * GET /api/reports/task-statistics
 * 任务统计报表
 */
router.get(
  '/task-statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const { project_id } = req.query;
    const { whereClause, params } = buildWhereCondition(project_id);

    const statsResult = await queryTaskStats(whereClause, params);
    const stats = statsResult[0] || { total_tasks: 0, completed_count: 0, delayed_count: 0, urgent_count: 0 };
    const totalTasks = Number(stats.total_tasks || 0);
    const completedCount = Number(stats.completed_count || 0);

    const [priorityDistribution, assigneeDistribution] = await Promise.all([
      queryTaskPriorityDistribution(whereClause, params),
      queryAssigneeDistribution(whereClause, params)
    ]);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取任务统计报表', { projectId: project_id });
    res.json({
      success: true,
      data: {
        stats: {
          total_tasks: totalTasks,
          completed_count: completedCount,
          delayed_count: Number(stats.delayed_count || 0),
          urgent_count: Number(stats.urgent_count || 0),
          avg_completion_rate: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
        },
        charts: {
          priority_distribution: priorityDistribution.map(formatPriorityData),
          assignee_distribution: assigneeDistribution.map(formatAssigneeData)
        }
      }
    });
  })
);

// ==================== 延期分析报表 ====================

/**
 * GET /api/reports/delay-analysis
 * 延期分析报表
 */
router.get(
  '/delay-analysis',
  asyncHandler(async (req: Request, res: Response) => {
    const { project_id } = req.query;
    const { whereClause, params } = buildWhereCondition(project_id);

    const [delayStats, reasonDistribution, trend, assigneeDelayStats] = await Promise.all([
      queryDelayStats(whereClause, params),
      queryReasonDistribution(whereClause, params),
      queryDelayTrend(),
      queryAssigneeDelayStats(whereClause, params)
    ]);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取延期分析报表', { projectId: project_id });
    res.json({
      success: true,
      data: {
        stats: { total_delayed: Number(delayStats[0]?.total || 0) },
        charts: {
          reason_distribution: reasonDistribution.map(formatReasonData),
          trend: trend.map(formatTrendData),
          assignee_delay_stats: assigneeDelayStats.map(formatDelayAssigneeData)
        }
      }
    });
  })
);

// ==================== 成员效能报表 ====================

/**
 * GET /api/reports/member-performance
 * 成员效能报表
 */
router.get(
  '/member-performance',
  asyncHandler(async (req: Request, res: Response) => {
    const { project_id } = req.query;

    const memberStats = await queryMemberPerformanceStats(project_id ? Number(project_id) : undefined);

    logger.info(LOG_CATEGORIES.HTTP_REQUEST, '获取成员效能报表', { projectId: project_id });
    res.json({
      success: true,
      data: {
        members: memberStats.map(formatMemberData)
      }
    });
  })
);

export default router;

// ==================== 辅助函数 ====================

/** 构建 WHERE 条件 */
function buildWhereCondition(projectId: unknown): { whereClause: string; params: (number | string)[] } {
  if (projectId) {
    return { whereClause: 'WHERE t.project_id = ?', params: [Number(projectId)] };
  }
  return { whereClause: '', params: [] };
}

/** 查询项目统计 */
async function queryProjectStats(projectId: number) {
  return databaseService.query(
    `SELECT
      p.id, p.name, p.progress,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status IN (?) THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN t.status = 'not_started' THEN 1 ELSE 0 END) as not_started_tasks,
      SUM(CASE WHEN t.status IN ('delayed', 'delay_warning') THEN 1 ELSE 0 END) as delayed_tasks
    FROM projects p
    LEFT JOIN wbs_tasks t ON p.id = t.project_id
    WHERE p.id = ?
    GROUP BY p.id`,
    [COMPLETED_STATUSES, projectId]
  );
}

/** 查询里程碑统计 */
async function queryMilestoneStats(projectId: number): Promise<{ total: number; completed: number }[]> {
  return databaseService.query(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) as completed
    FROM project_milestones WHERE project_id = ?`,
    [projectId]
  );
}

/** 查询状态分布 */
async function queryStatusDistribution(projectId: number): Promise<{ status: string; count: number }[]> {
  return databaseService.query(
    'SELECT status, COUNT(*) as count FROM wbs_tasks WHERE project_id = ? GROUP BY status',
    [projectId]
  );
}

/** 查询优先级分布 */
async function queryPriorityDistribution(projectId: number): Promise<{ priority: string; count: number }[]> {
  return databaseService.query(
    'SELECT priority, COUNT(*) as count FROM wbs_tasks WHERE project_id = ? GROUP BY priority',
    [projectId]
  );
}

/** 查询任务统计 */
async function queryTaskStats(whereClause: string, params: (number | string)[]) {
  return databaseService.query(
    `SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN t.status IN (?) THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN t.status = 'delayed' THEN 1 ELSE 0 END) as delayed_count,
      SUM(CASE WHEN t.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
     FROM wbs_tasks t ${whereClause}`,
    [COMPLETED_STATUSES, ...params]
  );
}

/** 查询优先级分布（带条件） */
async function queryTaskPriorityDistribution(whereClause: string, params: (number | string)[]): Promise<{ priority: string; count: number }[]> {
  const finalWhere = whereClause ? `${whereClause} AND t.priority IS NOT NULL` : 'WHERE t.priority IS NOT NULL';
  return databaseService.query(
    `SELECT t.priority, COUNT(*) as count FROM wbs_tasks t ${finalWhere} GROUP BY t.priority`,
    params
  );
}

/** 查询负责人分布 */
async function queryAssigneeDistribution(whereClause: string, params: (number | string)[]): Promise<{ assignee_name: string; count: number }[]> {
  return databaseService.query(
    `SELECT COALESCE(m.name, '未分配') as assignee_name, COUNT(*) as count
     FROM wbs_tasks t LEFT JOIN members m ON t.assignee_id = m.id
     ${whereClause}
     GROUP BY t.assignee_id, m.name
     ORDER BY count DESC
     LIMIT 10`,
    params
  );
}

/** 查询延期统计 */
async function queryDelayStats(whereClause: string, params: (number | string)[]): Promise<{ total: number }[]> {
  const delayWhere = whereClause ? `${whereClause} AND t.status IN (?)` : 'WHERE t.status IN (?)';
  return databaseService.query(
    `SELECT COUNT(*) as total FROM wbs_tasks t ${delayWhere}`,
    [DELAYED_STATUSES, ...params]
  );
}

/** 查询延期原因分布 */
async function queryReasonDistribution(whereClause: string, params: (number | string)[]): Promise<{ reason: string; count: number }[]> {
  return databaseService.query(
    `SELECT dr.reason, COUNT(*) as count
     FROM delay_records dr JOIN wbs_tasks t ON dr.task_id = t.id
     ${whereClause}
     GROUP BY dr.reason
     ORDER BY count DESC
     LIMIT 10`,
    params
  );
}

/** 查询延期趋势 */
async function queryDelayTrend(): Promise<{ date: Date; count: number }[]> {
  return databaseService.query(
    `SELECT DATE(created_at) as date, COUNT(*) as count
     FROM wbs_tasks
     WHERE status IN ('delayed', 'overdue_completed')
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    []
  );
}

/** 查询负责人延期任务统计 */
async function queryAssigneeDelayStats(whereClause: string, params: (number | string)[]): Promise<{ assignee_name: string; delay_count: number }[]> {
  const delayWhere = whereClause ? `${whereClause} AND t.status IN (?)` : 'WHERE t.status IN (?)';
  return databaseService.query(
    `SELECT COALESCE(m.name, '未分配') as assignee_name, COUNT(*) as delay_count
     FROM wbs_tasks t LEFT JOIN members m ON t.assignee_id = m.id
     ${delayWhere}
     GROUP BY t.assignee_id, m.name
     ORDER BY delay_count DESC
     LIMIT 10`,
    [DELAYED_STATUSES, ...params]
  );
}

/** 查询成员效能统计 */
async function queryMemberPerformanceStats(projectId?: number): Promise<MemberPerformanceData[]> {
  const taskCondition = projectId ? 'AND t.project_id = ?' : '';
  const queryParams: unknown[] = [COMPLETED_STATUSES];
  if (projectId) {
    queryParams.push(projectId);
  }

  return databaseService.query(
    `SELECT
      m.id, m.name,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status IN (?) THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'delayed' THEN 1 ELSE 0 END) as delayed_tasks,
      AVG(t.progress) as avg_progress
     FROM members m
     LEFT JOIN wbs_tasks t ON m.id = t.assignee_id ${taskCondition}
     WHERE m.is_active = true
     GROUP BY m.id, m.name
     HAVING total_tasks > 0
     ORDER BY total_tasks DESC
     LIMIT 20`,
    queryParams
  );
}

// ==================== 格式化函数 ====================

/** 格式化项目统计 */
function formatProjectStats(stats: Record<string, unknown>) {
  return {
    id: stats.id,
    name: stats.name,
    progress: Number(stats.progress || 0),
    total_tasks: Number(stats.total_tasks || 0),
    completed_tasks: Number(stats.completed_tasks || 0),
    in_progress_tasks: Number(stats.in_progress_tasks || 0),
    not_started_tasks: Number(stats.not_started_tasks || 0),
    delayed_tasks: Number(stats.delayed_tasks || 0)
  };
}

/** 格式化状态数据 */
function formatStatusData(item: { status: string; count: number }): { name: string; value: number } {
  return { name: item.status, value: Number(item.count) };
}

/** 格式化优先级数据 */
function formatPriorityData(item: { priority: string; count: number }): { name: string; value: number } {
  return { name: item.priority, value: Number(item.count) };
}

/** 格式化负责人数据 */
function formatAssigneeData(item: { assignee_name: string; count: number }): { name: string; value: number } {
  return { name: item.assignee_name, value: Number(item.count) };
}

/** 格式化原因数据 */
function formatReasonData(item: { reason: string; count: number }): { name: string; value: number } {
  return { name: item.reason, value: Number(item.count) };
}

/** 格式化延期负责人数据 */
function formatDelayAssigneeData(item: { assignee_name: string; delay_count: number }): { name: string; value: number } {
  return { name: item.assignee_name, value: Number(item.delay_count) };
}

/** 格式化趋势数据 */
function formatTrendData(item: { date: Date; count: number }): { date: Date; value: number } {
  return { date: item.date, value: Number(item.count) };
}

/** 格式化成员数据 */
function formatMemberData(member: MemberPerformanceData): Record<string, unknown> {
  const totalTasks = Number(member.total_tasks || 0);
  const completedTasks = Number(member.completed_tasks || 0);
  return {
    id: member.id,
    name: member.name,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    delayed_tasks: Number(member.delayed_tasks || 0),
    avg_progress: Math.round(Number(member.avg_progress || 0)),
    completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
}

/** 成员效能数据类型 */
interface MemberPerformanceData {
  id: number;
  name: string;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  avg_progress: number;
}
