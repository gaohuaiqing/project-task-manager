# 技术经理数据隔离问题分析报告

> **问题**: 汪志明（tech_manager）可以看到陈理技术组的任务，仪表板数据统计不仅仅是自己技术组的
> **分析日期**: 2026-05-11

---

## 一、问题根因分析

### 1.1 核心问题：`getTechManagerGroupIds` 函数逻辑错误

**位置**: `app/server/src/modules/analytics/query-builder.ts:312-352`

```typescript
export async function getTechManagerGroupIds(
  managerId: number,
  managerDeptId: number,
): Promise<number[]> {
  // ...

  // 获取直接管理的技术组
  const query = tableExists
    ? `SELECT DISTINCT d.id FROM departments d
       LEFT JOIN department_managers dm ON d.id = dm.department_id
       WHERE d.manager_id = ? OR dm.user_id = ?`
    : `SELECT DISTINCT d.id FROM departments d
       WHERE d.manager_id = ?`;

  const params = tableExists ? [managerId, managerId] : [managerId];
  const [managedGroups] = await pool.execute<RowDataPacket[]>(query, params);

  const groupIds = managedGroups.map((r: RowDataPacket) => r.id);

  // fallback: 如果没找到，使用自己的部门ID
  if (groupIds.length === 0 && managerDeptId) {
    groupIds.push(managerDeptId);
  }

  return [...new Set(groupIds)];
}
```

**问题分析**:

1. **查询条件过于宽泛**: `WHERE d.manager_id = ?` 只检查用户是否是某个部门的 manager_id，但**没有限制部门层级**。这意味着如果汪志明恰好是某个部门的 manager_id，他会看到该部门及其所有子部门的数据。

2. **Fallback 逻辑错误**: 当查询结果为空时，直接使用 `managerDeptId`（用户自己的部门ID）作为 fallback。但问题是：
   - 如果汪志明的 `department_id` 指向的是**父部门**（如"研发部"），他会看到整个研发部的数据
   - 正确的做法应该是：tech_manager 只能看到自己**直接管理的技术组**的数据

3. **缺少层级限制**: 需求文档明确指出：
   - dept_manager 管理的是**根部门及其所有子部门**
   - tech_manager 管理的是**技术组及其子部门**
   
   但当前实现没有区分这两种情况，导致 tech_manager 可能看到其他技术组的数据。

### 1.2 数据库结构假设错误

**当前实现假设**:
```
departments 表:
- id: 部门ID
- parent_id: 父部门ID
- manager_id: 部门经理的用户ID
```

**问题**: 
- `manager_id` 字段可能被用于**部门经理**和**技术经理**两种角色
- 没有区分"管理整个部门"和"管理某个技术组"的层级关系

**实际组织架构**（根据需求文档）:
```
部门（dept_manager 管理）
├── 技术组1（tech_manager A 管理）
│   ├── 工程师A1
│   └── 工程师A2
├── 技术组2（tech_manager B 管理）
│   ├── 工程师B1
│   └── 工程师B2
└── ...
```

### 1.3 ScopeService 的问题

**位置**: `app/server/src/modules/analytics/services/scope.service.ts:36-41`

```typescript
case 'tech_manager':
  return {
    projects: 'group_projects',
    users: 'group_members',
    departments: 'own_group',
  };
```

**问题**: 
- `group_projects` 和 `group_members` 的定义是正确的
- 但 `buildProjectFilter` 和 `buildTaskFilter` 方法中，tech_manager 的过滤逻辑**使用了错误的 SQL**：

```typescript
case 'group_projects':
  // 技术组参与的项目（通过任务分配关联）
  // 注意：User 类型中没有 tech_group_id，需要通过其他方式获取
  whereClause = `
    EXISTS (
      SELECT 1 FROM wbs_tasks wt
      JOIN users u ON wt.assignee_id = u.id
      WHERE wt.project_id = p.id
      AND u.id = :userId  // ❌ 错误：只过滤自己，而不是技术组成员
    )
  `;
  params.userId = user.id;
  break;
```

这个 SQL 只检查当前用户自己是否参与项目，**没有检查技术组成员**。

---

## 二、问题影响范围

### 2.1 受影响的功能

