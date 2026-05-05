/**
 * 仪表板控制器（已废弃）
 *
 * 注意：此控制器已被 routes.ts + AnalyticsService 替代。
 * 实际 API 路由走 routes.ts -> service.ts -> repository.ts 路径。
 * 此文件仅作为历史参考保留，未来可安全删除。
 *
 * @deprecated 使用 routes.ts 中注册的 AnalyticsService 方法替代
 * @module analytics/controllers/dashboard
 */

import type { Request, Response } from 'express';
import { getPool } from '../../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import { ScopeService } from '../services/scope.service';
import { buildTaskScopeFilter, buildProjectScopeFilter } from '../query-builder';
import { STATUS_CONDITIONS } from '../constants';
import type { User } from '../../../core/types';
import { RedisCache } from '../../../core/cache/redis';
import { MemoryCache } from '../../../core/cache/memory';
import { logger } from '../../../core/logger';

// 缓存实例（进程级单例）
let dashboardCache: RedisCache | MemoryCache;
try {
  dashboardCache = new RedisCache();
} catch {
  dashboardCache = new MemoryCache();
}

const STATS_TTL = 3 * 60;    // 统计缓存 3 分钟
const TRENDS_TTL = 5 * 60;   // 趋势缓存 5 分钟
const URGENT_TTL = 2 * 60;   // 紧急任务缓存 2 分钟

/**
 * 获取认证用户信息
 */
function getAuthUser(req: Request): User | undefined {
  return (req as { user?: User }).user;
}

/**
 * 仪表板控制器
 */
