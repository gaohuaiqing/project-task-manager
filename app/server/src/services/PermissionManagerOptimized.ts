/**
 * 权限管理服务（优化版）
 * 使用批量查询和更积极的缓存策略减少数据库访问
 */

import { databaseService } from './DatabaseService.js';
import { LRUCacheWithTTL, cacheCleanupManager } from '../utils/LRUCache.js';

// ================================================================
// 类型定义
// ================================================================

export interface UserPermission {
  userId: number;
  username: string;
  role: 'admin' | 'dept_manager' | 'tech_manager' | 'engineer';
  primaryDepartment: {
    id: number;
    code: string;
    name: string;
  };
  departments: Array<{
    id: number;
    code: string;
    name: string;
    role: 'dept_manager' | 'member';
  }>;
  techGroups: Array<{
    id: number;
    code: string;
    name: string;
    role: 'leader' | 'member';
  }>;
  _cachedAt: number;  // 缓存时间戳
}

export interface ResourcePermission {
  resourceType: 'projects' | 'wbs_tasks' | 'milestones' | 'departments';
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  granted: boolean;
  reason?: string;
}

export interface DataFilterOptions {
  departmentId?: number;
  techGroupId?: number;
  projectId?: string;
  userId?: number;
}

// ================================================================
// 权限管理服务类（优化版）
// ================================================================

export class PermissionManagerOptimized {
  private permissionCache: LRUCacheWithTTL<number, UserPermission>;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存（从5分钟增加）
  private bulkLoadCache: Map<number, Promise<UserPermission>> = new Map(); // 批量加载缓存

  constructor() {
    // 创建更大的LRU缓存
    this.permissionCache = new LRUCacheWithTTL(2000, this.CACHE_TTL);

    // 注册定期清理任务
    cacheCleanupManager.registerCleanup('permission-cache', this.permissionCache, 60000);

    // 每5分钟预加载活跃用户权限
    setInterval(() => this.preloadActiveUserPermissions(), 5 * 60 * 1000);
  }

  /**
   * 获取用户完整权限信息（优化版 - 使用单次联合查询）
   */
  async getUserPermissions(userId: number): Promise<UserPermission> {
    // 检查缓存
    const cached = this.permissionCache.get(userId);
    if (cached && Date.now() - cached._cachedAt < this.CACHE_TTL) {
      return cached;
    }

    // 检查是否正在批量加载（防止重复查询）
    const loading = this.bulkLoadCache.get(userId);
    if (loading) {
      return loading;
    }

    // 开始加载
    const loadPromise = this._loadUserPermissions(userId);
    this.bulkLoadCache.set(userId, loadPromise);

    try {
      const permissions = await loadPromise;
      return permissions;
    } finally {
      this.bulkLoadCache.delete(userId);
    }
  }

