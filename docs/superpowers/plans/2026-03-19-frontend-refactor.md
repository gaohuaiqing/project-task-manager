# 前端重构实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除旧前端代码，建立与后端 7 模块一致的功能模块化前端架构

**Architecture:** 采用功能模块化架构（features/ 目录），集中式 API 层，渐进式开发顺序。先建立基础设施，再开发核心页面，最后扩展页面。

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS + shadcn/ui + React Query + React Router

**Spec Document:** `docs/superpowers/specs/2026-03-19-frontend-architecture-design.md`

---

## 文件结构总览

### 创建的文件

```
app/src/
├── types/                        # 全局类型
│   ├── common.ts
│   ├── api.ts
│   └── index.ts
│
├── lib/api/                      # API 层
│   ├── client.ts
│   ├── query-keys.ts
│   ├── websocket.ts
│   ├── auth.api.ts
│   ├── org.api.ts
│   ├── project.api.ts
│   ├── task.api.ts
│   ├── workflow.api.ts
│   ├── collab.api.ts
│   ├── analytics.api.ts
│   └── index.ts
│
├── shared/
│   ├── context/
│   │   └── AppContext.tsx
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── components/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ProjectProgress.tsx
│   │   │   └── TaskDistribution.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardData.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   ├── projects/
│   │   ├── components/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   └── MilestoneTimeline.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   └── useProjectMutations.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   ├── tasks/
│   │   ├── components/
│   │   │   ├── WbsTable.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── DependencyGraph.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   └── useTaskMutations.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   ├── assignment/
│   │   ├── components/
│   │   │   ├── CapabilityMatrix.tsx
│   │   │   ├── AssignmentSuggestion.tsx
│   │   │   └── MemberCapabilities.tsx
│   │   ├── hooks/
│   │   │   └── useCapabilities.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   └── settings/
│       ├── components/
│       │   ├── UserForm.tsx
│       │   ├── PermissionEditor.tsx
│       │   └── OrgTree.tsx
│       ├── hooks/
│       │   └── useSettings.ts
│       ├── pages/
│       │   ├── Profile.tsx
│       │   ├── Users.tsx
│       │   ├── Permissions.tsx
│       │   ├── Organization.tsx
│       │   └── SystemConfig.tsx
│       ├── index.tsx
│       └── types.ts
│
└── App.tsx                       # 应用入口
```

### 删除的文件

```
app/src/components/projects/*       # 旧项目管理组件
app/src/components/task-management/*  # 旧任务管理组件
app/src/components/task-assignment/*  # 旧智能分配组件
app/src/components/dashboard/*      # 旧仪表板组件
app/src/components/settings/*       # 旧设置组件
app/src/components/analytics/*      # 旧分析组件
app/src/components/workflow/*       # 旧工作流组件
app/src/components/organization/*   # 旧组织架构组件
app/src/components/common/*         # 旧通用组件
app/src/components/shared/*         # 旧共享组件
app/src/components/dev/*            # 开发工具组件
app/src/components/layout/*         # 旧布局组件
app/src/components/auth/*           # 旧认证组件
app/src/components/capabilities/*   # 旧能力组件
app/src/components/gantt/*          # 旧甘特图组件
app/src/components/profile/*        # 旧个人资料组件
app/src/components/task-approval/*  # 旧审批组件
app/src/services/*                  # 旧服务层
app/src/hooks/useAuth.ts            # 旧认证 Hook
app/src/hooks/useAppData.ts         # 旧数据 Hook
app/src/hooks/useDialog.ts          # 旧对话框 Hook
app/src/hooks/useDebounce.ts        # 旧防抖 Hook
app/src/hooks/useNotification.ts    # 旧通知 Hook
app/src/hooks/useConflictResolution.tsx  # 旧冲突解决 Hook
app/src/types/*                     # 旧类型定义（部分）
app/src/utils/*                     # 旧工具函数（部分）
app/src/App.tsx                     # 旧应用入口
```

---

## Chunk 1: 基础设施（Phase 1）

### Task 1.1: 清理旧代码

