# API规范设计

> **文档版本**: 1.0
> **最后更新**: 2026-03-17
> **状态**: ✅ 完成

---

## 1. API设计原则

### 1.1 RESTful规范

| 原则 | 说明 |
|------|------|
| 资源命名 | 使用名词复数形式（/projects, /tasks） |
| HTTP方法 | GET(查询), POST(创建), PUT(更新), DELETE(删除) |
| 版本控制 | URL路径版本（/api/v1, /api/v2） |
| 状态码 | 语义化HTTP状态码 |

### 1.2 URL规范

```
基础路径: /api

资源路径格式:
/api/{resource}                 # 资源集合
/api/{resource}/:id             # 单个资源
/api/{resource}/:id/{sub-resource}  # 子资源

版本化路径:
/api/{resource}/v2/:id          # 带版本的资源操作
```

### 1.3 HTTP方法映射

| HTTP方法 | 操作 | 幂等性 | 示例 |
|---------|------|--------|------|
| GET | 查询 | ✅ | GET /api/projects |
| POST | 创建 | ❌ | POST /api/projects |
| PUT | 完整更新 | ✅ | PUT /api/projects/v2/:id |
| PATCH | 部分更新 | ❌ | PATCH /api/projects/:id |
| DELETE | 删除 | ✅ | DELETE /api/projects/v2/:id |

---

## 2. 统一响应格式

### 2.1 成功响应

```typescript
// 单个资源
interface SingleResponse<T> {
  data: T;
  message?: string;
}

// 资源列表
interface ListResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// 分页响应
interface PagedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 2.2 错误响应

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  requestId?: string;
}
```

### 2.3 HTTP状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | OK | 成功响应 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功（无返回体） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 版本冲突 |
| 422 | Unprocessable Entity | 验证失败 |
| 500 | Internal Server Error | 服务器错误 |

---

## 3. 认证与授权

### 3.1 认证方式

- **Cookie-Session认证**
- Cookie: `sessionId`
- 有效期: 7天
- HttpOnly, Secure

### 3.2 请求头

```http
Cookie: sessionId=xxx
Content-Type: application/json
```

### 3.3 权限检查

每个API请求经过权限中间件检查：

```typescript
// 权限中间件
const checkPermission = (permission: string) => {
  return async (req, res, next) => {
    const user = req.session.user;
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: '无权限执行此操作' }
      });
    }
    next();
  };
};
```

---

## 4. API清单

### 4.1 认证模块

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/login | 用户登录 | 公开 |
| POST | /api/logout | 用户登出 | 已登录 |
| GET | /api/auth/me | 获取当前用户信息 | 已登录 |
| PUT | /api/auth/password | 修改密码 | 已登录 |

### 4.2 用户管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/users | 获取用户列表 | USER_MANAGE |
| GET | /api/users/:id | 获取用户详情 | USER_MANAGE |
| POST | /api/users | 创建用户 | USER_MANAGE |
| PUT | /api/users/:id | 更新用户 | USER_MANAGE |
| DELETE | /api/users/:id | 删除用户 | USER_MANAGE |
| POST | /api/users/:id/reset-password | 重置密码 | USER_MANAGE |

### 4.3 权限管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/permissions | 获取权限配置 | SYSTEM_CONFIG |
| PUT | /api/permissions | 更新权限配置 | SYSTEM_CONFIG |
| GET | /api/permissions/history | 获取权限变更历史 | AUDIT_LOG_VIEW |

### 4.4 会话管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/sessions | 获取当前用户会话列表 | 已登录 |
| DELETE | /api/sessions/:id | 终止指定会话 | 已登录 |
| DELETE | /api/sessions/all | 终止所有会话 | 已登录 |

### 4.5 部门管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/departments | 获取部门树 | MEMBER_VIEW |
| GET | /api/departments/:id | 获取部门详情 | MEMBER_VIEW |
| POST | /api/departments | 创建部门 | MEMBER_CREATE |
| PUT | /api/departments/:id | 更新部门 | MEMBER_EDIT |
| DELETE | /api/departments/:id | 删除部门 | MEMBER_DELETE |

### 4.6 成员管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/members | 获取成员列表 | MEMBER_VIEW |
| GET | /api/members/:id | 获取成员详情 | MEMBER_VIEW |
| POST | /api/members | 创建成员 | MEMBER_CREATE |
| PUT | /api/members/:id | 更新成员 | MEMBER_EDIT |
| DELETE | /api/members/:id | 删除成员 | MEMBER_DELETE |