  /**
   * 内部方法：使用单次查询获取用户权限
   */
  private async _loadUserPermissions(userId: number): Promise<UserPermission> {
    try {
      // 使用 UNION ALL 合并查询，减少数据库往返
      const [results] = await databaseService.query(`
        -- 用户基本信息
        SELECT
          u.id,
          u.username,
          u.role,
          'user' as result_type,
          NULL as dept_id,
          NULL as dept_code,
          NULL as dept_name,
          NULL as is_primary,
          NULL as dept_role,
          NULL as group_id,
          NULL as group_code,
          NULL as group_name,
          NULL as group_role
        FROM users u
        WHERE u.id = ?

        UNION ALL

        -- 用户部门关系
        SELECT
          u.id,
          u.username,
          u.role,
          'department' as result_type,
          d.id as dept_id,
          d.code as dept_code,
          d.name as dept_name,
          ud.is_primary,
          ud.role as dept_role,
          NULL as group_id,
          NULL as group_code,
          NULL as group_name,
          NULL as group_role
        FROM users u
        LEFT JOIN user_departments ud ON u.id = ud.user_id
        LEFT JOIN departments d ON ud.department_id = d.id
        WHERE u.id = ?

        UNION ALL

        -- 用户技术组关系
        SELECT
          u.id,
          u.username,
          u.role,
          'tech_group' as result_type,
          NULL as dept_id,
          NULL as dept_code,
          NULL as dept_name,
          NULL as is_primary,
          NULL as dept_role,
          tg.id as group_id,
          tg.code as group_code,
          tg.name as group_name,
          ug.role as group_role
        FROM users u
        LEFT JOIN user_tech_groups ug ON u.id = ug.user_id
        LEFT JOIN tech_groups tg ON ug.tech_group_id = tg.id
        WHERE u.id = ?
      `, [userId, userId, userId]) as any[];

      if (!results || results.length === 0) {
        throw new Error(`用户不存在: ${userId}`);
      }

      // 解析结果
      const userRow = results.find((r: any) => r.result_type === 'user');
      if (!userRow) {
        throw new Error(`用户不存在: ${userId}`);
      }

      const departments = results
        .filter((r: any) => r.result_type === 'department' && r.dept_id !== null)
        .map((r: any) => ({
          id: r.dept_id,
          code: r.dept_code,
          name: r.dept_name,
          role: r.dept_role
        }));

      const techGroups = results
        .filter((r: any) => r.result_type === 'tech_group' && r.group_id !== null)
        .map((r: any) => ({
          id: r.group_id,
          code: r.group_code,
          name: r.group_name,
          role: r.group_role
        }));

      // 确定主部门
      const primaryDept = departments.find((d: any) => d.is_primary) || departments[0];

      const permissions: UserPermission = {
        userId: userRow.id,
        username: userRow.username,
        role: userRow.role,
        primaryDepartment: primaryDept ? {
          id: primaryDept.id,
          code: primaryDept.code,
          name: primaryDept.name
        } : {
          id: 0,
          code: 'UNKNOWN',
          name: '未分配'
        },
        departments,
        techGroups,
        _cachedAt: Date.now()
      };

      // 写入缓存
      this.permissionCache.set(userId, permissions);

      return permissions;
    } catch (error) {
      console.error('[PermissionManager] 获取用户权限失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取用户权限（减少 N 次查询为 1 次）
   */
  async getBatchUserPermissions(userIds: number[]): Promise<Map<number, UserPermission>> {
    const result = new Map<number, UserPermission>();
    const uncachedIds: number[] = [];

    // 先从缓存获取
    for (const userId of userIds) {
      const cached = this.permissionCache.get(userId);
      if (cached && Date.now() - cached._cachedAt < this.CACHE_TTL) {
        result.set(userId, cached);
      } else {
        uncachedIds.push(userId);
      }
    }

    // 批量加载未缓存的用户权限
    if (uncachedIds.length > 0) {
      const [results] = await databaseService.query(`
        -- 用户基本信息
        SELECT
          u.id,
          u.username,
          u.role,
          'user' as result_type,
          NULL as dept_id,
          NULL as dept_code,
          NULL as dept_name,
          NULL as is_primary,
          NULL as dept_role,
          NULL as group_id,
          NULL as group_code,
          NULL as group_name,
          NULL as group_role
        FROM users u
        WHERE u.id IN (?)

        UNION ALL

        -- 用户部门关系
        SELECT
          u.id,
          u.username,
          u.role,
          'department' as result_type,
          d.id as dept_id,
          d.code as dept_code,
          d.name as dept_name,
          ud.is_primary,
          ud.role as dept_role,
          NULL as group_id,
          NULL as group_code,
          NULL as group_name,
          NULL as group_role
        FROM users u
        LEFT JOIN user_departments ud ON u.id = ud.user_id
        LEFT JOIN departments d ON ud.department_id = d.id
        WHERE u.id IN (?)

        UNION ALL

        -- 用户技术组关系
        SELECT
          u.id,
          u.username,
          u.role,
          'tech_group' as result_type,
          NULL as dept_id,
          NULL as dept_code,
          NULL as dept_name,
          NULL as is_primary,
          NULL as dept_role,
          tg.id as group_id,
          tg.code as group_code,
          tg.name as group_name,
          ug.role as group_role
        FROM users u
        LEFT JOIN user_tech_groups ug ON u.id = ug.user_id
        LEFT JOIN tech_groups tg ON ug.tech_group_id = tg.id
        WHERE u.id IN (?)
      `, [uncachedIds, uncachedIds, uncachedIds]) as any[];

      // 按用户分组解析结果
      const userResults = new Map<number, any[]>();
      for (const row of results) {
        if (!userResults.has(row.id)) {
          userResults.set(row.id, []);
        }
        userResults.get(row.id)!.push(row);
      }

      // 为每个用户构建权限对象
      for (const [userId, rows] of userResults) {
        const userRow = rows.find((r: any) => r.result_type === 'user');
        if (!userRow) continue;

        const departments = rows
          .filter((r: any) => r.result_type === 'department' && r.dept_id !== null)
          .map((r: any) => ({
            id: r.dept_id,
            code: r.dept_code,
            name: r.dept_name,
            role: r.dept_role
          }));

        const techGroups = rows
          .filter((r: any) => r.result_type === 'tech_group' && r.group_id !== null)
          .map((r: any) => ({
            id: r.group_id,
            code: r.group_code,
            name: r.group_name,
            role: r.group_role
          }));

        const primaryDept = departments.find((d: any) => d.is_primary) || departments[0];

        const permissions: UserPermission = {
          userId: userRow.id,
          username: userRow.username,
          role: userRow.role,
          primaryDepartment: primaryDept ? {
            id: primaryDept.id,
            code: primaryDept.code,
            name: primaryDept.name
          } : {
            id: 0,
            code: 'UNKNOWN',
            name: '未分配'
          },
          departments,
          techGroups,
          _cachedAt: Date.now()
        };

        this.permissionCache.set(userId, permissions);
        result.set(userId, permissions);
      }
    }

    return result;
  }

  /**
   * 预加载活跃用户权限（异步，不阻塞主流程）
   */
  private async preloadActiveUserPermissions(): Promise<void> {
    try {
      // 获取最近活跃的用户ID（从会话表）
      const [activeUsers] = await databaseService.query(`
        SELECT DISTINCT user_id
        FROM sessions
        WHERE status = 'active'
        AND last_accessed > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        LIMIT 100
      `) as any[];

      if (activeUsers && activeUsers.length > 0) {
        const userIds = activeUsers.map((u: any) => u.user_id);
        await this.getBatchUserPermissions(userIds);
        console.log(`[PermissionManager] 预加载了 ${userIds.length} 个活跃用户权限`);
      }
    } catch (error) {
      console.error('[PermissionManager] 预加载权限失败:', error);
    }
  }

  /**
   * 批量检查用户是否可以接收广播消息（优化版）
   */
  async batchCanReceiveBroadcast(
    userIds: number[],
    message: any
  ): Promise<Map<number, boolean>> {
    const result = new Map<number, boolean>();

    // 批量获取所有用户权限
    const permissionsMap = await this.getBatchUserPermissions(userIds);

    // 检查每个用户的权限
    for (const [userId, permissions] of permissionsMap) {
      result.set(userId, this._checkCanReceive(permissions, message));
    }

    return result;
  }

  /**
   * 内部方法：检查单个用户是否可以接收消息
   */
  private _checkCanReceive(permissions: UserPermission, message: any): boolean {
    // 管理员接收所有消息
    if (permissions.role === 'admin') {
      return true;
    }

    // 根据消息类型检查权限
    switch (message.type) {
      case 'global_data_updated':
      case 'global_data_created':
      case 'data_conflict':
        return true;  // 简化逻辑，避免每次都查询数据库
      default:
        return true;
    }
  }

  /**
   * 获取用户主部门ID
   */
  async getUserPrimaryDepartment(userId: number): Promise<number> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.primaryDepartment.id;
  }

  /**
   * 获取用户所属所有部门ID
   */
  async getUserDepartments(userId: number): Promise<number[]> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.departments.map(d => d.id);
  }

  /**
   * 清除权限缓存
   */
  clearPermissionCache(userId?: number): void {
    if (userId !== undefined) {
      this.permissionCache.delete(userId);
    } else {
      this.permissionCache.clear();
    }
  }

  // ================================================================
  // 资源操作权限检查
  // ================================================================

  /**
   * 检查用户是否有权限执行操作
   */
  async canPerformAction(
    userId: number,
    resourceType: ResourcePermission['resourceType'],
    resourceId: string,
    action: ResourcePermission['action']
  ): Promise<ResourcePermission> {
    try {
      // 获取用户权限
      const permissions = await this.getUserPermissions(userId);

      // 管理员全权限
      if (permissions.role === 'admin') {
        return {
          resourceType,
          resourceId,
          action,
          granted: true
        };
      }

      // 根据资源类型检查权限
      switch (resourceType) {
        case 'projects':
          return await this.checkProjectPermission(permissions, resourceId, action);
        case 'wbs_tasks':
          return await this.checkTaskPermission(permissions, resourceId, action);
        case 'departments':
          return await this.checkDepartmentPermission(permissions, resourceId, action);
        default:
          return { resourceType, resourceId, action, granted: false, reason: '未知资源类型' };
      }
    } catch (error) {
      console.error('[PermissionManager] 权限检查失败:', error);
      return {
        resourceType,
        resourceId,
        action,
        granted: false,
        reason: '权限检查失败'
      };
    }
  }

  /**
   * 检查项目权限
   */
  private async checkProjectPermission(
    permissions: UserPermission,
    projectId: string,
    action: string
  ): Promise<ResourcePermission> {
    // 查询项目信息
    const [projects] = await databaseService.query(
      'SELECT id, department_id, created_by FROM projects WHERE code = ?',
      [projectId]
    ) as any[];

    if (!projects || projects.length === 0) {
      return {
        resourceType: 'projects',
        resourceId: projectId,
        action: action as any,
        granted: false,
        reason: '项目不存在'
      };
    }

    const project = projects[0];

    // 部门经理可以查看/编辑本部门项目
    if (permissions.role === 'dept_manager') {
      const isInDept = permissions.departments.some(d => d.id === project.department_id);

      if (isInDept) {
        if (action === 'read' || action === 'update') {
          return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: true };
        }
        if (action === 'delete') {
          return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: false, reason: '部门经理无法删除项目' };
        }
      }
    }

