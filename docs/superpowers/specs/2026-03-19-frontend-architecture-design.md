# 前端架构设计文档

> **文档版本**: 1.1
> **创建日期**: 2026-03-19
> **状态**: 设计完成，待实施
> **作者**: AI Assistant

---

## 1. 概述

### 1.1 背景

当前前端代码是旧版本，不符合新的需求文档和设计文档要求。后端已完成 7 个模块的重构，前端需要同步重构以匹配新的 API 结构和业务需求。

### 1.2 目标

- 删除旧前端代码，消除技术债务
- 建立与后端模块化架构一致的前端结构
- 采用功能模块化架构，支持 AI 并行开发
- 严格遵循 YAGNI、KISS、DRY 原则

### 1.3 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.9.3 | 类型安全 |
| Vite | 7.2.4 | 构建工具 |
| Tailwind CSS | 3.4.19 | 样式框架 |
| shadcn/ui | - | UI 组件库 |
| React Query | - | 数据获取与缓存 |
| React Router | - | 路由管理 |
| date-fns | - | 日期处理 |

---

## 2. 架构决策

### 2.1 架构模式：功能模块化

**选择理由：**

| 维度 | 优势 |
|------|------|
| 与后端一致 | 后端 7 个独立模块，前端按功能域组织，API 调用映射清晰 |
| AI 并行开发 | 每个功能独立目录，可分配给不同 Agent 并行开发 |
| 隔离性 | 修改一个功能不影响其他功能，减少回归风险 |
| 高内聚 | 一个功能的组件、hooks、types 都在一起，上下文完整 |
| YAGNI | 只在需要时创建共享组件，避免过度抽象 |

### 2.2 API 服务层：集中式

**选择理由：**

| 维度 | 优势 |
|------|------|
| 类型安全 | 所有 API 类型定义在一处，与后端 types.ts 一一对应 |
| QueryKey 管理 | React Query 的 queryKey 统一管理，避免缓存键冲突 |
| 基础配置 | baseURL、请求拦截器、错误处理只配置一次 |
| 调试友好 | 所有 API 调用集中，AI 修改时不用跨目录 |

### 2.3 开发顺序：渐进式

**选择理由：**

- 循序渐进，每步可验证
- 降低集成风险
- 符合后端模块依赖顺序

---

## 3. 目录结构

```
app/src/
├── components/
│   └── ui/                        # shadcn/ui 基础组件（保留，约50个）
│
├── features/                      # 功能模块（按页面/功能域）
│   ├── auth/                      # 认证模块
│   │   ├── components/           # 认证相关组件
│   │   │   ├── LoginForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/                # 认证相关 hooks
│   │   │   └── useAuth.ts
│   │   ├── index.tsx             # 登录页面入口
│   │   └── types.ts              # 认证类型
│   │
│   ├── dashboard/                 # 仪表板
│   │   ├── components/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ProjectProgress.tsx
│   │   │   └── TaskDistribution.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardData.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   ├── projects/                  # 项目管理
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
│   ├── tasks/                     # 任务管理
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
│   ├── assignment/                # 智能分配
│   │   ├── components/
│   │   │   ├── CapabilityMatrix.tsx
│   │   │   ├── AssignmentSuggestion.tsx
│   │   │   └── MemberCapabilities.tsx
│   │   ├── hooks/
│   │   │   └── useCapabilities.ts
│   │   ├── index.tsx
│   │   └── types.ts
│   │
│   └── settings/                  # 设置
│       ├── components/            # 可复用组件
│       │   ├── UserForm.tsx       # 用户表单组件
│       │   ├── PermissionEditor.tsx
│       │   └── OrgTree.tsx        # 组织架构树
│       ├── hooks/
│       ├── pages/                 # 设置子页面（路由级）
│       │   ├── Profile.tsx        # /settings/profile
│       │   ├── Users.tsx          # /settings/users
│       │   ├── Permissions.tsx    # /settings/permissions
│       │   ├── Organization.tsx   # /settings/organization
│       │   └── SystemConfig.tsx   # /settings/system
│       ├── index.tsx
│       └── types.ts
│
├── shared/                        # 真正共享的组件（按需创建）
│   ├── layout/                   # 布局组件
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── components/               # 跨功能共享组件
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
│
├── lib/                          # 核心库
│   ├── api/                      # API 层（集中式）
│   │   ├── client.ts            # Axios 实例配置
│   │   ├── auth.api.ts          # 认证 API
│   │   ├── org.api.ts           # 组织架构 API
│   │   ├── project.api.ts       # 项目管理 API
│   │   ├── task.api.ts          # 任务管理 API
│   │   ├── workflow.api.ts      # 工作流 API
│   │   ├── collab.api.ts        # 协作 API
│   │   ├── analytics.api.ts     # 分析 API
│   │   ├── query-keys.ts        # React Query keys
│   │   └── index.ts             # 统一导出
│   └── utils.ts                  # 工具函数（保留）
│
├── types/                        # 全局类型定义
│   ├── common.ts                # 通用类型（分页、响应等）
│   ├── api.ts                   # API 响应类型
│   └── index.ts                 # 统一导出
│
├── hooks/                        # 全局 Hooks
│   └── use-mobile.ts            # 移动端检测（保留）
│
├── App.tsx                       # 应用入口（路由配置）
├── main.tsx                      # 渲染入口（保留）
└── index.css                     # 全局样式（保留）
```

