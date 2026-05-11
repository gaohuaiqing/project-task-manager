# 权限矩阵实现检查报告

> **检查日期**: 2026-05-10
> **检查范围**: 后端 API 权限控制实现
> **对比基准**: FINAL_REQUIREMENTS_0404-0827.md 及 REQ_01_auth_permission.md

---

## 一、检查结果概览

| 检查项 | 状态 | 说明 |
|--------|:----:|------|
| 报表分析权限 | ✅ 符合 | REPORT_VIEW 权限正确限制 admin/dept_manager/tech_manager |
| 数据备份权限 | ✅ 符合 | BACKUP_MANAGE 权限正确限制 admin |
| 审计日志权限 | ✅ 符合 | AUDIT_LOG_VIEW 权限正确限制 admin/dept_manager |
| 用户管理权限 | ✅ 符合 | requireUserManage 中间件正确限制 admin |
| 任务数据隔离 | ✅ 符合 | 基于项目成员关系正确实现 |
| 项目数据隔离 | ✅ 符合 | 基于项目成员关系正确实现 |
| 批量操作权限 | ⚠️ 部分符合 | 角色检查正确，但缺少细粒度权限定义 |
| 组织架构权限 | ❌ 不符合 | 缺少 DEPT_*/MEMBER_* 权限检查 |
| 项目操作权限 | ❌ 不符合 | 缺少 PROJECT_CREATE/EDIT/DELETE 权限检查 |
| 任务操作权限 | ❌ 不符合 | 缺少 TASK_CREATE/EDIT/DELETE/ASSIGN 权限检查 |
| 系统配置权限 | ⚠️ 部分符合 | 配置接口缺少权限中间件 |
| 仪表板权限 | ⚠️ 部分符合 | 缺少 engineer 访问限制 |

---

## 二、详细检查结果

### 2.1 组织架构权限（DEPT_* / MEMBER_*）

**需求定义**:

| 权限 | admin | dept_manager | tech_manager | engineer |
|------|:-----:|:------------:|:-----------:|:--------:|
| DEPT_VIEW | ✅ | ✅ | ❌ | ❌ |
| DEPT_CREATE | ✅ | ✅ | ❌ | ❌ |
| DEPT_EDIT | ✅ | ✅ | ❌ | ❌ |
| DEPT_DELETE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_VIEW | ✅ | ✅ | ✅ | ✅ |
| MEMBER_CREATE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_EDIT | ✅ | ✅ | ❌ | ❌ |
| MEMBER_DELETE | ✅ | ✅ | ❌ | ❌ |

**当前实现** (`app/server/src/modules/org/routes.ts`):

```typescript
// 所有组织架构接口仅检查登录状态，无角色/权限检查
router.get('/departments', async (req, res, next) => { ... });
router.post('/departments', async (req, res, next) => {
  const currentUser = getCurrentUser(req);
  if (!currentUser) { return res.status(401)... }
  // 无角色检查，任何登录用户都可创建部门
});
router.post('/members', async (req, res, next) => {
  // 无角色检查，任何登录用户都可创建成员
});
```

**问题**:
- ❌ 部门 CRUD 操作无角色限制（需求：仅 admin/dept_manager）
- ❌ 成员创建/编辑/删除无角色限制（需求：仅 admin/dept_manager）
- ❌ tech_manager 和 engineer 可创建/删除部门（违反需求）
- ❌ engineer 可创建/删除成员（违反需求）

---

### 2.2 项目权限（PROJECT_*）

**需求定义**:

| 权限 | admin | dept_manager | tech_manager | engineer |
|------|:-----:|:------------:|:-----------:|:--------:|
| PROJECT_VIEW | ✅ | ✅ | ✅ | ✅ |
| PROJECT_CREATE | ✅ | ✅ | ✅ | ❌ |
| PROJECT_EDIT | ✅ | ✅ | ✅ | ❌ |
| PROJECT_DELETE | ✅ | ✅ | ✅ | ❌ |

**当前实现** (`app/server/src/modules/project/routes.ts`):

```typescript
// 创建项目 - 无角色检查
router.post('/', async (req, res, next) => {
  const currentUser = requireUser(req);
  const id = await projectService.createProject(req.body, currentUser);
  // 任何登录用户都可创建项目
});

// 更新项目 - 无角色检查
router.put('/:id', async (req, res, next) => {
  // 任何登录用户都可更新项目
});

// 删除项目 - 无角色检查
router.delete('/:id', async (req, res, next) => {
  // 任何登录用户都可删除项目
});

// 批量删除 - 有角色检查
router.post('/batch-delete', async (req, res, next) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
    return res.status(403)...  // 正确
  }
});
```