### 4.7 能力模型

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/capability-models | 获取能力模型列表 | SYSTEM_CONFIG |
| GET | /api/capability-models/:id | 获取能力模型详情 | SYSTEM_CONFIG |
| POST | /api/capability-models | 创建能力模型 | SYSTEM_CONFIG |
| PUT | /api/capability-models/:id | 更新能力模型 | SYSTEM_CONFIG |
| DELETE | /api/capability-models/:id | 删除能力模型 | SYSTEM_CONFIG |
| GET | /api/members/:id/capabilities | 获取成员能力列表 | MEMBER_VIEW |
| POST | /api/members/:id/capabilities | 添加成员能力评定 | MEMBER_EDIT |
| PUT | /api/members/:id/capabilities/:capId | 更新成员能力评定 | MEMBER_EDIT |
| DELETE | /api/members/:id/capabilities/:capId | 删除成员能力评定 | MEMBER_EDIT |
| POST | /api/tasks/recommend-assignee | 获取任务负责人推荐 | TASK_ASSIGN |

### 4.8 项目管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects | 获取项目列表 | PROJECT_VIEW |
| GET | /api/projects/:id | 获取项目详情 | PROJECT_VIEW |
| GET | /api/projects/:id/detail | 获取项目完整信息 | PROJECT_VIEW |
| POST | /api/projects | 创建项目 | PROJECT_CREATE |
| PUT | /api/projects/v2/:id | 更新项目（带版本控制） | PROJECT_EDIT |
| DELETE | /api/projects/v2/:id | 删除项目 | PROJECT_DELETE |

### 4.9 项目成员

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/members | 获取项目成员列表 | PROJECT_VIEW |
| POST | /api/projects/:id/members | 添加项目成员 | PROJECT_EDIT |
| DELETE | /api/projects/:id/members/:memberId | 移除项目成员 | PROJECT_EDIT |

### 4.10 里程碑

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/milestones | 获取里程碑列表 | PROJECT_VIEW |
| POST | /api/projects/:id/milestones | 创建里程碑 | PROJECT_EDIT |
| PUT | /api/milestones/:id | 更新里程碑 | PROJECT_EDIT |
| DELETE | /api/milestones/:id | 删除里程碑 | PROJECT_EDIT |

### 4.11 时间线

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/timelines | 获取时间轴列表 | PROJECT_VIEW |
| POST | /api/projects/:id/timelines | 创建时间轴 | PROJECT_EDIT |
| PUT | /api/timelines/:id | 更新时间轴 | PROJECT_EDIT |
| DELETE | /api/timelines/:id | 删除时间轴 | PROJECT_EDIT |
| GET | /api/timelines/:id/tasks | 获取时间轴任务 | PROJECT_VIEW |
| POST | /api/timelines/:id/tasks | 创建时间轴任务 | PROJECT_EDIT |
| PUT | /api/timeline-tasks/:id | 更新时间轴任务 | PROJECT_EDIT |
| DELETE | /api/timeline-tasks/:id | 删除时间轴任务 | PROJECT_EDIT |

### 4.12 WBS任务

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/wbs-tasks | 获取任务列表 | TASK_VIEW |
| GET | /api/wbs-tasks/:id | 获取任务详情 | TASK_VIEW |
| POST | /api/wbs-tasks | 创建任务 | TASK_CREATE |
| PUT | /api/wbs-tasks/v2/:id | 更新任务（带版本控制） | TASK_EDIT |
| DELETE | /api/wbs-tasks/:id | 删除任务 | TASK_DELETE |
| GET | /api/wbs-tasks/:id/changes | 获取任务变更历史 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/changes | 提交计划变更 | TASK_EDIT |
| GET | /api/wbs-tasks/:id/delays | 获取任务延期记录 | TASK_VIEW |
| POST | /api/wbs-tasks/:id/delays | 添加延期原因 | TASK_EDIT |

### 4.13 审批流程

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/approvals | 获取审批列表 | TASK_VIEW |
| GET | /api/approvals/pending | 获取待审批列表 | TASK_VIEW |
| POST | /api/approvals/:id/approve | 通过审批 | TASK_EDIT |
| POST | /api/approvals/:id/reject | 驳回审批 | TASK_EDIT |

### 4.14 批量操作

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/batch/projects | 批量获取项目 | PROJECT_VIEW |
| POST | /api/batch/members | 批量获取成员 | MEMBER_VIEW |
| POST | /api/batch/wbs-tasks | 批量获取任务 | TASK_VIEW |
| POST | /api/batch/mixed | 混合批量查询 | 按资源类型 |
| POST | /api/batch/cache/warmup | 缓存预热 | SYSTEM_CONFIG |

### 4.15 版本控制

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/projects/:id/versions | 获取项目版本历史 | PROJECT_VIEW |
| GET | /api/wbs-tasks/:id/versions | 获取任务版本历史 | TASK_VIEW |