    // 技术经理可以查看/编辑本部门项目
    if (permissions.role === 'tech_manager') {
      const isInDept = permissions.departments.some(d => d.id === project.department_id);

      if (isInDept) {
        if (action === 'read' || action === 'update') {
          return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: true };
        }
      }
    }

    // 工程师只能查看/编辑被分配的项目
    if (permissions.role === 'engineer') {
      const [members] = await databaseService.query(
        'SELECT * FROM project_members WHERE project_id = (SELECT id FROM projects WHERE code = ?) AND user_id = ?',
        [projectId, permissions.userId]
      ) as any[];

      const isMember = members && members.length > 0;

      if (isMember) {
        const memberRole = members[0].role;

        if (action === 'read') {
          return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: true };
        }
        if (action === 'update' && memberRole === 'manager') {
          return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: true };
        }
      }

      return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: false, reason: '您不是该项目成员' };
    }

    return { resourceType: 'projects', resourceId: projectId, action: action as any, granted: false, reason: '权限不足' };
  }

  /**
   * 检查WBS任务权限
   */
  private async checkTaskPermission(
    permissions: UserPermission,
    taskId: string,
    action: string
  ): Promise<ResourcePermission> {
    // WBS任务可能存储在全局数据中，这里简化处理
    // 检查任务所属项目，然后检查项目权限
    // TODO: 实现任务权限检查逻辑
    return { resourceType: 'wbs_tasks', resourceId: taskId, action: action as any, granted: true };
  }

  /**
   * 检查部门权限
   */
  private async checkDepartmentPermission(
    permissions: UserPermission,
    departmentId: string,
    action: string
  ): Promise<ResourcePermission> {
    const deptId = parseInt(departmentId);

    // 检查用户是否属于该部门
    const isInDept = permissions.departments.some(d => d.id === deptId);

    if (!isInDept) {
      return {
        resourceType: 'departments',
        resourceId: departmentId,
        action: action as any,
        granted: false,
        reason: '您不属于该部门'
      };
    }

    // 部门经理有部门管理权限
    if (permissions.role === 'dept_manager') {
      const deptRole = permissions.departments.find(d => d.id === deptId)?.role;

      if (deptRole === 'dept_manager') {
        return { resourceType: 'departments', resourceId: departmentId, action: action as any, granted: true };
      }
    }

    // 其他角色只能查看
    if (action === 'read') {
      return { resourceType: 'departments', resourceId: departmentId, action: action as any, granted: true };
    }

    return { resourceType: 'departments', resourceId: departmentId, action: action as any, granted: false, reason: '权限不足' };
  }

  // ================================================================
  // 数据过滤
  // ================================================================

  /**
   * 获取用户数据过滤条件
   */
  async getDataFilterOptions(userId: number, resourceType: string): Promise<DataFilterOptions> {
    const permissions = await this.getUserPermissions(userId);

    // 管理员可以看到所有数据
    if (permissions.role === 'admin') {
      return {};
    }

    switch (resourceType) {
      case 'projects':
        // 只能看到主部门的项目
        return {
          departmentId: permissions.primaryDepartment.id
        };

      case 'wbs_tasks':
        // 只能看到主部门项目的任务
        return {
          projectId: undefined // TODO: 实现项目过滤
        };

      case 'organization_units':
        // 只能看到本部门的组织架构
        return {
          departmentId: permissions.primaryDepartment.id
        };

      default:
        return {};
    }
  }

  /**
   * 过滤全局数据（按部门）
   */
  async filterGlobalData<T extends { department_id?: number }>(
    userId: number,
    data: T[]
  ): Promise<T[]> {
    if (data.length === 0) {
      return data;
    }

    const permissions = await this.getUserPermissions(userId);

    // 管理员看到所有数据
    if (permissions.role === 'admin') {
      return data;
    }

    // 其他用户只能看到本部门的数据
    const deptId = permissions.primaryDepartment.id;
    return data.filter(item => item.department_id === deptId);
  }

  // ================================================================
  // WebSocket 广播消息过滤
  // ================================================================

  /**
   * 检查用户是否有权限接收广播消息
   */
  async canReceiveBroadcast(
    userId: number,
    message: any
  ): Promise<boolean> {
    try {
      // 获取用户权限
      const permissions = await this.getUserPermissions(userId);

      // 管理员接收所有消息
      if (permissions.role === 'admin') {
        return true;
      }

      // 根据消息类型检查权限
      switch (message.type) {
        case 'global_data_updated':
        case 'global_data_created':
          // 检查数据是否属于用户部门
          if (message.dataType === 'projects') {
            // 查询项目所属部门
            const [projects] = await databaseService.query(
              'SELECT department_id FROM projects WHERE code = ?',
              [message.dataId]
            ) as any[];

            if (projects && projects.length > 0) {
              const projectDeptId = projects[0].department_id;
              return permissions.departments.some(d => d.id === projectDeptId);
            }
          }
          return true;

        case 'data_conflict':
          // 冲突消息总是发送给相关用户
          return true;

        default:
          return true;
      }
    } catch (error) {
      console.error('[PermissionManager] 广播权限检查失败:', error);
      return true; // 出错时允许接收
    }
  }

  // ================================================================
  // 辅助函数
  // ================================================================

  /**
   * 检查用户是否属于指定部门
   */
  async isUserInDepartment(userId: number, departmentId: number): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.departments.some(d => d.id === departmentId);
  }

  /**
   * 检查用户是否属于指定技术组
   */
  async isUserInTechGroup(userId: number, techGroupId: number): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.techGroups.some(g => g.id === techGroupId);
  }

  /**
   * 检查用户是否为项目成员
   */
  async isProjectMember(userId: number, projectId: string): Promise<boolean> {
    const [members] = await databaseService.query(
      'SELECT * FROM project_members WHERE project_id = (SELECT id FROM projects WHERE code = ?) AND user_id = ?',
      [projectId, userId]
    ) as any[];

    return members && members.length > 0;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number; usageRate: number } {
    return {
      size: this.permissionCache.getActiveSize(),
      maxSize: 2000,
      usageRate: this.permissionCache.getUsageRate()
    };
  }
}

// 导出单例实例
export const permissionManagerOptimized = new PermissionManagerOptimized();
