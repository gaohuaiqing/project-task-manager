// app/server/src/modules/analytics/service.ts
import { AnalyticsRepository } from './repository';
import { ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig, AuditLogQueryOptions
} from './types';

export class AnalyticsService {
  private repo = new AnalyticsRepository();

  // ========== 仪表板 ==========

  async getDashboardStats(userId: number, isAdmin: boolean): Promise<DashboardStats & { urgent_tasks: unknown[] }> {
    const stats = await this.repo.getDashboardStats(userId, isAdmin);
    const urgentTasks = await this.repo.getUrgentTasks(userId, isAdmin);

    return {
      ...stats,
      urgent_tasks: urgentTasks,
    };
  }

  async getTaskTrend(startDate: string, endDate: string, projectId?: string): Promise<unknown[]> {
    return this.repo.getTaskTrend(startDate, endDate, projectId);
  }

  // ========== 报表分析 ==========

  async getProjectProgressReport(projectId: string, currentUser: User): Promise<ProjectProgressReport | null> {
    // 验证权限
    // 简化实现
    return this.repo.getProjectProgressReport(projectId);
  }

  async getTaskStatisticsReport(options: ReportQueryOptions, currentUser: User): Promise<TaskStatisticsReport> {
    return this.repo.getTaskStatisticsReport(options);
  }

  async getDelayAnalysisReport(options: ReportQueryOptions, currentUser: User): Promise<DelayAnalysisReport> {
    return this.repo.getDelayAnalysisReport(options);
  }

  async getMemberAnalysisReport(memberId: number, currentUser: User): Promise<MemberAnalysisReport | null> {
    return this.repo.getMemberAnalysisReport(memberId);
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

  // ========== 导入导出 ==========

  async exportData(domain: string, format: 'xlsx' | 'csv' | 'json', filters?: ReportQueryOptions): Promise<Buffer> {
    // 简化实现，返回空 Buffer
    // 实际应该使用 exceljs 或类似库生成文件
    return Buffer.from('');
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