**问题**:
- ❌ 项目创建无角色限制（需求：engineer 不可创建）
- ❌ 项目更新无角色限制（需求：engineer 不可更新）
- ❌ 项目删除无角色限制（需求：engineer 不可删除）
- ✅ 批量删除正确限制 admin/dept_manager

---

### 2.3 任务权限（TASK_*）

**需求定义**:

| 权限 | admin | dept_manager | tech_manager | engineer |
|------|:-----:|:------------:|:-----------:|:--------:|
| TASK_VIEW | ✅ | ✅ | ✅ | ✅ |
| TASK_CREATE | ✅ | ✅ | ✅ | ✅* |
| TASK_EDIT | ✅ | ✅ | ✅ | ✅** |
| TASK_DELETE | ✅ | ✅ | ✅ | ❌ |
| TASK_ASSIGN | ✅ | ✅ | ✅ | ❌ |

*工程师只能在自己负责的任务下创建子任务
**工程师编辑计划字段需要审批

**当前实现** (`app/server/src/modules/task/routes.ts`):

```typescript
// 创建任务 - 无角色限制
router.post('/', async (req, res, next) => {
  const currentUser = requireUser(req);
  const id = await taskService.createTask(req.body, currentUser);
  // 任何登录用户都可创建任务
});

// 删除任务 - 无角色限制
router.delete('/:id', async (req, res, next) => {
  // 任何登录用户都可删除任务
});

// 批量删除 - 有角色检查
router.post('/batch-delete', async (req, res, next) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'dept_manager') {
    return res.status(403)...  // 正确
  }
});

// 批量更新 - 有角色检查
router.post('/batch-update', async (req, res, next) => {
  if (currentUser.role !== 'admin' && currentUser.role !== 'tech_manager' && currentUser.role !== 'dept_manager') {
    return res.status(403)...  // 正确
  }
});
```

**问题**:
- ❌ 任务创建无角色限制（需求：engineer 只能创建子任务）
- ❌ 任务删除无角色限制（需求：engineer 不可删除）
- ❌ 任务分配无角色限制（需求：engineer 不可分配）
- ✅ 批量删除正确限制 admin/dept_manager
- ✅ 批量更新正确限制 admin/tech_manager/dept_manager
- ✅ 数据隔离正确实现（基于项目成员关系）

---

### 2.4 系统权限（SYSTEM_*）

**需求定义**:

| 权限 | admin | dept_manager | tech_manager | engineer |
|------|:-----:|:------------:|:-----------:|:--------:|
| USER_MANAGE | ✅ | ❌ | ❌ | ❌ |
| SYSTEM_CONFIG | ✅ | ❌ | ❌ | ❌ |
| BACKUP_MANAGE | ✅ | ❌ | ❌ | ❌ |
| AUDIT_LOG_VIEW | ✅ | ✅ | ❌ | ❌ |
| CAPABILITY_CONFIG | ✅ | ✅ | ❌ | ❌ |
| TASK_TYPE_CONFIG | ✅ | ✅ | ❌ | ❌ |
| HOLIDAY_CONFIG | ✅ | ✅ | ❌ | ❌ |
| TEAM_AUTHORIZATION | ✅ | ✅ | ❌ | ❌ |

**当前实现**:

#### 用户管理 (`auth/routes.ts`) ✅
```typescript
function requireUserManage(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ ... });
  }
  next();
}
router.get('/users', requireAuth, requireUserManage, ...);
```

#### 备份管理 (`backup/routes.ts`) ✅
```typescript
router.use(permissionMiddleware('BACKUP_MANAGE'));
// PERMISSIONS.BACKUP_MANAGE = ['admin']
```

#### 审计日志 (`analytics/routes.ts`) ✅
```typescript
router.get('/audit-logs', requirePermission('AUDIT_LOG_VIEW'), ...);
// PERMISSIONS.AUDIT_LOG_VIEW = ['admin', 'dept_manager']
```

#### 系统配置 (`analytics/routes.ts`) ⚠️
```typescript
// 项目类型配置 - 无权限检查
router.post('/config/project-types', async (req, res, next) => {
  const currentUser = requireUser(req);
  // 任何登录用户都可配置
});

// 任务类型配置 - 无权限检查
router.post('/config/task-types', async (req, res, next) => {
  // 任何登录用户都可配置
});

// 节假日配置 - 无权限检查
router.post('/config/holidays', async (req, res, next) => {
  // 任何登录用户都可配置
});
```