**Files:**
- Delete: `app/src/components/projects/*`
- Delete: `app/src/components/task-management/*`
- Delete: `app/src/components/task-assignment/*`
- Delete: `app/src/components/dashboard/*`
- Delete: `app/src/components/settings/*`
- Delete: `app/src/components/analytics/*`
- Delete: `app/src/components/workflow/*`
- Delete: `app/src/components/organization/*`
- Delete: `app/src/components/common/*`
- Delete: `app/src/components/shared/*`
- Delete: `app/src/components/dev/*`
- Delete: `app/src/components/layout/*`
- Delete: `app/src/components/auth/*`
- Delete: `app/src/components/capabilities/*`
- Delete: `app/src/components/gantt/*`
- Delete: `app/src/components/profile/*`
- Delete: `app/src/components/task-approval/*`
- Delete: `app/src/services/*`
- Delete: `app/src/hooks/useAuth.ts`
- Delete: `app/src/hooks/useAppData.ts`
- Delete: `app/src/hooks/useDialog.ts`
- Delete: `app/src/hooks/useDebounce.ts`
- Delete: `app/src/hooks/useNotification.ts`
- Delete: `app/src/hooks/useConflictResolution.tsx`
- Delete: `app/src/types/*`（保留 index.ts 如果有）
- Delete: `app/src/utils/*`（保留必要的）
- Delete: `app/src/App.tsx`

- [ ] **Step 1: 删除旧业务组件目录**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0"
rm -rf app/src/components/projects
rm -rf app/src/components/task-management
rm -rf app/src/components/task-assignment
rm -rf app/src/components/dashboard
rm -rf app/src/components/settings
rm -rf app/src/components/analytics
rm -rf app/src/components/workflow
rm -rf app/src/components/organization
rm -rf app/src/components/common
rm -rf app/src/components/shared
rm -rf app/src/components/dev
rm -rf app/src/components/layout
rm -rf app/src/components/auth
rm -rf app/src/components/capabilities
rm -rf app/src/components/gantt
rm -rf app/src/components/profile
rm -rf app/src/components/task-approval
```

- [ ] **Step 2: 删除旧服务层和 hooks**

```bash
rm -rf app/src/services
rm -f app/src/hooks/useAuth.ts
rm -f app/src/hooks/useAppData.ts
rm -f app/src/hooks/useDialog.ts
rm -f app/src/hooks/useDebounce.ts
rm -f app/src/hooks/useNotification.ts
rm -f app/src/hooks/useConflictResolution.tsx
```

- [ ] **Step 3: 删除旧类型和工具函数**

```bash
# 备份可能需要的文件
mkdir -p app/src/types_backup
cp app/src/types/index.ts app/src/types_backup/ 2>/dev/null || true

# 删除旧文件
rm -rf app/src/types
rm -f app/src/utils/deviceId.ts
rm -f app/src/utils/syncEvents.ts
rm -f app/src/utils/employeeIdManager.ts
rm -f app/src/utils/syncLogger.ts
rm -f app/src/utils/dataFingerprint.ts
rm -f app/src/utils/browserStorageTest.ts
rm -f app/src/utils/employeeValidation.ts
rm -f app/src/utils/taskTypeManager.ts
rm -f app/src/utils/taskAssignmentAlgorithm.ts
rm -f app/src/utils/dateUtils.ts
rm -f app/src/utils/crossTabSync.ts
rm -f app/src/utils/xssProtection.ts

# 删除旧应用入口
rm -f app/src/App.tsx
```

- [ ] **Step 4: 提交清理**

```bash
git add -A
git commit -m "chore: 清理旧前端代码，准备重构

- 删除旧业务组件目录
- 删除旧服务层和 hooks
- 删除旧类型和工具函数
- 保留 shadcn/ui 基础组件"
```

---

### Task 1.2: 创建全局类型定义

**Files:**
- Create: `app/src/types/common.ts`
- Create: `app/src/types/api.ts`
- Create: `app/src/types/index.ts`

- [ ] **Step 1: 创建通用类型文件**

```typescript
// app/src/types/common.ts

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 通用 API 响应类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 通用列表查询参数
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通用实体类型
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户基本信息
 */
export interface UserBasic {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
}

/**
 * 部门基本信息
 */
export interface DepartmentBasic {
  id: string;
  name: string;
  parentId?: string;
}
```

- [ ] **Step 2: 创建 API 错误类型文件**

```typescript
// app/src/types/api.ts

