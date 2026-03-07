/**
 * Repository使用示例
 *
 * 展示如何在服务层使用Repository模式
 */

import type { RepositoryFactory } from './RepositoryFactory.js';
import type { Project, WbsTask, Member } from '../../../shared/types/index.js';

/**
 * ProjectService - 使用Repository的项目服务示例
 *
 * 这个类展示了如何从直接使用DatabaseService迁移到使用Repository
 */
export class ProjectService {
  constructor(private repositoryFactory: RepositoryFactory) {}

  /**
   * 创建项目（使用事务）
   */
  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Project> {
    return this.repositoryFactory.transaction(async (repos) => {
      // 创建项目
      const project = await repos.project.create(data);

      // 如果需要，可以在这里执行其他相关操作
      // 例如：创建默认的WBS任务、发送通知等

      return project;
    });
  }

  /**
   * 获取项目详情（包含关联数据）
   */
  async getProjectDetail(projectId: number): Promise<{
    project: Project;
    tasks: WbsTask[];
    members: Member[];
    stats: {
      totalTasks: number;
      completedTasks: number;
      progress: number;
    };
  } | null> {
    const repos = this.repositoryFactory.getAllRepositories();

    // 获取项目
    const project = await repos.project.findById(projectId);
    if (!project) {
      return null;
    }

    // 获取项目的所有任务
    const tasks = await repos.wbsTask.findByProject(projectId);

    // 获取项目成员
    const projectMembers = await this.db.query(
      `SELECT pm.*, m.name as member_name, m.position
       FROM project_members pm
       LEFT JOIN members m ON pm.member_id = m.id
       WHERE pm.project_id = ? AND pm.deleted_at IS NULL`,
      [projectId]
    );

    // 计算统计信息
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      progress: project.progress,
    };

    return {
      project,
      tasks,
      members: projectMembers,
      stats,
    };
  }

  /**
   * 更新项目进度
   */
  async updateProjectProgress(projectId: number): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();

    // 计算项目进度
    const tasks = await repos.wbsTask.findByProject(projectId);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 更新项目
    await repos.project.update(projectId, { progress });
    await repos.project.updateTaskCounts(projectId, totalTasks, completedTasks);
  }

  /**
   * 搜索项目
   */
  async searchProjects(keyword: string): Promise<Project[]> {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.project.findProjects({ searchKeyword: keyword });
  }

  /**
   * 获取延期项目
   */
  async getDelayedProjects(): Promise<Project[]> {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.project.findDelayedProjects();
  }

  /**
   * 批量更新项目状态
   */
  async batchUpdateStatus(projectIds: number[], status: Project['status']): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();

    await Promise.all(
      projectIds.map(id => repos.project.update(id, { status }))
    );
  }
}

/**
 * WbsTaskService - 使用Repository的WBS任务服务示例
 */
export class WbsTaskService {
  constructor(private repositoryFactory: RepositoryFactory) {}

  /**
   * 创建任务
   */
  async createTask(projectId: number, data: Omit<WbsTask, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<WbsTask> {
    return this.repositoryFactory.transaction(async (repos) => {
      // 创建任务
      const task = await repos.wbsTask.create({
        ...data,
        projectId,
      });

      // 更新项目进度
      await this.updateProjectProgress(projectId);

      return task;
    });
  }

  /**
   * 分配任务
   */
  async assignTask(taskId: number, assigneeId: number): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();

    // 获取任务
    const task = await repos.wbsTask.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 分配任务
    await repos.wbsTask.assignTask(taskId, assigneeId);

    // 记录任务分配历史
    await this.db.query(
      `INSERT INTO task_assignments (task_id, assignee_id, assigned_by)
       VALUES (?, ?, ?)`,
      [taskId, assigneeId, task.createdBy]
    );
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: number, status: WbsTask['status']): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();

    // 获取任务
    const task = await repos.wbsTask.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 更新状态
    await repos.wbsTask.updateStatus(taskId, status);

    // 更新项目进度
    await this.updateProjectProgress(task.projectId);
  }

  /**
   * 移动任务（更改层级结构）
   */
  async moveTask(taskId: number, newParentId: number | null): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();

    await repos.wbsTask.moveTask(taskId, newParentId);

    // 获取任务以更新项目进度
    const task = await repos.wbsTask.findById(taskId);
    if (task) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  /**
   * 获取任务统计
   */
  async getTaskStats(projectId?: number) {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.wbsTask.getTaskStats(projectId);
  }

  /**
   * 获取关键路径
   */
  async getCriticalPath(projectId: number): Promise<WbsTask[]> {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.wbsTask.findCriticalPathTasks(projectId);
  }

  /**
   * 更新项目进度（私有方法）
   */
  private async updateProjectProgress(projectId: number): Promise<void> {
    const projectService = new ProjectService(this.repositoryFactory);
    await projectService.updateProjectProgress(projectId);
  }
}

/**
 * MemberService - 使用Repository的成员服务示例
 */
export class MemberService {
  constructor(private repositoryFactory: RepositoryFactory) {}

  /**
   * 创建成员并关联用户
   */
  async createMemberWithUser(
    memberData: Parameters<InstanceType<typeof MemberRepository>['create']>[0],
    userData: {
      username: string;
      password: string;
      role: string;
      name: string;
    }
  ): Promise<{ member: Member; userId: number }> {
    return this.repositoryFactory.transaction(async (repos) => {
      // 创建用户
      const user = await repos.user.create({
        username: userData.username,
        password: userData.password,
        role: userData.role as any,
        name: userData.name,
      });

      // 创建成员并关联用户
      const member = await repos.member.create({
        ...memberData,
        userId: user.id,
      });

      return { member, userId: user.id };
    });
  }

  /**
   * 获取成员工作负载
   */
  async getMemberWorkload(memberId: number) {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.member.getMemberWorkload(memberId);
  }

  /**
   * 搜索成员
   */
  async searchMembers(keyword: string, limit = 20): Promise<Member[]> {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.member.search(keyword, limit);
  }

  /**
   * 获取可用成员
   */
  async getAvailableMembers(): Promise<Member[]> {
    const repos = this.repositoryFactory.getAllRepositories();
    return repos.member.findAvailableMembers();
  }

  /**
   * 更新成员能力评估
   */
  async updateCapabilities(memberId: number, capabilities: Record<string, unknown>): Promise<void> {
    const repos = this.repositoryFactory.getAllRepositories();
    await repos.member.updateCapabilities(memberId, capabilities);
  }
}

/**
 * 使用示例
 */
export async function exampleUsage() {
  // 假设已经初始化了DatabaseService和RepositoryFactory
  // const db = new DatabaseService();
  // await db.init();
  // const repositoryFactory = initRepositories(db);

  // 创建服务实例
  // const projectService = new ProjectService(repositoryFactory);
  // const taskService = new WbsTaskService(repositoryFactory);
  // const memberService = new MemberService(repositoryFactory);

  // 使用服务
  // const project = await projectService.createProject({
  //   code: 'PRJ-001',
  //   name: 'New Project',
  //   status: 'planning',
  //   projectType: 'product_development',
  //   progress: 0,
  //   taskCount: 0,
  //   completedTaskCount: 0,
  // });

  // const task = await taskService.createTask(project.id, {
  //   taskCode: 'TASK-001',
  //   taskName: 'First Task',
  //   taskType: 'task',
  //   status: 'pending',
  //   priority: 1,
  //   progress: 0,
  // });

  // await taskService.assignTask(task.id, 1);
}
