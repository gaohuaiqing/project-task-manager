# Index.ts 代码质量分析报告

> **分析日期**: 2026-03-10
> **文件**: `G:\Project\Web\Project_Task_Manager_3.0\app\server\src\index.ts`
> **总行数**: 2279 行
> **分析框架**: Martin Fowler《重构》、SOLID 原则、GoF 设计模式

---

## 执行摘要

### 关键发现
- **P0 严重问题**: 7 个 (需立即处理)
- **P1 重要问题**: 12 个 (应尽快处理)
- **P2 优化建议**: 15 个 (可延后处理)

### 整体评分
| 维度 | 评分 | 说明 |
|------|------|------|
| 复杂度控制 | ⚠️ D | 多处高圈复杂度和认知复杂度 |
| 代码异味 | ⚠️ D | 存在多种严重代码异味 |
| SOLID 原则 | ❌ F | 严重违反多项原则 |
| 可维护性 | ⚠️ D | 文件过大,职责不清 |
| 可测试性 | ❌ F | 紧耦合,难以单元测试 |

---

## 1. 复杂度分析

### 1.1 圈复杂度 (Cyclomatic Complexity)

#### 🔴 P0 - 极高复杂度函数

| 函数名 | 行号 | 圈复杂度 | 阈值 | 违反度 |
|--------|------|----------|------|--------|
| `handleTaskAssign` | 1515-1689 | ~45 | 10 | +350% |
| `handleWbsNodeMove` | 1757-1928 | ~42 | 10 | +320% |
| `handleDataUpdate` | 1255-1383 | ~28 | 10 | +180% |
| `handleMessage` | 1140-1172 | ~12 | 10 | +20% |
| `broadcastToAll` | 257-320 | ~18 | 10 | +80% |
| `startServer` | 1997-2163 | ~25 | 10 | +150% |

**问题代码示例** (handleTaskAssign - 1515行):
```typescript
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const { /* 8 个参数 */ } = requestData;

    console.log(`...`);

    // 复杂度分支 1: 数据类型判断
    const dataType = taskType === 'wbs_task' ? 'wbs_tasks' : `${taskType}s`;
    if (!GLOBAL_DATA_TYPES.includes(dataType)) {
      sendError(ws, `...`);
      return;
    }

    // 复杂度分支 2: 权限检查
    if (client.userId) {
      const permission = await permissionManager.canPerformAction(...);
      if (!permission.granted) {
        sendError(ws, `...`);
        return;
      }
    }

    // 复杂度分支 3: 获取当前状态
    let beforeData: any = null;
    try {
      const currentData = await databaseService.query(...);
      if (currentData && currentData.length > 0) {
        beforeData = { /* 4 个字段 */ };
      }
    } catch (error) {
      console.warn('...');
    }

    // 复杂度分支 4: 执行分配
    const result = await globalDataManager.updateGlobalData(...);

    // 复杂度分支 5: 处理成功/冲突/失败
    if (result.success) {
      // 嵌套分支 5a: 记录审计日志
      try {
        const taskInfo = result.data || beforeData || {};
        await auditLogService.logTaskAssign(...);
      } catch (auditError) {
        console.error('...');
      }

      // 嵌套分支 5b: 广播更新
      const updateMessage = { /* ... */ };
      clients.forEach((c, id) => {
        if (c.ws.readyState === WebSocket.OPEN) {
          sendToClient(c.ws, updateMessage);
        }
      });

      // 嵌套分支 5c: 响应分配者
      sendToClient(ws, { /* ... */ });
      console.log(`...`);
    } else if (result.conflict) {
      // 嵌套分支 5d: 冲突处理
      try {
        await auditLogService.log(...);
      } catch (auditError) {
        console.error('...');
      }
      sendToClient(ws, { /* ... */ });
      console.warn(`...`);
    } else {
      sendError(ws, result.message || '...');
    }
  } catch (error) {
    console.error('...');
    sendError(ws, '...');
  }
}
```

### 1.2 认知复杂度 (Cognitive Complexity)

#### 🔴 P0 - 极高认知复杂度

| 代码段 | 行号 | 认知复杂度 | 主要问题 |
|--------|------|-----------|----------|
| `handleTaskAssign` | 1515-1689 | ~85 | 深度嵌套、多个 try-catch、复杂的条件逻辑 |
| `handleWbsNodeMove` | 1757-1928 | ~78 | 6 层嵌套、Promise.all 批量操作 |
| `broadcastToAll` | 257-320 | ~35 | 3 层嵌套循环、异步权限检查 |
| `gracefulShutdown` | 2169-2226 | ~22 | 7 个顺序关闭步骤 |

**问题特征**:
- **嵌套层级**: 5-7 层 (建议 ≤ 3)
- **嵌套分支**: 大量 if-else-if 链
- **跳转语句**: 多个早期 return
- **递归**: 无
- **逻辑重写**: 频繁的条件取反

### 1.3 嵌套深度 (Nesting Depth)

#### 🔴 P0 - 超深嵌套

```typescript
// 示例: handleTaskAssign 第 1590-1608 行 (6 层嵌套)
if (result.success) {                          // 层级 1
  try {                                        // 层级 2
    const taskInfo = result.data || beforeData || {};
    await auditLogService.logTaskAssign(       // 层级 3
      parseInt(taskId),
      taskInfo.task_code || taskId,            // 层级 4 (逻辑表达式)
      taskInfo.task_name || `任务 ${taskId}`,  // 层级 4
      beforeData?.assigneeName || null,        // 层级 4
      assignToName || assignTo,                // 层级 4
      parseInt(assignTo),
      client.userId || 0,
      client.username || operatorName || '系统', // 层级 4 (链式逻辑或)
      client.role || 'unknown',                // 层级 4
      notes                                    // 层级 3
    );                                         // 层级 3
  } catch (auditError) {                       // 层级 2
    console.error('[WebSocket] 记录审计日志失败:', auditError);
  }                                            // 层级 1
}
```

**深度嵌套位置统计**:
- 4-5 层: 15+ 处
- 6-7 层: 8+ 处
- 8+ 层: 2 处

### 1.4 函数长度 (Function Length)

#### 🔴 P0 - 超长函数

| 函数名 | 行号 | 长度 | 阈值 | 违反度 |
|--------|------|------|------|--------|
| `handleTaskAssign` | 1515-1689 | 175 行 | 50 | +250% |
| `handleWbsNodeMove` | 1757-1928 | 172 行 | 50 | +244% |
| `startServer` | 1997-2163 | 167 行 | 50 | +234% |
| `gracefulShutdown` | 2169-2226 | 58 行 | 50 | +16% |
| `broadcastToAll` | 257-320 | 64 行 | 50 | +28% |

---

## 2. 代码异味 (Code Smells) - Martin Fowler

### 2.1 🔴 P0 - God Class / God Object

**位置**: 整个 `index.ts` 文件 (2279 行)