/**
 * API 错误类型
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  validationErrors?: ValidationError[];
}

/**
 * HTTP 状态码枚举
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * 错误代码枚举
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

- [ ] **Step 3: 创建类型导出文件**

```typescript
// app/src/types/index.ts

// 通用类型
export type {
  PaginatedResponse,
  ApiResponse,
  ListQueryParams,
  BaseEntity,
  UserBasic,
  DepartmentBasic,
} from './common';

// API 类型
export type {
  ApiError,
  ValidationError,
  ApiErrorResponse,
} from './api';

export { HttpStatus, ErrorCode } from './api';
```

- [ ] **Step 4: 验证类型编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit src/types/index.ts
```

Expected: No errors

- [ ] **Step 5: 提交类型定义**

```bash
git add app/src/types
git commit -m "feat(types): 新增全局类型定义

- 通用类型（分页、响应、实体）
- API 错误类型
- 类型导出索引"
```

---

### Task 1.3: 创建 API 客户端

**Files:**
- Create: `app/src/lib/api/client.ts`
- Create: `app/src/lib/api/query-keys.ts`
- Create: `app/src/lib/api/websocket.ts`
- Create: `app/src/lib/api/index.ts`

**Prerequisites:**
- Verify axios is installed: `npm list axios`
- If not installed: `npm install axios`

- [ ] **Step 0: 验证依赖**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npm list axios
```

Expected: 显示 axios 版本

如果没有安装:
```bash
npm install axios
```

- [ ] **Step 1: 创建 Axios 客户端**

```typescript
// app/src/lib/api/client.ts

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * API 客户端配置
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Cookie 会话认证
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 获取 CSRF Token
 */
function getCsrfToken(): string | null {
  // 从 meta 标签获取 CSRF token
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') ?? null;
}

/**
 * 请求拦截器：添加 CSRF token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const csrfToken = getCsrfToken();
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器：统一错误处理
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    // 401 未认证，跳转登录
    if (error.response?.status === 401) {
      // 避免在登录页面循环重定向
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // 403 权限不足
    if (error.response?.status === 403) {
      console.error('权限不足:', error.response.data);
    }

    // 构造统一的错误对象
    const apiError = {
      code: (error.response?.data as { code?: string })?.code ?? 'UNKNOWN_ERROR',
      message: (error.response?.data as { message?: string })?.message ?? error.message,
      statusCode: error.response?.status ?? 0,
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
```

- [ ] **Step 2: 创建 React Query Keys**

```typescript
// app/src/lib/api/query-keys.ts

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
```

- [ ] **Step 3: 创建 WebSocket 客户端**

```typescript
// app/src/lib/api/websocket.ts

/**
 * WebSocket 消息处理器类型
 */
type MessageHandler = (data: unknown) => void;

/**
 * WebSocket 连接状态
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocket 客户端类
 */
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.status = 'connecting';
    this.notifyStatusChange();

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.status = 'error';
      this.notifyStatusChange();
      this.scheduleReconnect();
    }
  }

  /**
   * 设置 WebSocket 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.notifyStatusChange();
      console.log('WebSocket 已连接');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket 消息解析失败:', error);
      }
    };

    this.ws.onclose = () => {
      this.status = 'disconnected';
      this.notifyStatusChange();
      console.log('WebSocket 已断开');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      this.status = 'error';
      this.notifyStatusChange();
      console.error('WebSocket 错误:', error);
    };
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`WebSocket 将在 ${delay}ms 后重连 (第 ${this.reconnectAttempts} 次)`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('WebSocket 重连次数已达上限');
    }
  }

  /**
   * 订阅事件
   */
  subscribe(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: { type: string; data: unknown }): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('WebSocket 消息处理失败:', error);
        }
      });
    }
  }

  /**
   * 发送消息
   */
  send(type: string, data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket 未连接，消息发送失败');
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 监听状态变化
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.notifyStatusChange();
  }
}

/**
 * WebSocket 客户端单例
 */
export const wsClient = new WebSocketClient();

/**
 * 实时同步 Hook
 */
