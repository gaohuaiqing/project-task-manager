# Repository模式实现报告

## 概述

本报告记录了数据库重构计划中**阶段5：实现Repository模式抽象**的实施情况。

## 实现目标

1. ✅ 创建 BaseRepository 抽象类
2. ✅ 实现具体的 Repository 类
3. ✅ 提供 RepositoryFactory 工厂类
4. ✅ 支持事务操作
5. ✅ 提供使用示例

---

## 架构设计

### 类图

```
┌─────────────────────────┐
│   BaseRepository<T>      │
│   (抽象类)               │
├─────────────────────────┤
│ + findById()            │
│ + findAll()             │
│ + findPaginated()       │
│ + create()              │
│ + update()              │
│ + softDelete()          │
│ + stats()               │
│ + count()               │
│ + exists()              │
└──────────┬──────────────┘
           │
           ├──────────► ProjectRepository
           ├──────────► WbsTaskRepository
           ├──────────► MemberRepository
           └──────────► UserRepository

┌─────────────────────────┐
│  RepositoryFactory       │
│  (工厂类/单例)            │
├─────────────────────────┤
│ - db: DatabaseService   │
│ - repositories: Map     │
├─────────────────────────┤
│ + getInstance()         │
│ + getProjectRepository()│
│ + getWbsTaskRepository()│
│ + getMemberRepository() │
│ + getUserRepository()   │
│ + transaction()         │
│ + healthCheck()         │
└─────────────────────────┘
```

### 设计原则

1. **单一职责原则**: 每个Repository只负责一个实体的数据访问
2. **依赖倒置原则**: 服务层依赖Repository抽象，不直接依赖DatabaseService
3. **开闭原则**: 通过继承BaseRepository扩展功能
4. **里氏替换原则**: 具体Repository可以替换BaseRepository

---

## 实现详情

### 1. BaseRepository 抽象类

**文件**: `app/server/src/repositories/BaseRepository.ts`

**核心方法**:

| 方法 | 功能 | 返回类型 |
|------|------|----------|
| `findById(id)` | 根据ID查找实体 | `T \| null` |
| `findByIds(ids)` | 批量查找实体 | `T[]` |
| `findAll(options)` | 查找所有实体 | `T[]` |
| `findPaginated(options)` | 分页查询 | `PaginatedResponse<T>` |
| `create(entity)` | 创建实体 | `T` |
| `createMany(entities)` | 批量创建 | `T[]` |
| `update(id, entity)` | 更新实体 | `T` |
| `updateMany(updates)` | 批量更新 | `T[]` |
| `softDelete(id)` | 软删除 | `boolean` |
| `hardDelete(id)` | 硬删除 | `boolean` |
| `restore(id)` | 恢复已删除 | `boolean` |
| `stats(options)` | 统计信息 | `RepositoryStats` |
| `count(options)` | 计数 | `number` |
| `exists(id)` | 检查存在 | `boolean` |

**特性**:
- 泛型支持: `BaseRepository<T extends BaseEntity>`
- 软删除支持: 自动处理 `deleted_at` 字段
- 查询选项: 支持过滤、分页、排序
- 事务支持: 批量操作使用事务
- 类型映射: 抽象方法 `mapToEntity()` 和 `mapToRow()`

### 2. 具体Repository实现

#### ProjectRepository

**文件**: `app/server/src/repositories/ProjectRepository.ts`

**特有方法**:
- `findByCode(code)` - 根据代码查找
- `codeExists(code, excludeId)` - 检查代码是否存在
- `findProjects(options)` - 查询项目（带筛选）
- `getProjectStats()` - 获取项目统计
- `updateProgress(id, progress)` - 更新进度
- `updateTaskCounts(id, ...)` - 更新任务计数
- `findDelayedProjects()` - 获取延期项目
- `findUpcomingDeadlineProjects(days)` - 获取即将到期项目

#### WbsTaskRepository

**文件**: `app/server/src/repositories/WbsTaskRepository.ts`

