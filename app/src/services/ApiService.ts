const API_BASE_URL = 'http://localhost:3001/api';

interface LoginResponse {
  success: boolean;
  session?: {
    sessionId: string;
    username: string;
    createdAt: number;
  };
  message?: string;
}

interface SyncResponse {
  success: boolean;
  data?: any;
  message?: string;
}

class ApiService {
  // 优化：请求去重机制，避免相同请求重复发送
  private pendingRequests = new Map<string, Promise<any>>();

  // 分级超时配置
  private readonly TIMEOUT_CONFIG = {
    FAST: parseInt(import.meta.env?.VITE_API_TIMEOUT_FAST || '5000'),
    NORMAL: parseInt(import.meta.env?.VITE_API_TIMEOUT_NORMAL || '10000'),
    SLOW: parseInt(import.meta.env?.VITE_API_TIMEOUT_SLOW || '30000'),
    DEFAULT: 10000
  };

  private getTimeoutForOperation(endpoint: string, method: string = 'GET'): number {
    // 快速操作
    if (endpoint.includes('/login') || endpoint.includes('/health')) {
      return this.TIMEOUT_CONFIG.FAST;
    }
    // 慢操作
    if (endpoint.includes('/batch/') || endpoint.includes('/export') || method === 'POST') {
      return this.TIMEOUT_CONFIG.SLOW;
    }
    return this.TIMEOUT_CONFIG.DEFAULT;
  }

  private getSessionId(): string | null {
    // 尝试从 localStorage 获取当前用户的 sessionId
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return null;

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);
      return session.sessionId || null;
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // 优化：生成请求缓存键，用于请求去重
    const cacheKey = `${endpoint}:${JSON.stringify(options)}`;

