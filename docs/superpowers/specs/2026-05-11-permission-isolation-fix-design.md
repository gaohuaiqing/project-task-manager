# 权限隔离修复设计文档

> **日期**: 2026-05-11
> **状态**: 待审批
> **优先级**: P0（安全漏洞）

---

## 1. 问题概述

### 1.1 问题描述

所有非 admin 角色（dept_manager、tech_manager、engineer）的数据隔离失效，导致用户可以看到越权数据。

### 1.2 受影响功能

| 角色 | WBS任务查看 | 仪表板统计 | 报表分析 |
|------|:-----------:|:----------:|:--------:|
| dept_manager | 🔴 失效 | 🔴 失效 | 🔴 失效 |
| tech_manager | 🔴 失效 | 🔴 失效 | 🔴 失效 |
| engineer | 🟡 部分失效 | 🟡 部分失效 | 🟡 部分失效 |

### 1.3 根因分析

1. **权限过滤逻辑分散** - `query-builder.ts` 和 `scope.service.ts` 两套实现不一致
2. **查询条件错误** - 未正确识别用户管理的部门范围
3. **fallback 逻辑错误** - 查询失败时错误地使用用户自己的部门ID

---

## 2. 组织架构与权限模型

### 2.1 组织架构层级

```
根部门（parent_id IS NULL）
└── 子部门
    └── 子部门
        └── 技术组（叶子节点）
            └── 工程师
```

**示例**：
```
超声产品开发部 (id=1)
└── 超声硬件开发部 (id=2)
    └── 超声硬件开发部G部 (id=3)
        └── 嵌入式开发组 (id=5)
            └── 工程师
```

### 2.2 角色权限定义

| 角色 | 管理范围 | 数据访问范围 |
|------|---------|-------------|
| admin | 全局 | 所有数据 |
| dept_manager | 本部门及所有后代部门 | 管理范围内成员参与的项目/任务 |
| tech_manager | 本技术组及所有后代 | 管理范围内成员参与的项目/任务 |
| engineer | 无 | 自己参与的项目/任务 |

### 2.3 数据存储设计

**departments 表**：
```sql
CREATE TABLE departments (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  parent_id INT NULL,        -- 父部门ID
  manager_id INT NULL,       -- 部门经理ID（简单场景）
  ...
);
```

**department_managers 表**（支持多经理）：
```sql
CREATE TABLE department_managers (
  id INT PRIMARY KEY,
  department_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('primary', 'co_manager'),
  ...
);
```

**users 表**：
```sql
-- department_id 指向用户实际工作的最底层部门（技术组）
-- 工程师: 指向技术组
-- 管理者: 指向其管理的部门
department_id INT NULL
```

---

## 3. 核心设计决策

### 3.1 统一权限过滤入口

**原则**：所有数据隔离逻辑统一使用 `query-builder.ts`

```
┌─────────────────────────────────────────────────────────────┐
│                     数据访问层                               │
├─────────────────────────────────────────────────────────────┤
│  task/service.ts     → buildTaskScopeFilter()              │
│  analytics/repo.ts   → buildProjectScopeFilter()           │
│  reports/*           → buildUserDepartmentScopeFilter()    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   query-builder.ts                          │
├─────────────────────────────────────────────────────────────┤
│  getManagedDepartmentIds()   - 获取管理的部门及所有后代     │
│  buildTaskScopeFilter()      - 任务过滤                     │
│  buildProjectScopeFilter()   - 项目过滤                     │
│  buildUserDepartmentScopeFilter() - 用户过滤               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 递归 CTE 查询部门树

**核心逻辑**：使用 MySQL 8.0+ 的递归 CTE 查询部门及其所有后代

```sql
WITH RECURSIVE dept_tree AS (
  -- 基础查询：获取用户直接管理的部门
  SELECT d.id FROM departments d
  LEFT JOIN department_managers dm ON d.id = dm.department_id
  WHERE d.manager_id = ? OR dm.user_id = ?

  UNION ALL

  -- 递归查询：获取所有子部门
  SELECT d.id FROM departments d
  JOIN dept_tree dt ON d.parent_id = dt.id
)
SELECT id FROM dept_tree
```

### 3.3 移除 fallback 逻辑

**原则**：无授权则无权限

- 查询不到管理的部门时，返回空数组
- 不再 fallback 到用户自己的 `department_id`

### 3.4 废弃 scope.service.ts 的简化实现

**处理方式**：让 `scope.service.ts` 内部调用 `query-builder.ts`

---

## 4. 详细实现方案

### 4.1 修复 `getManagedDepartmentIds`

**位置**：`app/server/src/modules/analytics/query-builder.ts`

**修改前**：
```typescript
// 问题：fallback 逻辑错误
if (deptIds.length === 0 && managerDeptId) {
  deptIds.push(managerDeptId);
}
```

**修改后**：
```typescript
export async function getManagedDepartmentIds(
  managerId: number,
  managerDeptId: number,
): Promise<number[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}managed:${managerId}`;
  const cached = CacheService.get<number[]>(cacheKey);
  if (cached) return cached;

  const pool = getPool();
  const tableExists = await checkTableExists('department_managers');

  // 使用递归 CTE 查询管理的部门及其所有后代
  const query = tableExists
    ? `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        LEFT JOIN department_managers dm ON d.id = dm.department_id
        WHERE d.manager_id = ? OR dm.user_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`
    : `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        WHERE d.manager_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);

  const deptIds = rows.map((r: RowDataPacket) => r.id);

  // 移除 fallback 逻辑：无授权则返回空数组
  CacheService.set(cacheKey, deptIds, SCOPE_CACHE_TTL);
  return deptIds;
}
```

### 4.2 修复 `getTechManagerGroupIds`

**位置**：`app/server/src/modules/analytics/query-builder.ts`

**修改后**：
```typescript
export async function getTechManagerGroupIds(
  managerId: number,
  managerDeptId: number,
): Promise<number[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}tech_groups:${managerId}`;
  const cached = CacheService.get<number[]>(cacheKey);
  if (cached) return cached;

  const pool = getPool();
  const tableExists = await checkTableExists('department_managers');

  // 使用递归 CTE 查询管理的技术组及其所有后代
  // 与 dept_manager 逻辑一致，统一处理
  const query = tableExists
    ? `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        LEFT JOIN department_managers dm ON d.id = dm.department_id
        WHERE d.manager_id = ? OR dm.user_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`
    : `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        WHERE d.manager_id = ?
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);

  const groupIds = rows.map((r: RowDataPacket) => r.id);

  // 移除 fallback 逻辑
  CacheService.set(cacheKey, groupIds, SCOPE_CACHE_TTL);
  return groupIds;
}
```

### 4.3 修复 `getAccessibleProjectIds`

**位置**：`app/server/src/modules/task/service.ts`

**修改后**：
```typescript
async getAccessibleProjectIds(user: User): Promise<string[] | undefined> {
  if (user.role === 'admin') return undefined;

  if (user.role === 'dept_manager') {
    return this.getDeptManagerAccessibleProjects(user);
  }

  if (user.role === 'tech_manager') {
    return this.getTechManagerAccessibleProjects(user);
  }

  // engineer: 自己参与的项目
  return this.projectRepo.getProjectIdsByMember(user.id);
}

