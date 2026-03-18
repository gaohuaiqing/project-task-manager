# 模块设计：协作模块 (06-collaboration)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 06-collaboration
> **开发顺序**: 6（可与其他模块并行）
> **依赖**: 01-04模块

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

协作模块提供多人实时协作、版本控制、批量操作和缓存管理功能。确保团队成员高效协作，数据一致性和系统性能。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| WebSocket实时同步 | P0 | 数据变更300ms内同步 |
| 在线状态显示 | P1 | 显示用户在线/离开/离线 |
| 消息去重 | P0 | 通过nodeId过滤自己发布的消息 |
| 跨标签页同步 | P1 | BroadcastChannel实现 |
| 乐观锁版本控制 | P0 | 冲突检测返回409 |
| 批量查询API | P0 | 减少网络请求 |
| Redis缓存 | P0 | 高性能缓存 + LRU降级 |
| 文档附件 | P2 | 任务文档上传管理 |

### 1.3 关键技术点

- **WebSocket**: Socket.io实现实时双向通信
- **消息去重**: 每个消息携带nodeId，客户端过滤
- **乐观锁**: version字段检测冲突
- **缓存策略**: Redis主缓存 + LRU内存缓存降级
- **跨标签页**: BroadcastChannel API

---

## 2. 数据模型

### 2.1 相关表结构

本模块涉及2个核心表：

| 表名 | 说明 | 记录来源 |
|------|------|---------|
| data_versions | 版本历史表 | FINAL L1630-1647 |
| attachments | 附件表 | FINAL L2050 |

### 2.2 data_versions表（版本历史）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| table_name | String(50) | ✅ | - | 表名 |
| record_id | String(36) | ✅ | - | 记录ID |
| version | Integer | ✅ | - | 版本号 |
| data | Text | ✅ | - | 数据快照（JSON） |
| changed_by | Integer | ✅ | - | 变更人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

**索引**:
```sql
CREATE INDEX idx_versions_table_record ON data_versions(table_name, record_id);
CREATE INDEX idx_versions_version ON data_versions(table_name, record_id, version);
```

### 2.3 attachments表（附件）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| task_id | String(36) | ✅ | - | 关联任务 |
| file_name | String(255) | ✅ | - | 文件名 |
| file_path | String(500) | ✅ | - | 文件存储路径 |
| file_size | Integer | ✅ | - | 文件大小（字节） |
| mime_type | String(100) | ❌ | NULL | MIME类型 |
| uploaded_by | Integer | ✅ | - | 上传人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |

**索引**:
```sql
CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_uploader ON attachments(uploaded_by);
```

---

## 3. 实时协作

### 3.1 WebSocket消息格式

**来源**: API_SPECIFICATION L342-367

```typescript
// 客户端发送
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'event';
  channel?: string;
  data?: any;
}

// 服务端推送
interface ServerMessage {
  type: 'update' | 'notification' | 'pong' | 'error';
  channel?: string;
  data?: any;
  nodeId: string;      // 服务节点ID（用于消息去重）
  timestamp: number;
}
```

### 3.2 频道类型

| 频道 | 说明 | 数据类型 |
|------|------|---------|
| `project:{id}` | 项目更新 | 项目信息变更 |
| `task:{id}` | 任务更新 | 任务信息变更 |
| `user:{id}` | 用户通知 | 审批结果、延期通知 |
| `global` | 全局广播 | 系统公告 |

### 3.3 WebSocket服务器配置示例

```typescript
// Socket.io 服务器配置
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6 // 1MB
});

// 认证中间件
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await verifyToken(token);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### 3.4 消息去重机制

```typescript
// 客户端消息去重
class MessageDeduplicator {
  private nodeId: string;

  constructor() {
    this.nodeId = generateNodeId(); // 每个客户端生成唯一nodeId
  }

  // 发布消息时携带nodeId
  publish(channel: string, data: any) {
    const message: ClientMessage = {
      type: 'event',
      channel,
      data,
      nodeId: this.nodeId
    };
    websocket.send(message);
  }

