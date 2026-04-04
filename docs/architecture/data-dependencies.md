# 数据依赖关系文档

> 记录跨模块的数据依赖关系，用于指导 React Query 缓存失效策略。

---

## 核心原则

**当实体 A 的数据通过 JOIN 查询包含实体 B 的字段时，修改 B 必须同时失效 A 的缓存。**

---

## 数据依赖关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           数据依赖关系                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐      JOIN (name)       ┌──────────┐                 │
│   │ Project  │ ─────────────────────→ │   Task   │                 │
│   └──────────┘                        └──────────┘                 │
│        ↑                                   ↑                        │
│        │                                   │                        │
│   统计聚合                              JOIN (real_name)            │
│        │                                   │                        │
│   ┌──────────┐                        ┌──────────┐                 │
│   │ Dashboard│ ←───────────────────── │  Member  │                 │
│   └──────────┘      统计聚合          └──────────┘                 │
│                                            ↑                        │
│                                       JOIN (name)                  │
│                                            │                        │
│                                       ┌──────────┐                 │
│                                       │Department│                 │
│                                       └──────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 详细依赖表

### Task 模块的依赖

| Task 字段 | 来源 | JOIN 查询 | 修改源时需失效 |
|-----------|------|-----------|----------------|
| `projectName` | `projects.name` | ✅ | `task.all` |
| `assigneeName` | `users.real_name` | ✅ | `task.all` |
| `wbsCode` | 自身字段 | ❌ | - |

**相关 mutation 需要失效 `task.all`：**
- `useUpdateProject` ✅ 已修复
- `useUpdateMember` ✅ 已修复

---

### Dashboard 模块的依赖

| Dashboard 数据 | 来源 | 聚合查询 | 修改源时需失效 |
|----------------|------|----------|----------------|
| 项目统计 | `tasks` 聚合 | ✅ | `analytics.all` |
| 任务统计 | `tasks` 聚合 | ✅ | `analytics.all` |
| 成员统计 | `tasks` 聚合 | ✅ | `analytics.all` |

**相关 mutation 需要失效 `analytics.all`：**
- `useCreateTask` ✅ 已有
- `useUpdateTask` - 可选（状态变更影响统计）
- `useDeleteTask` ✅ 已有

---

### Project 模块的依赖

| Project 字段 | 来源 | JOIN 查询 | 修改源时需失效 |
|--------------|------|-----------|----------------|
| `members[].name` | `users.real_name` | ✅ | `project.all` |

**相关 mutation 需要失效 `project.all`：**
- `useUpdateMember` ✅ 已有（通过 `org.members` 失效）

---

## Mutation 缓存失效清单

### Project Mutations (`useProjectMutations.ts`)

| Mutation | 需失效缓存 | 状态 |
|----------|-----------|------|
| `useCreateProject` | `project.all` | ✅ |
| `useUpdateProject` | `project.all`, `task.all` | ✅ 已修复 |
| `useDeleteProject` | `project.all` | ✅ |

### Task Mutations (`useTaskMutations.ts`)

| Mutation | 需失效缓存 | 状态 |
|----------|-----------|------|
| `useCreateTask` | `task.lists()`, `analytics.all` | ✅ |
| `useUpdateTask` | `task.detail()`, `task.lists()` | ✅ |
| `useDeleteTask` | `task.lists()`, `analytics.all` | ✅ |

### Org Mutations (`useOrg.ts`)

| Mutation | 需失效缓存 | 状态 |
|----------|-----------|------|
| `useCreateMember` | `['org', 'members']` | ✅ |
| `useUpdateMember` | `['org', 'members']`, `task.all` | ✅ 已修复 |
| `useDeleteMember` | `['org', 'members']` | ✅ |
| `useCreateDepartment` | `org.departments`, `org.departmentTree` | ✅ |
| `useUpdateDepartment` | `org.departments`, `org.departmentTree` | ✅ |
| `useDeleteDepartment` | `org.departments`, `org.departmentTree` | ✅ |

---

## 开发指南

### 新增 Mutation 检查清单

1. **识别修改的数据实体** - 明确本次操作修改了哪张表
2. **查找 JOIN 查询** - 搜索代码中哪些查询 JOIN 了这张表
3. **确定依赖模块** - 哪些模块的数据包含该实体的字段
4. **添加缓存失效** - 在 `onSuccess` 中失效所有依赖模块的缓存

### 代码审查要点

```typescript
// ❌ 错误：只失效自身缓存
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.project.all });
}

// ✅ 正确：同时失效依赖它的模块
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.project.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.task.all }); // Task JOIN 了 Project
}
```

### 使用 `xxx.all` 失效

优先使用 `queryKeys.xxx.all` 而非精确 key，确保覆盖所有查询变体：

```typescript
// ✅ 推荐：失效所有任务相关查询
queryClient.invalidateQueries({ queryKey: queryKeys.task.all });

// ❌ 不推荐：只失效特定查询
queryClient.invalidateQueries({ queryKey: queryKeys.task.list({ projectId }) });
```

---

## 后端 JOIN 查询记录

### Task 查询 (`task/repository.ts`)

```sql
SELECT t.*,
       u.real_name as assignee_name,   -- 来自 users 表
       p.name as project_name           -- 来自 projects 表
FROM wbs_tasks t
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN projects p ON t.project_id = p.id
```

### Project 查询 (`project/repository.ts`)

```sql
SELECT p.*,
       -- 成员信息通过关联查询获取
FROM projects p
-- 成员通过 project_members 关联
```

---

## 更新日志

| 日期 | 变更 | 影响 |
|------|------|------|
| 2026-04-03 | 修复 `useUpdateProject` 未失效 `task.all` | 项目名称变更后任务列表同步更新 |
| 2026-04-03 | 修复 `useUpdateMember` 未失效 `task.all` | 成员名称变更后任务列表同步更新 |
| 2026-04-03 | 创建数据依赖文档 | 建立系统性排查机制 |