/**
 * 获取技术经理可访问的项目ID列表
 */
private async getTechManagerAccessibleProjects(user: User): Promise<string[]> {
  const pool = (await import('../../core/db')).getPool();

  // 使用递归 CTE 获取管理的技术组及所有后代
  const groupIds = await getTechManagerGroupIds(user.id, user.department_id!);

  if (groupIds.length === 0) return [];

  // 查询技术组成员参与的项目
  const placeholders = groupIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT DISTINCT pm.project_id
     FROM users u
     JOIN project_members pm ON pm.user_id = u.id
     WHERE u.department_id IN (${placeholders})
     AND u.is_active = 1
     UNION
     SELECT pm2.project_id
     FROM project_members pm2 WHERE pm2.user_id = ?`,
    [...groupIds, user.id]
  );

  return (rows as any[]).map(r => String(r.project_id));
}
```

### 4.4 修复 `scope.service.ts`

**位置**：`app/server/src/modules/analytics/services/scope.service.ts`

**修改后**：改为调用 `query-builder.ts` 的方法

```typescript
import { buildTaskScopeFilter, buildProjectScopeFilter, buildUserDepartmentScopeFilter } from '../query-builder';

export class ScopeService {
  /**
   * 构建项目过滤条件
   */
  static async buildProjectFilter(user: User): Promise<{
    whereClause: string;
    params: Record<string, unknown>;
  }> {
    const scope = await buildProjectScopeFilter(user, 'p');
    // 将数组参数转换为命名参数
    const params: Record<string, unknown> = {};
    scope.params.forEach((p, i) => {
      params[`param${i}`] = p;
    });
    // 替换占位符为命名参数
    let whereClause = scope.clause;
    scope.params.forEach((_, i) => {
      whereClause = whereClause.replace('?', `:param${i}`);
    });
    return { whereClause, params };
  }

  // 类似处理 buildTaskFilter 和 buildUserFilter
}
```

---

## 5. 修改文件清单

| 文件 | 修改内容 | 优先级 |
|------|---------|:------:|
| `query-builder.ts` | 修复 `getManagedDepartmentIds` 和 `getTechManagerGroupIds` | P0 |
| `task/service.ts` | 新增 `getTechManagerAccessibleProjects` 方法 | P0 |
| `scope.service.ts` | 改为调用 query-builder 的方法 | P1 |

---

## 6. 验证测试

### 6.1 dept_manager 验证

1. 以部门经理身份登录
2. 检查仪表板统计是否只显示管理部门及后代部门的数据
3. 检查 WBS 表是否只显示管理部门成员的任务
4. 检查报表分析是否只显示管理部门成员

### 6.2 tech_manager 验证

1. 以技术经理身份登录
2. 检查仪表板统计是否只显示管理技术组及后代的数据
3. 检查 WBS 表是否只显示管理技术组成员的任务
4. 确认看不到其他技术经理管理的技术组数据

### 6.3 engineer 验证

1. 以工程师身份登录
2. 检查仪表板统计是否只显示自己参与的项目数据
3. 检查 WBS 表是否只显示自己参与项目的任务

---

## 7. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 递归 CTE 性能 | 低（组织结构简单） | 添加缓存，15分钟 TTL |
| 现有数据兼容 | 中 | 查询同时支持 `manager_id` 和 `department_managers` 表 |
| 缓存一致性 | 低 | 部门变更时清除相关缓存 |

---

## 8. 总结

**核心改动**：
1. 统一使用递归 CTE 查询部门树
2. 移除错误的 fallback 逻辑
3. 统一权限过滤入口为 `query-builder.ts`

**预期效果**：
- 所有角色的数据隔离严格按权限执行
- 代码逻辑统一，易于维护
- 支持多层嵌套的组织架构

---

**文档结束**