export function useRealtimeSync(
  queryClient: { invalidateQueries: (options: { queryKey: readonly unknown[] }) => void },
  queryKey: readonly unknown[]
): void {
  // 这个 hook 将在 React 组件中使用
  // 这里只是类型定义，实际实现在 hooks 目录
}
```

- [ ] **Step 4: 创建 API 导出索引**

```typescript
// app/src/lib/api/index.ts

// API 客户端
export { apiClient } from './client';

// Query Keys
export { queryKeys, type QueryKeys } from './query-keys';

// WebSocket
export { wsClient, type ConnectionStatus } from './websocket';

// 各模块 API（将在后续任务中创建）
// export { authApi } from './auth.api';
// export { orgApi } from './org.api';
// export { projectApi } from './project.api';
// export { taskApi } from './task.api';
// export { workflowApi } from './workflow.api';
// export { collabApi } from './collab.api';
// export { analyticsApi } from './analytics.api';
```

- [ ] **Step 5: 验证 API 层编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit src/lib/api/index.ts
```

Expected: No errors

- [ ] **Step 6: 提交 API 层**

```bash
git add app/src/lib/api
git commit -m "feat(api): 新增 API 客户端层

- Axios 客户端配置（CSRF、错误处理）
- React Query Keys 集中管理
- WebSocket 客户端（自动重连）"
```

---

### Task 1.4: 创建共享组件

**Files:**
- Create: `app/src/shared/context/AppContext.tsx`
- Create: `app/src/shared/components/LoadingSpinner.tsx`
- Create: `app/src/shared/components/ErrorBoundary.tsx`
- Create: `app/src/shared/components/ConfirmDialog.tsx`

- [ ] **Step 1: 创建全局 Context**

```tsx
// app/src/shared/context/AppContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * 应用全局状态
 */
interface AppContextValue {
  // 侧边栏状态
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 主题
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // 用户信息
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatar?: string;
  } | null;
  setCurrentUser: (user: AppContextValue['currentUser']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * 应用状态 Provider
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 从 localStorage 读取主题
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  });
  const [currentUser, setCurrentUser] = useState<AppContextValue['currentUser']>(null);

  // 主题变化时保存到 localStorage
  const handleSetTheme = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // 更新 document class
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        theme,
        setTheme: handleSetTheme,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/**
 * 使用应用状态的 Hook
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

export default AppContext;
```

- [ ] **Step 2: 创建加载指示器组件**

```tsx
// app/src/shared/components/LoadingSpinner.tsx

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * 加载指示器组件
 */
export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

/**
 * 全屏加载指示器
 */
export function FullPageLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export default LoadingSpinner;
```

- [ ] **Step 3: 创建错误边界组件**

```tsx
// app/src/shared/components/ErrorBoundary.tsx

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                出错了
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                页面遇到了一个错误，请尝试刷新页面或联系管理员。
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset}>重试</Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  刷新页面
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

- [ ] **Step 4: 创建确认对话框组件**

```tsx
// app/src/shared/components/ConfirmDialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

/**
 * 确认对话框组件
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel?.();
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {loading ? '处理中...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
```

- [ ] **Step 5: 验证共享组件编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: 提交共享组件**

```bash
git add app/src/shared
git commit -m "feat(shared): 新增共享组件

- AppContext 全局状态管理
- LoadingSpinner 加载指示器
- ErrorBoundary 错误边界
- ConfirmDialog 确认对话框"
```

---

### Task 1.5: 创建布局组件

**Files:**
- Create: `app/src/shared/layout/Sidebar.tsx`
- Create: `app/src/shared/layout/Header.tsx`
- Create: `app/src/shared/layout/MainLayout.tsx`

- [ ] **Step 1: 创建侧边栏组件**

```tsx
// app/src/shared/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppContext } from '../context/AppContext';

/**
 * 导航菜单项
 */
const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表板' },
  { path: '/projects', icon: FolderKanban, label: '项目管理' },
  { path: '/tasks', icon: ListTodo, label: '任务管理' },
  { path: '/assignment', icon: Users, label: '智能分配' },
  { path: '/settings', icon: Settings, label: '设置' },
];

