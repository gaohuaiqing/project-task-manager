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
    departmentTree: ['org', 'departments', 'tree'] as const,
    department: (id: number) => ['org', 'department', id] as const,
    members: (params?: object) => ['org', 'members', params] as const,
    member: (id: number) => ['org', 'member', id] as const,
    capabilities: ['org', 'capabilities'] as const,
    capability: (id: string) => ['org', 'capability', id] as const,
    capabilityModels: ['org', 'capability-models'] as const,
    capabilityModel: (id: string) => ['org', 'capability-model', id] as const,
  },

  // ==================== 项目管理 ====================
  projects: {
    all: ['projects'] as const,
    list: (params?: object) => ['projects', 'list', params] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    milestones: (projectId: string) => ['projects', 'milestones', projectId] as const,
    milestone: (projectId: string, milestoneId: string) =>
      ['projects', 'milestone', projectId, milestoneId] as const,
    timelines: (projectId: string) => ['projects', 'timelines', projectId] as const,
    tags: (projectId: string) => ['projects', 'tags', projectId] as const,
  },

  // 项目管理别名（单数形式）
  project: {
    all: ['projects'] as const,
    list: (params?: object) => ['projects', 'list', params] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    milestones: (projectId: string) => ['projects', 'milestones', projectId] as const,
    milestone: (projectId: string, milestoneId: string) =>
      ['projects', 'milestone', projectId, milestoneId] as const,
    timelines: (projectId: string) => ['projects', 'timelines', projectId] as const,
    tags: (projectId: string) => ['projects', 'tags', projectId] as const,
    members: (projectId: string) => ['projects', 'members', projectId] as const,
    stats: (projectId: string) => ['projects', 'stats', projectId] as const,
  },

  // ==================== 任务管理 ====================
  tasks: {
    all: ['tasks'] as const,
    lists: () => ['tasks', 'list'] as const,
    list: (params?: object) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    stats: (projectId: string) => ['tasks', 'stats', projectId] as const,
    progressRecords: (taskId: string) => ['tasks', 'progress', taskId] as const,
    dependencies: (taskId: string) => ['tasks', 'dependencies', taskId] as const,
    history: (taskId: string) => ['tasks', 'history', taskId] as const,
    wbsTree: (projectId: string) => ['tasks', 'wbsTree', projectId] as const,
  },

  // 任务管理别名（单数形式）
  task: {
    all: ['tasks'] as const,
    lists: () => ['tasks', 'list'] as const,
    list: (params?: object) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    stats: (projectId: string) => ['tasks', 'stats', projectId] as const,
    progressRecords: (taskId: string) => ['tasks', 'progress', taskId] as const,
    dependencies: (taskId: string) => ['tasks', 'dependencies', taskId] as const,
    history: (taskId: string) => ['tasks', 'history', taskId] as const,
    wbsTree: (projectId: string) => ['tasks', 'wbsTree', projectId] as const,
  },

  // ==================== 工作流 ====================
  workflow: {
    all: ['workflow'] as const,
    approvals: ['workflow', 'approvals'] as const,
    pendingApprovals: ['workflow', 'pending'] as const,
    approval: (id: string) => ['workflow', 'approval', id] as const,
    planChangesList: (params?: object) => ['workflow', 'plan-changes', params] as const,
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
    dashboardStats: () => ['analytics', 'dashboardStats'] as const,
    projectStats: (projectId: string) => ['analytics', 'project', projectId] as const,
    taskStats: (projectId: string) => ['analytics', 'tasks', projectId] as const,
    taskTrend: (params: object) => ['analytics', 'taskTrend', params] as const,
    taskStatistics: (params: object) => ['analytics', 'taskStatistics', params] as const,
    projectProgress: (projectId: string) => ['analytics', 'projectProgress', projectId] as const,
    delayAnalysis: (params: object) => ['analytics', 'delayAnalysis', params] as const,
    reports: (type: string) => ['analytics', 'reports', type] as const,
    // 报表分析模块
    projectProgressReport: (projectId?: string) => ['analytics', 'reports', 'project-progress', projectId] as const,
    taskStatisticsReport: (filters: object) => ['analytics', 'reports', 'task-statistics', filters] as const,
    delayAnalysisReport: (filters: object) => ['analytics', 'reports', 'delay-analysis', filters] as const,
    memberAnalysisReport: (memberId?: number) => ['analytics', 'reports', 'member-analysis', memberId] as const,
    resourceEfficiencyReport: (filters: object) => ['analytics', 'reports', 'resource-efficiency', filters] as const,
    reportTrend: (params: object) => ['analytics', 'reports', 'trend', params] as const,
    // 角色仪表板
    adminDashboard: (projectId?: string) => ['analytics', 'dashboard', 'admin', projectId] as const,
    deptManagerDashboard: (projectId?: string) => ['analytics', 'dashboard', 'dept-manager', projectId] as const,
    techManagerDashboard: (projectId?: string, groupId?: number) => ['analytics', 'dashboard', 'tech-manager', projectId, groupId] as const,
    engineerDashboard: (projectId?: string) => ['analytics', 'dashboard', 'engineer', projectId] as const,
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