export class DashboardController {
  /**
   * 获取首页统计数据
   * GET /api/dashboard/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: '未授权' });
      }

      // 尝试从缓存获取（包含日期参数避免跨天数据串用）
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `dashboard:stats:${user.id}:${user.role}:${today}`;
      const cached = await dashboardCache.get<{ data: unknown }>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const pool = getPool();
      const scope = ScopeService.getDataScope(user);

      // 构建项目过滤条件
      const projectScope = await buildProjectScopeFilter(user, 'p');
      // 任务范围过滤（assignee_id 为 NULL 的任务对所有人可见）
      const taskScope = await buildTaskScopeFilter(user, 't', true);

      // 查询项目统计
      const [projectRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN p.status IN ('in_progress', 'planning') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN p.status = 'delayed' THEN 1 ELSE 0 END) as delayed,
          SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM projects p
         WHERE ${projectScope.clause}`,
        projectScope.params
      );

      // 查询任务统计
      const [taskRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ${STATUS_CONDITIONS.inProgress} THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ${STATUS_CONDITIONS.completed} THEN 1 ELSE 0 END) as completed
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE ${taskScope.clause}`,
        taskScope.params
      );

      // 查询延期预警（使用 warning_days 而非硬编码7天）
      const [warningRows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE ${STATUS_CONDITIONS.notCompleted}
           AND t.end_date IS NOT NULL
           AND t.end_date >= CURDATE()
           AND DATEDIFF(t.end_date, CURDATE()) <= t.warning_days
           AND ${taskScope.clause}`,
        taskScope.params
      );

      const projectResult = projectRows[0] || { total: 0, active: 0, delayed: 0, completed: 0 };
      const taskResult = taskRows[0] || { total: 0, in_progress: 0, completed: 0 };
      const warningResult = warningRows[0] || { total: 0 };

      // 计算完成率
      const completionRate = taskResult.total > 0
        ? Math.round((taskResult.completed / taskResult.total) * 100)
        : 0;

      // 返回统计数据
      const responseData = {
        success: true,
        data: {
          metrics: [
            {
              label: scope.projects === 'my_projects' ? '参与项目' : '项目总数',
              value: projectResult.total,
              displayValue: String(projectResult.total),
            },
            {
              label: scope.users === 'self' ? '我的进行中' : '进行中任务',
              value: taskResult.in_progress,
              displayValue: String(taskResult.in_progress),
            },
            {
              label: scope.users === 'self' ? '我的已完成' : '已完成任务',
              value: taskResult.completed,
              displayValue: String(taskResult.completed),
            },
            {
              label: scope.users === 'self' ? '我的到期任务' : '延期预警',
              value: warningResult.total,
              displayValue: String(warningResult.total),
              trend: 0,
            },
          ],
          completionRate,
          scope: {
            projects: scope.projects,
            users: scope.users,
          },
        },
      };

      // 写入缓存
      await dashboardCache.set(cacheKey, responseData, STATS_TTL);

      res.json(responseData);
    } catch (error) {
      logger.error('获取仪表板统计失败: %s', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: '获取仪表板统计失败' });
    }
  }

  /**
   * 获取趋势数据
   * GET /api/dashboard/trends
   */
  static async getTrends(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: '未授权' });
      }

      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string) || 30;

      // 尝试从缓存获取
      const cacheKey = `dashboard:trends:${user.id}:${user.role}:${daysNum}`;
      const cached = await dashboardCache.get<{ success: boolean; data: unknown }>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const pool = getPool();
      // 任务范围过滤（assignee_id 为 NULL 的任务对所有人可见）
      const taskScope = await buildTaskScopeFilter(user, 't', true);

      // 查询创建趋势
      const [createdRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          DATE(t.created_at) as date,
          COUNT(*) as created
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND ${taskScope.clause}
         GROUP BY DATE(t.created_at)
         ORDER BY date`,
        [daysNum, ...taskScope.params]
      );

      // 查询完成趋势
      const [completedRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          DATE(t.actual_end_date) as date,
          COUNT(*) as completed
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.actual_end_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND ${STATUS_CONDITIONS.completed}
           AND ${taskScope.clause}
         GROUP BY DATE(t.actual_end_date)
         ORDER BY date`,
        [daysNum, ...taskScope.params]
      );

      // 合并数据
      const dateMap = new Map<string, { created: number; completed: number; delayed: number }>();

      createdRows.forEach((item) => {
        dateMap.set(item.date, {
          created: item.created,
          completed: 0,
          delayed: 0,
        });
      });

      completedRows.forEach((item) => {
        const existing = dateMap.get(item.date);
        if (existing) {
          existing.completed = item.completed;
        } else {
          dateMap.set(item.date, {
            created: 0,
            completed: item.completed,
            delayed: 0,
          });
        }
      });

      // 转换为数组
      const result = Array.from(dateMap.entries())
        .map(([date, values]) => ({
          date,
          ...values,
          value: values.created,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const responseData = {
        success: true,
        data: result,
      };

      // 写入缓存
      await dashboardCache.set(cacheKey, responseData, TRENDS_TTL);

      res.json(responseData);
    } catch (error) {
      logger.error('获取趋势数据失败: %s', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: '获取趋势数据失败' });
    }
  }

  /**
   * 获取紧急任务列表
   * GET /api/dashboard/urgent-tasks
   */
  static async getUrgentTasks(req: Request, res: Response) {
    try {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({ error: '未授权' });
      }

      // 尝试从缓存获取
      const cacheKey = `dashboard:urgent:${user.id}:${user.role}`;
      const cached = await dashboardCache.get<{ success: boolean; data: unknown }>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const pool = getPool();
      // 任务范围过滤（assignee_id 为 NULL 的任务对所有人可见）
      const taskScope = await buildTaskScopeFilter(user, 't', true);

      // 查询紧急任务
      const [urgentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT
          t.id,
          t.description as name,
          t.progress,
          t.end_date as dueDate,
          t.status,
          p.name as projectName
         FROM wbs_tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE ${STATUS_CONDITIONS.notCompleted}
           AND t.end_date IS NOT NULL
           AND t.end_date >= CURDATE()
           AND DATEDIFF(t.end_date, CURDATE()) <= t.warning_days
           AND ${taskScope.clause}
         ORDER BY t.end_date ASC
         LIMIT 10`,
        taskScope.params
      );

      // 计算逾期天数
      const tasks = urgentRows.map((task) => {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...task,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          priority: daysOverdue > 0 ? 'high' : daysOverdue === 0 ? 'medium' : 'low',
        };
      });

      const responseData = {
        success: true,
        data: tasks,
      };

      // 写入缓存
      await dashboardCache.set(cacheKey, responseData, URGENT_TTL);

      res.json(responseData);
    } catch (error) {
      logger.error('获取紧急任务失败: %s', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: '获取紧急任务失败' });
    }
  }
}

export default DashboardController;