/**
 * 侧边栏组件
 */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-sidebar-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo 区域 */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground">
            任务管理系统
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-active',
                      isActive && 'bg-sidebar-active text-sidebar-primary',
                      sidebarCollapsed && 'justify-center'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">{item.label}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>

      {/* 底部区域 */}
      <div className="border-t p-2">
        {/* 可以添加用户信息、退出登录等 */}
      </div>
    </aside>
  );
}

export default Sidebar;
```

- [ ] **Step 2: 创建头部组件**

```tsx
// app/src/shared/layout/Header.tsx

import { Bell, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

/**
 * 头部组件
 */
export function Header() {
  const { theme, setTheme, currentUser } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: 实现登出逻辑
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      {/* 左侧：面包屑或页面标题 */}
      <div className="flex items-center gap-2">
        {/* 可以添加面包屑导航 */}
      </div>

      {/* 右侧：工具栏 */}
      <div className="flex items-center gap-2">
        {/* 通知 */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{currentUser?.displayName ?? '用户'}</span>
                <span className="text-xs text-muted-foreground">
                  {currentUser?.email ?? ''}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
              个人设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
```

- [ ] **Step 3: 创建主布局组件**

```tsx
// app/src/shared/layout/MainLayout.tsx

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * 主布局组件
 */
export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 头部 */}
        <Header />

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto bg-background p-4">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
```

- [ ] **Step 4: 验证布局组件编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: 提交布局组件**

```bash
git add app/src/shared/layout
git commit -m "feat(layout): 新增布局组件

- Sidebar 侧边栏（可折叠、导航菜单）
- Header 头部（主题切换、用户菜单）
- MainLayout 主布局（Outlet 渲染）"
```

---

### Task 1.6: 创建认证模块

**Files:**
- Create: `app/src/features/auth/types.ts`
- Create: `app/src/lib/api/auth.api.ts`
- Create: `app/src/features/auth/hooks/useAuth.ts`
- Create: `app/src/features/auth/components/LoginForm.tsx`
- Create: `app/src/features/auth/components/ProtectedRoute.tsx`
- Create: `app/src/features/auth/index.tsx`

- [ ] **Step 1: 创建认证类型**

```typescript
// app/src/features/auth/types.ts

import type { BaseEntity, UserBasic } from '@/types';

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

/**
 * 用户权限
 */
export type Permission =
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'member:manage'
  | 'permission:manage'
  | 'setting:manage';

/**
 * 用户信息
 */
export interface User extends UserBasic {
  role: UserRole;
  permissions: Permission[];
  departmentId?: string;
  isActive: boolean;
}

/**
 * 会话信息
 */
export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  deviceId: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
  deviceId?: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: User;
  session: Session;
}

/**
 * 认证状态
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

- [ ] **Step 2: 创建认证 API**

```typescript
// app/src/lib/api/auth.api.ts

import { apiClient } from './client';
import { queryKeys } from './query-keys';
import type { LoginRequest, LoginResponse, User, Session } from '@/features/auth/types';
import type { ApiResponse } from '@/types';

/**
 * 认证 API
 */
export const authApi = {
  /**
   * 登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  /**
   * 登出
   */
  logout: async (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },

  /**
   * 获取当前用户
   */
  getCurrentUser: async (): Promise<User> => {
    return apiClient.get('/auth/me');
  },

  /**
   * 获取当前会话
   */
  getSession: async (): Promise<Session> => {
    return apiClient.get('/auth/session');
  },

  /**
   * 刷新会话
   */
  refreshSession: async (): Promise<Session> => {
    return apiClient.post('/auth/refresh');
  },

  /**
   * 修改密码
   */
  changePassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<void> => {
    return apiClient.put('/auth/password', data);
  },

  /**
   * 获取用户权限
   */
  getPermissions: async (): Promise<string[]> => {
    return apiClient.get('/auth/permissions');
  },
};

// 导出 query keys 供 React Query 使用
export const authQueryKeys = queryKeys.auth;
```

- [ ] **Step 3: 创建认证 Hook**

```typescript
// app/src/features/auth/hooks/useAuth.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, authQueryKeys } from '@/lib/api/auth.api';
import { useAppContext } from '@/shared/context/AppContext';
import type { LoginRequest, AuthState } from '../types';
import { useState, useCallback } from 'react';

/**
 * 认证 Hook
 */
export function useAuth(): AuthState & {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
} {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentUser } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  // 检查是否有登录标记（从 localStorage 读取）
  const [hasAuthCookie, setHasAuthCookie] = useState(() => {
    return localStorage.getItem('auth_pending') === 'true';
  });

  // 获取当前用户
  // 使用 enabled 控制是否自动请求，避免在未登录时触发 401 重定向循环
  const { data: user } = useQuery({
    queryKey: authQueryKeys.user,
    queryFn: authApi.getCurrentUser,
    enabled: hasAuthCookie, // 只有在有登录标记时才请求
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分钟
  });

  // 获取权限
  const { data: permissions = [] } = useQuery({
    queryKey: authQueryKeys.permissions,
    queryFn: authApi.getPermissions,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // 登录
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      // 设置登录标记
      localStorage.setItem('auth_pending', 'true');
      setHasAuthCookie(true);

      setCurrentUser({
        id: response.user.id,
        username: response.user.username,
        displayName: response.user.displayName,
        email: response.user.email,
        avatar: response.user.avatar,
      });
      // 刷新用户数据
      queryClient.invalidateQueries({ queryKey: authQueryKeys.user });
      navigate('/dashboard');
    },
  });

  // 登出
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // 清除登录标记
      localStorage.removeItem('auth_pending');
      setHasAuthCookie(false);

      setCurrentUser(null);
      queryClient.clear();
      navigate('/login');
    },
  });

  // 登录方法
  const login = useCallback(
    async (data: LoginRequest) => {
      setIsLoading(true);
      try {
        await loginMutation.mutateAsync(data);
      } finally {
        setIsLoading(false);
      }
    },
    [loginMutation]
  );

  // 登出方法
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  }, [logoutMutation]);

  // 权限检查
  const hasPermission = useCallback(
    (permission: string) => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  return {
    user: user ?? null,
    session: null, // TODO: 从 query 获取
    isAuthenticated: !!user,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    login,
    logout,
    hasPermission,
  };
}

