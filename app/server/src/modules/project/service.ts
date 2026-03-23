// app/server/src/modules/project/service.ts
import { v4 as uuidv4 } from 'uuid';
import { ProjectRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type {
  Project, ProjectListItem, Milestone, Timeline, TimelineTask,
  ProjectMember, Holiday, ProjectStats,
  CreateProjectRequest, UpdateProjectRequest,
  CreateMilestoneRequest, UpdateMilestoneRequest,
  CreateTimelineRequest, UpdateTimelineRequest,
  CreateTimelineTaskRequest, UpdateTimelineTaskRequest,
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

    const id = await this.repo.createProject(data);

    // 如果有成员，添加到项目成员表
    if (data.member_ids && data.member_ids.length > 0) {
      for (const memberId of data.member_ids) {
        await this.repo.addProjectMember(String(id), { user_id: memberId, role: 'member' });
      }
    }

    return String(id);
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

    // 验证日期
    const startDate = data.planned_start_date || project.planned_start_date;
    const endDate = data.planned_end_date || project.planned_end_date;
    if (new Date(endDate) < new Date(startDate)) {
      throw new ValidationError('结束日期不能早于开始日期');
    }

    return this.repo.updateProject(id, { ...data, version: data.version || project.version });
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

    return this.repo.updateMilestone(id, data);
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

  // ========== 时间线任务管理 ==========

  async getTimelineTasks(timelineId: string): Promise<TimelineTask[]> {
    return this.repo.getTimelineTasks(timelineId);
  }

  async createTimelineTask(timelineId: string, data: CreateTimelineTaskRequest, currentUser: User): Promise<string> {
    // 验证时间线存在
    const timeline = await this.repo.getTimelineById(timelineId);
    if (!timeline) {
      throw new ValidationError('时间线不存在');
    }

    // 验证时间范围
    const startDate = data.start_date;
    const endDate = data.end_date;
    const timelineStart = timeline.start_date.toISOString().split('T')[0];
    const timelineEnd = timeline.end_date.toISOString().split('T')[0];

    if (startDate < timelineStart) {
      throw new ValidationError('任务开始日期不能早于时间线开始日期');
    }
    if (endDate > timelineEnd) {
      throw new ValidationError('任务结束日期不能晚于时间线结束日期');
    }
    if (endDate < startDate) {
      throw new ValidationError('任务结束日期不能早于开始日期');
    }

    const taskId = uuidv4();
    await this.repo.createTimelineTask({ ...data, id: taskId, timeline_id: timelineId });
 return taskId;
  }

  async updateTimelineTask(id: string, data: UpdateTimelineTaskRequest, currentUser: User): Promise<boolean> {
    // 如果有日期变更，需要验证时间范围
    if (data.start_date || data.end_date) {
      const task = await this.repo.getTimelineTaskById(id);
      if (!task) {
        throw new ValidationError('任务不存在');
      }

      const timeline = await this.repo.getTimelineById(task.timeline_id);
      if (!timeline) {
        throw new ValidationError('时间线不存在');
      }

      const startDate = data.start_date || task.start_date.toISOString().split('T')[0];
      const endDate = data.end_date || task.end_date.toISOString().split('T')[0];
      const timelineStart = timeline.start_date.toISOString().split('T')[0];
      const timelineEnd = timeline.end_date.toISOString().split('T')[0];

      if (startDate < timelineStart) {
        throw new ValidationError('任务开始日期不能早于时间线开始日期');
      }
      if (endDate > timelineEnd) {
        throw new ValidationError('任务结束日期不能晚于时间线结束日期');
      }
      if (endDate < startDate) {
        throw new ValidationError('任务结束日期不能早于开始日期');
      }
    }

    return this.repo.updateTimelineTask(id, data);
  }

  async deleteTimelineTask(id: string, currentUser: User): Promise<void> {
    const deleted = await this.repo.deleteTimelineTask(id);
    if (!deleted) {
      throw new ValidationError('删除任务失败');
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
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以管理节假日');
    }

    const created = await this.repo.createHoliday(data);
    if (!created) {
      throw new ValidationError('节假日已存在');
    }
  }

  async deleteHoliday(date: string, currentUser: User): Promise<void> {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以管理节假日');
    }

    const deleted = await this.repo.deleteHoliday(date);
    if (!deleted) {
      throw new ValidationError('删除节假日失败');
    }
  }
}