**问题描述**:
`index.ts` 违反了单一职责原则,承担了太多职责:

1. **HTTP 服务器配置** (行 70-183)
   - Express 配置
   - CORS 设置
   - CSRF 防护
   - Rate Limiting

2. **WebSocket 服务器管理** (行 1027-1138)
   - 连接管理
   - 心跳检测
   - 消息路由

3. **路由定义** (行 476-1025)
   - 15+ 个 API 端点
   - 登录/登出逻辑
   - 全局数据管理
   - 系统日志管理

4. **业务逻辑处理** (行 1140-1928)
   - 10+ 个消息处理器
   - 权限验证
   - 数据操作
   - 审计日志

5. **会话管理** (行 207-218, 1954-1989)
   - SessionManager 集成
   - 会话清理定时器

6. **性能监控** (行 2093-2136)
   - 内存监控
   - 数据库连接池状态
   - 登录性能统计

7. **服务器生命周期** (行 1997-2274)
   - 启动初始化
   - 优雅关闭
   - 错误处理

**影响**:
- ❌ 难以理解和维护
- ❌ 难以测试
- ❌ 高耦合度
- ❌ 修改风险高

**重构建议**:
应用 **分层架构 (Layered Architecture)** + **依赖注入 (Dependency Injection)**

```typescript
// 重构后结构
src/
├── server.ts                 // 服务器入口 (仅启动逻辑)
├── config/
│   ├── app.config.ts        // 应用配置
│   ├── cors.config.ts       // CORS 配置
│   └── security.config.ts   // 安全配置
├── http/
│   ├── server.ts            // HTTP 服务器
│   ├── routes/              // 路由定义
│   └── middleware/          // 中间件
├── websocket/
│   ├── server.ts            // WebSocket 服务器
│   ├── handlers/            // 消息处理器
│   └── connection-manager.ts
├── services/                // 业务服务 (已存在)
└── bootstrap/
    ├── database.bootstrap.ts
    ├── redis.bootstrap.ts
    └── app.bootstrap.ts
```

**Before/After 对比**:

```typescript
// ❌ Before: index.ts (2279 行)
// 所有逻辑混在一起

// ✅ After: server.ts (约 50 行)
import { createHttpServer } from './http/server.js';
import { createWebSocketServer } from './websocket/server.js';
import { bootstrapApp } from './bootstrap/app.bootstrap.js';

async function main() {
  await bootstrapApp();

  const httpServer = createHttpServer();
  const wsServer = createWebSocketServer(httpServer);

  await setupGracefulShutdown(httpServer, wsServer);
}

main().catch(console.error);
```

---

### 2.2 🔴 P0 - Long Method (长方法)

**问题函数**:
- `handleTaskAssign` (175 行)
- `handleWbsNodeMove` (172 行)
- `startServer` (167 行)

**问题示例**: `handleTaskAssign` (1515-1689)

```typescript
// ❌ Before: 175 行的单一函数
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  // 1. 验证客户端 (5 行)
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  // 2. 解析请求 (10 行)
  const { assignmentId, taskType, taskId, assignTo, /* ... */ } = requestData;

  // 3. 确定数据类型 (5 行)
  const dataType = taskType === 'wbs_task' ? 'wbs_tasks' : `${taskType}s`;

  // 4. 验证数据类型 (5 行)
  if (!GLOBAL_DATA_TYPES.includes(dataType)) {
    sendError(ws, `不支持分配 ${taskType} 类型的任务`);
    return;
  }

  // 5. 权限检查 (12 行)
  if (client.userId) {
    const permission = await permissionManager.canPerformAction(...);
    if (!permission.granted) {
      sendError(ws, `权限不足: ${permission.reason || '无分配权限'}`);
      return;
    }
  }

  // 6. 获取当前状态 (18 行)
  let beforeData: any = null;
  try {
    const currentData = await databaseService.query(...);
    if (currentData && currentData.length > 0) {
      beforeData = { /* ... */ };
    }
  } catch (error) {
    console.warn('[WebSocket] 获取任务当前状态失败（不影响分配）:', error);
  }

  // 7. 执行分配 (10 行)
  const result = await globalDataManager.updateGlobalData(...);

  // 8-11. 处理结果 (110 行)
  if (result.success) {
    // 审计日志 (20 行)
    // 广播更新 (15 行)
    // 响应客户端 (10 行)
  } else if (result.conflict) {
    // 冲突日志 (20 行)
    // 冲突响应 (10 行)
  } else {
    // 失败响应 (2 行)
  }
}
```

**重构方案**: 应用 **提取方法 (Extract Method)** + **策略模式 (Strategy Pattern)**

```typescript
// ✅ After: 分解为多个小函数
class TaskAssignmentHandler {
  async handle(clientId: string, ws: WebSocket, requestData: TaskAssignRequest) {
    const client = this.validateClient(clientId, ws);
    const context = this.buildAssignmentContext(requestData, client);
    const beforeData = await this.captureBeforeState(context);

    const result = await this.executeAssignment(context);

    return await this.handleResult(result, context, beforeData, ws);
  }

  private validateClient(clientId: string, ws: WebSocket): ClientData {
    const client = clients.get(clientId);
    if (!client) {
      sendError(ws, '未认证');
      throw new Error('Client not found');
    }
    return client;
  }

  private async captureBeforeState(context: AssignmentContext): Promise<TaskData | null> {
    try {
      const currentData = await databaseService.query(
        'SELECT * FROM ? WHERE id = ?',
        [context.dataType, context.taskId]
      );
      return this.extractTaskData(currentData[0]);
    } catch {
      return null;
    }
  }

  private async handleResult(
    result: UpdateResult,
    context: AssignmentContext,
    beforeData: TaskData | null,
    ws: WebSocket
  ) {
    if (result.success) {
      await this.onSuccess(result, context, beforeData, ws);
    } else if (result.conflict) {
      await this.onConflict(result, context, beforeData, ws);
    } else {
      this.onFailure(result, ws);
    }
  }

  private async onSuccess(result, context, beforeData, ws) {
    await this.logAudit(context, beforeData);
    await this.broadcastUpdate(result, context);
    this.sendAck(result, context, ws);
  }

  private async onConflict(result, context, beforeData, ws) {
    await this.logConflict(context, beforeData);
    this.sendConflict(result, context, ws);
  }

  private onFailure(result, ws) {
    sendError(ws, result.message || '任务分配失败');
  }
}
```

---

### 2.3 🔴 P0 - Feature Envy (依恋情节)

**位置**: 多处 WebSocket 处理函数

**问题描述**:
函数过度访问其他对象的数据,而非自己拥有的数据。