export default useAuth;
```

- [ ] **Step 4: 创建登录表单组件**

```tsx
// app/src/features/auth/components/LoginForm.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * 登录表单组件
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    try {
      await login({ username, password });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">登录</CardTitle>
        <CardDescription>请输入您的用户名和密码</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
```

- [ ] **Step 5: 创建路由保护组件**

```tsx
// app/src/features/auth/components/ProtectedRoute.tsx

import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from '@/shared/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

/**
 * 路由保护组件
 */
export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  // 加载中
  if (isLoading) {
    return <FullPageLoader text="验证登录状态..." />;
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 权限不足
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">权限不足</h1>
          <p className="text-muted-foreground">您没有权限访问此页面</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

- [ ] **Step 6: 创建登录页面**

```tsx
// app/src/features/auth/index.tsx

import { LoginForm } from './components/LoginForm';

/**
 * 登录页面
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </div>
  );
}

// 导出组件
export { LoginForm } from './components/LoginForm';
export { ProtectedRoute } from './components/ProtectedRoute';
export { useAuth } from './hooks/useAuth';
export type { User, Session, LoginRequest, AuthState } from './types';
```

- [ ] **Step 7: 更新 API 导出**

```typescript
// app/src/lib/api/index.ts

// API 客户端
export { apiClient } from './client';

// Query Keys
export { queryKeys, type QueryKeys } from './query-keys';

// WebSocket
export { wsClient, type ConnectionStatus } from './websocket';

// 认证 API
export { authApi, authQueryKeys } from './auth.api';

// 其他模块 API（将在后续任务中创建）
// export { orgApi } from './org.api';
// export { projectApi } from './project.api';
// export { taskApi } from './task.api';
// export { workflowApi } from './workflow.api';
// export { collabApi } from './collab.api';
// export { analyticsApi } from './analytics.api';
```

- [ ] **Step 8: 验证认证模块编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 9: 提交认证模块**

```bash
git add app/src/features/auth app/src/lib/api/auth.api.ts app/src/lib/api/index.ts
git commit -m "feat(auth): 新增认证模块

- 认证类型定义（User、Session、Permission）
- 认证 API（login、logout、getCurrentUser）
- useAuth Hook（登录、登出、权限检查）
- LoginForm 登录表单组件
- ProtectedRoute 路由保护组件"
```

---

### Task 1.7: 创建应用入口

**Files:**
- Create: `app/src/App.tsx`
- Modify: `app/src/main.tsx`（如需要）

- [ ] **Step 1: 创建 App.tsx**

```tsx
// app/src/App.tsx

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from '@/shared/context/AppContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { MainLayout } from '@/shared/layout/MainLayout';
import { FullPageLoader } from '@/shared/components/LoadingSpinner';
import { wsClient } from '@/lib/api';

// 懒加载页面
const LoginPage = lazy(() => import('@/features/auth'));
const Dashboard = lazy(() => import('@/features/dashboard'));
const Projects = lazy(() => import('@/features/projects'));
const Tasks = lazy(() => import('@/features/tasks'));
const Assignment = lazy(() => import('@/features/assignment'));
const Settings = lazy(() => import('@/features/settings'));

// React Query 客户端配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * 应用入口组件
 */
export function App() {
  // 启动 WebSocket 连接
  useEffect(() => {
    wsClient.connect();
    return () => wsClient.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              {/* 公开路由 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 受保护路由 */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<Projects />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/:id" element={<Tasks />} />
                <Route path="/assignment" element={<Assignment />} />
                <Route path="/settings/*" element={<Settings />} />
              </Route>

              {/* 默认重定向 */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
```

- [ ] **Step 2: 检查 main.tsx**

```tsx
// app/src/main.tsx（确认内容）

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: 验证应用编译**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: 提交应用入口**

```bash
git add app/src/App.tsx app/src/main.tsx
git commit -m "feat(app): 新增应用入口

- React Query 配置
- 路由配置（懒加载、保护路由）
- WebSocket 初始化
- AppProvider 全局状态"
```

---

### Task 1.8: 创建占位页面

**Files:**
- Create: `app/src/features/dashboard/index.tsx`
- Create: `app/src/features/projects/index.tsx`
- Create: `app/src/features/tasks/index.tsx`
- Create: `app/src/features/assignment/index.tsx`
- Create: `app/src/features/settings/index.tsx`

- [ ] **Step 1: 创建仪表板占位页**

```tsx
// app/src/features/dashboard/index.tsx

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">仪表板</h1>
      <p className="text-muted-foreground">仪表板功能开发中...</p>
    </div>
  );
}
```

- [ ] **Step 2: 创建项目管理占位页**

```tsx
// app/src/features/projects/index.tsx

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">项目管理</h1>
      <p className="text-muted-foreground">项目管理功能开发中...</p>
    </div>
  );
}
```

- [ ] **Step 3: 创建任务管理占位页**

```tsx
// app/src/features/tasks/index.tsx