  // 接收消息时过滤自己的消息
  onMessage(message: ServerMessage) {
    // 过滤自己发布的消息
    if (message.nodeId === this.nodeId) {
      return; // 忽略自己的消息
    }

    // 处理其他用户的消息
    this.handleUpdate(message);
  }
}
```

### 3.5 跨标签页同步

```typescript
// 使用BroadcastChannel实现跨标签页同步
class CrossTabSync {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('task_manager_sync');
    this.channel.onmessage = (event) => {
      this.handleCrossTabMessage(event.data);
    };
  }

  // 广播到其他标签页
  broadcast(type: string, data: any) {
    this.channel.postMessage({ type, data });
  }

  // 处理来自其他标签页的消息
  handleCrossTabMessage(message: { type: string; data: any }) {
    switch (message.type) {
      case 'DATA_UPDATE':
        // 更新本地缓存
        this.updateLocalCache(message.data);
        break;
      case 'LOGOUT':
        // 同步登出
        this.handleLogout();
        break;
    }
  }
}
```

### 3.6 在线状态管理

```typescript
// 在线状态枚举
type OnlineStatus = 'online' | 'away' | 'offline';

// 状态管理服务
class OnlineStatusService {
  private status: OnlineStatus = 'online';
  private lastActivity: Date = new Date();
  private awayTimeout = 5 * 60 * 1000; // 5分钟无操作

  // 监听用户活动
  startActivityMonitor() {
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
      document.addEventListener(event, () => this.recordActivity());
    });

    // 定时检查
    setInterval(() => this.checkAwayStatus(), 60000);
  }

  recordActivity() {
    this.lastActivity = new Date();
    if (this.status !== 'online') {
      this.setStatus('online');
    }
  }

  checkAwayStatus() {
    const now = new Date();
    const inactiveTime = now.getTime() - this.lastActivity.getTime();

    if (inactiveTime > this.awayTimeout && this.status === 'online') {
      this.setStatus('away');
    }
  }

  setStatus(status: OnlineStatus) {
    this.status = status;
    // 通知服务器
    websocket.send({ type: 'status_update', status });
  }
}
```

---

## 4. 版本控制

### 4.1 乐观锁机制

**来源**: FINAL L1630-1647

```typescript
// 更新请求必须携带版本号
interface UpdateRequest {
  data: any;
  version: number; // 当前版本号
}

// 更新处理
async function updateWithVersion<T>(
  tableName: string,
  recordId: string,
  data: Partial<T>,
  version: number
): Promise<T> {
  // 1. 检查版本号
  const current = await db.query(`
    SELECT version FROM ${tableName} WHERE id = ?
  `, [recordId]);

  if (!current || current.version !== version) {
    throw new VersionConflictError({
      currentVersion: current?.version,
      providedVersion: version
    });
  }

  // 2. 更新数据
  const newVersion = version + 1;
  await db.query(`
    UPDATE ${tableName}
    SET ?, version = ?, updated_at = NOW()
    WHERE id = ?
  `, [data, newVersion, recordId]);

  // 3. 保存版本历史
  await saveVersionHistory(tableName, recordId, newVersion, data);

  return { ...data, version: newVersion };
}
```

### 4.2 版本历史保存

```typescript
async function saveVersionHistory(
  tableName: string,
  recordId: string,
  version: number,
  data: any,
  changedBy: number
): Promise<void> {
  await db.data_versions.create({
    table_name: tableName,
    record_id: recordId,
    version,
    data: JSON.stringify(data),
    changed_by: changedBy
  });
}
```

### 4.3 冲突响应

```typescript
// 冲突错误
class VersionConflictError extends Error {
  constructor(public details: {
    currentVersion: number;
    providedVersion: number;
  }) {
    super('版本冲突：数据已被其他用户修改');
  }
}

// API响应
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "数据已被其他用户修改，请刷新后重试",
    "details": {
      "current_version": 5,
      "provided_version": 4
    }
  }
}
```

---

## 5. 批量操作

### 5.1 批量API定义

**来源**: API_SPECIFICATION L283-289

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /api/batch/projects | 批量获取项目 |
| POST | /api/batch/members | 批量获取成员 |
| POST | /api/batch/wbs-tasks | 批量获取任务 |
| POST | /api/batch/mixed | 混合批量查询 |
| POST | /api/batch/cache/warmup | 缓存预热 |

### 5.2 批量请求格式

```typescript
// 批量获取请求
interface BatchRequest {
  ids: string[] | number[];
  fields?: string[]; // 可选，指定返回字段
}