**问题**:
- ✅ USER_MANAGE 正确实现
- ✅ BACKUP_MANAGE 正确实现
- ✅ AUDIT_LOG_VIEW 正确实现
- ❌ CAPABILITY_CONFIG 未实现权限检查
- ❌ TASK_TYPE_CONFIG 未实现权限检查
- ❌ HOLIDAY_CONFIG 未实现权限检查
- ❌ TEAM_AUTHORIZATION 未发现实现

---

### 2.5 报表分析权限（REPORT_VIEW）

**需求定义**:

| 权限 | admin | dept_manager | tech_manager | engineer |
|------|:-----:|:------------:|:-----------:|:--------:|
| REPORT_VIEW | ✅ | ✅ | ✅ | ❌ |

**当前实现** (`analytics/routes.ts`) ✅:

```typescript
router.get('/reports/project-progress', requirePermission('REPORT_VIEW'), ...);
router.get('/reports/task-statistics', requirePermission('REPORT_VIEW'), ...);
router.get('/reports/delay-analysis', requirePermission('REPORT_VIEW'), ...);
router.get('/reports/member-analysis', requirePermission('REPORT_VIEW'), ...);
router.get('/reports/resource-efficiency', requirePermission('REPORT_VIEW'), ...);

// PERMISSIONS.REPORT_VIEW = ['admin', 'dept_manager', 'tech_manager']
```

**结论**: ✅ 完全符合需求

---

### 2.6 仪表板权限

**需求定义**:

| 角色 | 可见仪表板 | 数据范围 |
|------|:---------:|----------|
| admin | ✅ | 全局数据 |
| dept_manager | ✅ | 本部门数据 |
| tech_manager | ✅ | 本技术组数据 |
| engineer | ✅ | 个人数据 |

**当前实现** (`analytics/routes.ts`):

```typescript
// 仪表板统计 - 无权限检查，所有登录用户可访问
router.get('/dashboard/stats', async (req, res, next) => {
  const currentUser = requireUser(req);
  const result = await analyticsService.getDashboardStats(currentUser);
  // 数据范围在 service 层根据角色过滤
});

// 角色专属仪表板详情
router.get('/dashboard/admin/detail', requireRole(['admin']), ...);
router.get('/dashboard/dept-manager/detail', requireRole(['dept_manager']), ...);
router.get('/dashboard/tech-manager/detail', requireRole(['tech_manager']), ...);
router.get('/dashboard/engineer/detail', async ...);  // 无角色限制
```

**问题**:
- ✅ 数据范围过滤正确实现（在 service 层）
- ⚠️ 仪表板基础接口无权限中间件（依赖 service 层过滤）
- ✅ 角色专属详情接口正确使用 requireRole

---

### 2.7 权限定义完整性

**当前定义** (`permission-middleware.ts`):

```typescript
export const PERMISSIONS: Record<string, UserRole[]> = {
  REPORT_VIEW: ['admin', 'dept_manager', 'tech_manager'],
  REPORT_EXPORT: ['admin', 'dept_manager', 'tech_manager'],
  CONFIG_PROJECT_TYPE: ['admin', 'dept_manager'],
  CONFIG_TASK_TYPE: ['admin', 'dept_manager'],
  CONFIG_HOLIDAY: ['admin', 'dept_manager'],
  AUDIT_LOG_VIEW: ['admin', 'dept_manager'],
  DATA_IMPORT: ['admin', 'dept_manager', 'tech_manager'],
  DATA_EXPORT: ['admin', 'dept_manager', 'tech_manager'],
  BACKUP_MANAGE: ['admin'],
};
```

**缺失的权限定义**:

| 权限类别 | 缺失权限项 |
|----------|-----------|
| 组织架构 | DEPT_VIEW, DEPT_CREATE, DEPT_EDIT, DEPT_DELETE |
| 成员管理 | MEMBER_VIEW, MEMBER_CREATE, MEMBER_EDIT, MEMBER_DELETE |
| 项目管理 | PROJECT_VIEW, PROJECT_CREATE, PROJECT_EDIT, PROJECT_DELETE |
| 任务管理 | TASK_VIEW, TASK_CREATE, TASK_EDIT, TASK_DELETE, TASK_ASSIGN |
| 系统管理 | USER_MANAGE, SYSTEM_CONFIG, CAPABILITY_CONFIG, TEAM_AUTHORIZATION |