**特有方法**:
- `findByTaskCode(projectId, taskCode)` - 根据任务编码查找
- `findByProject(projectId, options)` - 查询项目的所有任务
- `findSubtasks(parentId)` - 查询子任务
- `findTaskTree(projectId, rootParentId)` - 查询任务树（递归）
- `getTaskStats(projectId?)` - 获取任务统计
- `updateProgress(id, progress)` - 更新进度
- `updateStatus(id, status)` - 更新状态
- `assignTask(taskId, assigneeId)` - 分配任务
- `moveTask(taskId, newParentId)` - 移动任务（更改层级）
- `findCriticalPathTasks(projectId)` - 获取关键路径
- `findUpcomingDeadlineTasks(days)` - 获取即将到期任务

#### MemberRepository

**文件**: `app/server/src/repositories/MemberRepository.ts`

**特有方法**:
- `findByEmployeeId(employeeId)` - 根据工号查找
- `findByUserId(userId)` - 根据用户ID查找
- `findMembers(options)` - 查询成员（带筛选）
- `getMemberStats()` - 获取成员统计
- `linkUserAccount(memberId, userId)` - 关联用户账户
- `unlinkUserAccount(memberId)` - 取消关联
- `updateCapabilities(memberId, capabilities)` - 更新能力评估
- `updateSkills(memberId, skills)` - 更新技能
- `findAvailableMembers()` - 获取可用成员
- `search(keyword, limit)` - 搜索成员
- `getMemberWorkload(memberId)` - 获取工作负载

#### UserRepository

**文件**: `app/server/src/repositories/UserRepository.ts`

**特有方法**:
- `findByUsername(username)` - 根据用户名查找
- `usernameExists(username, excludeId)` - 检查用户名是否存在
- `findUsers(options)` - 查询用户（带筛选）
- `getUserStats()` - 获取用户统计
- `verifyPassword(username, password)` - 验证密码
- `updatePassword(userId, hashedPassword)` - 更新密码
- `updateRole(userId, role)` - 更新角色
- `getUserSessions(userId)` - 获取用户的所有会话
- `terminateAllSessions(userId)` - 终止所有会话
- `search(keyword, limit)` - 搜索用户
- `findByRole(role)` - 按角色查询
- `findAdmins()` - 获取管理员
- `findTechManagers()` - 获取技术经理
- `findDeptManagers()` - 获取部门经理
- `findEngineers()` - 获取工程师

### 3. RepositoryFactory 工厂类

**文件**: `app/server/src/repositories/RepositoryFactory.ts`

**功能**:
- 单例模式：确保全局只有一个实例
- 延迟初始化：Repository实例按需创建
- 事务支持：跨Repository的事务操作
- 健康检查：检查所有Repository的可用性

**核心方法**:
- `getInstance(db)` - 获取单例实例
- `getProjectRepository()` - 获取ProjectRepository
- `getWbsTaskRepository()` - 获取WbsTaskRepository
- `getMemberRepository()` - 获取MemberRepository
- `getUserRepository()` - 获取UserRepository
- `transaction(callback)` - 执行事务
- `healthCheck()` - 健康检查

---

## 使用示例

### 初始化

```typescript
import { DatabaseService } from './services/DatabaseService.js';
import { initRepositories } from './repositories/index.js';

// 初始化DatabaseService
const db = new DatabaseService();
await db.init();

// 初始化RepositoryFactory
const repositoryFactory = initRepositories(db);
```

### 基本操作

```typescript
// 获取Repository
const projectRepo = repositoryFactory.getProjectRepository();

// 创建项目
const project = await projectRepo.create({
  code: 'PRJ-001',
  name: 'New Project',
  status: 'planning',
  projectType: 'product_development',
  progress: 0,
  taskCount: 0,
  completedTaskCount: 0,
});

// 查询项目
const projects = await projectRepo.findProjects({
  status: ['in_progress'],
  searchKeyword: 'backend',
});

// 分页查询
const result = await projectRepo.findPaginated({
  pagination: { page: 1, pageSize: 20 },
});
```

### 事务操作

```typescript
// 跨Repository事务
const result = await repositoryFactory.transaction(async (repos) => {
  // 创建项目
  const project = await repos.project.create(projectData);

  // 创建任务
  const task = await repos.wbsTask.create({
    ...taskData,
    projectId: project.id,
  });

  // 分配任务
  await repos.wbsTask.assignTask(task.id, memberId);

  return { project, task };
});
```