export default function TasksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">任务管理</h1>
      <p className="text-muted-foreground">任务管理功能开发中...</p>
    </div>
  );
}
```

- [ ] **Step 4: 创建智能分配占位页**

```tsx
// app/src/features/assignment/index.tsx

export default function AssignmentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">智能分配</h1>
      <p className="text-muted-foreground">智能分配功能开发中...</p>
    </div>
  );
}
```

- [ ] **Step 5: 创建设置占位页**

```tsx
// app/src/features/settings/index.tsx

import { Routes, Route } from 'react-router-dom';

function ProfilePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">个人设置</h1>
      <p className="text-muted-foreground">个人设置功能开发中...</p>
    </div>
  );
}

function UsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">用户管理</h1>
      <p className="text-muted-foreground">用户管理功能开发中...</p>
    </div>
  );
}

function PermissionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">权限管理</h1>
      <p className="text-muted-foreground">权限管理功能开发中...</p>
    </div>
  );
}

function OrganizationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">组织架构</h1>
      <p className="text-muted-foreground">组织架构功能开发中...</p>
    </div>
  );
}

function SystemConfigPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">系统配置</h1>
      <p className="text-muted-foreground">系统配置功能开发中...</p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Routes>
      <Route index element={<ProfilePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="permissions" element={<PermissionsPage />} />
      <Route path="organization" element={<OrganizationPage />} />
      <Route path="system" element={<SystemConfigPage />} />
    </Routes>
  );
}
```

- [ ] **Step 6: 验证应用启动**

```bash
cd "G:/Project/Web/Project_Task_Manager_3.0/app"
npm run dev
```

Expected: 应用成功启动，可以访问 http://localhost:5173

- [ ] **Step 7: 提交占位页面**

```bash
git add app/src/features
git commit -m "feat(features): 新增占位页面

