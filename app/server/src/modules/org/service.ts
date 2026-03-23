// app/server/src/modules/org/service.ts
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { OrgRepository } from './repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import type { User } from '../../core/types';
import type {
  Department, DepartmentTreeNode, Member,
  CapabilityModel, MemberCapability, AssigneeRecommendation,
  CreateDepartmentRequest, UpdateDepartmentRequest,
  CreateMemberRequest, UpdateMemberRequest, MemberQueryOptions,
  CreateCapabilityModelRequest, UpdateCapabilityModelRequest,
  CreateMemberCapabilityRequest, UpdateMemberCapabilityRequest,
  DimensionScore,
  TaskTypeMapping,
  CreateTaskTypeMappingRequest,
} from './types';

export class OrgService {
  private repo = new OrgRepository();

  // ========== 部门管理 ==========

  async getDepartmentTree(): Promise<DepartmentTreeNode[]> {
    const departments = await this.repo.getAllDepartments();
    return this.buildDepartmentTree(departments, null);
  }

  private buildDepartmentTree(
    departments: Department[],
    parentId: number | null
  ): DepartmentTreeNode[] {
    return departments
      .filter(d => d.parent_id === parentId)
      .map(d => ({
        ...d,
        children: this.buildDepartmentTree(departments, d.id),
        member_count: 0, // 将在后续计算
      }));
  }

  async getDepartmentById(id: number): Promise<Department | null> {
    return this.repo.getDepartmentById(id);
  }

