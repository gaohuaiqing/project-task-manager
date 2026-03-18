# 模块依赖关系图

> **生成日期**: 2026-03-10
> **分析范围**: app/server/src
> **总模块数**: 97 个文件
> **总依赖数**: 261 次导入

---

## 📊 依赖关系统计

### 依赖热力图

| 层级 | 模块数 | 内部依赖 | 外部依赖 | 依赖强度 |
|------|--------|---------|---------|---------|
| **路由层** | 5 | 35 | 20 | 🔴 高 |
| **服务层** | 30 | 120 | 40 | 🔴 高 |
| **数据访问层** | 6 | 15 | 5 | 🟡 中 |
| **基础设施层** | 15 | 25 | 30 | 🟡 中 |
| **工具层** | 10 | 5 | 10 | 🟢 低 |

### 中心化依赖排名

**上帝对象** (被依赖最多的模块):

| 排名 | 模块 | 被依赖次数 | 依赖者 | 风险等级 |
|------|------|-----------|--------|---------|
| 1 | `DatabaseService` | 35+ | 所有服务层 | 🔴 严重 |
| 2 | `AsyncSystemLogger` | 20+ | 全局 | 🟡 中等 |
| 3 | `AuthService` | 10+ | 认证相关 | 🟡 中等 |
| 4 | `SessionManager` | 8+ | 会话相关 | 🟢 良好 |
| 5 | `CacheManager` | 5+ | 缓存相关 | 🟢 良好 |

---

## 🕸️ 依赖关系图

### 宏观架构依赖

```
                    ┌─────────────────┐
                    │   Express App   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   dataRoutes  │  │permissionRtes │  │ batchRoutes   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   AuthService │  │GlobalDataMgr  │  │PermissionMgr  │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│DatabaseService│  │SystemLogger   │  │CacheManager   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│     MySQL     │  │    Pino       │  │    Redis      │
└───────────────┘  └───────────────┘  └───────────────┘
```

### 模块级依赖详情

#### 1. 路由层依赖

**dataRoutes.ts** (13 个导入):
```
├── DatabaseService
├── SessionManager
├── GlobalDataManager
├── PermissionManager
├── SystemLogger
├── AuditLogService
├── TaskApprovalService
├── ProjectMemberService
├── TaskAssignmentService
├── BatchProjectOperationsService
├── TaskStatusCalculator
├── AtomicTransaction
└── WbsTaskHierarchyOptimized
```

**问题**:
- ❌ 导入过多 (13 个)
- ❌ 直接依赖 DatabaseService
- ❌ 职责不清晰

#### 2. 服务层依赖

**GlobalDataManager.ts** (6 个导入):
```
├── DatabaseService (直接依赖)
├── LRUCache
├── DatabaseTypeGuards
├── DatabaseQueryTimeout
├── SystemLogger
└── DeadlockRetry
```

**问题**:
- ❌ 强依赖 DatabaseService
- ❌ 循环依赖风险 (logger → database)

**PermissionManagerOptimized.ts** (2 个导入):
```
├── DatabaseService (直接依赖)
└── LRUCache
```

**问题**:
- ❌ 直接依赖 DatabaseService
- ⚠️ 权限逻辑与数据访问耦合

#### 3. 基础设施层依赖

**CacheManager.ts** (3 个导入):
```
├── RedisService
├── Logger
└── Config
```

**优点**:
- ✅ 依赖清晰
- ✅ 职责单一

**WebSocketService.ts** (5 个导入):
```
├── MessageBroker
├── Logger
├── Types
└── ws (外部库)
```

**优点**:
- ✅ 依赖少
- ✅ 独立性强

---

## 🔄 循环依赖检测

### 潜在循环依赖

#### 循环 1: 服务-数据库-日志

```
GlobalDataManager
    ↓
DatabaseService
    ↓
SystemLogger (写入日志)
    ↓
DatabaseService (存储日志)
```

**影响**:
- 🔴 严重: 可能导致启动失败
- 🔴 影响测试: 难以 mock

**解决方案**:
```typescript
// 使用依赖注入
class GlobalDataManager {
  constructor(
    private db: IDatabaseService,
    private logger: ILogger
  ) {}
}

// Logger 使用异步写入, 避免循环
class AsyncSystemLogger {
  private queue: LogEntry[] = [];
  async flush() {
    // 批量写入
  }
}
```

#### 循环 2: 认证-会话-数据库

```
AuthService
    ↓
SessionManager
    ↓
DatabaseService
    ↓
SystemLogger
    ↓
DatabaseService
```

**影响**:
- 🟡 中等: 可启动但耦合紧密

**解决方案**:
- 提取 ILogger 接口
- 使用依赖注入

### 依赖方向分析

**当前依赖方向** (❌ 违反 Clean Architecture):
```
Routes (外层)
    ↓
Services (外层)
    ↓
DatabaseService (基础设施)
    ↓
MySQL (基础设施)
```

