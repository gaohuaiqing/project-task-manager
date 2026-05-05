// app/server/src/modules/analytics/service.ts
import { AnalyticsRepository } from './repository';
import { WorkflowRepository } from '../workflow/repository';
import { ForbiddenError, ValidationError } from '../../core/errors';
import { DEFAULTS, TIME_INTERVALS } from './constants';
import { getPool } from '../../core/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { User } from '../../core/types';
import type {
  DashboardStats, ProjectProgressReport, TaskStatisticsReport,
  DelayAnalysisReport, MemberAnalysisReport, ReportQueryOptions,
  ProjectTypeConfig, TaskTypeConfig, HolidayConfig, AuditLogQueryOptions,
  TrendDataPoint, ProjectProgressItem, StatsWithTrend, TimeSeriesPoint,
  ResourceEfficiencyReport, ResourceEfficiencyQueryOptions,
  MemberAnalysisExtendedResponse, MemberAnalysisQueryOptions,
  AdminDashboardDetailResponse, DeptManagerDashboardDetailResponse,
  TechManagerDashboardDetailResponse, EngineerDashboardDetailResponse,
} from './types';
import { MetricsService, ScopeService, TrendService } from './services';
import type { Workbook, Worksheet, Cell } from 'exceljs';
import type { TaskPriority, TaskType } from '../task/types';
import type { ProjectType } from '../project/types';

export class AnalyticsService {
  private repo = new AnalyticsRepository();
  private workflowRepo = new WorkflowRepository();

  // ========== 仪表板 ==========

  async getDashboardStats(user: User): Promise<DashboardStats & { urgent_tasks: unknown[] }> {
    const stats = await this.repo.getDashboardStats(user);
    const urgentTasks = await this.repo.getUrgentTasks(user);

    // 修正 pending_approval_tasks：使用审批链逻辑，仅统计需要当前用户审批的数量
    // 管理员看全部，技术经理仅看本技术组，部门经理仅在无技术经理时兜底
    if (user.role === 'admin' || user.role === 'tech_manager' || user.role === 'dept_manager') {
      const myPendingApprovals = await this.workflowRepo.getPendingApprovalsCountForUser(user.id);
      stats.pending_approval_tasks = myPendingApprovals;
    }

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

  /**
   * 获取优先级完成率趋势
   */
  async getPriorityCompletionTrend(
    startDate: string,
    endDate: string,
    user: User,
    projectId?: string
  ): Promise<Array<{ period: string; priority: string; completionRate: number; totalTasks: number; completedTasks: number }>> {
    // 权限检查：engineer 不可见报表分析模块
    if (user.role === 'engineer') {
      throw new ForbiddenError('无权限查看优先级完成率趋势');
    }
    return this.repo.getPriorityCompletionTrend(startDate, endDate, user, projectId);
  }

  // ========== 报表分析 ==========

  async getProjectProgressReport(projectId: string, currentUser: User): Promise<ProjectProgressReport | null> {
    // 权限检查：engineer 不可见报表分析模块
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看项目进度报表');
    }
    return this.repo.getProjectProgressReport(projectId, currentUser);
  }

  /**
   * 获取项目进度汇总报表（多项目对比视图）
   */
  async getProjectProgressSummary(currentUser: User): Promise<import('./types').ProjectProgressSummary> {
    // 权限检查：engineer 不可见报表分析模块
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看项目进度报表');
    }
    return this.repo.getProjectProgressSummary(currentUser);
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
    // 简化实现：仅允许查看自己或同部门成员
    // TODO: 使用 ScopeService.canAccessMember 实现更完整的权限检查

