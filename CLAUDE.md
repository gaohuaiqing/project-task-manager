# 后端模块 - CLAUDE.md

## 后端技术栈

- **运行时**: Node.js (ES Modules)
- **框架**: Express 4.18.2
- **语言**: TypeScript 5.2.2
- **执行**: tsx 4.1.4 (watch/dev)
- **数据库**: MySQL 2 (mysql2 3.17.1)
- **缓存**: Redis 4.7.1
- **实时**: WebSocket (ws 8.14.2)

## 开发命令

```bash
npm run dev                # tsx watch 监视模式启动
npm run build              # 编译 TypeScript
npm run start              # 运行编译代码 (生产)

# 数据库
npm run db:init            # 初始化数据库
npm run migrate:up         # 执行迁移
npm run migrate:down       # 回滚迁移

# 测试
npm run test:api           # API 测试
npm run test:concurrency   # 并发测试
npm run test:load          # 负载测试
```

## 核心架构

### 分层结构

```
routes/          # API 路由 (HTTP 端点)
middleware/      # Express 中间件
services/        # 业务逻辑 (单例类)
utils/           # 工具函数
types/           # TypeScript 类型
```

### 关键服务

| 服务 | 职责 |
|------|------|
| `DatabaseService` | MySQL 连接池 (100 连接) |
| `SessionManager` | 用户会话 + 设备绑定 |
| `PermissionManagerOptimized` | RBAC 权限检查 |
| `TaskApprovalService` | 审批流程引擎 |
| `TaskAssignmentService` | 任务分配逻辑 |
| `DataSyncService` | WebSocket 广播 |
| `RedisCacheService` | Redis 缓存 |
| `AuditLogService` | 操作审计 |

## 权限系统 (RBAC)

### 角色定义
```typescript
enum Role {
  admin = 'admin',                      // 系统管理员
  department_manager = 'dept_manager',  // 部门经理
  tech_manager = 'tech_manager',        // 技术经理
  engineer = 'engineer'                 // 工程师
}
```

### 权限检查
```typescript
// 数据范围权限
const canAccess = await permissionManager.canAccessDataScope(user, scope);

// 任务操作权限
const canApprove = await permissionManager.canPerformTaskOperation(user, 'approve');

// 用户管理权限
const canManageUsers = await permissionManager.canPerformUserManagement(user, 'create');
```

## 数据库操作

### 使用连接池
```typescript
// ✅ 正确 - 使用 DatabaseService
const db = DatabaseService.getInstance();
const results = await db.query('SELECT * FROM projects');

// ❌ 错误 - 直接创建连接
const conn = await mysql.createConnection(...);
```

### 原子事务
```typescript
import { AtomicTransaction } from './services/AtomicTransaction';

await AtomicTransaction.run(async (connection) => {
  await connection.query('UPDATE projects SET ...');
  await connection.query('INSERT INTO audit_logs ...');
});
```

### 死锁处理
```typescript
import { DeadlockRetry } from './utils/DeadlockRetry';

await DeadlockRetry.exec(async () => {
  // 可能死锁的操作
});
```

## WebSocket 通信

### 数据广播
```typescript
import { DataSyncService } from './services/DataSyncService';

// 广播给所有客户端
DataSyncService.broadcastToAll('project-updated', projectData);

// 广播给特定项目成员
DataSyncService.broadcastToProject(projectId, 'task-created', taskData);
```

### 会话管理
```typescript
import { SessionManager } from './services/SessionManager';

// 创建会话
const session = await SessionManager.createSession(userId, deviceId);

// 验证会话
const isValid = await SessionManager.validateSession(sessionId);
```

## 审计日志

记录敏感操作:
```typescript
import { AuditLogService } from './services/AuditLogService';

await AuditLogService.log({
  userId,
  action: 'project.delete',
  entityType: 'project',
  entityId: projectId,
  changes: { name: project.name },
  timestamp: new Date()
});
```

## 代码约定

### 代码注释语言
**始终使用中文**编写代码注释。

### 错误处理
```typescript
// ✅ 正确 - 详细错误信息
throw new Error(`项目 ${projectId} 不存在或已删除`);

// ❌ 错误 - 模糊错误
throw new Error('操作失败');
```

### 类型安全
所有函数参数和返回值必须定义类型。

### 预处理语句
**永远使用参数化查询**防止 SQL 注入:
```typescript
// ✅ 正确
await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ 错误 - SQL 注入风险
await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

## 环境配置

创建 `.env` 文件:
```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=task_manager
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
```
