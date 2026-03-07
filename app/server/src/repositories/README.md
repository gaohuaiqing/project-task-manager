# Repository层使用指南

## 概述

本项目已实现完整的Repository数据访问层，用于统一管理数据库操作。Repository层提供了以下好处：

- **统一数据访问**: 所有数据库操作通过Repository进行
- **类型安全**: 完整的TypeScript类型支持
- **业务逻辑分离**: 数据访问逻辑与业务逻辑分离
- **可测试性**: 易于单元测试
- **缓存优化**: 统一的缓存策略

## 当前状态

✅ **已实现**:
- BaseRepository: 提供通用CRUD操作
- ProjectRepository: 项目数据访问
- MemberRepository: 成员数据访问
- WbsTaskRepository: 任务数据访问
- UserRepository: 用户数据访问
- RepositoryFactory: Repository工厂类

❌ **待改进**:
- 业务服务仍直接使用DatabaseService
- 需要逐步迁移到Repository模式

## Repository基本用法

### 1. 在服务中使用Repository

```typescript
// ❌ 旧方式：直接使用DatabaseService
import { DatabaseService } from '../services/DatabaseService.js';

class ProjectService {
  async getProject(id: number) {
    const result = await DatabaseService.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    return result[0];
  }
}

// ✅ 新方式：使用Repository
import { ProjectRepository } from '../repositories/ProjectRepository.js';

class ProjectService {
  constructor(
    private projectRepo: ProjectRepository
  ) {}

  async getProject(id: number) {
    return await this.projectRepo.findById(id);
  }
}
```

### 2. 初始化Repositories

```typescript
// 在应用初始化时
import { initRepositories } from './repositories/RepositoryFactory.js';
import { DatabaseService } from './services/DatabaseService.js';

const db = new DatabaseService();
const repositories = await initRepositories(db);

// 使用repositories.project
const project = await repositories.project.findById(1);
```

### 3. 带条件的查询

```typescript
// 基础查询
const allProjects = await projectRepo.findAll();

// 带过滤条件
const activeProjects = await projectRepo.findAll({
  filters: [
    { field: 'status', operator: 'eq', value: 'in_progress' }
  ]
});

// 带排序
const projects = await projectRepo.findAll({
  orderBy: 'created_at',
  orderDirection: 'DESC'
});

// 组合条件
const projects = await projectRepo.findProjects({
  status: ['in_progress', 'planning'],
  searchKeyword: '关键词',
  orderBy: 'planned_end_date',
  orderDirection: 'ASC'
});
```

### 4. 创建和更新

```typescript
// 创建
const newProject = await projectRepo.create({
  code: 'PRJ001',
  name: '新项目',
  status: 'planning',
  projectType: 'product_development',
  // ... 其他字段
});

// 更新
const updated = await projectRepo.update(projectId, {
  name: '更新后的名称',
  status: 'in_progress'
});

// 批量更新
const updated = await projectRepo.updateMany([
  { id: 1, entity: { status: 'completed' } },
  { id: 2, entity: { status: 'completed' } }
]);
```

### 5. 软删除

```typescript
// 软删除
await projectRepo.softDelete(projectId);

// 批量软删除
await projectRepo.softDeleteMany([1, 2, 3]);

// 恢复
await projectRepo.restore(projectId);
```

## 迁移计划

### 阶段1: 新功能使用Repository
- 新增的业务服务必须使用Repository
- 示例：新的批量操作服务

### 阶段2: 逐步迁移现有服务
按优先级迁移：
1. OptimizedProjectService → ProjectRepository
2. OptimizedMemberService → MemberRepository
3. OptimizedWbsTaskService → WbsTaskRepository

### 阶段3: 统一缓存策略
- Repository层统一缓存
- 移除业务层的重复缓存逻辑

## 示例：完整的服务类

```typescript
import { ProjectRepository, type ProjectQueryOptions } from '../repositories/ProjectRepository.js';
import { RedisCacheService } from '../services/RedisCacheService.js';

export class EnhancedProjectService {
  constructor(
    private projectRepo: ProjectRepository,
    private cache: RedisCacheService
  ) {}

  async getProject(id: number): Promise<Project | null> {
    // 尝试从缓存获取
    const cached = await this.cache.get(`project:${id}`);
    if (cached) return JSON.parse(cached);

    // 从Repository获取
    const project = await this.projectRepo.findById(id);
    if (!project) return null;

    // 缓存结果
    await this.cache.set(`project:${id}`, JSON.stringify(project), 300);
    return project;
  }

  async getProjects(options: ProjectQueryOptions = {}): Promise<Project[]> {
    const cacheKey = `projects:${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const projects = await this.projectRepo.findProjects(options);
    await this.cache.set(cacheKey, JSON.stringify(projects), 60);
    return projects;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const project = await this.projectRepo.create(data);

    // 清除相关缓存
    await this.cache.deletePattern('projects:*');
    await this.cache.set(`project:${project.id}`, JSON.stringify(project), 300);

    return project;
  }
}
```

## 性能优化建议

1. **使用批量操作**: 尽量使用`findByIds`、`createMany`、`updateMany`
2. **合理使用缓存**: 热数据放入Redis，冷数据直接查询
3. **避免N+1查询**: 使用`findByIds`批量获取关联数据
4. **使用事务**: 多个相关操作使用`db.transaction()`

## 最佳实践

1. **错误处理**: Repository方法可能抛出异常，需要适当处理
2. **类型安全**: 充分利用TypeScript类型检查
3. **软删除优先**: 优先使用`softDelete`而非`hardDelete`
4. **审计日志**: 重要操作记录审计日志
5. **性能监控**: 监控慢查询并优化

## 常见问题

### Q: 如何执行复杂查询？

A: 使用`queryRaw`或`queryRawEntities`方法：

```typescript
const results = await projectRepo.queryRawEntities(`
  SELECT p.*, COUNT(t.id) as task_count
  FROM projects p
  LEFT JOIN wbs_tasks t ON t.project_id = p.id
  WHERE p.status = ?
  GROUP BY p.id
`, ['in_progress']);
```

### Q: 如何处理事务？

A: 使用DatabaseService的transaction方法：

```typescript
const result = await db.transaction(async () => {
  const project = await projectRepo.create(projectData);
  const member = await memberRepo.create(memberData);
  await projectRepo.addMember(project.id, member.id);
  return { project, member };
});
```

### Q: 如何在Express路由中使用？

A: 通过依赖注入传入Repository实例：

```typescript
router.get('/projects/:id', async (req, res) => {
  const project = await req.app.locals.repositories.project.findById(
    parseInt(req.params.id)
  );
  if (!project) {
    return res.status(404).json({ success: false, message: '项目不存在' });
  }
  res.json({ success: true, data: project });
});
```

## 总结

Repository层是数据访问的最佳实践，建议：
- 新功能优先使用Repository
- 现有代码逐步迁移
- 保持代码简洁和可维护性
- 充分利用类型安全和缓存优化