---

## 三、数据隔离检查

### 3.1 任务数据隔离 ✅

**实现位置**: `task/routes.ts` - `checkTaskAccess()`

```typescript
async function checkTaskAccess(user: User, task: { project_id: string | null; assignee_id: number | null }): Promise<boolean> {
  // admin 有全部权限
  if (user.role === 'admin') return true;

  // 任务无项目归属时，只有任务负责人可以访问
  if (!task.project_id) {
    return task.assignee_id === user.id;
  }

  // 检查项目是否存在（防止悬空引用）
  const project = await projectRepo.getProjectById(task.project_id);
  if (!project) {
    return task.assignee_id === user.id;
  }

  // 有项目归属的任务：检查用户是否是项目成员
  const accessibleProjectIds = await taskService.getAccessibleProjectIds(user);
  return accessibleProjectIds.includes(String(task.project_id));
}
```

**结论**: ✅ 符合需求

### 3.2 项目数据隔离 ✅

**实现位置**: `project/routes.ts` - `checkProjectAccess()`

```typescript
async function checkProjectAccess(projectId: string, req: Request): Promise<boolean> {
  const currentUser = getCurrentUser(req);
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return await projectService.isProjectMember(projectId, currentUser.id);
}
```

**结论**: ✅ 符合需求

### 3.3 报表数据隔离 ✅

**实现位置**: `analytics/services/scope.service.ts`

```typescript
// 根据角色返回数据范围
async getDataScope(user: User): Promise<DataScope> {
  switch (user.role) {
    case 'admin':
      return { type: 'all' };
    case 'dept_manager':
      return { type: 'department', department_id: user.department_id };
    case 'tech_manager':
      return { type: 'group', group_projects: [...], group_members: [...] };
    default:
      return { type: 'self', user_id: user.id };
  }
}
```

**结论**: ✅ 符合需求

---

## 四、问题汇总

### 4.1 严重问题（CRITICAL）

| 编号 | 问题描述 | 影响范围 | 风险等级 |
|------|----------|----------|:--------:|
| C1 | 部门 CRUD 无权限控制 | engineer 可创建/删除部门 | 🔴 高 |
| C2 | 成员 CRUD 无权限控制 | engineer 可创建/删除成员 | 🔴 高 |
| C3 | 项目创建/编辑/删除无权限控制 | engineer 可创建/删除项目 | 🔴 高 |
| C4 | 任务删除无权限控制 | engineer 可删除任务 | 🟡 中 |
| C5 | 系统配置无权限控制 | engineer 可修改系统配置 | 🔴 高 |

### 4.2 中等问题（MEDIUM）

| 编号 | 问题描述 | 影响范围 | 风险等级 |
|------|----------|----------|:--------:|
| M1 | 权限定义不完整 | 缺少 17 个权限项定义 | 🟡 中 |
| M2 | 任务创建无限制 | engineer 可创建根任务 | 🟡 中 |
| M3 | 任务分配无限制 | engineer 可分配任务 | 🟡 中 |
| M4 | 技术组授权未实现 | TEAM_AUTHORIZATION 功能缺失 | 🟡 中 |

### 4.3 轻微问题（LOW）

| 编号 | 问题描述 | 影响范围 | 风险等级 |
|------|----------|----------|:--------:|
| L1 | 仪表板接口无权限中间件 | 依赖 service 层过滤 | 🟢 低 |
| L2 | 配置接口权限定义存在但未使用 | CONFIG_* 权限已定义但未应用 | 🟢 低 |

---

## 五、修复建议

### 5.1 完善权限定义

在 `permission-middleware.ts` 中添加缺失的权限定义：