### 自定义查询

```typescript
// 使用queryRaw执行自定义SQL
const rows = await projectRepo.queryRaw(
  'SELECT * FROM projects WHERE YEAR(created_at) = ?',
  [2025]
);

const projects = rows.map(row => projectRepo.mapToEntity(row));
```

---

## 迁移指南

### 从DatabaseService迁移到Repository

**旧代码**:
```typescript
// 直接使用DatabaseService
const rows = await db.query(
  'SELECT * FROM projects WHERE id = ?',
  [projectId]
);
const project = rows[0];
```

**新代码**:
```typescript
// 使用Repository
const projectRepo = repositoryFactory.getProjectRepository();
const project = await projectRepo.findById(projectId);
```

### 迁移步骤

1. **引入RepositoryFactory**
   ```typescript
   import { initRepositories } from './repositories/index.js';
   ```

2. **获取Repository实例**
   ```typescript
   const projectRepo = repositoryFactory.getProjectRepository();
   ```

3. **替换查询代码**
   - `db.query()` → `repository.findById()` / `findAll()`
   - 参数化查询自动处理

4. **使用类型安全的实体**
   - Repository返回的实体是类型安全的
   - 不需要手动解析数据库行

5. **处理复杂查询**
   - 使用 `findWithCustomQuery()` 或 `queryRaw()`
   - 或在具体Repository中添加特有方法

---

## 优势与收益

### 代码质量提升

| 指标 | 改进前 | 改进后 |
|------|--------|--------|
| 数据访问代码重复 | 高 | 低（复用BaseRepository） |
| 类型安全 | 部分 | 完全（泛型支持） |
| 测试难度 | 高（需要模拟数据库） | 低（可mock Repository） |
| 事务处理 | 手动 | 自动（RepositoryFactory） |

### 可维护性提升

- **统一接口**: 所有Repository使用相同的接口
- **易于扩展**: 新增实体只需创建新的Repository
- **关注点分离**: 数据访问逻辑与业务逻辑分离
- **便于测试**: 可以mock Repository进行单元测试

---

## 文件清单

### 核心文件（6个）

| 文件 | 行数 | 说明 |
|------|------|------|
| `BaseRepository.ts` | ~500 | 抽象基类 |
| `ProjectRepository.ts` | ~300 | 项目Repository |
| `WbsTaskRepository.ts` | ~400 | WBS任务Repository |
| `MemberRepository.ts` | ~300 | 成员Repository |
| `UserRepository.ts` | ~250 | 用户Repository |
| `RepositoryFactory.ts` | ~200 | 工厂类 |

### 辅助文件（2个）

| 文件 | 行数 | 说明 |
|------|------|------|
| `index.ts` | ~30 | 模块导出 |
| `examples.ts` | ~300 | 使用示例 |

---

## 下一步

1. **编写单元测试**
   - 测试BaseRepository的各个方法
   - 测试具体Repository的特有方法
   - 测试RepositoryFactory的事务支持

2. **集成到现有服务**
   - 替换OptimizedProjectService使用ProjectRepository
   - 替换OptimizedWbsTaskService使用WbsTaskRepository
   - 替换OptimizedMemberService使用MemberRepository

3. **性能优化**
   - 添加查询结果缓存
   - 优化复杂查询的SQL
   - 添加批量操作的优化

4. **文档完善**
   - API文档生成
   - 使用指南更新
   - 最佳实践总结

---

## 总结

Repository模式的实现为项目带来了：

✅ **更好的代码组织**: 数据访问逻辑集中在Repository中
✅ **更强的类型安全**: 泛型支持确保类型正确
✅ **更易于测试**: 可以mock Repository
✅ **更易于维护**: 统一的接口和抽象
✅ **更易于扩展**: 新增实体只需继承BaseRepository

这为后续的开发和维护打下了坚实的基础。

---

**生成时间**: 2025-01-05
**版本**: 1.0.0
**作者**: 数据库重构项目组
