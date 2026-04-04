// app/server/src/modules/org/service.ts
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { OrgRepository } from './repository';
import { AuthRepository } from '../auth/repository';
import { ValidationError, ForbiddenError } from '../../core/errors';
import { audit } from '../../core/audit';
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
  private authRepo = new AuthRepository();

  // ========== 权限检查辅助方法 ==========

  /**
   * 检查用户对目标部门的访问权限
   * admin 可以访问所有部门
   * dept_manager 只能访问管理的部门及其子部门
   */
  private async checkDepartmentAccess(
    targetDeptId: number | null,
    currentUser: User
  ): Promise<{ allowed: boolean; reason?: string }> {
    // admin 可以访问所有部门
    if (currentUser.role === 'admin') {
      return { allowed: true };
    }

    // dept_manager 需要检查部门范围
    if (currentUser.role === 'dept_manager') {
      // 获取用户管理的部门
      const managedDept = await this.repo.getManagedDepartmentByUserId(currentUser.id);
      if (!managedDept) {
        return { allowed: false, reason: '您不是部门经理，无权操作' };
      }

      // 目标部门为空时不允许操作
      if (targetDeptId === null || targetDeptId === undefined) {
        return { allowed: false, reason: '只能操作本部门及其子部门的成员' };
      }

      // 检查目标部门是否是管理部门或其子部门
      const isAccessible = await this.repo.isChildDepartment(targetDeptId, managedDept.id);
      if (!isAccessible) {
        return { allowed: false, reason: '只能操作本部门及其子部门的成员' };
      }

      return { allowed: true };
    }

    // 其他角色无权访问
    return { allowed: false, reason: '无权限操作' };
  }

  /**
   * 检查用户对目标成员的访问权限
   * admin 可以访问所有成员
   * dept_manager 只能访问本部门及其子部门的成员
   */
  private async checkMemberAccess(
    targetMemberId: number,
    currentUser: User
  ): Promise<{ allowed: boolean; reason?: string; member?: Member }> {
    // 获取目标成员
    const member = await this.repo.getMemberById(targetMemberId);
    if (!member) {
      return { allowed: false, reason: '成员不存在' };
    }

    // admin 可以访问所有成员
    if (currentUser.role === 'admin') {
      return { allowed: true, member };
    }

    // dept_manager 需要检查部门范围
    if (currentUser.role === 'dept_manager') {
      const accessCheck = await this.checkDepartmentAccess(member.department_id, currentUser);
      return { ...accessCheck, member };
    }

    return { allowed: false, reason: '无权限操作', member };
  }

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

      // dept_manager 只能在自己管理的部门下创建子部门
      if (currentUser.role === 'dept_manager') {
        const accessCheck = await this.checkDepartmentAccess(data.parent_id, currentUser);
        if (!accessCheck.allowed) {
          throw new ForbiddenError('只能在本部门及其子部门下创建新部门');
        }
      }
    } else if (currentUser.role === 'dept_manager') {
      // dept_manager 不能创建顶级部门
      throw new ForbiddenError('部门经理只能在本部门下创建子部门');
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

    // dept_manager 只能更新本部门及其子部门
    if (currentUser.role === 'dept_manager') {
      const accessCheck = await this.checkDepartmentAccess(id, currentUser);
      if (!accessCheck.allowed) {
        throw new ForbiddenError('只能更新本部门及其子部门');
      }
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

  async deleteDepartment(id: number, currentUser: User): Promise<{ deletedDepartments: number; deletedMembers: number }> {
    // 验证权限
    if (currentUser.role !== 'admin') {
      throw new ForbiddenError('只有管理员可以删除部门');
    }

    // 验证部门存在
    const dept = await this.repo.getDepartmentById(id);
    if (!dept) {
      throw new ValidationError('部门不存在');
    }

    // 获取所有子部门ID（递归）
    const childDeptIds = await this.repo.getAllChildDepartmentIds(id);

    // 统计
    let deletedMembers = 0;

    // 从最深层子部门开始处理（倒序）
    // 注意：getAllChildDepartmentIds 返回的是广度优先的顺序，我们需要从后往前删除
    for (const childId of [...childDeptIds].reverse()) {
      // 删除子部门下的所有成员
      const members = await this.repo.deleteMembersByDepartment(childId);
      deletedMembers += members;
      // 删除子部门
      await this.repo.deleteDepartment(childId);
    }

    // 删除当前部门下的所有成员
    const members = await this.repo.deleteMembersByDepartment(id);
    deletedMembers += members;

    // 删除当前部门
    const deleted = await this.repo.deleteDepartment(id);
    if (!deleted) {
      throw new ValidationError('删除部门失败');
    }

    return {
      deletedDepartments: childDeptIds.length + 1, // 子部门 + 当前部门
      deletedMembers
    };
  }

  // ========== 成员管理 ==========

  async getMembers(options: MemberQueryOptions): Promise<{ items: Member[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { items, total } = await this.repo.getMembers({
      department_id: options.department_id,
      is_active: options.is_active,
      search: options.search,
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      excludeBuiltin: options.excludeBuiltin,
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
    // 验证权限 - tech_manager 不能创建成员（只能查看）
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权限创建成员');
    }

    // dept_manager 需要检查部门范围
    if (currentUser.role === 'dept_manager' && data.department_id) {
      const accessCheck = await this.checkDepartmentAccess(data.department_id, currentUser);
      if (!accessCheck.allowed) {
        throw new ForbiddenError(accessCheck.reason || '无权在该部门创建成员');
      }
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

    // 普通用户必须有部门
    if (!data.department_id) {
      throw new ValidationError('普通用户必须关联部门');
    }

    // 验证工号格式：8位数字 或 6位字母+数字
    if (!this.validateUsername(data.username)) {
      throw new ValidationError('工号格式不正确，应为8位数字或6位字母+数字组合');
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
      gender: data.gender,
      department_id: data.department_id || null,
      email: data.email,
      phone: data.phone,
      is_builtin: false, // 通过组织架构创建的都是普通用户
    });

    return { id, initialPassword };
  }

  async updateMember(id: number, data: UpdateMemberRequest, currentUser: User): Promise<boolean> {
    // 验证权限 - 仅 admin 和 dept_manager 可以修改成员
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('无权限更新成员');
    }

    // 检查成员访问权限
    const accessCheck = await this.checkMemberAccess(id, currentUser);
    if (!accessCheck.allowed) {
      throw new ForbiddenError(accessCheck.reason || '无权限更新该成员');
    }
    const member = accessCheck.member!;

    // 如果要修改部门，检查新部门的权限
    if (data.department_id !== undefined && currentUser.role === 'dept_manager') {
      const newDeptAccess = await this.checkDepartmentAccess(data.department_id, currentUser);
      if (!newDeptAccess.allowed) {
        throw new ForbiddenError('无权将成员移动到该部门');
      }
    }

    // 内置用户不能修改部门
    if (member.is_builtin && data.department_id !== undefined) {
      throw new ValidationError('内置用户不可调整部门');
    }

    // 检查是否修改了角色
    const roleChanged = data.role && data.role !== member.role;

    // 执行更新
    const updated = await this.repo.updateMember(id, data);

    // 如果角色被修改，终止该用户的所有会话，强制重新登录
    if (roleChanged && updated) {
      // 获取该用户的所有活跃会话
      const sessions = await this.authRepo.getActiveSessionsByUser(id);
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.session_id);
        await this.authRepo.terminateSessions(sessionIds, 'role_changed');
        console.log(`[Org] User ${id} role changed from ${member.role} to ${data.role}, terminated ${sessionIds.length} sessions`);

        // 记录审计日志
        audit.log({
          userId: currentUser.id,
          username: currentUser.real_name,
          userRole: currentUser.role,
          category: 'org',
          action: 'ROLE_CHANGE_FORCE_LOGOUT',
          tableName: 'users',
          recordId: String(id),
          details: `用户 ${member.real_name} 角色从 ${member.role} 修改为 ${data.role}，已强制下线 ${sessionIds.length} 个会话`,
        });
      }
    }

    return updated;
  }

  /**
   * 软删除成员（停用）
   * 设置 is_active = false，记录 deleted_at 和 deleted_by
   */
  async deactivateMember(id: number, currentUser: User): Promise<void> {
    // 验证权限
    if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
      throw new ForbiddenError('只有管理员或部门经理可以停用成员');
    }

    // 不能删除自己
    if (id === currentUser.id) {
      throw new ValidationError('不能停用自己的账户');
    }

    // 检查成员访问权限
    const accessCheck = await this.checkMemberAccess(id, currentUser);
    if (!accessCheck.allowed) {
      throw new ForbiddenError(accessCheck.reason || '无权停用该成员');
    }
    const member = accessCheck.member!;

    // 内置用户不能删除
    if (member.is_builtin) {
      throw new ValidationError('内置用户不可删除');
    }

    const deleted = await this.repo.deleteMember(id, currentUser.id);
    if (!deleted) {
      throw new ValidationError('停用成员失败');
    }
  }

  /**
   * @deprecated 使用 deactivateMember 代替
   * 保留向后兼容
   */
  async deleteMember(id: number, currentUser: User): Promise<void> {
    return this.deactivateMember(id, currentUser);
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

    // 检查成员访问权限
    const accessCheck = await this.checkMemberAccess(id, currentUser);
    if (!accessCheck.allowed) {
      throw new ForbiddenError(accessCheck.reason || '无权查看该成员的删除检查');
    }
    const member = accessCheck.member!;

    const checkData = await this.repo.getMemberDeletionCheck(id);

    const warnings: string[] = [];
    const blockingReasons: string[] = [];

    // 检查是否是内置用户
    if (checkData.isBuiltin) {
      blockingReasons.push('内置用户不可删除');
    }

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

    // 软删除：管理员和部门经理都可以执行（但内置用户除外）
    const canDeactivate = (currentUser.role === 'admin' || currentUser.role === 'dept_manager') && !checkData.isBuiltin;

    // 物理删除：仅管理员，且无阻止条件
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

    // 检查成员访问权限
    const accessCheck = await this.checkMemberAccess(id, currentUser);
    if (!accessCheck.allowed) {
      throw new ForbiddenError(accessCheck.reason || '无权删除该成员');
    }
    const member = accessCheck.member!;

    // 内置用户不能删除
    if (member.is_builtin) {
      throw new ValidationError('内置用户不可删除');
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

  /**
   * 验证工号格式
   * 规则：8位数字 或 6位字母+数字组合
   */
  private validateUsername(username: string): boolean {
    // 8位纯数字
    const eightDigits = /^\d{8}$/;
    // 6位字母+数字组合（至少包含1个字母和1个数字）
    const sixAlphanumeric = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6}$/;

    return eightDigits.test(username) || sixAlphanumeric.test(username);
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
          memberGender: member.gender,
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

  // ========== 审批人查询方法 ==========

  /**
   * 获取用户的直接主管
   * 从用户所在部门获取部门经理
   */
  async getDirectSupervisor(userId: number): Promise<Member | null> {
    return this.repo.getDirectSupervisor(userId);
  }

  /**
   * 获取用户的技术经理
   * 查找用户所在部门的父部门（技术组）的经理
   */
  async getTechManager(userId: number): Promise<Member | null> {
    return this.repo.getTechManager(userId);
  }

  /**
   * 获取用户的部门经理
   * 查找用户所在部门的根部门的经理
   */
  async getDeptManager(userId: number): Promise<Member | null> {
    return this.repo.getDeptManager(userId);
  }

  /**
   * 获取系统管理员
   */
  async getAdmin(): Promise<Member | null> {
    return this.repo.getAdmin();
  }

  /**
   * 按兜底顺序查找审批人
   * 顺序：直接主管 → 技术经理 → 部门经理 → 系统管理员
   */
  async findApprover(userId: number): Promise<Member | null> {
    // 1. 查找直接主管
    const directSupervisor = await this.repo.getDirectSupervisor(userId);
    if (directSupervisor) {
      return directSupervisor;
    }

    // 2. 查找技术经理
    const techManager = await this.repo.getTechManager(userId);
    if (techManager) {
      return techManager;
    }

    // 3. 查找部门经理
    const deptManager = await this.repo.getDeptManager(userId);
    if (deptManager) {
      return deptManager;
    }

    // 4. 返回系统管理员
    return this.repo.getAdmin();
  }
}