    return this.repo.getMemberAnalysisReport(memberId, currentUser);
  }

  /**
   * 成员分析扩展（支持多成员对比）
   * member_id 可选：不传则返回全部成员对比数据
   */
  async getMemberAnalysisExtended(
    options: MemberAnalysisQueryOptions,
    currentUser: User,
  ): Promise<MemberAnalysisExtendedResponse> {
    // 权限检查：engineer 不可见
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看成员任务分析报表');
    }

    return this.repo.getMemberAnalysisExtended(options, currentUser);
  }

  async getResourceEfficiencyReport(options: ResourceEfficiencyQueryOptions, currentUser: User): Promise<ResourceEfficiencyReport> {
    // 权限检查：engineer 不可见
    if (currentUser.role === 'engineer') {
      throw new ForbiddenError('无权限查看资源效能分析报表');
    }
    return this.repo.getResourceEfficiencyReport(options, currentUser);
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
  async getDashboardTrends(user: User, days: number = DEFAULTS.TREND_DAYS): Promise<Record<string, StatsWithTrend>> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * TIME_INTERVALS.MS_PER_DAY).toISOString().split('T')[0];

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
        const report = await this.repo.getTaskStatisticsReport(filters || {}, user);
        data = report as unknown as Record<string, unknown>;
        break;
      }
      case 'delay-analysis': {
        const report = await this.repo.getDelayAnalysisReport(filters || {}, user);
        data = report as unknown as Record<string, unknown>;
        break;
      }
      case 'project-progress': {
        // 支持不指定项目ID时导出全部项目进度
        if (filters?.project_id) {
          const report = await this.repo.getProjectProgressReport(filters.project_id, user);
          if (!report) throw new ValidationError('项目不存在');
          data = report as unknown as Record<string, unknown>;
        } else {
          const report = await this.repo.getAllProjectsProgress(user);
          data = { projects: report } as unknown as Record<string, unknown>;
        }
        break;
      }
      case 'member-analysis': {
        const report = await this.repo.getMemberAnalysisExtended(filters || {}, user);
        data = report as unknown as Record<string, unknown>;
        break;
      }
      case 'resource-efficiency': {
        const report = await this.repo.getResourceEfficiencyReport(filters || {}, user);
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

    // Excel/CSV 使用 exceljs（兼容ESM和CommonJS导出）
    const exceljsModule = await import('exceljs');
    const ExcelJS = exceljsModule.default || exceljsModule;
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
    workbook: Workbook,
    worksheet: Worksheet,
    domain: string,
    data: Record<string, unknown>,
  ): void {
    // 通用样式
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
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
        worksheet.getRow(1).eachCell((cell: Cell) => {
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
        worksheet.getRow(1).eachCell((cell: Cell) => {
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
        worksheet.getRow(1).eachCell((cell: Cell) => {
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
        sheet2.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        statusDist.forEach((item) => {
          sheet2.addRow(item);
        });
        break;
      }

      case 'member-analysis': {
        // Sheet 1: 成员汇总
        const membersSummary = (data.members_summary || []) as Array<Record<string, unknown>>;
        worksheet.columns = [
          { header: '成员姓名', key: 'member_name', width: 15 },
          { header: '部门', key: 'department', width: 15 },
          { header: '当前任务数', key: 'current_tasks', width: 12 },
          { header: '全职比合计', key: 'total_full_time_ratio', width: 12 },
          { header: '平均完成率(%)', key: 'avg_completion_rate', width: 14 },
          { header: '预估准确性(%)', key: 'estimation_accuracy', width: 14 },
          { header: '活跃度(%)', key: 'activity_rate', width: 12 },
        ];
        worksheet.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        membersSummary.forEach((member) => {
          worksheet.addRow(member);
        });
        // Sheet 2: 预估准确性分布
        const estimationDist = (data.estimation_distribution || []) as Array<Record<string, unknown>>;
        const sheet2 = workbook.addWorksheet('预估准确性分布');
        sheet2.columns = [
          { header: '类别', key: 'category', width: 15 },
          { header: '数量', key: 'count', width: 10 },
        ];
        sheet2.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        estimationDist.forEach((item) => {
          sheet2.addRow(item);
        });
        // Sheet 3: 分配建议
        const suggestions = (data.suggestions || []) as Array<Record<string, unknown>>;
        const sheet3 = workbook.addWorksheet('分配建议');
        sheet3.columns = [
          { header: '建议类型', key: 'type', width: 15 },
          { header: '成员', key: 'member_name', width: 15 },
          { header: '当前负载', key: 'current_load', width: 12 },
          { header: '建议', key: 'suggestion', width: 30 },
        ];
        sheet3.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        suggestions.forEach((item) => {
          sheet3.addRow(item);
        });
        break;
      }

      case 'resource-efficiency': {
        // Sheet 1: 成员效能明细
        const efficiencyList = (data.member_efficiency_list || []) as Array<Record<string, unknown>>;
        worksheet.columns = [
          { header: '成员姓名', key: 'member_name', width: 15 },
          { header: '部门', key: 'department', width: 15 },
          { header: '技术组', key: 'tech_group', width: 15 },
          { header: '完成任务数', key: 'completed_tasks', width: 12 },
          { header: '产能', key: 'productivity', width: 10 },
          { header: '预估准确性(%)', key: 'estimation_accuracy', width: 14 },
          { header: '返工率(%)', key: 'rework_rate', width: 12 },
          { header: '全职比利用率(%)', key: 'fulltime_utilization', width: 14 },
        ];
        worksheet.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        efficiencyList.forEach((item) => {
          worksheet.addRow(item);
        });
        // Sheet 2: 团队效能对比
        const teamComparison = (data.team_efficiency_comparison || []) as Array<Record<string, unknown>>;
        const sheet2 = workbook.addWorksheet('团队效能对比');
        sheet2.columns = [
          { header: '团队名称', key: 'team_name', width: 20 },
          { header: '团队类型', key: 'team_type', width: 12 },
          { header: '成员数', key: 'member_count', width: 10 },
          { header: '平均产能', key: 'avg_productivity', width: 12 },
          { header: '平均预估准确性', key: 'avg_estimation_accuracy', width: 14 },
          { header: '平均返工率', key: 'avg_rework_rate', width: 12 },
        ];
        sheet2.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        teamComparison.forEach((item) => {
          sheet2.addRow(item);
        });
        // Sheet 3: 产能趋势
        const trendData = (data.productivity_trend || []) as Array<Record<string, unknown>>;
        const sheet3 = workbook.addWorksheet('产能趋势');
        sheet3.columns = [
          { header: '周期', key: 'period', width: 15 },
          { header: '产能', key: 'productivity', width: 10 },
          { header: '完成任务数', key: 'task_count', width: 12 },
        ];
        sheet3.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });
        trendData.forEach((item) => {
          sheet3.addRow(item);
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

  async importData(domain: string, data: unknown[], currentUser: User): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('导入数据不能为空，请提供数组格式的数据');
    }

    const errors: Array<{ row: number; message: string }> = [];
    let succeeded = 0;

    switch (domain) {
      case 'tasks': {
        const { TaskService } = await import('../task/service');
        const taskService = new TaskService();

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as Record<string, unknown>;
          try {
            // 必填字段验证
            if (!row.description) {
              errors.push({ row: i + 1, message: '任务描述不能为空' });
              continue;
            }
            if (!row.project_id) {
              errors.push({ row: i + 1, message: '项目ID不能为空' });
              continue;
            }

            await taskService.createTask({
              description: String(row.description),
              project_id: String(row.project_id),
              assignee_id: row.assignee_id ? Number(row.assignee_id) : undefined,
              priority: (row.priority as TaskPriority) || 'medium',
              wbs_level: 0,
              start_date: row.planned_start_date ? String(row.planned_start_date) : undefined,
              task_type: (row.task_type as TaskType) || 'other',
              full_time_ratio: row.fulltime_ratio ? Number(row.fulltime_ratio) : undefined,
            }, currentUser);
            succeeded++;
          } catch (err: any) {
            errors.push({ row: i + 1, message: err.message || '创建失败' });
          }
        }
        break;
      }

      case 'projects': {
        const { ProjectService } = await import('../project/service');
        const projectService = new ProjectService();

        // 获取项目类型配置（用于中文名称到代码的转换）
        const projectTypes = await this.repo.getProjectTypes();
        const nameToCodeMap = new Map(projectTypes.map(t => [t.name, t.code]));
        const validCodes = projectTypes.map(t => t.code);

        // 日期格式正则
        const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

        // 获取所有有效用户ID（用于成员验证）
        const validUserIds = await this.getValidUserIds();

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as Record<string, unknown>;
          const rowNumber = i + 1;

          try {
            // ===== 必填字段验证 =====
            if (!row.code || String(row.code).trim() === '') {
              errors.push({ row: rowNumber, message: '项目编码不能为空' });
              continue;
            }
            if (!row.name || String(row.name).trim() === '') {
              errors.push({ row: rowNumber, message: '项目名称不能为空' });
              continue;
            }
            if (!row.project_type || String(row.project_type).trim() === '') {
              errors.push({ row: rowNumber, message: '项目类型不能为空' });
              continue;
            }
            if (!row.planned_start_date || !row.planned_end_date) {
              errors.push({ row: rowNumber, message: '开始日期和截止日期为必填项' });
              continue;
            }

            // ===== 项目类型验证与转换 =====
            // 支持中文名称或代码
            const projectTypeInput = String(row.project_type).trim();
            let projectTypeCode: string | undefined;

            if (nameToCodeMap.has(projectTypeInput)) {
              projectTypeCode = nameToCodeMap.get(projectTypeInput);
            } else if (validCodes.includes(projectTypeInput as ProjectType)) {
              projectTypeCode = projectTypeInput;
            }

            if (!projectTypeCode) {
              const validOptions = [...nameToCodeMap.keys(), ...validCodes].join('、');
              errors.push({
                row: rowNumber,
                message: `项目类型无效，可选值：${validOptions}`
              });
              continue;
            }

            // ===== 日期格式验证 =====
            const startDateStr = String(row.planned_start_date).trim();
            const endDateStr = String(row.planned_end_date).trim();

            if (!DATE_REGEX.test(startDateStr)) {
              errors.push({ row: rowNumber, message: '开始日期格式必须为 YYYY-MM-DD' });
              continue;
            }
            if (!DATE_REGEX.test(endDateStr)) {
              errors.push({ row: rowNumber, message: '截止日期格式必须为 YYYY-MM-DD' });
              continue;
            }

            // ===== 日期逻辑验证 =====
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              errors.push({ row: rowNumber, message: '日期格式无效，请检查日期是否正确' });
              continue;
            }
            if (endDate < startDate) {
              errors.push({ row: rowNumber, message: '截止日期不能早于开始日期' });
              continue;
            }

            // ===== 成员ID存在性验证 =====
            let memberIds: number[] = [];
            if (row.member_ids) {
              const idsStr = String(row.member_ids).trim();
              if (idsStr) {
                memberIds = idsStr.split(',')
                  .map(id => Number(id.trim()))
                  .filter(id => !isNaN(id) && id > 0);

                // 验证成员ID是否存在
                const invalidIds = memberIds.filter(id => !validUserIds.includes(id));
                if (invalidIds.length > 0) {
                  errors.push({
                    row: rowNumber,
                    message: `成员ID [${invalidIds.join(', ')}] 不存在`
                  });
                  continue;
                }
              }
            }
            if (memberIds.length === 0) {
              memberIds = [currentUser.id]; // 默认当前用户
            }

            // ===== 创建项目 =====
            await projectService.createProject({
              code: String(row.code).trim(),
              name: String(row.name).trim(),
              project_type: projectTypeCode as ProjectType,
              description: row.description ? String(row.description).trim() : undefined,
              planned_start_date: startDateStr,
              planned_end_date: endDateStr,
              member_ids: memberIds,
            }, currentUser);
            succeeded++;

          } catch (err: unknown) {
            // ===== 错误类型处理 =====
            const errorMessage = err instanceof Error ? err.message : '创建失败';
            if (err instanceof ValidationError) {
              errors.push({ row: rowNumber, message: errorMessage });
            } else if (err instanceof ForbiddenError) {
              errors.push({ row: rowNumber, message: '无权限创建项目，请联系管理员' });
            } else {
              errors.push({ row: rowNumber, message: errorMessage });
            }
          }
        }
        break;
      }

      default:
        throw new ValidationError(`不支持的导入类型: ${domain}，目前支持 tasks 和 projects`);
    }

    return {
      success: errors.length === 0,
      total: data.length,
      succeeded,
      failed: errors.length,
      errors,
    };
  }

  async downloadTemplate(type: string): Promise<Buffer> {
    const exceljsModule = await import('exceljs');
    const ExcelJS = exceljsModule.default || exceljsModule;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('导入模板');

    // 表头样式
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
      alignment: { horizontal: 'center' as const },
    };

    // 必填标注样式
    const requiredStyle = {
      font: { bold: true, color: { argb: 'FFFF0000' } },
      fill: { type: 'pattern' as const, pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
      alignment: { horizontal: 'center' as const },
    };

    switch (type) {
      case 'tasks': {
        worksheet.columns = [
          { header: '任务描述 *', key: 'description', width: 30 },
          { header: '项目ID *', key: 'project_id', width: 15 },
          { header: '负责人ID', key: 'assignee_id', width: 12 },
          { header: '优先级', key: 'priority', width: 10 },
          { header: '计划开始日期', key: 'planned_start_date', width: 16 },
          { header: '计划结束日期', key: 'planned_end_date', width: 16 },
          { header: '任务类型', key: 'task_type', width: 12 },
          { header: '全职比', key: 'fulltime_ratio', width: 10 },
        ];

        // 表头样式
        worksheet.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });

        // 示例数据
        worksheet.addRow({
          description: '实现用户登录功能',
          project_id: 'proj_001',
          assignee_id: '1',
          priority: 'high',
          planned_start_date: '2026-04-01',
          planned_end_date: '2026-04-15',
          task_type: 'development',
          fulltime_ratio: '0.8',
        });
        worksheet.addRow({
          description: '编写单元测试',
          project_id: 'proj_001',
          assignee_id: '2',
          priority: 'medium',
          planned_start_date: '2026-04-16',
          planned_end_date: '2026-04-20',
          task_type: 'testing',
          fulltime_ratio: '0.5',
        });
        break;
      }

      case 'projects': {
        // 获取系统中的项目类型配置
        const projectTypes = await this.repo.getProjectTypes();
        const projectTypeNames = projectTypes.map(t => t.name);

        worksheet.columns = [
          { header: '项目编码 *', key: 'code', width: 15 },
          { header: '项目名称 *', key: 'name', width: 25 },
          { header: '项目类型 *', key: 'project_type', width: 12 },
          { header: '项目描述', key: 'description', width: 30 },
          { header: '开始日期 *', key: 'planned_start_date', width: 16 },
          { header: '截止日期 *', key: 'planned_end_date', width: 16 },
          { header: '项目成员ID', key: 'member_ids', width: 20 },
        ];

        worksheet.getRow(1).eachCell((cell: Cell) => {
          cell.style = headerStyle;
        });

        // 示例数据（使用中文名称）
        const firstTypeName = projectTypeNames[0] || '产品开发';
        const secondTypeName = projectTypeNames[1] || projectTypeNames[0] || '职能管理';
        worksheet.addRow({
          code: 'PRJ-001',
          name: '新零售系统 v2.0',
          project_type: firstTypeName,
          description: '升级新零售系统核心功能',
          planned_start_date: '2026-04-01',
          planned_end_date: '2026-06-30',
          member_ids: '1,2,3',
        });
        worksheet.addRow({
          code: 'PRJ-002',
          name: '数据平台迁移',
          project_type: secondTypeName,
          description: '',
          planned_start_date: '2026-05-01',
          planned_end_date: '2026-08-31',
          member_ids: '4',
        });

        // 为项目类型列添加下拉验证（C列，从第2行开始）
        // 使用中文名称作为下拉选项
        if (projectTypeNames.length > 0) {
          const typeList = projectTypeNames.join(',');
          for (let row = 2; row <= 102; row++) {
            const cell = worksheet.getCell(`C${row}`);
            cell.dataValidation = {
              type: 'list',
              formulae: [`"${typeList}"`],
              allowBlank: false,
              showErrorMessage: true,
              errorStyle: 'error',
              errorTitle: '无效的项目类型',
              error: `请从列表中选择`,
            };
          }
        }
        break;
      }

      default:
        throw new ValidationError(`不支持的模板类型: ${type}`);
    }

    // 添加说明行
    const noteRow = worksheet.rowCount + 2;
    worksheet.getCell(`A${noteRow}`).value = '说明：带 * 的字段为必填项。日期格式为 YYYY-MM-DD。';
    worksheet.getCell(`A${noteRow}`).font = { italic: true, color: { argb: 'FF888888' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ========== 仪表板 Detail API（按角色聚合） ==========

  async getDashboardAdminDetail(user: User, projectId?: string): Promise<AdminDashboardDetailResponse> {
    if (user.role !== 'admin') throw new ForbiddenError('无权限访问管理员仪表板详情');
    return this.repo.getDashboardAdminDetail(user, projectId);
  }

  async getDashboardDeptManagerDetail(user: User, projectId?: string): Promise<DeptManagerDashboardDetailResponse> {
    if (user.role !== 'dept_manager') throw new ForbiddenError('无权限访问部门经理仪表板详情');
    return this.repo.getDashboardDeptManagerDetail(user, projectId);
  }

  async getDashboardTechManagerDetail(user: User, groupId?: number, projectId?: string): Promise<TechManagerDashboardDetailResponse> {
    if (user.role !== 'tech_manager') throw new ForbiddenError('无权限访问技术经理仪表板详情');
    return this.repo.getDashboardTechManagerDetail(user, groupId, projectId);
  }

  async getDashboardEngineerDetail(user: User, projectId?: string): Promise<EngineerDashboardDetailResponse> {
    if (user.role !== 'engineer') throw new ForbiddenError('无权限访问工程师仪表板详情');
    return this.repo.getDashboardEngineerDetail(user, projectId);
  }

  // ========== 辅助方法 ==========

  /**
   * 获取所有有效用户ID（用于导入时验证成员ID）
   */
  private async getValidUserIds(): Promise<number[]> {
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE is_active = 1'
    );
    return rows.map(r => r.id);
  }
}