  async createDepartment(data: CreateDepartmentRequest, currentUser: User): Promise<number> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以创建部门');
    }

    // 验证父部门存在
    if (data.parent_id) {
      const parent = await this.repo.getDepartmentById(data.parent_id);
      if (!parent) {
        throw new ValidationError('父部门不存在');
      }
    }

    return this.repo.createDepartment({
      name: data.name,
      parent_id: data.parent_id ?? undefined,
      manager_id: data.manager_id ?? undefined,
    });
  }

  async updateDepartment(id: number, data: UpdateDepartmentRequest, currentUser: User): Promise<boolean> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以更新部门');
    }

    // 验证部门存在
    const existing = await this.repo.getDepartmentById(id);
    if (!existing) {
      throw new ValidationError('部门不存在');
    }

    // 验证父部门不是自己或自己的子部门
    if (data.parent_id) {
      if (data.parent_id === id) {
        throw new ValidationError('父部门不能是自己');
      }
      // TODO: 检查是否形成循环
    }

    return this.repo.updateDepartment(id, data);
  }

  async deleteDepartment(id: number, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除部门');
    }

    // 检查是否有成员
    const hasMembers = await this.repo.hasDepartmentMembers(id);
    if (hasMembers) {
      throw new ValidationError('部门内有成员，无法删除');
    }

    // 检查是否有子部门
    const childCount = await this.repo.getChildDepartmentCount(id);
    if (childCount > 0) {
      throw new ValidationError('部门有子部门，无法删除');
    }

    const deleted = await this.repo.deleteDepartment(id);
    if (!deleted) {
      throw new ValidationError('删除部门失败');
    }
  }

  // ========== 成员管理 ==========

  async getMembers(options: MemberQueryOptions): Promise<{ items: Member[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { items, total } = await this.repo.getMembers({
      department_id: options.department_id,
      is_active: options.is_active,
      search: options.search,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
    });

    const pageSize = options.pageSize || 20;
    const totalPages = Math.ceil(total / pageSize);

    return { items, total, page: options.page || 1, pageSize, totalPages };
  }

  async getMemberById(id: number): Promise<Member | null> {
    return this.repo.getMemberById(id);
  }

  async getDepartmentMembers(departmentId: number): Promise<Member[]> {
    return this.repo.getDepartmentMembers(departmentId);
  }

  async createMember(data: CreateMemberRequest, currentUser: User): Promise<{ id: number; initialPassword: string }> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权限创建成员');
    }

    // 验证必填字段
    if (!data.username) {
      throw new ValidationError('用户名不能为空');
    }
    if (!data.real_name) {
      throw new ValidationError('真实姓名不能为空');
    }
    if (!data.role) {
      throw new ValidationError('角色不能为空');
    }

    // 检查用户名是否已存在
    const exists = await this.repo.usernameExists(data.username);
    if (exists) {
      throw new ValidationError('用户名已存在');
    }

    // 生成初始密码
    const initialPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const id = await this.repo.createMember({
      username: data.username,
      password: hashedPassword,
      real_name: data.real_name,
      role: data.role,
      department_id: data.department_id || null,
      email: data.email,
      phone: data.phone,
    });

    return { id, initialPassword };
  }

  async updateMember(id: number, data: UpdateMemberRequest, currentUser: User): Promise<boolean> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权限更新成员');
    }

    // 验证成员存在
    const member = await this.repo.getMemberById(id);
    if (!member) {
      throw new ValidationError('成员不存在');
    }

    return this.repo.updateMember(id, data);
  }

  async deleteMember(id: number, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除成员');
    }

    // 不能删除自己
    if (id === currentUser.id) {
      throw new ValidationError('不能删除自己的账户');
    }

    // 验证成员存在
    const member = await this.repo.getMemberById(id);
    if (!member) {
      throw new ValidationError('成员不存在');
    }

    const deleted = await this.repo.deleteMember(id);
    if (!deleted) {
      throw new ValidationError('删除成员失败');
    }
  }

  /**
   * 获取成员删除检查数据
   * 返回删除前需要检查的关联数据统计
   */
  async getMemberDeletionCheck(id: number, currentUser: User): Promise<{
    canDelete: boolean;
    canDeactivate: boolean;
    warnings: string[];
    blockingReasons: string[];
    stats: {
      projects: number;
      tasks: number;
      approvals: number;
      capabilityRecords: number;
    };
    managedDepts?: { id: number; name: string }[];
  }> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以查看删除检查');
    }

    // 验证成员存在
    const member = await this.repo.getMemberById(id);
    if (!member) {
      throw new ValidationError('成员不存在');
    }

    const checkData = await this.repo.getMemberDeletionCheck(id);

    const warnings: string[] = [];
    const blockingReasons: string[] = [];

    // 检查是否是部门经理
    if (checkData.isDeptManager) {
      const deptNames = checkData.managedDepts.map(d => d.name).join('、');
      blockingReasons.push(`用户是「${deptNames}」的部门经理，需先移除经理职务`);
    }

    // 检查进行中的任务
    if (checkData.taskCount > 0) {
      warnings.push(`该用户有 ${checkData.taskCount} 个进行中的任务`);
    }

    // 检查参与的项目
    if (checkData.projectCount > 0) {
      warnings.push(`该用户参与了 ${checkData.projectCount} 个项目`);
    }

    // 软删除始终可以执行（只要有权限）
    const canDeactivate = currentUser.role === 'admin';

    // 物理删除需要满足条件
    const canDelete = currentUser.role === 'admin' && blockingReasons.length === 0;

    return {
      canDelete,
      canDeactivate,
      warnings,
      blockingReasons,
      stats: {
        projects: checkData.projectCount,
        tasks: checkData.taskCount,
        approvals: checkData.approvalCount,
        capabilityRecords: checkData.capabilityRecords,
      },
      managedDepts: checkData.managedDepts.length > 0 ? checkData.managedDepts : undefined,
    };
  }

  /**
   * 物理删除成员
   * 仅管理员可用，需要先通过删除检查
   */
  async hardDeleteMember(id: number, currentUser: User): Promise<void> {
    // 仅管理员可以物理删除
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以物理删除成员');
    }

    // 不能删除自己
    if (id === currentUser.id) {
      throw new ValidationError('不能删除自己的账户');
    }

    // 验证成员存在
    const member = await this.repo.getMemberById(id);
    if (!member) {
      throw new ValidationError('成员不存在');
    }

    // 执行删除检查
    const checkData = await this.repo.getMemberDeletionCheck(id);

    // 阻止条件检查
    if (checkData.isDeptManager) {
      throw new ValidationError('该用户是部门经理，需先移除经理职务');
    }

    // 执行物理删除
    const deleted = await this.repo.hardDeleteMember(id);
    if (!deleted) {
      throw new ValidationError('删除成员失败');
    }
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // ========== 能力模型管理 ==========

  async getCapabilityModels(): Promise<CapabilityModel[]> {
    return this.repo.getCapabilityModels();
  }

  async getCapabilityModelById(id: string): Promise<CapabilityModel | null> {
    return this.repo.getCapabilityModelById(id);
  }

  async createCapabilityModel(data: CreateCapabilityModelRequest, currentUser: User): Promise<string> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以创建能力模型');
    }

    // 验证权重之和为100
    const totalWeight = data.dimensions.reduce((sum, d) => sum + d.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new ValidationError('所有维度权重之和必须为100%');
    }

    // 验证维度数量
    if (data.dimensions.length < 1 || data.dimensions.length > 10) {
      throw new ValidationError('维度数量必须在1-10之间');
    }

    const id = uuidv4();
    await this.repo.createCapabilityModel({
      id,
      name: data.name,
      description: data.description,
      dimensions: data.dimensions,
    });

    return id;
  }

  async updateCapabilityModel(id: string, data: UpdateCapabilityModelRequest, currentUser: User): Promise<boolean> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以更新能力模型');
    }

    // 验证模型存在
    const existing = await this.repo.getCapabilityModelById(id);
    if (!existing) {
      throw new ValidationError('能力模型不存在');
    }

    // 如果更新了维度，验证权重
    if (data.dimensions) {
      const totalWeight = data.dimensions.reduce((sum, d) => sum + d.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new ValidationError('所有维度权重之和必须为100%');
      }

      if (data.dimensions.length < 1 || data.dimensions.length > 10) {
        throw new ValidationError('维度数量必须在1-10之间');
      }
    }

    return this.repo.updateCapabilityModel(id, data);
  }

  async deleteCapabilityModel(id: string, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除能力模型');
    }

    const deleted = await this.repo.deleteCapabilityModel(id);
    if (!deleted) {
      throw new ValidationError('删除能力模型失败');
    }
  }

  // ========== 成员能力评定 ==========

  async getMemberCapabilities(userId: number): Promise<MemberCapability[]> {
    return this.repo.getMemberCapabilities(userId);
  }

  async addMemberCapability(
    userId: number,
    data: CreateMemberCapabilityRequest,
    evaluatedBy: number
  ): Promise<string> {
    // 验证模型存在
    const model = await this.repo.getCapabilityModelById(data.model_id);
    if (!model) {
      throw new ValidationError('能力模型不存在');
    }

    // 验证维度分数
    this.validateDimensionScores(model, data.dimension_scores);

    // 计算综合分数
    const overallScore = this.calculateOverallScore(model, data.dimension_scores);

    const id = uuidv4();
    await this.repo.createMemberCapability({
      id,
      user_id: userId,
      model_id: data.model_id,
      model_name: model.name,
      association_label: data.association_label,
      dimension_scores: data.dimension_scores,
      overall_score: overallScore,
      evaluated_by: evaluatedBy,
      notes: data.notes,
    });

    return id;
  }

  async updateMemberCapability(
    userId: number,
    capabilityId: string,
    data: UpdateMemberCapabilityRequest,
    evaluatedBy: number
  ): Promise<boolean> {
    // 获取现有评定
    const existing = await this.repo.getMemberCapabilityById(userId, capabilityId);
    if (!existing) {
      throw new ValidationError('能力评定不存在');
    }

    // 获取模型
    const model = await this.repo.getCapabilityModelById(existing.model_id);
    if (!model) {
      throw new ValidationError('能力模型不存在');
    }

    let overallScore = existing.overall_score;
    if (data.dimension_scores) {
      this.validateDimensionScores(model, data.dimension_scores);
      overallScore = this.calculateOverallScore(model, data.dimension_scores);
    }

    return this.repo.updateMemberCapability(userId, capabilityId, {
      ...data,
      overall_score: overallScore,
    });
  }

  async deleteMemberCapability(userId: number, capabilityId: string): Promise<void> {
    const deleted = await this.repo.deleteMemberCapability(userId, capabilityId);
    if (!deleted) {
      throw new ValidationError('删除能力评定失败');
    }
  }

  private validateDimensionScores(model: CapabilityModel, scores: DimensionScore[]): void {
    const modelDimensions = new Set(model.dimensions.map(d => d.name));

    for (const score of scores) {
      if (!modelDimensions.has(score.dimension_name)) {
        throw new ValidationError(`维度 "${score.dimension_name}" 不存在于模型中`);
      }
      if (score.score < 0 || score.score > 100) {
        throw new ValidationError(`维度 "${score.dimension_name}" 分数必须在0-100之间`);
      }
    }
  }

  private calculateOverallScore(model: CapabilityModel, scores: DimensionScore[]): number {
    const scoreMap = new Map(scores.map(s => [s.dimension_name, s.score]));

    let weightedSum = 0;
    for (const dim of model.dimensions) {
      const score = scoreMap.get(dim.name) || 0;
      weightedSum += score * (dim.weight / 100);
    }

    return Math.round(weightedSum);
  }

  // ========== 智能推荐 ==========

  async getAssigneeRecommendations(taskType: string): Promise<AssigneeRecommendation[]> {
    // 获取任务类型对应的能力模型
    const models = await this.repo.getModelsForTaskType(taskType);

    if (models.length === 0) {
      return [];
    }

    // 获取推荐列表
    const modelIds = models.map(m => m.model_id);
    return this.repo.getRecommendations(modelIds);
  }

  // ========== 能力矩阵 ==========

  async getCapabilityMatrix(params: { departmentId?: number; dimensions?: string[] }): Promise<any[]> {
    // 获取所有成员的能力数据
    const members = await this.repo.getMembers({
      department_id: params.departmentId,
      is_active: true,
      page: 1,
      pageSize: 1000,
    });

    // 获取每个成员的能力
    const result = [];
    for (const member of members.items) {
      const capabilities = await this.repo.getMemberCapabilities(member.id);
      if (capabilities.length > 0) {
        result.push({
          memberId: member.id,
          memberName: member.real_name,
          departmentId: member.department_id,
          capabilities: capabilities.map(c => ({
            modelId: c.model_id,
            modelName: c.model_name,
            overallScore: c.overall_score,
            dimensionScores: c.dimension_scores,
          })),
        });
      }
    }

    return result;
  }

  async submitCapabilityAssessment(data: any, evaluatedBy: number): Promise<string> {
    return this.addMemberCapability(data.userId, data, evaluatedBy);
  }

  async getCapabilityHistory(userId: number): Promise<any[]> {
    // 返回成员的能力评定历史
    const capabilities = await this.repo.getMemberCapabilities(userId);
    return capabilities.map(c => ({
      id: c.id,
      modelId: c.model_id,
      modelName: c.model_name,
      overallScore: c.overall_score,
      evaluatedAt: c.evaluated_at,
      evaluatedBy: c.evaluated_by,
    }));
  }

  // ========== 智能分配 ==========

  async getAssignmentSuggestions(taskId: string, dimensions?: string[], minScore?: number): Promise<any> {
    // 获取任务详情以确定所需能力
    // 这里简化实现：返回所有有能力的成员
    const members = await this.repo.getMembers({ is_active: true, page: 1, pageSize: 100 });
    const suggestions = [];

    for (const member of members.items) {
      const capabilities = await this.repo.getMemberCapabilities(member.id);
      if (capabilities.length > 0) {
        const avgScore = capabilities.reduce((sum, c) => sum + c.overall_score, 0) / capabilities.length;
        if (!minScore || avgScore >= minScore) {
          suggestions.push({
            memberId: member.id,
            memberName: member.real_name,
            score: avgScore,
            reasons: ['有相关能力评定记录'],
          });
        }
      }
    }

    return {
      taskId,
      suggestions: suggestions.sort((a, b) => b.score - a.score).slice(0, 5),
    };
  }

  async batchAssignmentSuggestions(taskIds: string[]): Promise<any[]> {
    const results = [];
    for (const taskId of taskIds) {
      const suggestion = await this.getAssignmentSuggestions(taskId);
      results.push(suggestion);
    }
    return results;
  }

  // ========== 能力发展计划 ==========

  async getDevelopmentPlans(userId: number): Promise<any[]> {
    // 返回成员的发展计划
    // 目前返回空数组，等待后续实现
    return [];
  }

  async createDevelopmentPlan(data: any, createdBy: number): Promise<string> {
    // 创建发展计划
    const id = uuidv4();
    // 存储发展计划（待实现数据库表）
    return id;
  }

  // ========== 任务类型映射管理 ==========

  async getTaskTypeMappings(): Promise<TaskTypeMapping[]> {
    return this.repo.getTaskTypeMappings();
  }

  async getTaskTypeMappingById(id: number): Promise<TaskTypeMapping | null> {
    return this.repo.getTaskTypeMappingById(id);
  }

  async createTaskTypeMapping(data: CreateTaskTypeMappingRequest, currentUser: User): Promise<number> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以创建任务类型映射');
    }

    // 验证能力模型存在
    const model = await this.repo.getCapabilityModelById(data.model_id);
    if (!model) {
      throw new ValidationError('能力模型不存在');
    }

    return this.repo.createTaskTypeMapping(data);
  }

  async updateTaskTypeMapping(id: number, data: Partial<CreateTaskTypeMappingRequest>, currentUser: User): Promise<boolean> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以更新任务类型映射');
    }

    // 验证映射存在
    const existing = await this.repo.getTaskTypeMappingById(id);
    if (!existing) {
      throw new ValidationError('任务类型映射不存在');
    }

    // 如果更新了模型ID，验证模型存在
    if (data.model_id) {
      const model = await this.repo.getCapabilityModelById(data.model_id);
      if (!model) {
        throw new ValidationError('能力模型不存在');
      }
    }

    return this.repo.updateTaskTypeMapping(id, data);
  }

  async deleteTaskTypeMapping(id: number, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除任务类型映射');
    }

    // 验证映射存在
    const existing = await this.repo.getTaskTypeMappingById(id);
    if (!existing) {
      throw new ValidationError('任务类型映射不存在');
    }

    const deleted = await this.repo.deleteTaskTypeMapping(id);
    if (!deleted) {
      throw new ValidationError('删除任务类型映射失败');
    }
  }
}
