# 权限隔离问题综合分析报告

> **问题**: 所有非 admin 角色（dept_manager、tech_manager、engineer）都存在数据隔离失效问题
> **分析日期**: 2026-05-11
> **优先级**: 🔴 P0（安全漏洞）

---

## 一、问题总览

### 1.1 受影响角色与功能

| 角色 | WBS任务查看 | 仪表板统计 | 报表分析 | 根因 |
|------|:-----------:|:----------:|:--------:|------|
| **dept_manager** | 🔴 失效 | 🔴 失效 | 🔴 失效 | 查询逻辑错误 + fallback 问题 |
| **tech_manager** | 🔴 失效 | 🔴 失效 | 🔴 失效 | 查询逻辑错误 + fallback 问题 |
| **engineer** | 🟡 部分失效 | 🟡 部分失效 | 🟡 部分失效 | ScopeService 逻辑简化 |

### 1.2 核心问题代码位置

| 文件 | 函数/方法 | 问题类型 |
|------|----------|----------|
| `query-builder.ts:251-301` | `getManagedDepartmentIds` | fallback 逻辑错误 |
| `query-builder.ts:312-352` | `getTechManagerGroupIds` | 查询条件过于宽泛 + fallback 错误 |
| `scope.service.ts:64-110` | `buildProjectFilter` | 过滤逻辑简化为只查自己 |
| `scope.service.ts:115-146` | `buildTaskFilter` | 过滤逻辑简化为只查自己 |
| `task/service.ts:408-418` | `getAccessibleProjectIds` | tech_manager/engineer 逻辑相同 |

---

## 二、详细问题分析

### 2.1 dept_manager 问题

#### 问题 1: `getManagedDepartmentIds` fallback 逻辑错误

**位置**: `query-builder.ts:291-295`

```typescript
// 如果没找到（可能不是直接的manager），fallback到自己的部门
if (deptIds.length === 0 && managerDeptId) {
  deptIds.push(managerDeptId);
}
```

**问题**:
- 如果用户不是任何部门的 `manager_id`，会 fallback 到自己的 `department_id`
- 但用户的 `department_id` 可能指向**子部门**，而非根部门
- 导致 dept_manager 只能看到自己所在子部门的数据，而非整个部门树

**正确逻辑**:
- dept_manager 应该管理**根部门及其所有子部门**
- 如果查询不到，应该返回空数组（无权限），而非 fallback

#### 问题 2: `getDeptManagerAccessibleProjects` 查询条件错误

**位置**: `task/service.ts:424-444`

```typescript
WITH RECURSIVE dept_tree AS (
  SELECT id FROM departments WHERE manager_id = ?  // ❌ 只查 manager_id
  UNION ALL
  SELECT d.id FROM departments d INNER JOIN dept_tree dt ON d.parent_id = dt.id
)
```

**问题**:
- 只检查 `manager_id = ?`，没有检查 `department_managers` 表
- 如果 dept_manager 的授权记录在 `department_managers` 表中，查询会返回空
- 导致 dept_manager 看不到任何项目

---

### 2.2 tech_manager 问题

#### 问题 1: `getTechManagerGroupIds` 查询条件过于宽泛

**位置**: `query-builder.ts:329-337`

```typescript
const query = tableExists
  ? `SELECT DISTINCT d.id FROM departments d
     LEFT JOIN department_managers dm ON d.id = dm.department_id
     WHERE d.manager_id = ? OR dm.user_id = ?`
  : `SELECT DISTINCT d.id FROM departments d
     WHERE d.manager_id = ?`;
```

**问题**:
- 没有限制部门层级（叶子节点）
- 如果 tech_manager 同时是某个父部门的 `manager_id`，会看到所有子部门数据
- 正确逻辑：tech_manager 只能看到**直接管理的技术组**（叶子节点）

#### 问题 2: fallback 逻辑错误

**位置**: `query-builder.ts:341-344`

```typescript
if (groupIds.length === 0 && managerDeptId) {
  groupIds.push(managerDeptId);
}
```

**问题**:
- 如果查询不到，会 fallback 到用户自己的部门ID
- 用户的 `department_id` 可能指向**父部门**，导致看到其他技术组的数据

---

### 2.3 engineer 问题

