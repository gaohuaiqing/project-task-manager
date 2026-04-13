/**
 * 仪表板控制器
 * 提供仪表板数据查询接口
 *
 * @module analytics/controllers/dashboard
 */

import type { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service';
import { ScopeService } from '../services/scope.service';
import { TrendService } from '../services/trend.service';
import type { User } from '../../../core/types';

/**
 * 数据库连接接口
 * 定义基本的数据库操作方法
 */
interface Database {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      get<T = unknown>(): T | undefined;
      all<T = unknown>(): T[];
      run(): { changes: number; lastInsertRowid: number };
    };
    get<T = unknown>(...params: unknown[]): T | undefined;
    all<T = unknown>(...params: unknown[]): T[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  };
  transaction<T>(fn: () => T): T;
  exec(sql: string): void;
}

/**
 * 获取认证用户信息
 */
function getAuthUser(req: Request): User | undefined {
  return (req as { user?: User }).user;
}

/**
 * 获取数据库连接
 */
function getDb(req: Request): Database | undefined {
  return req.app?.locals?.db as Database | undefined;
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

      const db = getDb(req);
      const scope = ScopeService.getDataScope(user);

      // 根据角色获取不同范围的统计数据
      let projectFilter = '';
      let taskFilter = '';
      const params: Record<string, unknown> = {};

      // 构建过滤条件
      if (scope.projects !== 'all') {
        const projectResult = ScopeService.buildProjectFilter(user);
        projectFilter = `AND ${projectResult.whereClause}`;
        Object.assign(params, projectResult.params);
      }

      if (scope.users !== 'all') {
        const taskResult = ScopeService.buildTaskFilter(user);
        taskFilter = `AND ${taskResult.whereClause}`;
        Object.assign(params, taskResult.params);
      }

      // 查询项目统计
      const projectStats = await db('projects as p')
        .whereRaw('1=1 ' + projectFilter, params)
        .count('* as total')
        .first();

      // 查询任务统计
      const taskStats = await db('wbs_tasks as t')
        .leftJoin('projects as p', 't.project_id', 'p.id')
        .whereRaw('1=1 ' + projectFilter + ' ' + taskFilter, params)
        .count('* as total')
        .count('* as in_progress')
        .where('t.status', 'in_progress')
        .first();

      // 查询已完成任务
      const completedStats = await db('wbs_tasks as t')
        .leftJoin('projects as p', 't.project_id', 'p.id')
        .whereRaw('1=1 ' + projectFilter + ' ' + taskFilter, params)
        .where('t.status', 'completed')
        .count('* as total')
        .first();

      // 查询延期预警
      const warningStats = await db('wbs_tasks as t')
        .leftJoin('projects as p', 't.project_id', 'p.id')
        .whereRaw('1=1 ' + projectFilter + ' ' + taskFilter, params)
        .where('t.status', 'in_progress')
        .where('t.progress', '<', 100)
        .whereRaw('t.end_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
        .count('* as total')
        .first();

      // 计算完成率和延期率
      const totalTasks = taskStats?.total || 0;
      const completedTasks = completedStats?.total || 0;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // 返回统计数据
      res.json({
        success: true,
        data: {
          metrics: [
            {
              label: scope.projects === 'my_projects' ? '参与项目' : '项目总数',
              value: projectStats?.total || 0,
              displayValue: String(projectStats?.total || 0),
            },
            {
              label: scope.users === 'self' ? '我的进行中' : '进行中任务',
              value: taskStats?.in_progress || 0,
              displayValue: String(taskStats?.in_progress || 0),
            },
            {
              label: scope.users === 'self' ? '我的已完成' : '已完成任务',
              value: completedStats?.total || 0,
              displayValue: String(completedStats?.total || 0),
            },
            {
              label: scope.users === 'self' ? '我的到期任务' : '延期预警',
              value: warningStats?.total || 0,
              displayValue: String(warningStats?.total || 0),
              trend: 0,
            },
          ],
          completionRate,
          scope: {
            projects: scope.projects,
            users: scope.users,
          },
        },
      });
    } catch (error) {
      console.error('获取仪表板统计失败:', error);
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

      const db = getDb(req);
      const scope = ScopeService.getDataScope(user);

      // 构建过滤条件
      const taskResult = ScopeService.buildTaskFilter(user);
      const params: Record<string, unknown> = { ...taskResult.params };

      // 查询趋势数据
      const trends = await db('wbs_tasks as t')
        .select(
          db.raw('DATE(t.created_at) as date'),
          db.raw('COUNT(*) as created'),
        )
        .whereRaw('t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [daysNum])
        .whereRaw(taskResult.whereClause || '1=1', params)
        .groupByRaw('DATE(t.created_at)')
        .orderBy('date');

      // 查询完成趋势
      const completedTrends = await db('wbs_tasks as t')
        .select(
          db.raw('DATE(t.completed_at) as date'),
          db.raw('COUNT(*) as completed'),
        )
        .whereRaw('t.completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)', [daysNum])
        .where('t.status', 'completed')
        .whereRaw(taskResult.whereClause || '1=1', params)
        .groupByRaw('DATE(t.completed_at)')
        .orderBy('date');

      // 合并数据
      const dateMap = new Map<string, { created: number; completed: number; delayed: number }>();

      trends.forEach((item: any) => {
        dateMap.set(item.date, {
          created: item.created,
          completed: 0,
          delayed: 0,
        });
      });

      completedTrends.forEach((item: any) => {
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

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取趋势数据失败:', error);
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

      const db = getDb(req);
      const scope = ScopeService.getDataScope(user);

      // 构建过滤条件
      const taskResult = ScopeService.buildTaskFilter(user);
      const projectResult = ScopeService.buildProjectFilter(user);
      const params: Record<string, unknown> = {
        ...taskResult.params,
        ...projectResult.params,
      };

      // 查询紧急任务
      const urgentTasks = await db('wbs_tasks as t')
        .select(
          't.id',
          't.name',
          't.progress',
          't.end_date as dueDate',
          't.status',
          'p.name as projectName',
        )
        .leftJoin('projects as p', 't.project_id', 'p.id')
        .whereRaw('t.status = "in_progress" AND t.progress < 100')
        .whereRaw(taskResult.whereClause || '1=1', params)
        .whereRaw(projectResult.whereClause || '1=1', params)
        .whereRaw('t.end_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)')
        .orderBy('t.end_date')
        .limit(10);

      // 计算逾期天数
      const tasks = urgentTasks.map((task: any) => {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...task,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          priority: daysOverdue > 0 ? 'high' : daysOverdue === 0 ? 'medium' : 'low',
        };
      });

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error('获取紧急任务失败:', error);
      res.status(500).json({ error: '获取紧急任务失败' });
    }
  }
}

export default DashboardController;