```typescript
export const PERMISSIONS: Record<string, UserRole[]> = {
  // ========== 组织架构权限 ==========
  DEPT_VIEW: ['admin', 'dept_manager'],
  DEPT_CREATE: ['admin', 'dept_manager'],
  DEPT_EDIT: ['admin', 'dept_manager'],
  DEPT_DELETE: ['admin', 'dept_manager'],

  // ========== 成员权限 ==========
  MEMBER_VIEW: ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  MEMBER_CREATE: ['admin', 'dept_manager'],
  MEMBER_EDIT: ['admin', 'dept_manager'],
  MEMBER_DELETE: ['admin', 'dept_manager'],

  // ========== 项目权限 ==========
  PROJECT_VIEW: ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  PROJECT_CREATE: ['admin', 'dept_manager', 'tech_manager'],
  PROJECT_EDIT: ['admin', 'dept_manager', 'tech_manager'],
  PROJECT_DELETE: ['admin', 'dept_manager', 'tech_manager'],

  // ========== 任务权限 ==========
  TASK_VIEW: ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  TASK_CREATE: ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  TASK_EDIT: ['admin', 'dept_manager', 'tech_manager', 'engineer'],
  TASK_DELETE: ['admin', 'dept_manager', 'tech_manager'],
  TASK_ASSIGN: ['admin', 'dept_manager', 'tech_manager'],

  // ========== 系统权限 ==========
  USER_MANAGE: ['admin'],
  SYSTEM_CONFIG: ['admin'],
  CAPABILITY_CONFIG: ['admin', 'dept_manager'],
  TEAM_AUTHORIZATION: ['admin', 'dept_manager'],

  // ... 保留现有权限定义
};
```

### 5.2 应用权限中间件

在各模块路由中应用权限中间件：

```typescript
// org/routes.ts
router.post('/departments', requirePermission('DEPT_CREATE'), ...);
router.put('/departments/:id', requirePermission('DEPT_EDIT'), ...);
router.delete('/departments/:id', requirePermission('DEPT_DELETE'), ...);

router.post('/members', requirePermission('MEMBER_CREATE'), ...);
router.put('/members/:id', requirePermission('MEMBER_EDIT'), ...);
router.delete('/members/:id', requirePermission('MEMBER_DELETE'), ...);

// project/routes.ts
router.post('/', requirePermission('PROJECT_CREATE'), ...);
router.put('/:id', requirePermission('PROJECT_EDIT'), ...);
router.delete('/:id', requirePermission('PROJECT_DELETE'), ...);

// task/routes.ts
router.post('/', requirePermission('TASK_CREATE'), ...);
router.put('/:id', requirePermission('TASK_EDIT'), ...);
router.delete('/:id', requirePermission('TASK_DELETE'), ...);

// analytics/routes.ts
router.post('/config/project-types', requirePermission('CONFIG_PROJECT_TYPE'), ...);
router.post('/config/task-types', requirePermission('CONFIG_TASK_TYPE'), ...);
router.post('/config/holidays', requirePermission('CONFIG_HOLIDAY'), ...);
```

### 5.3 特殊规则处理

对于工程师创建任务的限制，需要在 service 层实现：

```typescript
// task/service.ts
async createTask(data: CreateTaskRequest, user: User): Promise<string> {
  // 工程师只能创建子任务
  if (user.role === 'engineer' && !data.parent_id) {
    throw new ForbiddenError('工程师只能创建子任务');
  }

  // 工程师创建子任务时，父任务必须分配给自己
  if (user.role === 'engineer' && data.parent_id) {
    const parentTask = await this.getTaskById(data.parent_id);
    if (parentTask.assignee_id !== user.id) {
      throw new ForbiddenError('只能在自己负责的任务下创建子任务');
    }
  }

  // ... 创建逻辑
}
```

---

## 六、结论

### 6.1 合规性评估

| 类别 | 合规率 | 说明 |
|------|:------:|------|
| 报表分析权限 | 100% | 完全符合需求 |
| 数据备份权限 | 100% | 完全符合需求 |
| 审计日志权限 | 100% | 完全符合需求 |
| 用户管理权限 | 100% | 完全符合需求 |
| 数据隔离 | 100% | 完全符合需求 |
| 组织架构权限 | 0% | 完全缺失权限控制 |
| 项目操作权限 | 25% | 仅批量删除有控制 |
| 任务操作权限 | 40% | 批量操作有控制，单条操作无控制 |
| 系统配置权限 | 50% | 部分权限已定义但未应用 |

### 6.2 总体评估

**当前实现状态**: ⚠️ 部分符合需求

**主要问题**:
1. 细粒度权限定义不完整（缺少 17 个权限项）
2. 组织架构、项目、任务模块的 CRUD 操作缺少权限控制
3. 系统配置接口权限已定义但未应用

**建议优先级**:
1. 🔴 立即修复：组织架构权限控制（C1, C2）
2. 🔴 立即修复：项目操作权限控制（C3）
3. 🔴 立即修复：系统配置权限应用（C5）
4. 🟡 计划修复：任务操作权限控制（C4, M2, M3）
5. 🟡 计划修复：完善权限定义（M1）

---

**报告结束**