#### 问题 1: `getAccessibleProjectIds` 逻辑简化

**位置**: `task/service.ts:416-417`

```typescript
// 其他角色：自己作为成员参与的项目
return this.projectRepo.getProjectIdsByMember(user.id);
```

**问题**:
- tech_manager 和 engineer 使用相同的逻辑
- tech_manager 应该看到**技术组成员参与的项目**，而非仅自己参与的项目

#### 问题 2: ScopeService 过滤逻辑简化

**位置**: `scope.service.ts:82-94`

```typescript
case 'group_projects':
  // 技术组参与的项目（通过任务分配关联）
  // 注意：User 类型中没有 tech_group_id，需要通过其他方式获取
  whereClause = `
    EXISTS (
      SELECT 1 FROM wbs_tasks wt
      JOIN users u ON wt.assignee_id = u.id
      WHERE wt.project_id = p.id
      AND u.id = :userId  // ❌ 只过滤自己，而不是技术组成员
    )
  `;
```

**问题**:
- tech_manager 的 `group_projects` 过滤只检查当前用户自己
- 应该检查**技术组所有成员**

---

### 2.4 ScopeService 与 query-builder 不一致

**位置**: `scope.service.ts` vs `query-builder.ts`

| 方法 | ScopeService | query-builder |
|------|--------------|---------------|
| dept_manager 项目过滤 | `p.department_id = :departmentId` | CTE 递归查询部门树 |
| tech_manager 项目过滤 | 只检查 `u.id = :userId` | 查询技术组成员 |
| engineer 项目过滤 | 只检查 `t.assignee_id = :userId` | 只检查项目成员 |

**问题**:
- 两套代码逻辑不一致
- ScopeService 的实现过于简化，没有使用 query-builder 的完整逻辑
- 导致报表分析等功能使用 ScopeService 时数据隔离失效

---

## 三、修复方案

### 3.1 统一权限过滤入口

**原则**: 所有数据隔离逻辑统一使用 `query-builder.ts` 中的方法

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
│  getManagedDepartmentIds()   - dept_manager 部门树         │
│  getTechManagerGroupIds()    - tech_manager 技术组         │
│  buildTaskScopeFilter()      - 任务过滤                     │
│  buildProjectScopeFilter()   - 项目过滤                     │
│  buildUserDepartmentScopeFilter() - 用户过滤               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 修复 `getManagedDepartmentIds`

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

  // 修正：查询用户作为 manager 的根部门，然后递归获取所有子部门
  const query = tableExists
    ? `WITH RECURSIVE dept_tree AS (
        -- 基础查询：获取用户管理的根部门（parent_id IS NULL）
        SELECT d.id FROM departments d
        LEFT JOIN department_managers dm ON d.id = dm.department_id
        WHERE (d.manager_id = ? OR dm.user_id = ?)
        AND d.parent_id IS NULL  -- 必须是根部门
        UNION ALL
        -- 递归查询：获取所有子部门
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`
    : `WITH RECURSIVE dept_tree AS (
        SELECT d.id FROM departments d
        WHERE d.manager_id = ? AND d.parent_id IS NULL
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [rows] = await pool.execute<RowDataPacket[]>(query, params);

  const deptIds = rows.map((r: RowDataPacket) => r.id);

  // 修正：移除 fallback 逻辑
  // 如果查询结果为空，表示用户不是任何根部门的经理，返回空数组
  // 这符合"无授权则无权限"的安全原则

  CacheService.set(cacheKey, deptIds, SCOPE_CACHE_TTL);
  return deptIds;
}
```