```typescript
// ❌ Before: handleTaskAssign 过度依赖外部服务
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);  // 访问全局 Map

  // 依赖 permissionManager
  const permission = await permissionManager.canPerformAction(
    client.userId,
    dataType,
    taskId,
    'update'
  );

  // 依赖 databaseService
  const currentData = await databaseService.query(...);

  // 依赖 globalDataManager
  const result = await globalDataManager.updateGlobalData(...);

  // 依赖 auditLogService
  await auditLogService.logTaskAssign(...);

  // 依赖全局 clients Map
  clients.forEach((c, id) => {
    if (c.ws.readyState === WebSocket.OPEN) {
      sendToClient(c.ws, updateMessage);
    }
  });
}
```

**重构方案**: 应用 **服务层模式 (Service Layer Pattern)** + **门面模式 (Facade Pattern)**

```typescript
// ✅ After: 引入 TaskAssignmentService
class TaskAssignmentService {
  constructor(
    private permissionService: PermissionService,
    private dataService: DataService,
    private auditService: AuditService,
    private broadcastService: BroadcastService
  ) {}

  async assignTask(request: TaskAssignRequest, actor: User): Promise<TaskAssignResult> {
    await this.permissionService.checkUpdatePermission(actor, request.taskId);

    const beforeData = await this.dataService.getTask(request.taskId);
    const result = await this.dataService.updateTask(request);

    if (result.success) {
      await this.auditService.logAssignment(actor, beforeData, result);
      await this.broadcastService.notify(result);
    }

    return result;
  }
}

// WebSocket 处理器简化为:
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  const service = new TaskAssignmentService(/* ... */);

  const result = await service.assignTask(requestData, client);
  sendToClient(ws, { type: 'data_update_ack', data: result });
}
```

---

### 2.4 🟡 P1 - Data Clumps (数据泥团)

**位置**: 全局

**问题数据团**:
```typescript
// 数据泥团 1: 任务分配参数
const {
  assignmentId,
  taskType,
  taskId,
  assignTo,
  assignToName,
  operatorId,
  operatorName,
  expectedVersion,
  notes
} = requestData;  // 9 个相关参数

// 数据泥团 2: 会话信息
interface Session {
  sessionId: string;
  username: string;
  ip: string;
  userId?: number;
  role?: string;
  deviceId?: string;
  sourceDeviceInfo?: string;
}

// 数据泥团 3: 操作上下文
const { dataType, dataId, data, expectedVersion, changeReason, operationId } = requestData;
```

**重构方案**: 应用 **引入参数对象 (Introduce Parameter Object)**

```typescript
// ✅ After: 创建值对象
class TaskAssignment {
  constructor(
    public readonly taskId: string,
    public readonly taskType: TaskType,
    public readonly assignee: Assignee,
    public readonly operator: Operator,
    public readonly expectedVersion?: number,
    public readonly notes?: string
  ) {}
}

class Assignee {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}

class Operator {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
}

// 使用:
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const assignment = new TaskAssignment(
    requestData.taskId,
    requestData.taskType,
    new Assignee(requestData.assignTo, requestData.assignToName),
    new Operator(requestData.operatorId, requestData.operatorName),
    requestData.expectedVersion,
    requestData.notes
  );

  return await taskService.assign(assignment);
}
```

---

### 2.5 🟡 P1 - Primitive Obsession (基本类型偏执)

**位置**: 类型定义和函数参数

**问题示例**:
```typescript
// ❌ Before: 使用基本类型
function handleTaskAssign(
  clientId: string,      // 应该是 ClientId 类型
  ws: WebSocket,
  requestData: any       // 应该是具体类型
) { }

function broadcastToAll(
  message: ServerMessage,
  excludeClientId?: string  // 应该是 ClientId 类型
) { }

// 类型定义
interface WebSocketClientData {
  ws: WebSocket;
  sessionId: string;        // 应该是 SessionId 类型
  username: string;         // 应该是 Username 类型
  ip: string;              // 应该是 IP 类型
  userId?: number;
  role?: string;           // 应该是 Role 类型
}
```

**重构方案**: 应用 **类型安全模式 (Type Safety Pattern)**

```typescript
// ✅ After: 使用值对象
class ClientId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Invalid ClientId');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ClientId): boolean {
    return this.value === other.value;
  }
}

class SessionId {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Invalid SessionId');
    }
  }

  toString(): string {
    return this.value;
  }
}

class Username {
  constructor(private readonly value: string) {
    if (!value || value.length === 0) {
      throw new Error('Invalid Username');
    }
  }

  toString(): string {
    return this.value;
  }
}

// 使用
function handleTaskAssign(
  clientId: ClientId,
  ws: WebSocket,
  requestData: TaskAssignRequest
) { }

interface WebSocketClientData {
  ws: WebSocket;
  sessionId: SessionId;
  username: Username;
  ip: IP;
  userId?: UserId;
  role?: Role;
}
```

---

### 2.6 🟡 P1 - Switch Statements (Switch 语句)

**位置**: `handleMessage` 函数 (1140-1172)

```typescript
// ❌ Before: Switch 语句
async function handleMessage(clientId: string, ws: WebSocket, msg: ClientMessage, ip: string, heartbeatInterval: NodeJS.Timeout) {
  switch (msg.type) {
    case 'auth':
      await handleAuth(clientId, ws, msg.data, ip, heartbeatInterval);
      break;
    case 'data_update':
      handleDataUpdate(clientId, ws, msg.data);
      break;
    case 'global_data_update':
      await handleGlobalDataUpdate(clientId, ws, msg.data);
      break;
    case 'data_operation':
      await handleDataOperation(clientId, ws, msg.data);
      break;
    case 'heartbeat':
      await handleHeartbeat(clientId, ws);
      break;
    case 'request_sync':
      handleRequestSync(clientId, ws, msg.data);
      break;
    case 'task_assign':
      await handleTaskAssign(clientId, ws, msg.data);
      break;
    case 'fetch_changes':
      await handleFetchChanges(clientId, ws, msg.data);
      break;
    case 'wbs_move_node':
      await handleWbsNodeMove(clientId, ws, msg.data);
      break;
    default:
      sendError(ws, '未知的消息类型');
  }
}
```

**重构方案**: 应用 **命令模式 (Command Pattern)** + **策略模式 (Strategy Pattern)**