**理想依赖方向** (✅ 符合 Clean Architecture):
```
Routes (外层)
    ↓
UseCases (内层)
    ↓
Repositories (内层)
    ↓
Entities (核心)
    ↑
Infrastructure (外层, 实现接口)
```

---

## 📉 耦合度分析

### 耦合因子计算

**公式**:
$$CF = \frac{\text{实际依赖数}}{\text{理论最大依赖数}} \times 100\%$$

**计算**:
- 模块数 n = 97
- 理论最大依赖 = n(n-1) = 97 × 96 = 9312
- 实际依赖 = 261
- **耦合因子 CF = 2.8%**

### 评估

**整体耦合度**: ✅ **良好** (2.8%)

**但存在结构性问题**:
- ❌ **中心化耦合**: DatabaseService 被所有模块依赖
- ❌ **扇入耦合**: 部分模块被过多依赖
- ⚠️ **扇出耦合**: dataRoutes 依赖过多模块

### 耦合类型分布

| 耦合类型 | 实例数 | 严重度 | 示例 |
|---------|-------|--------|------|
| **数据耦合** | 15+ | 🟢 低 | 通过参数传递数据 |
| **控制耦合** | 8+ | 🟡 中 | 传递控制标志 |
| **内容耦合** | 3+ | 🔴 高 | 直接访问内部数据 |
| ** stamp耦合** | 10+ | 🟡 中 | 传递数据结构 |

---

## 🔧 解耦建议

### 短期改进 (1-2 周)

1. **引入接口隔离**
```typescript
// 当前
class GlobalDataManager {
  constructor() {
    this.db = databaseService; // 硬依赖
  }
}

// 改进
interface IDatabaseService {
  query(sql, params): Promise<any>;
}

class GlobalDataManager {
  constructor(private db: IDatabaseService) {}
}
```

2. **使用依赖注入**
```typescript
// 当前
import { databaseService } from './DatabaseService.js';

// 改进
constructor(db: IDatabaseService) {
  this.db = db;
}
```

### 中期重构 (3-4 周)

1. **引入 Repository 层**
```typescript
interface IProjectRepository {
  findById(id: number): Promise<Project>;
  findAll(): Promise<Project[]>;
}

class ProjectRepository implements IProjectRepository {
  constructor(private db: IDatabaseService) {}
}
```

2. **服务层解耦**
```typescript
// 当前: 服务直接调用 DatabaseService
// 改进: 服务调用 Repository
class ProjectService {
  constructor(
    private projectRepo: IProjectRepository
  ) {}
}
```

### 长期架构 (2-3 月)

**实现 Clean Architecture**:
```
Routes
    ↓
Controllers
    ↓
Use Cases ← 应用逻辑
    ↓
Repositories ← 接口
    ↑
Infrastructure ← 实现
```

---

## 📊 依赖矩阵

### 模块依赖矩阵

| 模块 | 数据库服务 | 日志服务 | 缓存服务 | 认证服务 | 会话服务 |
|------|-----------|---------|---------|---------|---------|
| **dataRoutes** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **AuthService** | ✅ | ✅ | ❌ | - | ✅ |
| **GlobalDataManager** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **PermissionManager** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **CacheManager** | ❌ | ✅ | ✅ | ❌ | ❌ |

**图例**:
- ✅ = 有依赖
- ❌ = 无依赖
- - = 自身

---

## 🎯 优化目标

### 目标指标

| 指标 | 当前 | 目标 | 改善 |
|------|------|------|------|
| **最大扇入** | 35+ | < 10 | -71% |
| **最大扇出** | 13 | < 5 | -62% |
| **循环依赖** | 2+ | 0 | -100% |
| **接口依赖** | 10% | 80% | +700% |

### 优先级

**P0 (立即修复)**:
1. ✅ 消除循环依赖
2. ✅ 引入 ILogger 接口

**P1 (短期)**:
1. ✅ Repository 层实现
2. ✅ DatabaseService 解耦

**P2 (中期)**:
1. ✅ 服务层接口化
2. ✅ 依赖注入容器

---

## 📝 结论

### 核心问题

1. **DatabaseService 上帝对象**
   - 被所有模块依赖
   - 修改风险极高
   - 测试困难

2. **缺乏接口抽象**
   - 直接依赖具体实现
   - 难以替换和 mock
   - 违反依赖倒置原则

3. **循环依赖风险**
   - Logger → Database
   - 启动顺序敏感
   - 测试困难

### 建议行动

**立即**:
1. 引入接口隔离
2. 消除循环依赖
3. 建立依赖注入

**短期**:
1. 实现 Repository 层
2. DatabaseService 解耦
3. 单元测试覆盖

**长期**:
1. Clean Architecture 转型
2. 微服务化准备
3. 领域驱动设计

---

**文档结束**

*生成时间: 2026-03-10*
*分析工具: Dependency Analysis Tool*