### 3.3 修复 `getTechManagerGroupIds`

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

  // 修正：只查询 tech_manager 直接管理的技术组（叶子部门）
  // 技术组特征：parent_id IS NOT NULL（有父部门）且是叶子节点
  const query = tableExists
    ? `SELECT DISTINCT d.id FROM departments d
       LEFT JOIN department_managers dm ON d.id = dm.department_id
       WHERE (d.manager_id = ? OR dm.user_id = ?)
       AND d.parent_id IS NOT NULL  -- 必须有父部门（是子部门）
       AND NOT EXISTS (             -- 且没有子部门（是叶子节点）
         SELECT 1 FROM departments sub WHERE sub.parent_id = d.id
       )`
    : `SELECT DISTINCT d.id FROM departments d
       WHERE d.manager_id = ?
       AND d.parent_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM departments sub WHERE sub.parent_id = d.id
       )`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [managedGroups] = await pool.execute<RowDataPacket[]>(query, params);

  const groupIds = managedGroups.map((r: RowDataPacket) => r.id);

  // 修正：移除 fallback 逻辑
  // 如果没有管理任何技术组，返回空数组（表示无权限）

  CacheService.set(cacheKey, groupIds, SCOPE_CACHE_TTL);
  return groupIds;
}
```

### 3.4 修复 `getAccessibleProjectIds`

```typescript
async getAccessibleProjectIds(user: User): Promise<string[] | undefined> {
  if (user.role === 'admin') return undefined; // 不过滤

  // 部门经理：获取自己部门及所有子部门成员参与的项目
  if (user.role === 'dept_manager') {
    return this.getDeptManagerAccessibleProjects(user);
  }

  // 技术经理：获取技术组成员参与的项目
  if (user.role === 'tech_manager') {
    return this.getTechManagerAccessibleProjects(user);
  }

  // 工程师：自己作为成员参与的项目
  return this.projectRepo.getProjectIdsByMember(user.id);
}

/**
 * 获取技术经理可访问的项目ID列表
 */
private async getTechManagerAccessibleProjects(user: User): Promise<string[]> {
  const pool = (await import('../../core/db')).getPool();

  // 获取技术经理管理的技术组ID
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

### 3.5 废弃 ScopeService 的简化实现

**建议**: 完全移除 `scope.service.ts` 中的 `buildProjectFilter`、`buildTaskFilter`、`buildUserFilter` 方法，统一使用 `query-builder.ts` 的实现。

或者，让 ScopeService 内部调用 query-builder：

```typescript
static async buildProjectFilter(user: User): Promise<{
  whereClause: string;
  params: Record<string, unknown>;
}> {
  const scope = await buildProjectScopeFilter(user, 'p');
  return {
    whereClause: scope.clause,
    params: Object.fromEntries(scope.params.map((p, i) => [`param${i}`, p])),
  };
}
```

---

## 四、修复优先级

| 优先级 | 问题 | 影响 | 修复复杂度 |
|:------:|------|------|:----------:|
| P0 | `getTechManagerGroupIds` 查询条件 | 技术经理看到其他组数据 | 中 |
| P0 | `getManagedDepartmentIds` fallback | 部门经理权限错误 | 低 |
| P0 | `getAccessibleProjectIds` tech_manager 逻辑 | 技术经理项目列表错误 | 中 |
| P1 | ScopeService 与 query-builder 不一致 | 报表分析数据隔离失效 | 高 |
| P2 | 移除所有 fallback 逻辑 | 安全原则统一 | 低 |

---

## 五、验证测试

修复后需要验证以下场景：

### 5.1 dept_manager 验证

1. 以部门经理身份登录
2. 检查仪表板统计是否只显示管理部门及子部门的数据
3. 检查 WBS 表是否只显示管理部门成员的任务
4. 检查报表分析是否只显示管理部门成员

### 5.2 tech_manager 验证

1. 以技术经理身份登录（如汪志明）
2. 检查仪表板统计是否只显示管理技术组的数据
3. 检查 WBS 表是否只显示管理技术组成员的任务
4. 确认看不到其他技术经理（如陈理）管理的技术组数据

### 5.3 engineer 验证

1. 以工程师身份登录
2. 检查仪表板统计是否只显示自己参与的项目数据
3. 检查 WBS 表是否只显示自己参与项目的任务
4. 检查报表分析是否只显示自己的数据

---

## 六、总结

**根本原因**: 权限过滤逻辑分散在多个文件中，实现不一致，且存在错误的 fallback 逻辑。

**修复策略**:
1. 统一使用 `query-builder.ts` 作为权限过滤的唯一入口
2. 修正 `getManagedDepartmentIds` 和 `getTechManagerGroupIds` 的查询逻辑
3. 移除所有 fallback 逻辑，遵循"无授权则无权限"原则
4. 废弃 ScopeService 的简化实现，统一调用 query-builder

**预期效果**: 所有角色的数据隔离严格按权限执行，杜绝越权访问。

---

**报告结束**