---

## 4. 组件规范

### 4.1 文件大小限制

| 类型 | 最大行数 | 原因 |
|------|---------|------|
| 组件文件 | 200 行 | 保持可理解性，超出则拆分 |
| Hook 文件 | 100 行 | 单一职责 |
| API 文件 | 150 行 | 按模块拆分，超出则细分 |
| 类型文件 | 100 行 | 按需拆分 |

### 4.2 命名规范

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件 | PascalCase | `ProjectCard.tsx` |
| Hook | camelCase + use 前缀 | `useProjects.ts` |
| API | 模块名 + .api.ts | `project.api.ts` |
| 类型 | PascalCase | `Project`, `ProjectFilters` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES` |

### 4.3 组件结构模板

```tsx
// features/projects/components/ProjectCard.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Project } from '../types';

// 1. 类型定义
interface ProjectCardProps {
  project: Project;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// 2. 组件实现
export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  // 2.1 Hooks
  const [isExpanded, setIsExpanded] = useState(false);

  // 2.2 派生状态
  const statusColor = getStatusColor(project.status);

  // 2.3 事件处理
  const handleEdit = () => onEdit?.(project.id);

  // 2.4 渲染
  return (
    <Card className={statusColor}>
      <CardHeader>{project.name}</CardHeader>
      <CardContent>
        {/* ... */}
      </CardContent>
    </Card>
  );
}

// 3. 辅助函数（组件私有）
function getStatusColor(status: string): string {
  // ...
}
```

---

## 5. API 层设计

### 5.1 客户端配置

```typescript
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Cookie 会话认证
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 CSRF token
apiClient.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 未认证，跳转登录
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 5.2 React Query Keys

```typescript
// lib/api/query-keys.ts
export const queryKeys = {
  // 认证
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
    permissions: ['auth', 'permissions'] as const,
  },

  // 组织架构
  org: {
    all: ['org'] as const,
    departments: ['org', 'departments'] as const,
    members: (filters?: MemberFilters) => ['org', 'members', filters] as const,
    capabilities: ['org', 'capabilities'] as const,
  },

  // 项目管理
  projects: {
    all: ['projects'] as const,
    list: (filters?: ProjectFilters) => ['projects', 'list', filters] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    milestones: (projectId: string) => ['projects', 'milestones', projectId] as const,
  },

  // 任务管理
  tasks: {
    all: ['tasks'] as const,
    list: (projectId: string, filters?: TaskFilters) =>
      ['tasks', 'list', projectId, filters] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    dependencies: (taskId: string) => ['tasks', 'dependencies', taskId] as const,
  },

  // 工作流
  workflow: {
    approvals: ['workflow', 'approvals'] as const,
    pendingApprovals: ['workflow', 'pending'] as const,
  },

  // 协作
  collab: {
    versions: (entityType: string, entityId: string) =>
      ['collab', 'versions', entityType, entityId] as const,
  },

  // 分析
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    reports: (type: string, params?: object) =>
      ['analytics', 'reports', type, params] as const,
  },
} as const;
```

### 5.3 API 函数模板

```typescript
// lib/api/project.api.ts
import { apiClient } from './client';
import { queryKeys } from './query-keys';
import type { Project, ProjectFilters, CreateProjectDto, UpdateProjectDto } from '@/types';

export const projectApi = {
  // 获取项目列表
  getList: async (filters?: ProjectFilters): Promise<PaginatedResponse<Project>> => {
    return apiClient.get('/projects', { params: filters });
  },

  // 获取单个项目
  getDetail: async (id: string): Promise<Project> => {
    return apiClient.get(`/projects/${id}`);
  },

  // 创建项目
  create: async (data: CreateProjectDto): Promise<Project> => {
    return apiClient.post('/projects', data);
  },

  // 更新项目
  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    return apiClient.put(`/projects/${id}`, data);
  },

  // 删除项目
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/projects/${id}`);
  },
};