// 混合批量请求
interface MixedBatchRequest {
  projects?: string[];
  members?: number[];
  tasks?: string[];
}

// 混合批量响应
interface MixedBatchResponse {
  projects: Project[];
  members: Member[];
  tasks: Task[];
}
```

### 5.3 批量查询优化

```typescript
// 批量查询服务
class BatchQueryService {
  async batchGetProjects(ids: string[]): Promise<Project[]> {
    // 单次查询获取所有数据
    const projects = await db.projects.findAll({
      where: { id: { $in: ids } }
    });

    // 更新缓存
    projects.forEach(p => cache.set(`project:${p.id}`, p, 300));

    return projects;
  }

  async mixedBatchQuery(request: MixedBatchRequest): Promise<MixedBatchResponse> {
    // 并行查询
    const [projects, members, tasks] = await Promise.all([
      request.projects ? this.batchGetProjects(request.projects) : [],
      request.members ? this.batchGetMembers(request.members) : [],
      request.tasks ? this.batchGetTasks(request.tasks) : []
    ]);

    return { projects, members, tasks };
  }
}
```

---

## 6. 缓存管理

### 6.1 缓存策略

**来源**: FINAL L1680-1699

| 数据类型 | Redis过期 | LRU降级 | 说明 |
|---------|----------|---------|------|
| 项目列表 | 5分钟 | ✅ | 热点数据 |
| 成员列表 | 10分钟 | ✅ | 较稳定数据 |
| 任务列表 | 2分钟 | ✅ | 高频变更 |
| 配置数据 | 30分钟 | ❌ | 内存缓存 |
| 权限配置 | 15分钟 | ❌ | 内存缓存 |

### 6.2 缓存服务

```typescript
// 缓存服务（支持降级）
class CacheService {
  private redis: RedisClient | null;
  private lruCache: LRUCache<string, any>;
  private memoryCache: Map<string, { data: any; expires: number }>;

  constructor() {
    this.lruCache = new LRUCache({ max: 1000, maxAge: 1000 * 60 * 30 });
    this.memoryCache = new Map();
    this.connectRedis();
  }

  private async connectRedis() {
    try {
      this.redis = await createRedisClient();
    } catch (error) {
      console.warn('Redis连接失败，使用LRU缓存降级');
      this.redis = null;
    }
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    // 优先使用Redis
    if (this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) return JSON.parse(data);
      } catch (error) {
        console.warn('Redis读取失败，降级到LRU');
      }
    }

    // 降级到LRU
    const lruData = this.lruCache.get(key);
    if (lruData) return lruData;

    // 最后使用内存缓存
    const memData = this.memoryCache.get(key);
    if (memData && memData.expires > Date.now()) {
      return memData.data;
    }

    return null;
  }

  // 设置缓存
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    // 写入Redis
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
      } catch (error) {
        console.warn('Redis写入失败');
      }
    }

    // 同时写入LRU
    this.lruCache.set(key, data, ttlSeconds * 1000);
  }

  // 清理缓存
  async clear(pattern: string): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    // 清理LRU
    for (const key of this.lruCache.keys()) {
      if (key.match(pattern)) {
        this.lruCache.del(key);
      }
    }
  }
}
```

### 6.3 缓存API

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| DELETE | /api/cache/clear | 清理缓存 | SYSTEM_CONFIG |
| POST | /api/cache/warmup | 缓存预热 | SYSTEM_CONFIG |
| GET | /api/cache/status | 缓存状态 | SYSTEM_CONFIG |

---

## 7. 组件设计

### 7.1 前端组件结构

```
src/components/collaboration/
├── OnlineStatusIndicator.tsx   # 在线状态指示器
├── UserAvatarWithStatus.tsx    # 带状态的Avatar
├── NotificationToast.tsx       # 通知Toast
├── ConflictDialog.tsx          # 版本冲突对话框
├── FileUploadZone.tsx          # 文件上传区域
├── AttachmentList.tsx          # 附件列表
└── hooks/
    ├── useWebSocket.ts         # WebSocket Hook
    ├── useOnlineStatus.ts      # 在线状态Hook
    ├── useCrossTabSync.ts      # 跨标签页同步Hook
    └── useCache.ts             # 缓存Hook