| 功能 | 影响程度 | 说明 |
|------|:--------:|------|
| 仪表板统计 | 🔴 高 | 显示的数据可能包含其他技术组 |
| 任务列表 | 🔴 高 | WBS 表可见任务可能超出范围 |
| 报表分析 | 🔴 高 | 成员分析、资源效能等报表数据越界 |
| 项目进度 | 🟡 中 | 项目列表可能显示其他技术组参与的项目 |

### 2.2 数据隔离失效场景

**场景 1**: 汪志明和陈理同属一个部门，但管理不同技术组
- 汪志明（tech_manager）管理技术组A
- 陈理（tech_manager）管理技术组B
- **问题**: 汪志明可能看到陈理技术组的任务

**场景 2**: 技术组的 manager_id 字段设置不当
- 如果 departments 表中某个技术组的 manager_id 指向了错误的人
- 或者 fallback 逻辑使用了错误的部门ID

---

## 三、修复方案

### 3.1 方案一：修正 `getTechManagerGroupIds` 函数（推荐）

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

  // 修正：fallback 只使用查询结果，不添加自己的部门ID
  // 如果没有管理任何技术组，返回空数组（表示无权限）
  
  CacheService.set(cacheKey, groupIds, SCOPE_CACHE_TTL);
  return groupIds;
}
```

### 3.2 方案二：在 users 表添加 `tech_group_id` 字段

**数据库迁移**:
```sql
ALTER TABLE users ADD COLUMN tech_group_id INT NULL 
REFERENCES departments(id);
```

**修改 User 类型**:
```typescript
export interface User {
  // ...
  tech_group_id: number | null;  // 新增：技术组ID
}
```

**修改过滤逻辑**:
```typescript
case 'tech_manager':
  if (!user.tech_group_id) {
    return { clause: '1=0', params: [] };
  }
  // 直接使用 tech_group_id 过滤
  return {
    clause: `u.department_id = ?`,
    params: [user.tech_group_id],
  };
```

### 3.3 方案三：使用 `department_managers` 表明确授权

**数据库表**:
```sql
CREATE TABLE department_managers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL REFERENCES departments(id),
  user_id INT NOT NULL REFERENCES users(id),
  role ENUM('dept_manager', 'tech_manager') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dept_user (department_id, user_id)
);
```

**查询逻辑**:
```typescript
const query = `
  SELECT DISTINCT d.id FROM departments d
  JOIN department_managers dm ON d.id = dm.department_id
  WHERE dm.user_id = ? AND dm.role = 'tech_manager'
`;
```

---

## 四、推荐修复步骤

### 第一步：诊断当前数据

```sql
-- 查看汪志明的用户信息
SELECT id, username, real_name, role, department_id FROM users WHERE real_name = '汪志明';

-- 查看陈理的用户信息
SELECT id, username, real_name, role, department_id FROM users WHERE real_name = '陈理';

-- 查看部门结构
SELECT d.id, d.name, d.parent_id, d.manager_id, u.real_name as manager_name
FROM departments d
LEFT JOIN users u ON d.manager_id = u.id
ORDER BY d.parent_id, d.id;

-- 查看汪志明应该看到的技术组
SELECT d.id, d.name, d.manager_id
FROM departments d
WHERE d.manager_id = (SELECT id FROM users WHERE real_name = '汪志明');
```

### 第二步：修正 `getTechManagerGroupIds` 函数

按方案一修改代码，确保只返回 tech_manager 直接管理的技术组ID。

### 第三步：清除缓存

```typescript
// 清除权限范围缓存
CacheService.flush();  // 或针对性清除
```

### 第四步：验证修复

1. 以汪志明身份登录
2. 检查仪表板统计数据是否只显示其技术组
3. 检查 WBS 表是否只显示其技术组成员的任务
4. 检查报表分析是否只显示其技术组成员

---

## 五、总结

**根本原因**: `getTechManagerGroupIds` 函数的查询逻辑没有正确区分技术组的层级关系，导致 tech_manager 可能看到其他技术组的数据。

**修复优先级**: 🔴 高（数据隔离失效）

**推荐方案**: 方案一（修正查询逻辑），因为：
1. 不需要修改数据库结构
2. 修改范围小，风险可控
3. 符合现有架构设计

---

**报告结束**