```typescript
// ✅ After: 策略模式
// 定义处理策略接口
interface MessageHandlerStrategy {
  handle(clientId: ClientId, ws: WebSocket, data: any, context: MessageContext): Promise<void>;
}

// 消息上下文
class MessageContext {
  constructor(
    public readonly ip: IP,
    public readonly heartbeatInterval: NodeJS.Timeout
  ) {}
}

// 具体策略实现
class AuthMessageHandler implements MessageHandlerStrategy {
  constructor(private authService: AuthService) {}

  async handle(clientId: ClientId, ws: WebSocket, data: any, context: MessageContext): Promise<void> {
    await this.authService.authenticate(clientId, ws, data, context.ip);
  }
}

class DataUpdateMessageHandler implements MessageHandlerStrategy {
  constructor(private dataService: DataService) {}

  async handle(clientId: ClientId, ws: WebSocket, data: any, context: MessageContext): Promise<void> {
    await this.dataService.updateData(clientId, ws, data);
  }
}

// ... 其他处理器

// 处理器注册表
class MessageHandlerRegistry {
  private handlers = new Map<string, MessageHandlerStrategy>();

  register(messageType: string, handler: MessageHandlerStrategy) {
    this.handlers.set(messageType, handler);
  }

  get(messageType: string): MessageHandlerStrategy | undefined {
    return this.handlers.get(messageType);
  }
}

// 使用
const registry = new MessageHandlerRegistry();
registry.register('auth', new AuthMessageHandler(authService));
registry.register('data_update', new DataUpdateMessageHandler(dataService));
// ... 注册其他处理器

async function handleMessage(clientId: ClientId, ws: WebSocket, msg: ClientMessage, context: MessageContext) {
  const handler = registry.get(msg.type);

  if (!handler) {
    sendError(ws, '未知的消息类型');
    return;
  }

  await handler.handle(clientId, ws, msg.data, context);
}
```

---

### 2.7 🟡 P1 - Message Chains (消息链)

**位置**: 多处

```typescript
// ❌ Before: 长消息链
const pool = (databaseService as any).pool;
const poolInfo = {
  totalConnections: pool.pool.connectionLimit,
  activeConnections: pool.pool._allConnections?.length || pool.pool._freeConnections?.length || 0,
  freeConnections: pool.pool._freeConnections?.length || 0,
  queuedRequests: pool.pool._connectionQueue?.length || 0,
  config: {
    connectionLimit: pool.pool.config.queueLimit,
    queueLimit: pool.pool.config.queueLimit,
    maxIdle: pool.pool.config.maxIdle,
    idleTimeout: pool.pool.config.idleTimeout
  }
};

// 另一个例子
const currentData = await databaseService.query(
  `SELECT * FROM ${dataType} WHERE id = ?`,
  [taskId]
);
if (currentData && currentData.length > 0) {
  beforeData = {
    assignee: currentData[0].assignee,
    assigneeName: currentData[0].assignee_name,
    taskCode: currentData[0].task_code,
    taskName: currentData[0].task_name
  };
}
```

**重构方案**: 应用 **隐藏委托关系 (Hide Delegate)** + **引入门面 (Introduce Facade)**

```typescript
// ✅ After: 提供清晰的 API
interface DatabasePoolInfo {
  totalConnections: number;
  activeConnections: number;
  freeConnections: number;
  queuedRequests: number;
  utilization: number;
}

class DatabasePoolMonitor {
  constructor(private databaseService: DatabaseService) {}

  getPoolInfo(): DatabasePoolInfo {
    const pool = this.databaseService.getPool();
    return {
      totalConnections: pool.getTotalConnections(),
      activeConnections: pool.getActiveConnections(),
      freeConnections: pool.getFreeConnections(),
      queuedRequests: pool.getQueuedRequests(),
      utilization: pool.getUtilization()
    };
  }
}

// 使用
const monitor = new DatabasePoolMonitor(databaseService);
const poolInfo = monitor.getPoolInfo();
```

---

### 2.8 🟢 P2 - Temporary Field (暂时字段)

**位置**: `WebSocketClientData` 接口

```typescript
// ❌ Before: 部分字段暂时未使用
interface WebSocketClientData {
  ws: WebSocket;
  sessionId: string;
  username: string;
  ip: string;
  userId?: number;        // 可选,在某些操作中未使用
  role?: string;          // 可选,在某些操作中未使用
  lastSeen: number;
  heartbeatInterval?: NodeJS.Timeout;  // 仅在清理时使用
}
```

**重构方案**: 应用 **提取类 (Extract Class)**

```typescript
// ✅ After: 拆分为不同的类
class WebSocketConnection {
  constructor(
    public readonly ws: WebSocket,
    public readonly ip: IP,
    public readonly lastSeen: Date = new Date()
  ) {}

  isActive(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }
}

class AuthenticatedSession {
  constructor(
    public readonly sessionId: SessionId,
    public readonly username: Username,
    public readonly userId: UserId,
    public readonly role: Role
  ) {}
}

class ManagedConnection {
  constructor(
    public readonly connection: WebSocketConnection,
    public readonly session: AuthenticatedSession | null,
    private heartbeatTimer?: NodeJS.Timeout
  ) {}

  startHeartbeat(interval: number, callback: () => void) {
    this.heartbeatTimer = setInterval(callback, interval);
  }

  cleanup() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
```

---

### 2.9 🟢 P2 - Inappropriate Intimacy (狎昵关系)

**位置**: WebSocket 处理器与全局 Map 的关系

```typescript
// ❌ Before: 直接访问全局变量
const clients = new LRUCache<string, WebSocketClientData>(MAX_WS_CONNECTIONS);

async function handleAuth(...) {
  const existingClient = clients.get(clientId);  // 直接访问全局 Map
  if (existingClient) {
    existingClient.sessionId = session.sessionId;
    existingClient.username = username;
    clients.set(clientId, existingClient);       // 直接修改全局 Map
  }
}

async function handleTaskAssign(...) {
  const client = clients.get(clientId);          // 直接访问全局 Map
  // ...
  clients.forEach((c, id) => {                   // 遍历全局 Map
    if (c.ws.readyState === WebSocket.OPEN) {
      sendToClient(c.ws, updateMessage);
    }
  });
}
```

**重构方案**: 应用 **连接管理器模式 (Connection Manager Pattern)**

```typescript
// ✅ After: 封装连接管理
interface ConnectionManager {
  get(clientId: ClientId): ManagedConnection | undefined;
  add(clientId: ClientId, connection: ManagedConnection): void;
  remove(clientId: ClientId): void;
  findAll(): ManagedConnection[];
  broadcast(message: ServerMessage, exclude?: ClientId): void;
}

class LRUConnectionManager implements ConnectionManager {
  private connections: LRUCache<string, ManagedConnection>;

  constructor(maxSize: number) {
    this.connections = new LRUCache(maxSize);
  }

  get(clientId: ClientId): ManagedConnection | undefined {
    return this.connections.get(clientId.toString());
  }

  add(clientId: ClientId, connection: ManagedConnection): void {
    this.connections.set(clientId.toString(), connection);
  }

  remove(clientId: ClientId): void {
    this.connections.delete(clientId.toString());
  }

  findAll(): ManagedConnection[] {
    return Array.from(this.connections.values());
  }

  broadcast(message: ServerMessage, exclude?: ClientId): void {
    this.findAll().forEach(conn => {
      if (conn.connection.isActive() && (!exclude || !conn.clientId.equals(exclude))) {
        conn.send(message);
      }
    });
  }
}

// 使用: 处理器不再直接访问全局变量
class MessageHandler {
  constructor(private connectionManager: ConnectionManager) {}

  async handleAuth(clientId: ClientId, ws: WebSocket, data: AuthData) {
    const connection = this.connectionManager.get(clientId);
    if (connection) {
      connection.authenticate(data.session);
    }
  }
}
```

