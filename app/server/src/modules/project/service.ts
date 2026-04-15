// app/server/src/modules/project/service.ts
import { v4 as uuidv4 } from 'uuid';
import { ProjectRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import { audit } from '../../core/audit';
import type { User } from '../../core/types';
import type {
  Project, ProjectListItem, Milestone, Timeline,
  ProjectMember, Holiday, ProjectStats,
  CreateProjectRequest, UpdateProjectRequest,
  CreateMilestoneRequest, UpdateMilestoneRequest,
  CreateTimelineRequest, UpdateTimelineRequest,
  AddProjectMemberRequest, CreateHolidayRequest
} from './types';

export class ProjectService {
  private repo = new ProjectRepository();

  // ========== 项目管理 ==========

  async getProjects(options?: {
    status?: string;
    project_type?: string;
    member_id?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ProjectListItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const { items, total } = await this.repo.getProjects(options);
    const totalPages = Math.ceil(total / pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.repo.getProjectById(id);
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    return this.repo.getProjectStats(projectId);
  }

  async createProject(data: CreateProjectRequest, currentUser: User): Promise<string> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager') {
      throw new ForbiddenError('只有管理员或技术经理可以创建项目');
    }

    // 验证日期
    if (new Date(data.planned_end_date) < new Date(data.planned_start_date)) {
      throw new ValidationError('结束日期不能早于开始日期');
    }

    // 验证项目代号唯一性
    const existing = await this.repo.getProjectByCode(data.code);
    if (existing) {
      throw new ValidationError('项目代号已存在');
    }

    // 使用事务同时创建项目和添加成员，确保数据一致性
    const memberIds = data.member_ids || [];
    const { projectId } = await this.repo.createProjectWithMembers(data, memberIds);

    // 记录审计日志
    audit.log({
      userId: currentUser.id,
      username: currentUser.real_name,
      userRole: currentUser.role,
      category: 'project',
      action: 'CREATE',
      tableName: 'projects',
      recordId: String(projectId),
      details: `创建项目: ${data.name} (${data.code})`,
    });

    return String(projectId);
  }

  async updateProject(id: string, data: UpdateProjectRequest, currentUser: User): Promise<{ updated: boolean; conflict: boolean }> {
    // 验证项目存在
    const project = await this.repo.getProjectById(id);
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(id, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限更新此项目');
    }

    // 如果修改了编码，验证编码唯一性（排除当前项目）
    if (data.code && data.code !== project.code) {
      const existing = await this.repo.getProjectByCode(data.code);
      if (existing) {
        throw new ValidationError('项目编码已被其他项目使用');
      }
    }

    // 验证日期
    const startDate = data.planned_start_date || project.planned_start_date;
    const endDate = data.planned_end_date || project.planned_end_date;
    if (new Date(endDate) < new Date(startDate)) {
      throw new ValidationError('结束日期不能早于开始日期');
    }

    const result = await this.repo.updateProject(id, { ...data, version: data.version || project.version });

    // 如果更新成功且包含成员数据，同步更新项目成员表
    if (result.updated && data.member_ids !== undefined) {
      await this.syncProjectMembers(id, data.member_ids);
    }

    // 记录审计日志
    if (result.updated) {
      audit.log({
        userId: currentUser.id,
        username: currentUser.real_name,
        userRole: currentUser.role,
        category: 'project',
        action: 'UPDATE',
        tableName: 'projects',
        recordId: id,
        details: `更新项目: ${project.name}`,
        beforeData: { name: project.name, status: project.status },
        afterData: data as unknown as Record<string, unknown>,
      });
    }

    return result;
  }

  /**
   * 同步项目成员（比较新旧成员列表，增量更新）
   */
  private async syncProjectMembers(projectId: string, newMemberIds: number[]): Promise<void> {
    // 获取当前成员
    const currentMembers = await this.repo.getProjectMembers(projectId);
    const currentMemberIds = new Set(currentMembers.map(m => m.user_id));
    const newMemberIdSet = new Set(newMemberIds);

    // 找出需要添加的成员
    const toAdd = newMemberIds.filter(id => !currentMemberIds.has(id));
    // 找出需要移除的成员
    const toRemove = [...currentMemberIds].filter(id => !newMemberIdSet.has(id));

    // 添加新成员
    for (const userId of toAdd) {
      await this.repo.addProjectMember(projectId, { user_id: userId, role: 'member' });
    }

    // 移除旧成员
    for (const userId of toRemove) {
      await this.repo.removeProjectMember(projectId, userId);
    }
  }

  async deleteProject(id: string, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除项目');
    }

    // 验证项目存在
    const project = await this.repo.getProjectById(id);
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查是否有任务
    const hasTasks = await this.repo.hasProjectTasks(id);
    if (hasTasks) {
      throw new ValidationError('项目下有任务，无法删除');
    }

    const deleted = await this.repo.deleteProject(id);
    if (!deleted) {
      throw new ValidationError('删除项目失败');
    }

    // 记录审计日志
    audit.log({
      userId: currentUser.id,
      username: currentUser.real_name,
      userRole: currentUser.role,
      category: 'project',
      action: 'DELETE',
      tableName: 'projects',
      recordId: id,
      details: `删除项目: ${project.name} (${project.code})`,
    });
  }

  // ========== 里程碑管理 ==========

  async getMilestones(projectId: string): Promise<Milestone[]> {
    return this.repo.getMilestones(projectId);
  }

  async createMilestone(projectId: string, data: CreateMilestoneRequest, currentUser: User): Promise<string> {
    // 验证项目存在
    const project = await this.repo.getProjectById(projectId);
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(projectId, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限操作此项目');
    }

    const id = uuidv4();
    await this.repo.createMilestone({ ...data, id, project_id: projectId });

    // 更新项目进度（基于里程碑完成百分比平均值）
    await this.repo.updateProjectStats(projectId);

    return id;
  }

  async updateMilestone(id: string, data: UpdateMilestoneRequest, currentUser: User): Promise<boolean> {
    const milestone = await this.repo.getMilestoneById(id);
    if (!milestone) {
      throw new ValidationError('里程碑不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(milestone.project_id, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限操作此项目');
    }

    const updated = await this.repo.updateMilestone(id, data);

    // 更新项目进度（基于里程碑完成百分比平均值）
    if (updated) {
      await this.repo.updateProjectStats(milestone.project_id);
    }

    return updated;
  }

  async deleteMilestone(id: string, currentUser: User): Promise<void> {
    const milestone = await this.repo.getMilestoneById(id);
    if (!milestone) {
      throw new ValidationError('里程碑不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(milestone.project_id, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限操作此项目');
    }

    const deleted = await this.repo.deleteMilestone(id);
    if (!deleted) {
      throw new ValidationError('删除里程碑失败');
    }

    // 更新项目进度（基于里程碑完成百分比平均值）
    await this.repo.updateProjectStats(milestone.project_id);
  }

  // ========== 时间线管理 ==========

  async getTimelines(projectId: string): Promise<Timeline[]> {
    return this.repo.getTimelines(projectId);
  }

  async createTimeline(projectId: string, data: CreateTimelineRequest, currentUser: User): Promise<string> {
    // 验证项目存在
    const project = await this.repo.getProjectById(projectId);
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(projectId, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限操作此项目');
    }

    const id = uuidv4();
    await this.repo.createTimeline({ ...data, id, project_id: projectId });
    return id;
  }

  async updateTimeline(id: string, data: UpdateTimelineRequest, currentUser: User): Promise<boolean> {
    // 验证权限（需要查询时间线所属项目）
    // 这里简化处理，实际应该查询时间线所属项目
    return this.repo.updateTimeline(id, data);
  }

  async deleteTimeline(id: string, currentUser: User): Promise<void> {
    const deleted = await this.repo.deleteTimeline(id);
    if (!deleted) {
      throw new ValidationError('删除时间线失败');
    }
  }

  // ========== 项目成员管理 ==========

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.repo.getProjectMembers(projectId);
  }

  async addProjectMember(projectId: string, data: AddProjectMemberRequest, currentUser: User): Promise<boolean> {
    // 验证项目存在
    const project = await this.repo.getProjectById(projectId);
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 验证权限
    const isMember = await this.repo.isProjectMember(projectId, currentUser.id);
    if (currentUser.role !== 'admin' && !isMember) {
      throw new ForbiddenError('无权限操作此项目');
    }

    return this.repo.addProjectMember(projectId, data);
  }

  async removeProjectMember(projectId: string, userId: number, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      const isMember = await this.repo.isProjectMember(projectId, currentUser.id);
      if (!isMember) {
        throw new ForbiddenError('无权限操作此项目');
      }
    }

    const removed = await this.repo.removeProjectMember(projectId, userId);
    if (!removed) {
      throw new ValidationError('移除成员失败');
    }
  }

  async isProjectMember(projectId: string, userId: number): Promise<boolean> {
    return this.repo.isProjectMember(projectId, userId);
  }

  // ========== 节假日管理 ==========

  async getHolidays(year?: number): Promise<Holiday[]> {
    return this.repo.getHolidays(year);
  }

  async createHoliday(data: CreateHolidayRequest, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以管理节假日');
    }

    const created = await this.repo.createHoliday(data);
    if (!created) {
      throw new ValidationError('节假日已存在');
    }
  }

  async deleteHoliday(date: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以管理节假日');
    }

    const deleted = await this.repo.deleteHoliday(date);
    if (!deleted) {
      throw new ValidationError('删除节假日失败');
    }
  }
}