- 仪表板占位页
- 项目管理占位页
- 任务管理占位页
- 智能分配占位页
- 设置占位页（含子路由）"
```

---

## Chunk 1 完成！

**阶段 1 验收标准：**
- [x] 旧代码已清理
- [x] 全局类型定义完成
- [x] API 客户端配置完成
- [x] 共享组件完成
- [x] 布局组件完成
- [x] 认证模块完成
- [x] 应用入口完成
- [x] 占位页面完成
- [x] 应用可正常启动

---

## Chunk 2: 核心页面（Phase 2）

> **注意**: Chunk 2 将在 Chunk 1 审查通过后继续编写。

### Task 2.1: 仪表板模块

**Files:**
- Create: `app/src/features/dashboard/types.ts`
- Create: `app/src/lib/api/analytics.api.ts`
- Create: `app/src/features/dashboard/hooks/useDashboardData.ts`
- Create: `app/src/features/dashboard/components/StatsCard.tsx`
- Create: `app/src/features/dashboard/components/ProjectProgress.tsx`
- Create: `app/src/features/dashboard/components/TaskDistribution.tsx`
- Modify: `app/src/features/dashboard/index.tsx`

（详细步骤将在 Chunk 1 审查后添加）

---

### Task 2.2: 项目管理模块

**Files:**
- Create: `app/src/features/projects/types.ts`
- Create: `app/src/lib/api/project.api.ts`
- Create: `app/src/features/projects/hooks/useProjects.ts`
- Create: `app/src/features/projects/hooks/useProjectMutations.ts`
- Create: `app/src/features/projects/components/ProjectList.tsx`
- Create: `app/src/features/projects/components/ProjectCard.tsx`
- Create: `app/src/features/projects/components/ProjectForm.tsx`
- Create: `app/src/features/projects/components/MilestoneTimeline.tsx`
- Modify: `app/src/features/projects/index.tsx`

（详细步骤将在 Chunk 1 审查后添加）

---

### Task 2.3: 任务管理模块

**Files:**
- Create: `app/src/features/tasks/types.ts`
- Create: `app/src/lib/api/task.api.ts`
- Create: `app/src/lib/api/workflow.api.ts`
- Create: `app/src/features/tasks/hooks/useTasks.ts`
- Create: `app/src/features/tasks/hooks/useTaskMutations.ts`
- Create: `app/src/features/tasks/components/WbsTable.tsx`
- Create: `app/src/features/tasks/components/TaskRow.tsx`
- Create: `app/src/features/tasks/components/TaskForm.tsx`
- Create: `app/src/features/tasks/components/DependencyGraph.tsx`
- Modify: `app/src/features/tasks/index.tsx`

（详细步骤将在 Chunk 1 审查后添加）

---

## Chunk 3: 扩展页面（Phase 3）

> **注意**: Chunk 3 将在 Chunk 2 审查通过后继续编写。

### Task 3.1: 智能分配模块

（详细步骤将在 Chunk 2 审查后添加）

---

### Task 3.2: 设置模块

（详细步骤将在 Chunk 2 审查后添加）

---

## 验收清单

### 阶段 1 完成标准
- [ ] API 客户端可正常请求后端
- [ ] React Query 缓存正常工作
- [ ] 布局组件渲染正确
- [ ] 登录流程完整可用
- [ ] 应用可正常启动

### 阶段 2 完成标准
- [ ] 仪表板显示统计数据
- [ ] 项目 CRUD 功能完整
- [ ] 任务 WBS 功能完整
- [ ] 所有 API 调用正常

### 阶段 3 完成标准
- [ ] 智能分配功能完整
- [ ] 设置页面功能完整
- [ ] 所有页面路由正常

---

## 相关文档

- [设计文档](./2026-03-19-frontend-architecture-design.md)
- [系统架构总览](../design/SYSTEM_OVERVIEW.md)
- [UI需求规格书](../requirements/UI_Requirement_0316-2023.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-19 | 1.0 | 初始版本 - Chunk 1 完成 |