---

### 2.10 🟢 P2 - Speculative Generality (推测的通用性)

**位置**: `broadcastToAll` 函数 (257-320)

```typescript
// ❌ Before: 过度设计的广播函数
async function broadcastToAll(message: ServerMessage, excludeClientId?: string): Promise<void> {
  // 复杂的批量权限检查逻辑
  const userIdsToCheck: number[] = [];
  const clientsByUserId = new Map<number, Array<{ clientId: string; client: any }>>();

  // 收集用户ID
  for (const [clientId, client] of clients.entries()) {
    // ... 复杂的收集逻辑
  }

  // 批量检查权限
  if (userIdsToCheck.length > 0) {
    const permissionResults = await permissionManager.batchCanReceiveBroadcast(userIdsToCheck, message);
    // ... 复杂的权限过滤逻辑
  }
}
```

**重构方案**: 应用 **职责分离 (Separation of Concerns)**

```typescript
// ✅ After: 简化并分离职责
interface BroadcastStrategy {
  send(message: ServerMessage, recipients: Recipient[]): Promise<void>;
}

class UnicastStrategy implements BroadcastStrategy {
  async send(message: ServerMessage, recipients: Recipient[]): Promise<void> {
    const [recipient] = recipients;
    if (recipient) {
      recipient.connection.send(message);
    }
  }
}

class MulticastStrategy implements BroadcastStrategy {
  constructor(private permissionService: PermissionService) {}

  async send(message: ServerMessage, recipients: Recipient[]): Promise<void> {
    const authorized = await this.filterAuthorized(recipients, message);
    authorized.forEach(r => r.connection.send(message));
  }

  private async filterAuthorized(recipients: Recipient[], message: ServerMessage): Promise<Recipient[]> {
    const permissions = await this.permissionService.batchCheck(
      recipients.map(r => r.user.userId),
      message
    );
    return recipients.filter((r, i) => permissions[i].allowed);
  }
}

// 使用
const broadcaster = new Broadcaster(new MulticastStrategy(permissionService));
await broadcaster.broadcast(message, recipients);
```

---

## 3. SOLID 原则违反

### 3.1 🔴 P0 - 单一职责原则 (SRP) 违反

**问题**: `index.ts` 违反了 SRP,承担了至少 7 个不同的职责

| 职责 | 代码行 | 违反程度 |
|------|--------|----------|
| HTTP 服务器配置 | 70-183 | 严重 |
| 路由定义 | 476-1025 | 严重 |
| WebSocket 管理 | 1027-1138 | 严重 |
| 消息处理 | 1140-1928 | 严重 |
| 会话管理 | 207-218 | 中等 |
| 性能监控 | 2093-2136 | 中等 |
| 生命周期管理 | 1997-2274 | 中等 |

**重构方案**: 分层架构 + 模块化

```typescript
// ✅ 重构后的结构
// server/index.ts - 仅负责启动
// server/http/ - HTTP 服务器相关
// server/websocket/ - WebSocket 服务器相关
// server/routes/ - 路由定义
// server/handlers/ - 消息处理器
// server/middleware/ - 中间件
// server/monitors/ - 监控相关
```

---

### 3.2 🔴 P0 - 开闭原则 (OCP) 违反

**问题**: 添加新消息类型需要修改 `handleMessage` 函数

```typescript
// ❌ Before: 每次添加新消息类型都要修改 switch
async function handleMessage(clientId: string, ws: WebSocket, msg: ClientMessage, ip: string, heartbeatInterval: NodeJS.Timeout) {
  switch (msg.type) {
    case 'auth':
      // ...
      break;
    case 'data_update':
      // ...
      break;
    // 添加新类型需要修改这里
    case 'new_message_type':
      // 需要添加新的 case
      break;
  }
}
```

**重构方案**: 策略模式 + 注册模式

```typescript
// ✅ After: 开闭原则
interface MessageHandler {
  canHandle(messageType: string): boolean;
  handle(clientId: ClientId, ws: WebSocket, data: any, context: MessageContext): Promise<void>;
}

class MessageHandlerRegistry {
  private handlers: MessageHandler[] = [];

  register(handler: MessageHandler) {
    this.handlers.push(handler);
  }

  async dispatch(message: ClientMessage, context: MessageContext): Promise<void> {
    const handler = this.handlers.find(h => h.canHandle(message.type));
    if (!handler) {
      throw new Error(`No handler for message type: ${message.type}`);
    }
    await handler.handle(message.clientId, message.ws, message.data, context);
  }
}

// 添加新消息类型只需注册新处理器,无需修改现有代码
registry.register(new NewMessageTypeHandler());
```

---

### 3.3 🟡 P1 - 依赖倒置原则 (DIP) 违反

**问题**: 直接依赖具体实现而非抽象

```typescript
// ❌ Before: 依赖具体实现
import { SessionManager } from './services/SessionManager.js';
import { databaseService } from './services/DatabaseService.js';
import { globalDataManager } from './services/GlobalDataManager.js';
import { permissionManagerOptimized as permissionManager } from './services/PermissionManagerOptimized.js';

const sessionManager = new SessionManager();  // 直接实例化具体类

async function handleTaskAssign(...) {
  const result = await globalDataManager.updateGlobalData(...);  // 直接调用具体实现
  const permission = await permissionManager.canPerformAction(...);
}
```

**重构方案**: 依赖注入 + 接口抽象

```typescript
// ✅ After: 依赖抽象
interface ISessionManager {
  createSession(username: string, ip: string, deviceId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  terminateSession(sessionId: string, reason: string): Promise<void>;
}

interface IGlobalDataManager {
  updateGlobalData(dataType: string, dataId: string, data: any, userId: number, expectedVersion?: number, changeReason?: string): Promise<UpdateResult>;
  getGlobalData(dataType: string, dataId: string): Promise<any[]>;
}

interface IPermissionManager {
  canPerformAction(userId: number, dataType: string, dataId: string, action: string): Promise<Permission>;
}

// 通过依赖注入
class TaskAssignmentHandler {
  constructor(
    private sessionManager: ISessionManager,
    private dataManager: IGlobalDataManager,
    private permissionManager: IPermissionManager
  ) {}

  async handle(request: TaskAssignRequest): Promise<void> {
    // 使用抽象接口
    const permission = await this.permissionManager.canPerformAction(...);
    const result = await this.dataManager.updateGlobalData(...);
  }
}
```

---

## 4. 设计模式识别和重构建议

### 4.1 🔴 P0 - 应用于: 分层架构

**当前问题**: 所有逻辑混在 index.ts

**推荐模式**: **分层架构 (Layered Architecture)**

