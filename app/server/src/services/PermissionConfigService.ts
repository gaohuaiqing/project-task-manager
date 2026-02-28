/**
 * 权限配置服务
 * 替代前端 localStorage 存储，提供服务端权限配置管理
 */

import { databaseService } from './DatabaseService.js';
import { systemLogger } from './AsyncSystemLogger.js';

// ================================================================
// 类型定义
// ================================================================

export interface PermissionConfigItem {
  id: string;
  name: string;
  description: string;
  module: string;
  permission: string;
  defaultLevels: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface PermissionConfig {
  items: PermissionConfigItem[];
  rolePermissions: Record<string, Record<string, string>>;
  version: number;
  lastUpdated: number;
  lastUpdatedBy: string;
}

export interface PermissionHistoryRecord {
  id: number;
  configId?: number;
  userId: number;
  username: string;
  action: string;
  details: string;
  oldValue?: any;
  newValue?: any;
  createdAt: Date;
}

// ================================================================
// 权限配置服务类
// ================================================================

export class PermissionConfigService {
  private configCache: PermissionConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取权限配置
   */
  async getPermissionConfig(): Promise<PermissionConfig> {
    // 检查缓存
    if (this.configCache && Date.now() < this.cacheExpiry) {
      return this.configCache;
    }

    try {
      const [rows] = await databaseService.query(
        `SELECT id, config_key, config_value, version, updated_by, updated_at
         FROM permission_configs
         WHERE config_key = 'role_permissions'
         LIMIT 1`
      ) as any[];

      if (!rows || rows.length === 0) {
        // 返回默认配置
        return this.getDefaultConfig();
      }

      const config = rows[0];
      const configValue = typeof config.config_value === 'string'
        ? JSON.parse(config.config_value)
        : config.config_value;

      this.configCache = {
        items: configValue.items || [],
        rolePermissions: configValue.rolePermissions || {},
        version: config.version,
        lastUpdated: new Date(config.updated_at).getTime(),
        lastUpdatedBy: config.updated_by?.toString() || 'system'
      };

      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      return this.configCache;
    } catch (error) {
      console.error('[PermissionConfigService] 获取权限配置失败:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 保存权限配置
   */
  async savePermissionConfig(
    config: PermissionConfig,
    userId: number,
    username: string,
    action: string = 'update',
    details?: string
  ): Promise<PermissionConfig> {
    const connection = await databaseService.getConnection();
    if (!connection) {
      throw new Error('无法获取数据库连接');
    }

    try {
      await connection.beginTransaction();

      // 获取当前配置
      const [rows] = await connection.query(
        `SELECT id, config_value FROM permission_configs WHERE config_key = 'role_permissions'`
      ) as any[];

      const oldConfig = rows && rows.length > 0 ? rows[0] : null;
      const oldValue = oldConfig ? (typeof oldConfig.config_value === 'string'
        ? JSON.parse(oldConfig.config_value)
        : oldConfig.config_value) : null;

      // 更新或插入配置
      const newVersion = (oldConfig?.version || 0) + 1;
      const newConfigValue = {
        ...config,
        version: newVersion,
        lastUpdated: Date.now(),
        lastUpdatedBy: userId.toString()
      };

      if (oldConfig) {
        await connection.query(
          `UPDATE permission_configs
           SET config_value = ?, version = ?, updated_by = ?
           WHERE config_key = 'role_permissions'`,
          [JSON.stringify(newConfigValue), newVersion, userId]
        );
      } else {
        await connection.query(
          `INSERT INTO permission_configs (config_key, config_value, version, updated_by)
           VALUES ('role_permissions', ?, ?, ?)`,
          [JSON.stringify(newConfigValue), newVersion, userId]
        );
      }

      // 记录历史
      const configId = oldConfig ? oldConfig.id : (await connection.query(
        'SELECT id FROM permission_configs WHERE config_key = ?'
      , ['role_permissions']) as any[])[0].id;

      await connection.query(
        `INSERT INTO permission_history (config_id, user_id, action, details, old_value, new_value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          configId,
          userId,
          action,
          details || '批量更新了角色权限配置',
          oldValue ? JSON.stringify(oldValue) : null,
          JSON.stringify(config)
        ]
      );

      await connection.commit();

      // 清除缓存
      this.clearCache();

      // 记录系统日志
      await systemLogger.logUserAction(
        'permission_config_updated',
        {
          action,
          details: details || '批量更新了角色权限配置',
          version: newVersion,
          changesCount: Object.keys(config.rolePermissions || {}).length
        },
        userId,
        username
      );

      // 返回新配置
      return await this.getPermissionConfig();
    } catch (error) {
      await connection.rollback();
      console.error('[PermissionConfigService] 保存权限配置失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 添加权限项
   */
  async addPermissionItem(
    item: Omit<PermissionConfigItem, 'createdAt' | 'updatedAt'>,
    userId: number,
    username: string
  ): Promise<PermissionConfig> {
    const config = await this.getPermissionConfig();

    const newItem: PermissionConfigItem = {
      ...item,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 更新角色权限配置
    const newRolePermissions = { ...config.rolePermissions };
    Object.entries(item.defaultLevels).forEach(([role, level]) => {
      if (!newRolePermissions[role]) {
        newRolePermissions[role] = {};
      }
      newRolePermissions[role][item.permission] = level;
    });

    const newConfig: PermissionConfig = {
      ...config,
      items: [...config.items, newItem],
      rolePermissions: newRolePermissions,
      version: config.version + 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId.toString()
    };

    return await this.savePermissionConfig(
      newConfig,
      userId,
      username,
      'add_permission',
      `添加了权限项: ${item.name}`
    );
  }

  /**
   * 更新权限项
   */
  async updatePermissionItem(
    itemId: string,
    updates: Partial<PermissionConfigItem>,
    userId: number,
    username: string
  ): Promise<PermissionConfig> {
    const config = await this.getPermissionConfig();

    const itemIndex = config.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`权限项不存在: ${itemId}`);
    }

    const updatedItems = [...config.items];
    const oldItem = updatedItems[itemIndex];
    const newItem: PermissionConfigItem = {
      ...oldItem,
      ...updates,
      updatedAt: Date.now()
    };
    updatedItems[itemIndex] = newItem;

    const newConfig: PermissionConfig = {
      ...config,
      items: updatedItems,
      version: config.version + 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId.toString()
    };

    return await this.savePermissionConfig(
      newConfig,
      userId,
      username,
      'update_permission',
      `更新了权限项: ${newItem.name}`
    );
  }

  /**
   * 删除权限项
   */
  async deletePermissionItem(
    itemId: string,
    userId: number,
    username: string
  ): Promise<PermissionConfig> {
    const config = await this.getPermissionConfig();

    const itemIndex = config.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`权限项不存在: ${itemId}`);
    }

    const deletedItem = config.items[itemIndex];

    // 从角色权限中移除该权限
    const newRolePermissions: Record<string, Record<string, string>> = {};
    Object.keys(config.rolePermissions).forEach(role => {
      newRolePermissions[role] = { ...config.rolePermissions[role] };
      delete newRolePermissions[role][deletedItem.permission];
    });

    const newConfig: PermissionConfig = {
      ...config,
      items: config.items.filter(item => item.id !== itemId),
      rolePermissions: newRolePermissions,
      version: config.version + 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId.toString()
    };

    return await this.savePermissionConfig(
      newConfig,
      userId,
      username,
      'delete_permission',
      `删除了权限项: ${deletedItem.name}`
    );
  }

  /**
   * 更新角色权限
   */
  async updateRolePermissions(
    rolePermissions: Record<string, Record<string, string>>,
    userId: number,
    username: string
  ): Promise<PermissionConfig> {
    const config = await this.getPermissionConfig();

    const newConfig: PermissionConfig = {
      ...config,
      rolePermissions,
      version: config.version + 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId.toString()
    };

    return await this.savePermissionConfig(
      newConfig,
      userId,
      username,
      'update_role_permissions',
      '批量更新了角色权限配置'
    );
  }

  /**
   * 获取权限变更历史
   */
  async getPermissionHistory(limit: number = 100): Promise<PermissionHistoryRecord[]> {
    try {
      const [rows] = await databaseService.query(
        `SELECT
          ph.id,
          ph.config_id,
          ph.user_id,
          u.username,
          ph.action,
          ph.details,
          ph.old_value,
          ph.new_value,
          ph.created_at
         FROM permission_history ph
         LEFT JOIN users u ON ph.user_id = u.id
         ORDER BY ph.created_at DESC
         LIMIT ?`,
        [limit]
      ) as any[];

      return (rows || []).map((row: any) => ({
        id: row.id,
        configId: row.config_id,
        userId: row.user_id,
        username: row.username,
        action: row.action,
        details: row.details,
        oldValue: row.old_value ? (typeof row.old_value === 'string'
          ? JSON.parse(row.old_value)
          : row.old_value) : undefined,
        newValue: row.new_value ? (typeof row.new_value === 'string'
          ? JSON.parse(row.new_value)
          : row.new_value) : undefined,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('[PermissionConfigService] 获取权限历史失败:', error);
      return [];
    }
  }

  /**
   * 检查用户是否有权限执行操作
   */
  async checkPermission(
    userId: number,
    role: string,
    operation: string
  ): Promise<boolean> {
    try {
      const config = await this.getPermissionConfig();

      // 管理员拥有所有权限
      if (role === 'admin') {
        return true;
      }

      // 检查角色是否有该操作权限
      const rolePermissions = config.rolePermissions[role];
      if (!rolePermissions) {
        return false;
      }

      const permissionLevel = rolePermissions[operation];
      // 'none' 表示无权限，其他都有权限
      return permissionLevel !== 'none';
    } catch (error) {
      console.error('[PermissionConfigService] 检查权限失败:', error);
      return false;
    }
  }

  /**
   * 获取用户对指定操作的权限级别
   */
  async getPermissionLevel(
    userId: number,
    role: string,
    operation: string
  ): Promise<string> {
    try {
      const config = await this.getPermissionConfig();

      if (role === 'admin') {
        return 'full';
      }

      const rolePermissions = config.rolePermissions[role];
      if (!rolePermissions) {
        return 'none';
      }

      return rolePermissions[operation] || 'none';
    } catch (error) {
      console.error('[PermissionConfigService] 获取权限级别失败:', error);
      return 'none';
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): PermissionConfig {
    return {
      items: [],
      rolePermissions: {
        admin: {},
        tech_manager: {},
        dept_manager: {},
        engineer: {}
      },
      version: 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: 'system'
    };
  }
}

// 导出单例
export const permissionConfigService = new PermissionConfigService();