// React Query Hooks
export const useProjects = (filters?: ProjectFilters) => {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectApi.getList(filters),
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectApi.getDetail(id),
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      projectApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });
};
```

---

## 6. 实时通信（WebSocket）

### 6.1 WebSocket 客户端设计

```typescript
// lib/api/websocket.ts
type MessageHandler = (data: unknown) => void;
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private status: ConnectionStatus = 'disconnected';

  connect() {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);
    this.status = 'connecting';

    this.ws.onopen = () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      this.status = 'disconnected';
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.status = 'error';
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private handleMessage(message: { type: string; data: unknown }) {
    const handlers = this.handlers.get(message.type);
    handlers?.forEach((h) => h(message.data));
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  getStatus() {
    return this.status;
  }
}

export const wsClient = new WebSocketClient();
```

### 6.2 与 React Query 集成

```typescript
// lib/hooks/useRealtimeSync.ts
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { wsClient } from '../api/websocket';

export function useRealtimeSync(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = wsClient.subscribe('data-updated', (data: { entity: string }) => {
      // 根据更新的实体类型失效相关缓存
      queryClient.invalidateQueries({ queryKey });
    });

    return unsubscribe;
  }, [queryClient, queryKey]);
}
```

---

## 7. 客户端状态管理

### 7.1 状态分层

| 状态类型 | 管理方案 | 使用场景 |
|---------|---------|---------|
| 服务器状态 | React Query | 项目、任务、用户数据 |
| 全局 UI 状态 | React Context | 侧边栏折叠、主题设置 |
| 组件本地状态 | useState | 表单输入、模态框开关 |

### 7.2 全局 UI 状态（使用 Context）

```typescript
// shared/context/AppContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsed((v) => !v),
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
```

---

## 8. 类型定义层次

### 8.1 全局类型 (`types/`)

用于跨模块共享的类型定义：

```typescript
// types/common.ts
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// types/api.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 8.2 模块类型 (`features/*/types.ts`)

用于模块内部的类型定义：

```typescript
// features/projects/types.ts
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  // ...
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

// 仅本模块使用的类型
export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
}
```

### 8.3 类型导入规则

```typescript
// ✅ 正确：从全局类型导入
import type { PaginatedResponse } from '@/types';

// ✅ 正确：从模块类型导入
import type { Project, ProjectFilters } from '../types';

// ❌ 错误：循环依赖
// 不要在全局类型中导入模块类型
```

---

## 9. 路由设计

### 9.1 路由结构

```typescript
// App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { MainLayout } from '@/shared/layout/MainLayout';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

// 懒加载页面
const Login = lazy(() => import('@/features/auth'));
const Dashboard = lazy(() => import('@/features/dashboard'));
const Projects = lazy(() => import('@/features/projects'));
const Tasks = lazy(() => import('@/features/tasks'));
const Assignment = lazy(() => import('@/features/assignment'));
const Settings = lazy(() => import('@/features/settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<Login />} />

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
    </QueryClientProvider>
  );
}
```

### 9.2 设置子路由

```typescript
// features/settings/index.tsx
import { Routes, Route } from 'react-router-dom';
import { Profile } from './pages/Profile';
import { Users } from './pages/Users';
import { Permissions } from './pages/Permissions';
import { Organization } from './pages/Organization';
import { SystemConfig } from './pages/SystemConfig';

export default function Settings() {
  return (
    <Routes>
      <Route index element={<Profile />} />
      <Route path="profile" element={<Profile />} />
      <Route path="users" element={<Users />} />
      <Route path="permissions" element={<Permissions />} />
      <Route path="organization" element={<Organization />} />
      <Route path="system" element={<SystemConfig />} />
    </Routes>
  );
}
```

---

## 10. 页面与后端模块映射