```
┌─────────────────────────────────────┐
│   Presentation Layer (HTTP/WS)      │
├─────────────────────────────────────┤
│   Application Layer (Handlers)      │
├─────────────────────────────────────┤
│   Domain Layer (Services/Logic)     │
├─────────────────────────────────────┤
│   Infrastructure Layer (DB/Redis)   │
└─────────────────────────────────────┘
```

**重构代码**:

```typescript
// server/http/routes.ts
export const httpRoutes = Router()
  .use('/api/login', loginController)
  .use('/api/logout', logoutController)
  .use('/api/global-data', globalDataController);

// server/websocket/handlers/
export const wsHandlers = {
  auth: new AuthHandler(authService),
  dataUpdate: new DataUpdateHandler(dataService),
  taskAssign: new TaskAssignHandler(taskService)
};
```

---

### 4.2 🔴 P0 - 应用于: 消息处理

**当前问题**: Switch 语句难以扩展

**推荐模式**: **命令模式 (Command Pattern)** + **策略模式 (Strategy Pattern)**

**重构代码**:

```typescript
// websocket/commands/message-command.ts
interface MessageCommand {
  execute(context: MessageContext): Promise<void>;
}

// websocket/commands/task-assign-command.ts
class TaskAssignCommand implements MessageCommand {
  constructor(
    private data: TaskAssignRequest,
    private client: ClientData
  ) {}

  async execute(context: MessageContext): Promise<void> {
    const service = new TaskAssignmentService(
      context.permissionService,
      context.dataService,
      context.auditService
    );

    const result = await service.assignTask(this.data, this.client);
    context.responseSender.send(result);
  }
}

// websocket/command-factory.ts
class MessageCommandFactory {
  create(message: ClientMessage, client: ClientData): MessageCommand {
    switch (message.type) {
      case 'task_assign':
        return new TaskAssignCommand(message.data, client);
      case 'data_update':
        return new DataUpdateCommand(message.data, client);
      // ...
    }
  }
}
```

---

### 4.3 🟡 P1 - 应用于: 服务依赖

**当前问题**: 紧耦合的具体实现

**推荐模式**: **依赖注入 (Dependency Injection)** + **工厂模式 (Factory Pattern)**

**重构代码**:

```typescript
// core/container.ts
interface ServiceContainer {
  get<T>(token: string): T;
  register<T>(token: string, factory: () => T): void;
}

class Container implements ServiceContainer {
  private services = new Map<string, any>();

  register<T>(token: string, factory: () => T): void {
    this.services.set(token, factory);
  }

  get<T>(token: string): T {
    const factory = this.services.get(token);
    if (!factory) {
      throw new Error(`Service not found: ${token}`);
    }
    return factory();
  }
}

// container.config.ts
const container = new Container();

container.register('database', () => databaseService);
container.register('sessionManager', () => new SessionManager());
container.register('permissionManager', () => permissionManager);
container.register('taskService', () => new TaskService(
  container.get('database'),
  container.get('permissionManager')
));

// 使用
const taskService = container.get<TaskService>('taskService');
```

---

### 4.4 🟡 P1 - 应用于: 连接管理

**当前问题**: 全局 Map 直接访问

**推荐模式**: **单例模式 (Singleton Pattern)** + **观察者模式 (Observer Pattern)**

**重构代码**:

```typescript
// websocket/connection-manager.ts
class ConnectionManager {
  private static instance: ConnectionManager;
  private connections: Map<string, ManagedConnection> = new Map();
  private observers: ConnectionObserver[] = [];

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  addConnection(clientId: string, connection: ManagedConnection) {
    this.connections.set(clientId, connection);
    this.notifyObservers('connected', { clientId, connection });
  }

  removeConnection(clientId: string) {
    const connection = this.connections.get(clientId);
    if (connection) {
      this.connections.delete(clientId);
      this.notifyObservers('disconnected', { clientId, connection });
    }
  }

  addObserver(observer: ConnectionObserver) {
    this.observers.push(observer);
  }

  private notifyObservers(event: string, data: any) {
    this.observers.forEach(obs => obs.onConnectionEvent(event, data));
  }
}

// 使用
const connectionManager = ConnectionManager.getInstance();
connectionManager.addObserver(new MetricsObserver());
connectionManager.addObserver(new LoggingObserver());
```

---

### 4.5 🟢 P2 - 应用于: 权限检查

**当前问题**: 重复的权限检查逻辑

**推荐模式**: **责任链模式 (Chain of Responsibility)**

**重构代码**:

```typescript
// permissions/handlers/
interface PermissionHandler {
  setNext(handler: PermissionHandler): PermissionHandler;
  handle(request: PermissionRequest): Promise<PermissionResult>;
}

abstract class BasePermissionHandler implements PermissionHandler {
  private next?: PermissionHandler;

  setNext(handler: PermissionHandler): PermissionHandler {
    this.next = handler;
    return handler;
  }

  async handle(request: PermissionRequest): Promise<PermissionResult> {
    if (this.next) {
      return this.next.handle(request);
    }
    return { granted: false, reason: 'No handler granted permission' };
  }
}

class AuthenticationHandler extends BasePermissionHandler {
  async handle(request: PermissionRequest): Promise<PermissionResult> {
    if (!request.user) {
      return { granted: false, reason: 'User not authenticated' };
    }
    return super.handle(request);
  }
}

class RoleBasedHandler extends BasePermissionHandler {
  async handle(request: PermissionRequest): Promise<PermissionResult> {
    if (request.user.role === 'admin') {
      return { granted: true };
    }
    return super.handle(request);
  }
}

class DataOwnershipHandler extends BasePermissionHandler {
  async handle(request: PermissionRequest): Promise<PermissionResult> {
    const owner = await this.dataService.getOwner(request.dataType, request.dataId);
    if (owner === request.user.id) {
      return { granted: true };
    }
    return super.handle(request);
  }
}

// 使用
const permissionChain = new AuthenticationHandler();
permissionChain
  .setNext(new RoleBasedHandler())
  .setNext(new DataOwnershipHandler());

const result = await permissionChain.handle(request);
```

---

## 5. 重构优先级矩阵

### P0 - 严重问题 (立即处理)

| # | 问题 | 影响 | 实施难度 | 重构模式 | 预估工时 |
|---|------|------|----------|----------|----------|
| 1 | God Class - index.ts 过大 | 极高 | 高 | 分层架构 | 2-3 周 |
| 2 | Long Method - handleTaskAssign | 高 | 中 | 提取方法 | 3-5 天 |
| 3 | Long Method - handleWbsNodeMove | 高 | 中 | 提取方法 | 3-5 天 |
| 4 | 高圈复杂度 - 多个函数 | 高 | 中 | 策略模式 | 1-2 周 |
| 5 | 深度嵌套 - 6-7 层 | 高 | 低 | 提取方法 | 2-3 天 |
| 6 | Switch 语句 - handleMessage | 中 | 中 | 命令模式 | 3-5 天 |
| 7 | SRP 违反 - 多职责 | 高 | 高 | 分层架构 | 2-3 周 |

