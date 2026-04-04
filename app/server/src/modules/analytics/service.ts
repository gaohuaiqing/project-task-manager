// app/server/src/modules/analytics/service.ts
import { AnalyticsRepository } from './repository';
import { ForbiddenError, ValidationError } from '../../core/errors';
import type { User } from '../../core/types';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig, AuditLogQueryOptions,
  TrendDataPoint, ProjectProgressItem, StatsWithTrend, TimeSeriesPoint,
  ResourceEfficiencyReport, ResourceEfficiencyQueryOptions
} from './types';

export class AnalyticsService {
  private repo = new AnalyticsRepository();

  // ========== 仪表板 ==========

  async getDashboardStats(user: User): Promise<DashboardStats & { urgent_tasks: unknown[] }> {
    const stats = await this.repo.getDashboardStats(user);
    const urgentTasks = await this.repo.getUrgentTasks(user);

    return {
      ...stats,
      urgent_tasks: urgentTasks,
    };
  }

  async getTaskTrend(startDate: string, endDate: string, user: User, projectId?: string): Promise<TrendDataPoint[]> {
    return this.repo.getTaskTrend(startDate, endDate, user, projectId);
  }

  // ========== 获取所有项目进度（仪表板专用） ==========

  async getAllProjectsProgress(user: User): Promise<ProjectProgressItem[]> {
    return this.repo.getAllProjectsProgress(user);
  }

  // ========== 报表分析 ==========

  async getProjectProgressReport(projectId: string, currentUser: User): Promise<ProjectProgressReport | null> {
    // 验证权限
    // 简化实现
    return this.repo.getProjectProgressReport(projectId);
  }