### 4.16 缓存管理

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| DELETE | /api/cache/clear | 清理缓存 | SYSTEM_CONFIG |
| POST | /api/cache/warmup | 缓存预热 | SYSTEM_CONFIG |
| GET | /api/cache/status | 缓存状态 | SYSTEM_CONFIG |

### 4.17 审计日志

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/audit-logs | 获取审计日志列表 | AUDIT_LOG_VIEW |
| GET | /api/audit-logs/:id | 获取审计日志详情 | AUDIT_LOG_VIEW |
| GET | /api/audit-logs/export | 导出审计日志 | AUDIT_LOG_VIEW |

### 4.18 报表分析

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/reports/project-progress | 项目进度报表 | PROJECT_VIEW |
| GET | /api/reports/task-statistics | 任务统计报表 | TASK_VIEW |
| GET | /api/reports/delay-analysis | 延期分析报表 | TASK_VIEW |
| GET | /api/reports/member-analysis | 成员任务分析 | MEMBER_VIEW |
| GET | /api/reports/:type/export | 导出Excel | 按报表类型 |

### 4.19 系统配置

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET/POST | /api/config/project-types | 项目类型配置 | SYSTEM_CONFIG |
| GET/POST | /api/config/task-types | 任务类型配置 | SYSTEM_CONFIG |
| GET/POST | /api/config/holidays | 节假日管理 | SYSTEM_CONFIG |
| GET/POST | /api/config/organization | 组织架构树 | MEMBER_VIEW |

### 4.20 健康检查

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/system/health | 基础健康检查 | 公开 |
| GET | /api/system/health/v2 | 详细健康检查 | SYSTEM_CONFIG |

---

## 5. WebSocket规范

### 5.1 连接

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
```

### 5.2 消息格式

```typescript
// 客户端发送
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
  data?: any;
}

// 服务端推送
interface ServerMessage {
  type: 'update' | 'notification' | 'pong' | 'error';
  channel?: string;
  data?: any;
  timestamp: number;
}
```

### 5.3 频道类型

| 频道 | 说明 |
|------|------|
| `project:{id}` | 项目更新 |
| `task:{id}` | 任务更新 |
| `user:{id}` | 用户通知 |
| `global` | 全局广播 |

---

## 6. 错误码定义

### 6.1 通用错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| BAD_REQUEST | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| VALIDATION_ERROR | 422 | 验证失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 6.2 业务错误码

| 错误码 | 说明 |
|--------|------|
| PROJECT_NOT_FOUND | 项目不存在 |
| TASK_NOT_FOUND | 任务不存在 |
| MEMBER_NOT_FOUND | 成员不存在 |
| VERSION_CONFLICT | 版本冲突 |
| CIRCULAR_DEPENDENCY | 循环依赖 |
| PERMISSION_DENIED | 权限不足 |
| LOGIN_FAILED | 登录失败 |
| SESSION_EXPIRED | 会话过期 |

---

## 7. 请求/响应示例

### 7.1 获取项目列表

**请求**:
```http
GET /api/projects?page=1&pageSize=10&status=active
Cookie: sessionId=xxx
```

**响应**:
```json
{
  "data": [
    {
      "id": "proj-001",
      "code": "PRJ-2024-001",
      "name": "WBS任务管理系统",
      "status": "active",
      "progress": 65,
      "planned_start_date": "2024-01-01",
      "planned_end_date": "2024-06-30"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 7.2 创建任务

**请求**:
```http
POST /api/wbs-tasks
Content-Type: application/json
Cookie: sessionId=xxx

{
  "project_id": "proj-001",
  "description": "完成用户登录功能",
  "task_type": "firmware",
  "priority": "high",
  "assignee_id": 1,
  "start_date": "2024-01-15",
  "duration": 5
}
```

**响应**:
```json
{
  "data": {
    "id": "task-001",
    "wbs_code": "1",
    "wbs_level": 1,
    "description": "完成用户登录功能",
    "status": "not_started",
    "start_date": "2024-01-15",
    "end_date": "2024-01-19",
    "version": 1
  },
  "message": "任务创建成功"
}
```

### 7.3 版本冲突

**请求**:
```http
PUT /api/wbs-tasks/v2/task-001
Content-Type: application/json
Cookie: sessionId=xxx

{
  "description": "更新后的描述",
  "version": 1
}
```

**响应（冲突）**:
```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "数据已被其他用户修改，请刷新后重试",
    "details": {
      "current_version": 2,
      "provided_version": 1
    }
  }
}
```

---

## 相关文档

- [系统架构总览](./SYSTEM_OVERVIEW.md)
- [数据模型设计](./DATA_MODEL.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