| 页面 | 路由 | 调用后端模块 | 主要功能 |
|------|------|-------------|----------|
| 登录 | /login | auth | 用户认证 |
| 仪表板 | /dashboard | analytics + project + task | 数据概览、进度统计 |
| 项目管理 | /projects | project + task | 项目 CRUD、里程碑管理 |
| 任务管理 | /tasks | task + workflow | WBS 任务、审批流程 |
| 智能分配 | /assignment | org | 能力模型、任务匹配 |
| 设置 | /settings/* | auth + org | 用户管理、权限配置 |

---

## 11. 开发顺序

### 阶段 1: 基础设施 (Phase 1)

```
1.1 API 客户端配置
    └── lib/api/client.ts

1.2 React Query 配置
    └── lib/api/query-keys.ts

1.3 布局组件
    ├── shared/layout/MainLayout.tsx
    ├── shared/layout/Sidebar.tsx
    └── shared/layout/Header.tsx

1.4 认证流程
    ├── features/auth/components/LoginForm.tsx
    ├── features/auth/components/ProtectedRoute.tsx
    ├── features/auth/hooks/useAuth.ts
    ├── lib/api/auth.api.ts
    └── features/auth/types.ts
```

### 阶段 2: 核心页面 (Phase 2)

```
2.1 仪表板
    ├── features/dashboard/index.tsx
    ├── features/dashboard/components/
    ├── features/dashboard/hooks/
    ├── lib/api/analytics.api.ts
    └── features/dashboard/types.ts

2.2 项目管理
    ├── features/projects/index.tsx
    ├── features/projects/components/
    ├── features/projects/hooks/
    ├── lib/api/project.api.ts
    └── features/projects/types.ts

2.3 任务管理
    ├── features/tasks/index.tsx
    ├── features/tasks/components/
    ├── features/tasks/hooks/
    ├── lib/api/task.api.ts
    ├── lib/api/workflow.api.ts
    └── features/tasks/types.ts
```

### 阶段 3: 扩展页面 (Phase 3)

```
3.1 智能分配
    ├── features/assignment/index.tsx
    ├── features/assignment/components/
    ├── features/assignment/hooks/
    ├── lib/api/org.api.ts
    └── features/assignment/types.ts

3.2 设置
    ├── features/settings/index.tsx
    ├── features/settings/pages/
    ├── features/settings/components/
    └── features/settings/types.ts
```

---

## 12. 清理计划

### 9.1 保留文件

| 路径 | 说明 |
|------|------|
| `app/src/components/ui/*` | shadcn/ui 基础组件（约 50 个） |
| `app/src/lib/utils.ts` | 工具函数 |
| `app/src/hooks/use-mobile.ts` | 移动端检测 |
| `app/src/main.tsx` | 渲染入口 |
| `app/src/index.css` | 全局样式 |
| `app/vite.config.ts` | Vite 配置 |
| `app/tailwind.config.js` | Tailwind 配置 |
| `app/tsconfig.json` | TypeScript 配置 |
| `app/package.json` | 依赖配置 |

### 9.2 删除文件

| 路径 | 说明 |
|------|------|
| `app/src/components/projects/*` | 旧项目管理组件 |
| `app/src/components/task-management/*` | 旧任务管理组件 |
| `app/src/components/task-assignment/*` | 旧智能分配组件 |
| `app/src/components/dashboard/*` | 旧仪表板组件 |
| `app/src/components/settings/*` | 旧设置组件 |
| `app/src/components/analytics/*` | 旧分析组件 |
| `app/src/components/workflow/*` | 旧工作流组件 |
| `app/src/components/organization/*` | 旧组织架构组件 |
| `app/src/components/common/*` | 旧通用组件 |
| `app/src/components/shared/*` | 旧共享组件 |
| `app/src/components/dev/*` | 开发工具组件 |
| `app/src/components/layout/*` | 旧布局组件 |
| `app/src/components/auth/*` | 旧认证组件 |
| `app/src/components/capabilities/*` | 旧能力组件 |
| `app/src/components/gantt/*` | 旧甘特图组件 |
| `app/src/components/profile/*` | 旧个人资料组件 |
| `app/src/components/task-approval/*` | 旧审批组件 |
| `app/src/services/*` | 旧服务层 |
| `app/src/hooks/useAuth.ts` | 旧认证 Hook |
| `app/src/hooks/useAppData.ts` | 旧数据 Hook |
| `app/src/hooks/useDialog.ts` | 旧对话框 Hook |
| `app/src/hooks/useDebounce.ts` | 旧防抖 Hook |
| `app/src/hooks/useNotification.ts` | 旧通知 Hook |
| `app/src/hooks/useConflictResolution.tsx` | 旧冲突解决 Hook |
| `app/src/types/*` | 旧类型定义（部分保留） |
| `app/src/utils/*` | 旧工具函数（部分保留） |
| `app/src/App.tsx` | 旧应用入口 |

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除重要代码 | 高 | 创建 feature 分支，逐步删除验证 |
| API 类型不匹配 | 中 | 从后端 types.ts 复制类型定义 |
| WebSocket 集成复杂 | 中 | 阶段 1 先完成基础，后续迭代 |
| shadcn/ui 组件缺失 | 低 | 按需添加新组件 |

---

## 14. 验收标准

### 阶段 1 完成标准
- [ ] API 客户端可正常请求后端
- [ ] React Query 缓存正常工作
- [ ] 布局组件渲染正确
- [ ] 登录流程完整可用

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

- [系统架构总览](../../design/SYSTEM_OVERVIEW.md)
- [UI需求规格书](../../requirements/UI_Requirement_0316-2023.md)
- [后端模块需求](../../requirements/modules/)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-19 | 1.1 | 新增 WebSocket 集成、状态管理、类型定义层次章节；修复设置页面目录结构 |
| 2026-03-19 | 1.0 | 初始版本 |