    // 优化：检查是否有相同请求正在进行
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`[ApiService] 请求去重: 复用现有请求 - ${endpoint}`);
      return this.pendingRequests.get(cacheKey) as Promise<T>;
    }

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 添加 sessionId 到请求头（如果存在）
    const sessionId = this.getSessionId();
    if (sessionId) {
      (defaultHeaders as any)['x-session-id'] = sessionId;
    }

    // 添加用户信息到请求头（从 localStorage 获取）
    const userId = this.getCurrentUserId();
    const userRole = this.getCurrentUserRole();
    if (userId) {
      (defaultHeaders as any)['x-user-id'] = userId.toString();
    }
    if (userRole) {
      (defaultHeaders as any)['x-user-role'] = userRole;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // 优化：创建请求超时控制器（使用分级超时策略）
    const timeout = this.getTimeoutForOperation(endpoint, options.method);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    // 创建请求Promise
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error: any) {
        // 优化：处理超时错误
        if (error.name === 'AbortError') {
          const timeout = this.getTimeoutForOperation(endpoint, options.method);
          console.error(`[ApiService] 请求超时: ${endpoint} (${timeout}ms)`);
          throw new Error(`请求超时: ${endpoint}`);
        }
        console.error(`[ApiService] 请求失败: ${endpoint}`, error);
        throw error;
      } finally {
        clearTimeout(timeoutId);
        // 请求完成后清理pending请求
        this.pendingRequests.delete(cacheKey);
      }
    })();

    // 将请求加入pending队列
    this.pendingRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  private getCurrentUserId(): number | null {
    // 尝试从 localStorage 获取当前用户 ID
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return null;

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);
      return session.userId || null;
    } catch {
      return null;
    }
  }

  private getCurrentUserRole(): string | null {
    // 尝试从 localStorage 获取当前用户角色
    const activeUserKey = Object.keys(localStorage).find(key => key.startsWith('active_session_'));
    if (!activeUserKey) return null;

    try {
      const sessionData = localStorage.getItem(activeUserKey);
      if (!sessionData) return null;
      const session = JSON.parse(sessionData);
      return session.role || null;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    // 性能优化：移除外部IP获取，直接使用 'local'
    // 后端已支持 'local' IP 作为特殊情况，避免 0-10 秒的外部请求延迟
    const ip = 'local';

    return this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, ip }),
    });
  }

  async logout(sessionId: string): Promise<{ success: boolean }> {
    return this.request('/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async getSessions(username: string): Promise<{ sessions: any[] }> {
    return this.request(`/sessions/${username}`);
  }

  async syncData(sessionId: string, dataType: string, data: any): Promise<SyncResponse> {
    return this.request('/sync', {
      method: 'POST',
      body: JSON.stringify({ sessionId, dataType, data }),
    });
  }

  async getData(username: string, dataType: string): Promise<{ data: any }> {
    return this.request(`/data/${username}/${dataType}`);
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    // 注意：health 端点不在 /api 路径下，需要直接使用完整 URL
    try {
      const response = await fetch('http://localhost:3001/health');
      return await response.json();
    } catch (error) {
      console.error('[ApiService] Health check failed:', error);
      throw error;
    }
  }

  // ================================================================
  // 权限配置 API
  // ================================================================

  /**
   * 获取权限配置
   */
  async getPermissionConfig(): Promise<{ success: boolean; data: any }> {
    return this.request('/permissions/config');
  }

  /**
   * 保存权限配置
   */
  async savePermissionConfig(config: any): Promise<{ success: boolean; data: any }> {
    return this.request('/permissions/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * 添加权限项
   */
  async addPermissionItem(item: any): Promise<{ success: boolean; data: any }> {
    return this.request('/permissions/item', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  /**
   * 更新权限项
   */
  async updatePermissionItem(itemId: string, updates: any): Promise<{ success: boolean; data: any }> {
    return this.request(`/permissions/item/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * 删除权限项
   */
  async deletePermissionItem(itemId: string): Promise<{ success: boolean; data: any }> {
    return this.request(`/permissions/item/${itemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 批量更新角色权限
   */
  async updateRolePermissions(rolePermissions: any): Promise<{ success: boolean; data: any }> {
    return this.request('/permissions/roles', {
      method: 'PUT',
      body: JSON.stringify({ rolePermissions }),
    });
  }

  /**
   * 获取权限变更历史
   */
  async getPermissionHistory(limit = 100): Promise<{ success: boolean; data: any[] }> {
    return this.request(`/permissions/history?limit=${limit}`);
  }

  /**
   * 检查用户是否有指定操作的权限
   */
  async checkPermission(operation: string): Promise<{ success: boolean; data: { hasPermission: boolean; operation: string; role: string } }> {
    return this.request(`/permissions/check/${operation}`);
  }

  /**
   * 获取用户对指定操作的权限级别
   */
  async getPermissionLevel(operation: string): Promise<{ success: boolean; data: { level: string; operation: string; role: string } }> {
    return this.request(`/permissions/level/${operation}`);
  }

  // ================================================================
  // 组织架构 API
  // ================================================================

  /**
   * 获取完整组织架构
   */
  async getOrganizationStructure(): Promise<{ success: boolean; data: any }> {
    return this.request('/organization/structure');
  }

  /**
   * 获取部门列表
   */
  async getDepartments(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/organization/departments');
  }

  /**
   * 创建部门
   */
  async createDepartment(department: any): Promise<{ success: boolean; data: any }> {
    return this.request('/organization/departments', {
      method: 'POST',
      body: JSON.stringify(department),
    });
  }

  /**
   * 更新部门
   */
  async updateDepartment(departmentId: number, updates: any): Promise<{ success: boolean }> {
    return this.request(`/organization/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * 删除部门
   */
  async deleteDepartment(departmentId: number): Promise<{ success: boolean }> {
    return this.request(`/organization/departments/${departmentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 添加用户到部门
   */
  async addUserToDepartment(data: { userId: number; departmentId: number; role: string; isPrimary: boolean; position?: string }): Promise<{ success: boolean }> {
    return this.request('/organization/departments/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 从部门移除用户
   */
  async removeUserFromDepartment(departmentId: number, userId: number): Promise<{ success: boolean }> {
    return this.request(`/organization/departments/${departmentId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取技术组列表
   */
  async getTechGroups(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/organization/tech-groups');
  }

  // ================================================================
  // 批量查询 API（性能优化）
  // ================================================================

  /**
   * 批量查询接口（减少网络往返）
   * 使用示例：
   * ```typescript
   * const result = await apiService.batchQuery({
   *   queries: [
   *     { type: 'projects', ids: [1, 2, 3] },
   *     { type: 'members', ids: [1, 2, 3] },
   *     { type: 'wbs_tasks', ids: [1, 2, 3] }
   *   ]
   * });
   * ```
   */
  async batchQuery(request: {
    queries: Array<{
      type: 'projects' | 'members' | 'wbs_tasks';
      ids: number[];
      fields?: string[];
    }>;
  }): Promise<{
    success: boolean;
    data: {
      projects?: any[];
      members?: any[];
      wbs_tasks?: any[];
    };
    meta?: {
      queries: number;
      queryTime: number;
    };
  }> {
    return this.request('/batch/mixed', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * 批量获取项目详情
   */
  async batchGetProjects(ids: number[], fields?: string[]): Promise<{
    success: boolean;
    data: any[];
    meta?: {
      count: number;
      requested: number;
      queryTime: number;
    };
  }> {
    return this.request('/batch/projects', {
      method: 'POST',
      body: JSON.stringify({ ids, fields })
    });
  }

  /**
   * 批量获取成员详情
   */
  async batchGetMembers(ids: number[], fields?: string[]): Promise<{
    success: boolean;
    data: any[];
    meta?: {
      count: number;
      requested: number;
      queryTime: number;
    };
  }> {
    return this.request('/batch/members', {
      method: 'POST',
      body: JSON.stringify({ ids, fields })
    });
  }

  /**
   * 批量获取任务详情
   */
  async batchGetWbsTasks(ids: number[], fields?: string[]): Promise<{
    success: boolean;
    data: any[];
    meta?: {
      count: number;
      requested: number;
      queryTime: number;
    };
  }> {
    return this.request('/batch/wbs-tasks', {
      method: 'POST',
      body: JSON.stringify({ ids, fields })
    });
  }

  /**
   * 获取批量统计信息
   */
  async batchGetStats(types: Array<'projects' | 'members' | 'wbs_tasks' | 'cache'>): Promise<{
    success: boolean;
    data: any;
    meta?: {
      queryTime: number;
    };
  }> {
    return this.request('/batch/stats', {
      method: 'POST',
      body: JSON.stringify({ types })
    });
  }
}

export const apiService = new ApiService();