```

### 7.2 WebSocket Hook（带重连机制）

```tsx
// useWebSocket.ts
// WebSocket 连接管理（指数退避重连）
class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 1000; // 1秒

  connect() {
    this.socket = io(SERVER_URL, {
      auth: { token: getAuthToken() },
      reconnection: false, // 手动控制重连
    });

    this.socket.on('disconnect', () => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      30000 // 最大30秒
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}

// React Hook 封装
const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [nodeId] = useState(() => generateNodeId());
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 1000;

  const connect = useCallback(() => {
    socketRef.current = io(WS_URL, {
      auth: { token: getAuthToken() },
      reconnection: false, // 手动控制重连
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      reconnectAttempts.current = 0; // 重置重连计数
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      scheduleReconnect();
    });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      baseDelay * Math.pow(2, reconnectAttempts.current),
      30000 // 最大30秒
    );

    setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  const subscribe = (channel: string) => {
    socketRef.current?.emit('subscribe', channel);
  };

  const unsubscribe = (channel: string) => {
    socketRef.current?.emit('unsubscribe', channel);
  };

  const onMessage = (callback: (msg: ServerMessage) => void) => {
    socketRef.current?.on('message', (msg: ServerMessage) => {
      // 消息去重
      if (msg.nodeId === nodeId) return;
      callback(msg);
    });
  };

  return { connected, subscribe, unsubscribe, onMessage, nodeId };
};
```

### 7.3 版本冲突对话框

```tsx
// ConflictDialog.tsx
interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: {
    currentVersion: number;
    providedVersion: number;
  };
  onRefresh: () => void;
}

const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onClose,
  conflict,
  onRefresh
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>版本冲突</DialogTitle>
      <DialogContent>
        <Alert variant="warning">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            数据已被其他用户修改，您的更改可能覆盖他人的工作。
          </AlertDescription>
        </Alert>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>您基于的版本:</span>
            <span className="font-mono">v{conflict.providedVersion}</span>
          </div>
          <div className="flex justify-between">
            <span>当前最新版本:</span>
            <span className="font-mono text-orange-500">v{conflict.currentVersion}</span>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="outline" onClick={onClose}>
          放弃更改
        </Button>
        <Button onClick={onRefresh}>
          刷新后重新编辑
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## 8. 开发检查清单

### 8.1 数据库迁移

- [ ] 创建 `025-create-data-versions-table.ts`
- [ ] 创建 `026-create-attachments-table.ts`

### 8.2 后端实现

- [ ] WebSocket服务器配置
- [ ] 消息发布/订阅服务
- [ ] 在线状态管理服务
- [ ] 版本控制中间件
- [ ] 批量查询API
- [ ] 缓存服务（Redis + LRU）
- [ ] 附件上传服务

### 8.3 前端组件

- [ ] `useWebSocket.ts` - WebSocket Hook
- [ ] `useOnlineStatus.ts` - 在线状态Hook
- [ ] `OnlineStatusIndicator.tsx` - 状态指示器
- [ ] `ConflictDialog.tsx` - 冲突对话框
- [ ] `FileUploadZone.tsx` - 文件上传

### 8.4 测试用例

- [ ] WebSocket连接测试
- [ ] 消息去重测试
- [ ] 跨标签页同步测试
- [ ] 版本冲突测试
- [ ] 批量查询性能测试
- [ ] 缓存降级测试

---

## 9. 完整性验证

### 9.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 实时协作 | L1206-1321 | ✅ |
| 消息去重 | L1216-1224 | ✅ |
| 跨标签页同步 | L1216-1224 | ✅ |
| 在线状态 | L1216-1224 | ✅ |
| 同步延迟 | L1288-1297 | ✅ |
| 版本控制 | L1630-1647 | ✅ |
| 批量操作 | L1648-1660 | ✅ |
| 缓存管理 | L1680-1699 | ✅ |

### 9.2 性能指标

| 指标 | 要求 | 状态 |
|------|------|:----:|
| 数据同步延迟 | < 300ms | ⏳ |
| 批量查询响应 | < 500ms | ⏳ |
| 缓存命中率 | > 80% | ⏳ |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_06_collaboration.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