**总计**: 4-6 周

---

### P1 - 重要问题 (尽快处理)

| # | 问题 | 影响 | 实施难度 | 重构模式 | 预估工时 |
|---|------|------|----------|----------|----------|
| 1 | Feature Envy - 过度依赖外部服务 | 中 | 中 | 服务层模式 | 1 周 |
| 2 | Data Clumps - 数据泥团 | 中 | 低 | 参数对象 | 2-3 天 |
| 3 | Primitive Obsession - 基本类型偏执 | 中 | 低 | 类型安全 | 2-3 天 |
| 4 | Message Chains - 消息链 | 中 | 低 | 门面模式 | 1-2 天 |
| 5 | OCP 违反 - Switch 难以扩展 | 中 | 中 | 策略模式 | 3-5 天 |
| 6 | DIP 违反 - 依赖具体实现 | 中 | 中 | 依赖注入 | 1 周 |
| 7 | 高认知复杂度 - 难以理解 | 中 | 中 | 提取方法 | 1 周 |
| 8 | Inappropriate Intimacy - 狎昵关系 | 中 | 中 | 连接管理器 | 3-5 天 |
| 9 | 重复代码 - 错误处理模式 | 低 | 低 | 模板方法 | 2-3 天 |
| 10 | 缺少接口抽象 | 中 | 中 | 接口隔离 | 1 周 |
| 11 | 紧耦合 - 难以测试 | 高 | 高 | 依赖注入 | 1-2 周 |
| 12 | 缺少错误边界 | 中 | 低 | 错误处理模式 | 2-3 天 |

**总计**: 3-4 周

---

### P2 - 优化建议 (可延后处理)

| # | 问题 | 影响 | 实施难度 | 重构模式 | 预估工时 |
|---|------|------|----------|----------|----------|
| 1 | Temporary Field - 暂时字段 | 低 | 低 | 提取类 | 1-2 天 |
| 2 | Speculative Generality - 推测的通用性 | 低 | 中 | 职责分离 | 2-3 天 |
| 3 | 缺少日志抽象 | 低 | 低 | 适配器模式 | 1-2 天 |
| 4 | 配置分散 | 低 | 低 | 配置对象 | 1 天 |
| 5 | 缺少健康检查抽象 | 低 | 低 | 策略模式 | 2-3 天 |
| 6 | 性能监控耦合 | 低 | 低 | 观察者模式 | 2-3 天 |
| 7 | 内存监控逻辑混杂 | 低 | 低 | 提取类 | 1-2 天 |
| 8 | 缺少重试机制 | 中 | 低 | 装饰器模式 | 2-3 天 |
| 9 | 缺少熔断器 | 中 | 中 | 熔断器模式 | 3-5 天 |
| 10 | 缺少限流抽象 | 低 | 低 | 策略模式 | 1-2 天 |
| 11 | 缺少缓存抽象 | 低 | 低 | 代理模式 | 2-3 天 |
| 12 | 缺少事务管理 | 中 | 高 | 单元工作模式 | 1-2 周 |
| 13 | 缺少事件驱动 | 中 | 高 | 事件总线 | 1-2 周 |
| 14 | 缺少 CQRS | 低 | 高 | CQRS 模式 | 2-3 周 |
| 15 | 缺少领域事件 | 低 | 中 | 事件模式 | 1 周 |

**总计**: 4-6 周

---

## 6. 具体重构示例

### 示例 1: 重构 `handleTaskAssign` (175 行 → 15 行)

**Before** (1515-1689, 175 行):
```typescript
async function handleTaskAssign(clientId: string, ws: WebSocket, requestData: any) {
  const client = clients.get(clientId);
  if (!client) {
    sendError(ws, '未认证');
    return;
  }

  try {
    const { /* 8 个参数 */ } = requestData;
    // ... 165 行的复杂逻辑
  } catch (error) {
    console.error('[WebSocket] 任务分配失败:', error);
    sendError(ws, '任务分配失败: 服务器错误');
  }
}
```

**After** (15 行):
```typescript
class TaskAssignmentHandler {
  constructor(
    private service: TaskAssignmentService,
    private sender: ResponseSender
  ) {}

  async handle(clientId: ClientId, ws: WebSocket, request: TaskAssignRequest): Promise<void> {
    try {
      const client = this.validateClient(clientId);
      const result = await this.service.assignTask(request, client);
      this.sender.sendSuccess(result, ws);
    } catch (error) {
      this.sender.sendError(error, ws);
    }
  }

  private validateClient(clientId: ClientId): ClientData {
    const client = this.connectionManager.get(clientId);
    if (!client) {
      throw new Error('未认证');
    }
    return client;
  }
}
```

---

### 示例 2: 重构 `handleMessage` (33 行 → 8 行)

**Before** (1140-1172, 33 行):
```typescript
async function handleMessage(clientId: string, ws: WebSocket, msg: ClientMessage, ip: string, heartbeatInterval: NodeJS.Timeout) {
  switch (msg.type) {
    case 'auth':
      await handleAuth(clientId, ws, msg.data, ip, heartbeatInterval);
      break;
    case 'data_update':
      handleDataUpdate(clientId, ws, msg.data);
      break;
    // ... 7 个 more cases
    default:
      sendError(ws, '未知的消息类型');
  }
}
```

**After** (8 行):
```typescript
class MessageDispatcher {
  constructor(private registry: MessageHandlerRegistry) {}

  async dispatch(message: ClientMessage, context: MessageContext): Promise<void> {
    const handler = this.registry.get(message.type);

    if (!handler) {
      throw new Error(`未知的消息类型: ${message.type}`);
    }

    await handler.handle(message, context);
  }
}
```

---

### 示例 3: 重构服务器启动 (167 行 → 40 行)

**Before** (1997-2163, 167 行):
```typescript
async function startServer() {
  try {
    await databaseService.init();
    console.log('[服务器] ✅ 数据库初始化成功');

    await initSystemLogsTable();
    console.log('[服务器] ✅ 系统日志表初始化成功');

    await initSessionCleanup();
    await initSoftDelete();
    await initJsonValidation();

    // ... 150 行的初始化逻辑
  } catch (error) {
    console.error('[服务器] ❌ 启动失败:', error);
    process.exit(1);
  }
}
```

