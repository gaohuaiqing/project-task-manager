/**
 * React Query 缓存键定义
 * 集中管理所有 query keys，避免冲突
 */
export const queryKeys = {
  // ==================== 认证 ====================
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
    permissions: ['auth', 'permissions'] as const,
  },

  // ==================== 组织架构 ====================
  org: {
    all: ['org'] as const,
    departments: ['org', 'departments'] as const,
    department: (id: string) => ['org', 'department', id] as const,
    members: ['org', 'members'] as const,
    member: (id: string) => ['org', 'member', id] as const,
    capabilities: ['org', 'capabilities'] as const,
    capability: (id: string) => ['org', 'capability', id] as const,
  },

  // ==================== 项目管理 ====================
  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    milestones: (projectId: string) => ['projects', 'milestones', projectId] as const,
    milestone: (projectId: string, milestoneId: string) =>
      ['projects', 'milestone', projectId, milestoneId] as const,
    timelines: (projectId: string) => ['projects', 'timelines', projectId] as const,
    tags: (projectId: string) => ['projects', 'tags', projectId] as const,
  },

  // ==================== 任务管理 ====================
  tasks: {
    all: ['tasks'] as const,
    list: (projectId: string) => ['tasks', 'list', projectId] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    dependencies: (taskId: string) => ['tasks', 'dependencies', taskId] as const,
    history: (taskId: string) => ['tasks', 'history', taskId] as const,
  },

  // ==================== 工作流 ====================
  workflow: {
    all: ['workflow'] as const,
    approvals: ['workflow', 'approvals'] as const,
    pendingApprovals: ['workflow', 'pending'] as const,
    approval: (id: string) => ['workflow', 'approval', id] as const,
    rules: ['workflow', 'rules'] as const,
    notifications: ['workflow', 'notifications'] as const,
  },

  // ==================== 协作 ====================
  collab: {
    all: ['collab'] as const,
    versions: (entityType: string, entityId: string) =>
      ['collab', 'versions', entityType, entityId] as const,
    version: (versionId: string) => ['collab', 'version', versionId] as const,
    attachments: (entityType: string, entityId: string) =>
      ['collab', 'attachments', entityType, entityId] as const,
  },

  // ==================== 分析 ====================
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => ['analytics', 'dashboard'] as const,
    projectStats: (projectId: string) => ['analytics', 'project', projectId] as const,
    taskStats: (projectId: string) => ['analytics', 'tasks', projectId] as const,
    reports: (type: string) => ['analytics', 'reports', type] as const,
  },

  // ==================== 系统配置 ====================
  config: {
    all: ['config'] as const,
    timeSettings: ['config', 'time-settings'] as const,
    holidays: ['config', 'holidays'] as const,
  },
} as const;

/**
 * Query Keys 类型
 */
export type QueryKeys = typeof queryKeys;
