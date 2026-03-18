// app/server/src/modules/analytics/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './service';
import { ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type { ReportQueryOptions, ProjectTypeConfig, TaskTypeConfig, HolidayConfig } from './types';

const router = Router();
const analyticsService = new AnalyticsService();

function getCurrentUser(req: Request): User | null {
  return (req as any).user || null;
}

function requireUser(req: Request): User {
  const user = getCurrentUser(req);
  if (!user) throw new ValidationError('未登录');
  return user;
}

function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// ========== 仪表板 ==========

router.get('/dashboard/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req);
    const userId = currentUser?.id || 0;
    const admin = currentUser ? isAdmin(currentUser) : false;
    const result = await analyticsService.getDashboardStats(userId, admin);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, project_id } = req.query;
    const trends = await analyticsService.getTaskTrend(
      start_date as string,
      end_date as string,
      project_id as string
    );
    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
});

// ========== 报表分析 ==========

router.get('/reports/project-progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { project_id } = req.query;
    if (!project_id) {
      throw new ValidationError('项目ID不能为空');
    }
    const report = await analyticsService.getProjectProgressReport(project_id as string, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/task-statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const options: ReportQueryOptions = {
      project_id: req.query.project_id as string,
      assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };
    const report = await analyticsService.getTaskStatisticsReport(options, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/delay-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const options: ReportQueryOptions = {
      project_id: req.query.project_id as string,
      delay_type: req.query.delay_type as any,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };
    const report = await analyticsService.getDelayAnalysisReport(options, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/member-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { member_id } = req.query;
    if (!member_id) {
      throw new ValidationError('成员ID不能为空');
    }
    const report = await analyticsService.getMemberAnalysisReport(parseInt(member_id as string), currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ========== 系统配置 - 项目类型 ==========

router.get('/config/project-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await analyticsService.getProjectTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

router.post('/config/project-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await analyticsService.updateProjectTypes(req.body as ProjectTypeConfig[], currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 系统配置 - 任务类型 ==========

router.get('/config/task-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await analyticsService.getTaskTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

router.post('/config/task-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await analyticsService.updateTaskTypes(req.body as TaskTypeConfig[], currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 系统配置 - 节假日 ==========

router.get('/config/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const holidays = await analyticsService.getHolidays(year);
    res.json({ success: true, data: holidays });
  } catch (error) {
    next(error);
  }
});

router.post('/config/holidays', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await analyticsService.createHoliday(req.body as HolidayConfig, currentUser);
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/config/holidays/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    await analyticsService.deleteHoliday(req.params.date, currentUser);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ========== 导入导出 ==========

router.get('/export/:domain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { domain } = req.params;
    const format = (req.query.format as 'xlsx' | 'csv' | 'json') || 'xlsx';
    const buffer = await analyticsService.exportData(domain, format);

    const mimeTypes: Record<string, string> = {
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
    };

    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${domain}_export.${format}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.post('/import/:domain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { domain } = req.params;
    const { data } = req.body;
    const result = await analyticsService.importData(domain, data, currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/templates/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = await analyticsService.downloadTemplate(req.params.type);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}_template.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