  async getTaskStatisticsReport(options: ReportQueryOptions, currentUser: User): Promise<TaskStatisticsReport> {
    // 权限检查：engineer 不可见报表分析模块
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看任务统计报表');
    }
    return this.repo.getTaskStatisticsReport(options, currentUser);
  }

  async getDelayAnalysisReport(options: ReportQueryOptions, currentUser: User): Promise<DelayAnalysisReport> {
    // 权限检查：engineer 不可见报表分析模块
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看延期分析报表');
    }
    return this.repo.getDelayAnalysisReport(options, currentUser);
  }

  async getMemberAnalysisReport(memberId: number, currentUser: User): Promise<MemberAnalysisReport | null> {
    // 权限检查：engineer 不可见报表分析模块
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看成员任务分析报表');
    }

    // 数据范围验证：检查当前用户是否有权查看该成员数据
    await this.validateMemberAccess(memberId, currentUser);

    return this.repo.getMemberAnalysisReport(memberId);
  }

  async getResourceEfficiencyReport(options: ResourceEfficiencyQueryOptions, currentUser: User): Promise<ResourceEfficiencyReport> {
    // 权限检查：engineer 不可见
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看资源效能分析报表');
    }
    return this.repo.getResourceEfficiencyReport(options);
  }

  // ========== 系统配置 ==========

  async getProjectTypes(): Promise<ProjectTypeConfig[]> {
    return this.repo.getProjectTypes();
  }

  async updateProjectTypes(types: ProjectTypeConfig[], currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以修改项目类型配置');
    }
    await this.repo.updateProjectTypes(types);
  }

  async getTaskTypes(): Promise<TaskTypeConfig[]> {
    return this.repo.getTaskTypes();
  }

  async updateTaskTypes(types: TaskTypeConfig[], currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以修改任务类型配置');
    }
    await this.repo.updateTaskTypes(types);
  }

  async getHolidays(year?: number): Promise<HolidayConfig[]> {
    return this.repo.getHolidays(year);
  }

  async createHoliday(holiday: HolidayConfig, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以添加节假日');
    }
    await this.repo.createHoliday(holiday);
  }

  async deleteHoliday(date: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除节假日');
    }
    await this.repo.deleteHoliday(date);
  }

  // ========== 审计日志查询 ==========

  async getAuditLogs(options: AuditLogQueryOptions, currentUser: User): Promise<{ items: unknown[]; total: number }> {
    if (currentUser.role !== 'admin') {
      // 非管理员只能查看自己的日志
      options.user_id = currentUser.id;
    }
    return this.repo.getAuditLogs(options);
  }

  // ========== 趋势指标 ==========

  /**
   * 获取仪表板统计卡片的趋势数据
   * 对比当前周期 vs 上一个同等周期
   */
  async getDashboardTrends(user: User, days: number = 30): Promise<Record<string, StatsWithTrend>> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const [activeProjects, totalTasks, completedTasks, delayWarning, overdue] = await Promise.all([
      this.repo.getStatsWithTrend(user, 'active_projects', startDate, endDate),
      this.repo.getStatsWithTrend(user, 'total_tasks', startDate, endDate),
      this.repo.getStatsWithTrend(user, 'completed_tasks', startDate, endDate),
      this.repo.getStatsWithTrend(user, 'delay_warning', startDate, endDate),
      this.repo.getStatsWithTrend(user, 'overdue', startDate, endDate),
    ]);

    return {
      active_projects: activeProjects,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      delay_warning: delayWarning,
      overdue: overdue,
    };
  }

  /**
   * 获取报表的时间序列趋势数据
   */
  async getReportTrend(
    user: User,
    metric: 'tasks_created' | 'tasks_completed' | 'tasks_delayed' | 'project_progress',
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'week',
    projectId?: string,
  ): Promise<TimeSeriesPoint[]> {
    return this.repo.getTimeSeries(user, metric, startDate, endDate, granularity, projectId);
  }

  // ========== 导入导出 ==========

  async exportData(domain: string, format: 'xlsx' | 'csv' | 'json', user: User, filters?: ReportQueryOptions): Promise<Buffer> {
    // 获取报表数据
    let data: Record<string, unknown>;
    switch (domain) {
      case 'task-statistics': {
        const report = await this.repo.getTaskStatisticsReport(filters || {});
        data = report as unknown as Record<string, unknown>;
        break;
      }
      case 'delay-analysis': {
        const report = await this.repo.getDelayAnalysisReport(filters || {});
        data = report as unknown as Record<string, unknown>;
        break;
      }
      case 'project-progress': {
        if (!filters?.project_id) {
          throw new ValidationError('项目进度导出需要指定项目ID');
        }
        const report = await this.repo.getProjectProgressReport(filters.project_id);
        if (!report) throw new ValidationError('项目不存在');
        data = report as unknown as Record<string, unknown>;
        break;
      }
      default:
        throw new ValidationError(`不支持的导出类型: ${domain}`);
    }

    // JSON 格式直接返回
    if (format === 'json') {
      return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
    }

    // Excel/CSV 使用 exceljs
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('数据');

    // 根据 domain 写入不同的列和数据行
    this.writeDomainData(workbook, worksheet, domain, data);

    if (format === 'csv') {
      const csvBuffer = await workbook.csv.writeBuffer();
      return Buffer.from(String(csvBuffer), 'utf-8');
    }

    // xlsx
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
  }

  /**
   * 根据报表类型写入Excel数据
   */
  private writeDomainData(
    workbook: any,
    worksheet: any,
    domain: string,
    data: Record<string, unknown>,
  ): void {
    // 通用样式
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center' as const },
    };

    switch (domain) {
      case 'task-statistics': {
        // 写入任务明细列表
        const taskList = (data.task_list || []) as Array<Record<string, unknown>>;
        worksheet.columns = [
          { header: '任务ID', key: 'id', width: 15 },
          { header: '任务描述', key: 'description', width: 40 },
          { header: '项目', key: 'project_name', width: 20 },
          { header: '负责人', key: 'assignee_name', width: 15 },
          { header: '状态', key: 'status', width: 15 },
          { header: '进度(%)', key: 'progress', width: 10 },
          { header: '优先级', key: 'priority', width: 10 },
          { header: '计划结束日期', key: 'planned_end_date', width: 15 },
        ];
        // 设置表头样式
        worksheet.getRow(1).eachCell((cell: any) => {
          cell.style = headerStyle;
        });
        taskList.forEach((task) => {
          worksheet.addRow(task);
        });
        break;
      }

      case 'delay-analysis': {
        // 写入延期任务列表
        const delayedTasks = (data.delayed_tasks || []) as Array<Record<string, unknown>>;
        worksheet.columns = [
          { header: '任务ID', key: 'id', width: 15 },
          { header: '任务描述', key: 'description', width: 40 },
          { header: '项目', key: 'project_name', width: 20 },
          { header: '负责人', key: 'assignee_name', width: 15 },
          { header: '延期类型', key: 'delay_type', width: 15 },
          { header: '延期天数', key: 'delay_days', width: 10 },
          { header: '原因', key: 'reason', width: 30 },
          { header: '状态', key: 'status', width: 15 },
        ];
        worksheet.getRow(1).eachCell((cell: any) => {
          cell.style = headerStyle;
        });
        delayedTasks.forEach((task) => {
          worksheet.addRow(task);
        });
        break;
      }

      case 'project-progress': {
        // 写入项目进度数据
        const milestones = (data.milestones || []) as Array<Record<string, unknown>>;
        const statusDist = (data.status_distribution || []) as Array<Record<string, unknown>>;
        // Sheet 1: 里程碑
        worksheet.columns = [
          { header: '里程碑名称', key: 'name', width: 30 },
          { header: '目标日期', key: 'target_date', width: 15 },
          { header: '完成百分比(%)', key: 'completion_percentage', width: 15 },
          { header: '状态', key: 'status', width: 15 },
        ];
        worksheet.getRow(1).eachCell((cell: any) => {
          cell.style = headerStyle;
        });
        milestones.forEach((ms) => {
          worksheet.addRow(ms);
        });
        // Sheet 2: 状态分布
        const sheet2 = workbook.addWorksheet('任务状态分布');
        sheet2.columns = [
          { header: '状态', key: 'status', width: 20 },
          { header: '数量', key: 'count', width: 10 },
        ];
        sheet2.getRow(1).eachCell((cell: any) => {
          cell.style = headerStyle;
        });
        statusDist.forEach((item) => {
          sheet2.addRow(item);
        });
        break;
      }

      default:
        worksheet.columns = [
          { header: '数据', key: 'data', width: 50 },
        ];
        worksheet.addRow({ data: JSON.stringify(data) });
    }
  }

  async importData(domain: string, data: unknown[], currentUser: User): Promise<{ success: boolean; total: number; succeeded: number; failed: number }> {
    // 简化实现
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
    };
  }

  async downloadTemplate(type: string): Promise<Buffer> {
    // 简化实现，返回空 Buffer
    return Buffer.from('');
  }
}