**After** (40 行):
```typescript
class ApplicationBootstrap {
  private readonly bootstrapSteps: BootstrapStep[] = [
    new DatabaseBootstrapStep(),
    new RedisBootstrapStep(),
    new LogBootstrapStep(),
    new MigrationBootstrapStep(),
    new WebSocketBootstrapStep()
  ];

  async run(): Promise<void> {
    try {
      await this.executeSteps();
      this.startServer();
    } catch (error) {
      this.handleStartupError(error);
    }
  }

  private async executeSteps(): Promise<void> {
    for (const step of this.bootstrapSteps) {
      await step.execute();
      console.log(`[启动] ✅ ${step.name} 完成`);
    }
  }

  private startServer(): void {
    this.httpServer.listen(this.port, this.host, () => {
      console.log(`[服务器] ✅ 运行在 http://${this.host}:${this.port}`);
    });
  }

  private handleStartupError(error: any): void {
    console.error('[服务器] ❌ 启动失败:', error);
    process.exit(1);
  }
}
```

---

## 7. 测试性改进

### 当前问题
- ❌ 无法单元测试 (紧耦合)
- ❌ 无法 Mock 依赖 (直接实例化)
- ❌ 难以隔离测试 (全局状态)

### 重构后的测试性改进

```typescript
// ✅ 可测试的代码
describe('TaskAssignmentHandler', () => {
  it('should assign task successfully', async () => {
    // Arrange
    const mockService = {
      assignTask: jest.fn().mockResolvedValue({ success: true })
    };
    const mockSender = {
      sendSuccess: jest.fn()
    };
    const handler = new TaskAssignmentHandler(mockService, mockSender);

    // Act
    await handler.handle(clientId, ws, request);

    // Assert
    expect(mockService.assignTask).toHaveBeenCalledWith(request, client);
    expect(mockSender.sendSuccess).toHaveBeenCalled();
  });
});
```

---

## 8. 性能考虑

### 潜在性能问题

1. **同步权限检查** (295 行): 批量权限检查可能阻塞
2. **内存泄漏风险** (1049-1072 行): 心跳定时器未正确清理
3. **未使用连接池** (491 行): 直接查询数据库
4. **缺少缓存** (674 行): 重复查询相同数据

### 优化建议

```typescript
// 1. 异步权限检查
class AsyncPermissionChecker {
  async checkBatch(userIds: number[], message: ServerMessage): Promise<Map<number, boolean>> {
    const results = await Promise.allSettled(
      userIds.map(id => this.permissionService.canReceive(id, message))
    );
    // ...
  }
}

// 2. 使用 WeakMap 防止内存泄漏
class ConnectionRegistry {
  private connections = new WeakMap<WebSocket, ManagedConnection>();

  register(ws: WebSocket, connection: ManagedConnection) {
    this.connections.set(ws, connection);
  }
}

// 3. 使用连接池
class DatabaseRepository {
  async query(sql: string, params: any[]) {
    const connection = await this.pool.getConnection();
    try {
      return await connection.query(sql, params);
    } finally {
      connection.release();
    }
  }
}

// 4. 添加缓存层
class CachedDataService {
  private cache = new LRUCache<string, any>(1000);

  async getData(dataType: string, dataId: string) {
    const key = `${dataType}:${dataId}`;
    let data = this.cache.get(key);

    if (!data) {
      data = await this.databaseService.query(...);
      this.cache.set(key, data);
    }

    return data;
  }
}
```

---

## 9. 安全性考虑

### 当前安全问题

1. **SQL 注入风险** (491 行): 使用字符串拼接
2. **XSS 风险**: 未验证 WebSocket 消息
3. **CSRF 防护不足** (149-182 行): 仅验证来源
4. **敏感信息泄漏** (756 行): 错误消息包含堆栈跟踪

### 改进建议

```typescript
// 1. 使用参数化查询
const users = await databaseService.query(
  'SELECT * FROM users WHERE username = ?',
  [username]
);

// 2. 消息验证
class MessageValidator {
  validate(message: any): message is ClientMessage {
    return this.isValidType(message.type) &&
           this.isValidData(message.data);
  }
}

// 3. 增强 CSRF 防护
class CsrfProtection {
  private tokens = new Map<string, string>();

  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, token);
    return token;
  }

  validateToken(sessionId: string, token: string): boolean {
    return this.tokens.get(sessionId) === token;
  }
}

// 4. 安全的错误处理
class ErrorHandler {
  handleError(error: any, res: Response) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(500).json({
      success: false,
      message: '操作失败',
      error: isDevelopment ? error.message : undefined,
      stack: isDevelopment ? error.stack : undefined
    });
  }
}
```

---

## 10. 总结与建议

### 关键发现

1. **God Object**: index.ts 承担了太多职责 (2279 行)
2. **高复杂度**: 多个函数圈复杂度 > 40
3. **紧耦合**: 直接依赖具体实现,难以测试
4. **违反 SOLID**: 特别是 SRP 和 OCP

### 重构路线图

#### 第一阶段 (4-6 周) - P0 问题
1. 拆分 God Object → 分层架构
2. 提取 Long Method → 小函数
3. 应用策略模式 → 消除 Switch
4. 降低嵌套深度 → 提取方法

#### 第二阶段 (3-4 周) - P1 问题
1. 实现服务层 → 解决 Feature Envy
2. 引入值对象 → 解决 Data Clumps
3. 依赖注入框架 → 解决 DIP 违反
4. 提取接口 → 提高可测试性

#### 第三阶段 (4-6 周) - P2 优化
1. 实现连接管理器
2. 添加缓存层
3. 性能优化
4. 安全加固

### 预期收益

| 指标 | Before | After | 改进 |
|------|--------|-------|------|
| 文件行数 | 2279 | ~200/文件 | -90% |
| 圈复杂度 | 45+ | <10 | -75% |
| 嵌套深度 | 7 层 | <3 层 | -60% |
| 测试覆盖率 | 0% | >80% | +80% |
| 可维护性 | D | B | +2 级 |
| 可测试性 | F | A | +4 级 |

---

## 附录

### A. 参考书目

1. Martin Fowler - 《重构:改善既有代码的设计》
2. Robert C. Martin - 《敏捷软件开发:原则、模式与实践》
3. Erich Gamma 等 - 《设计模式:可复用面向对象软件的基础》
4. Steve McConnell - 《代码大全》
5. Robert C. Martin - 《代码整洁之道》

### B. 工具推荐

1. **SonarQube** - 代码质量分析
2. **ESLint** - 代码检查
3. **Prettier** - 代码格式化
4. **Jest** - 单元测试
5. **Istanbul** - 测试覆盖率
6. **Complexity Report** - 复杂度分析

### C. 重构检查清单

- [ ] 所有函数行数 < 50
- [ ] 圈复杂度 < 10
- [ ] 嵌套深度 < 4
- [ ] 每个类只有一个职责
- [ ] 使用接口而非具体实现
- [ ] 可进行单元测试
- [ ] 无代码重复
- [ ] 有意义的命名
- [ ] 完整的错误处理
- [ ] 安全的输入验证

---

**报告生成时间**: 2026-03-10
**分析工具**: 人工分析 + 业界最佳实践
**建议优先级**: P0 > P1 > P2
