// app/server/src/modules/org/service.ts
import { v4 as uuidv4 } from 'uuid';
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
  DimensionScore
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
}
