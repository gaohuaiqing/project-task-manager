// app/server/src/modules/analytics/routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './service';
import { ValidationError } from '../../core/errors';
import { requirePermission } from '../../core/middleware/permission-middleware';
import type { User } from '../../core/types';
import type { ReportQueryOptions, ProjectTypeConfig, TaskTypeConfig, HolidayConfig, ResourceEfficiencyQueryOptions, MemberAnalysisQueryOptions } from './types';
import { auditService } from '../../core/audit';
import type { AuditCategory } from '../../core/types';

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

// ========== 仪表板 ==========

router.get('/dashboard/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await analyticsService.getDashboardStats(currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const { start_date, end_date, project_id } = req.query;
    const trends = await analyticsService.getTaskTrend(
      start_date as string,
      end_date as string,
      currentUser,
      project_id as string
    );
    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
});

// 获取所有项目进度（仪表板专用）
router.get('/dashboard/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const projects = await analyticsService.getAllProjectsProgress(currentUser);
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// ========== 报表分析（需要 REPORT_VIEW 权限）==========

router.get('/reports/project-progress', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
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

router.get('/reports/task-statistics', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
    const options: ReportQueryOptions = {
      project_id: req.query.project_id as string,
      assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      task_type: req.query.task_type as string,  // v1.2 新增：任务类型筛选
    };
    const report = await analyticsService.getTaskStatisticsReport(options, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/delay-analysis', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
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

router.get('/reports/member-analysis', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
    const options: MemberAnalysisQueryOptions = {
      member_id: req.query.member_id ? parseInt(req.query.member_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };
    const report = await analyticsService.getMemberAnalysisExtended(options, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// 资源效能分析报表（v1.2 新增）
router.get('/reports/resource-efficiency', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
    const options: ResourceEfficiencyQueryOptions = {
      project_id: req.query.project_id as string,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
      tech_group_id: req.query.tech_group_id ? parseInt(req.query.tech_group_id as string) : undefined,
      productivity_threshold: req.query.productivity_threshold ? parseFloat(req.query.productivity_threshold as string) : undefined,
    };
    const report = await analyticsService.getResourceEfficiencyReport(options, currentUser);
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// ========== 趋势指标 ==========

// 仪表板统计卡片趋势
router.get('/dashboard/trends-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const result = await analyticsService.getDashboardTrends(currentUser, days);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ========== 仪表板详情（按角色聚合） ==========

router.get('/dashboard/admin/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await analyticsService.getDashboardAdminDetail(currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/dept-manager/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await analyticsService.getDashboardDeptManagerDetail(currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/tech-manager/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const groupId = req.query.group_id ? parseInt(req.query.group_id as string) : undefined;
    const result = await analyticsService.getDashboardTechManagerDetail(currentUser, groupId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/engineer/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = requireUser(req);
    const result = await analyticsService.getDashboardEngineerDetail(currentUser);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 报表时间序列趋势（需要 REPORT_VIEW 权限）
router.get('/reports/trend', requirePermission('REPORT_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
    const metric = req.query.metric as 'tasks_created' | 'tasks_completed' | 'tasks_delayed' | 'project_progress';
    if (!metric) {
      throw new ValidationError('metric 参数不能为空');
    }
    const endDate = (req.query.end_date as string) || new Date().toISOString().split('T')[0];
    const startDate = (req.query.start_date as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const granularity = (req.query.granularity as 'day' | 'week' | 'month') || 'week';
    const projectId = req.query.project_id as string;

    const result = await analyticsService.getReportTrend(currentUser, metric, startDate, endDate, granularity, projectId);
    res.json({ success: true, data: result });
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

// ========== 导入导出（需要相应权限）==========

router.get('/export/:domain', requirePermission('REPORT_EXPORT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
    const { domain } = req.params;
    const format = (req.query.format as 'xlsx' | 'csv' | 'json') || 'xlsx';
    const filters: ReportQueryOptions = {
      project_id: req.query.project_id as string,
      assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id as string) : undefined,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      delay_type: req.query.delay_type as any,
    };
    const buffer = await analyticsService.exportData(domain, format, currentUser, filters);

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

router.post('/import/:domain', requirePermission('DATA_IMPORT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = getCurrentUser(req)!;
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

// ========== 审计日志（需要 AUDIT_LOG_VIEW 权限）==========

/**
 * 获取审计日志列表
 * 权限: admin, dept_manager（通过 AUDIT_LOG_VIEW 权限控制）
 */
router.get('/audit-logs', requirePermission('AUDIT_LOG_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await auditService.query({
      category: req.query.category as AuditCategory,
      action: req.query.action as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取审计日志筛选选项
 */
router.get('/audit-logs/options', requirePermission('AUDIT_LOG_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actionTypes = auditService.getActionTypes();

    res.json({
      success: true,
      data: {
        categories: [
          { value: 'security', label: '安全' },
          { value: 'project', label: '项目' },
          { value: 'task', label: '任务' },
          { value: 'org', label: '组织' },
          { value: 'config', label: '配置' },
        ],
        actionTypes,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 导出审计日志
 */
router.get('/audit-logs/export', requirePermission('AUDIT_LOG_VIEW'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 查询数据（限制最多1000条）
    const result = await auditService.query({
      category: req.query.category as AuditCategory,
      action: req.query.action as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      search: req.query.search as string,
      page: 1,
      pageSize: 1000,
    });

    // 转换为 CSV
    const headers = ['时间', '用户', '角色', '分类', '操作', '详情', 'IP地址'];
    const rows = result.items.map((log) => [
      log.created_at instanceof Date ? log.created_at.toISOString() : log.created_at,
      log.actor_username || '',
      log.actor_role || '',
      log.category,
      log.action,
      (log.details || '').replace(/"/g, '""'),
      log.ip_address || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    // 添加 BOM 以支持中文
    res.send('\ufeff' + csv);
  } catch (error) {
    next(error);
  }
});

export default router;
