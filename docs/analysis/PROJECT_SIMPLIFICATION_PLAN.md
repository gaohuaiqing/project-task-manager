# 项目简化执行计划

> **创建时间**: 2026-03-09
> **目标**: 将 82,564 行代码简化到 30,000-40,000 行
> **预期减少**: 60%+ 的代码量和复杂度

---

## 📊 执行概览

| 项目 | 当前 | 目标 | 减少 |
|------|------|------|------|
| **代码行数** | 82,564 行 | 30,000-40,000 行 | ~50,000 行 (60%) |
| **文件数量** | 288 个 | 150-180 个 | ~130 个 (45%) |
| **复杂度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 降低 40% |
| **功能数量** | 50+ 个 | 15-20 个 | ~30 个 (60%) |

---

## 🎯 核心原则

### 保留（MVP）：
```
✅ 用户登录/注销
✅ 项目管理（CRUD）
✅ 任务管理（CRUD）
✅ 任务分配
✅ 成员查看
✅ 简单权限（admin/user）
✅ 基础统计
✅ 设置页面
```

### 删除：
```
❌ 离线支持（IndexedDB）
❌ 多级缓存（LRU）
❌ 性能监控系统
❌ WBS 复杂算法
```

---

## 📋 执行步骤清单

### ✅ 准备阶段

- [ ] **步骤 0.1**: 创建备份分支
  ```bash
  git checkout -b backup-before-simplification
  git push origin backup-before-simplification
  git checkout main
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 0.2**: 记录当前状态
  ```bash
  # 记录当前代码量
  find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 > before_simplification.txt
  ```
  **状态**: ⬜ 未开始

---

### 🔴 第一阶段：删除实时同步系统（预计减少 ~1,100 行）

- [ ] **步骤 1.1**: 删除 WebSocketService
  ```bash
  rm src/services/WebSocketService.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 1.2**: 删除 IndexedDBSyncService
  ```bash
  rm src/services/IndexedDBSyncService.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 1.3**: 删除 ConflictManager
  ```bash
  rm src/services/ConflictManager.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 1.4**: 删除 CrossTabOptimizer
  ```bash
  rm src/services/CrossTabOptimizer.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 1.5**: 清理引用
  ```bash
  # 在 src/contexts/AuthContext.tsx 中：
  # 删除：import { wsService } from '@/services/WebSocketService';
  # 删除：WebSocket 连接相关代码
  # 删除：wsService.onMessage 相关代码

  # 在 src/main.tsx 中：
  # 删除：import { wsService } from '@/services/WebSocketService';
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~1,100 行代码

---

### 🔴 第二阶段：删除离线支持系统（预计减少 ~700 行）

- [ ] **步骤 2.1**: 删除 OfflineDraftService
  ```bash
  rm src/services/OfflineDraftService.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 2.2**: 删除 IndexedDBOperationQueue
  ```bash
  rm src/services/IndexedDBOperationQueue.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 2.3**: 删除 OperationQueue
  ```bash
  rm src/services/OperationQueue.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 2.4**: 删除 NetworkStatus
  ```bash
  rm src/services/NetworkStatus.ts
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~700 行代码

---

### 🔴 第三阶段：简化缓存系统（预计减少 ~500 行）

- [ ] **步骤 3.1**: 简化 CacheManager
  ```bash
  # 编辑 src/services/CacheManager.ts
  # 删除 LRUCache 类实现
  # 删除内存缓存相关代码
  # 删除 IndexedDB 同步代码
  # 只保留简单的 localStorage 操作
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 3.2**: 清理缓存引用
  ```bash
  # 检查并更新所有使用 CacheManager 的地方
  # 将复杂的缓存调用改为简单的 get/set
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~500 行代码

---

### 🔴 第四阶段：简化权限系统（预计减少 ~500 行）

- [ ] **步骤 4.1**: 简化 types/auth.ts
  ```bash
  # 编辑 src/types/auth.ts
  # 修改前：4 种角色（admin, tech_manager, dept_manager, engineer）
  # 修改后：2 种角色（admin, user）

  # 删除：
  # - 数据权限类型（DataScope）
  # - 复杂的权限配置

  # 保留：
  # - 基础的 User 类型
  # - 简单的 UserRole 类型
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 4.2**: 简化 AuthContext.tsx
  ```bash
  # 编辑 src/contexts/AuthContext.tsx
  # 删除复杂的权限检查函数
  # 删除 WebSocket 相关代码
  # 删除会话管理复杂逻辑
  # 简化为基本的登录/注销
  ```
  **目标**: 从 900+ 行减少到 300 行
  **状态**: ⬜ 未开始

- [ ] **步骤 4.3**: 简化 useAppPermissions.ts
  ```bash
  # 编辑 src/hooks/useAppPermissions.ts
  # 删除复杂的权限检查逻辑
  # 简化为基本的角色检查
  ```
  **目标**: 从 150+ 行减少到 50 行
  **状态**: ⬜ 未开始

**预计减少**: ~500 行代码

---

### 🔴 第五阶段：删除跨标签页同步（预计减少 ~550 行）

- [ ] **步骤 5.1**: 删除 crossTabSync
  ```bash
  rm src/utils/crossTabSync.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 5.2**: 删除 syncEvents
  ```bash
  rm src/utils/syncEvents.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 5.3**: 删除 BroadcastChannelService
  ```bash
  rm src/services/BroadcastChannelService.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 5.4**: 清理引用
  ```bash
  # 在 src/contexts/AuthContext.tsx 中：
  # 删除：import { initAuthTabSync, ... } from '@/utils/crossTabSync';
  # 删除：所有跨标签同步相关代码
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~550 行代码

---

### 🔴 第六阶段：删除性能监控（预计减少 ~500 行）

- [ ] **步骤 6.1**: 删除 pageLoadMonitor
  ```bash
  rm src/utils/pageLoadMonitor.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 6.2**: 删除 loginPerformanceMonitor
  ```bash
  rm src/utils/loginPerformanceMonitor.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 6.3**: 清理性能监控引用
  ```bash
  # 在 src/main.tsx 中：
  # 删除：import '@/utils/pageLoadMonitor'

  # 在 src/contexts/AuthContext.tsx 中：
  # 删除：import { loginPerformanceMonitor } from '@/utils/loginPerformanceMonitor';
  # 删除：所有 loginPerformanceMonitor 相关调用
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~500 行代码

---

### 🟡 第七阶段：简化 WBS 功能（预计减少 ~600 行）

- [ ] **步骤 7.1**: 简化 WbsHierarchyService
  ```bash
  # 编辑 src/services/WbsHierarchyService.ts
  # 删除：循环依赖检测
  # 删除：关键路径计算
  # 删除：复杂的权重计算
  # 保留：简单的树形结构操作
  ```
  **目标**: 从 400+ 行减少到 150 行
  **状态**: ⬜ 未开始

- [ ] **步骤 7.2**: 简化 WbsTaskApiService
  ```bash
  # 编辑 src/services/WbsTaskApiService.ts
  # 删除复杂的依赖关系处理
  # 简化为基础的 CRUD 操作
  ```
  **目标**: 从 300+ 行减少到 100 行
  **状态**: ⬜ 未开始

- [ ] **步骤 7.3**: 删除 TaskDependencyService
  ```bash
  rm src/services/TaskDependencyService.ts
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~600 行代码

---

### 🟡 第八阶段：简化辅助功能（预计减少 ~1,450 行）

- [ ] **步骤 8.1**: 简化存储迁移
  ```bash
  # 编辑 src/utils/storageMigration.ts
  # 删除复杂的迁移逻辑
  # 删除版本管理
  # 直接使用新的存储格式
  ```
  **目标**: 从 450+ 行减少到 150 行
  **状态**: ⬜ 未开始

- [ ] **步骤 8.2**: 删除服务管理器
  ```bash
  rm src/services/ServiceManager.ts
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 8.3**: 清理服务初始化
  ```bash
  # 在 src/main.tsx 中：
  # 删除：import { serviceManager } from '@/services/ServiceManager';
  # 删除：serviceManager.init() 调用
  # 改为直接导入和使用需要的服务
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 8.4**: 简化日志系统
  ```bash
  # 保留 console.log
  # 删除 FrontendLogger 服务
  # 删除日志查看界面
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 8.5**: 删除设计系统演示
  ```bash
  rm -rf src/components/apple-design/
  ```
  **状态**: ⬜ 未开始

**预计减少**: ~1,450 行代码

---

### 🟢 第九阶段：清理和测试

- [ ] **步骤 9.1**: 清理未使用的导入
  ```bash
  # 运行 ESLint 检查未使用的导入
  npm run lint -- --fix
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 9.2**: 清理 package.json
  ```bash
  # 删除不再需要的依赖
  # 例如：如果不再使用 WebSocket，可以删除相关依赖
  ```
  **状态**: ⬜ 未开始

- [ ] **步骤 9.3**: 测试核心功能
  ```bash
  npm run dev
  ```
  **测试清单**:
  - [ ] 登录/注销功能正常
  - [ ] 项目管理功能正常
  - [ ] 任务管理功能正常
  - [ ] 任务分配功能正常
  - [ ] 成员查看功能正常
  **状态**: ⬜ 未开始

- [ ] **步骤 9.4**: 记录简化后状态
  ```bash
  # 记录简化后代码量
  find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 > after_simplification.txt
  ```
  **状态**: ⬜ 未开始

---

## 📊 进度追踪

### 总体进度
```
已完成：0/47 步 (0%)
预计减少：~5,900 行代码
当前代码量：82,564 行
目标代码量：30,000-40,000 行
```

### 各阶段进度
- [ ] 准备阶段：0/2 步
- [ ] 第一阶段：0/5 步（删除实时同步）
- [ ] 第二阶段：0/4 步（删除离线支持）
- [ ] 第三阶段：0/2 步（简化缓存）
- [ ] 第四阶段：0/3 步（简化权限）
- [ ] 第五阶段：0/4 步（删除跨标签同步）
- [ ] 第六阶段：0/3 步（删除性能监控）
- [ ] 第七阶段：0/3 步（简化 WBS）
- [ ] 第八阶段：0/5 步（简化辅助功能）
- [ ] 第九阶段：0/4 步（清理测试）

---

## 📝 详细修改指南

### 修改 src/contexts/AuthContext.tsx

**需要删除的导入**：
```typescript
// 删除这些
import { wsService } from '@/services/WebSocketService';
import { loginPerformanceMonitor } from '@/utils/loginPerformanceMonitor';
import { initAuthTabSync, syncLoginState, syncLogoutState, onAuthTabSync } from '@/utils/crossTabSync';
```

**需要删除的代码块**：
```typescript
// 删除 WebSocket 连接相关代码
useEffect(() => {
  if (!USE_BACKEND || !session || !user) return;
  const connectWebSocket = async () => {
    try {
      await wsService.connect(session.sessionId, user.username);
      setIsBackendConnected(true);
    } catch (error) {
      console.error('[AuthProvider] WebSocket连接失败:', error);
      setIsBackendConnected(false);
    }
  };
  connectWebSocket();
  // ... 其余 WebSocket 代码
}, [session?.sessionId, user?.username, logout]);
```

**需要删除的性能监控代码**：
```typescript
// 删除所有 loginPerformanceMonitor 调用
loginPerformanceMonitor.startStage('validation');
loginPerformanceMonitor.endStage('validation');
// ... 等等
```

---

### 修改 src/types/auth.ts

**简化前**：
```typescript
export type UserRole = 'admin' | 'tech_manager' | 'dept_manager' | 'engineer';

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: { label: '系统管理员', level: 4, permissions: ['*'], dataScope: 'all' },
  tech_manager: { label: '技术经理', level: 3, permissions: [...], dataScope: 'department' },
  dept_manager: { label: '部门经理', level: 2, permissions: [...], dataScope: 'department' },
  engineer: { label: '工程师', level: 1, permissions: [...], dataScope: 'self' }
};
```

**简化后**：
```typescript
export type UserRole = 'admin' | 'user';

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: { label: '管理员', level: 2, permissions: ['*'] },
  user: { label: '普通用户', level: 1, permissions: ['read', 'write'] }
};
```

---

## ⚠️ 注意事项

### 删除前必读

1. **备份是必须的**
   - 每个阶段开始前创建 git commit
   - 保留备份分支

2. **分阶段执行**
   - 一次只执行一个阶段
   - 测试通过后再进行下一阶段
   - 遇到问题可以快速回滚

3. **测试优先**
   - 每个阶段完成后测试核心功能
   - 确保没有破坏现有功能

4. **渐进式删除**
   - 先删除独立的文件
   - 再清理引用
   - 最后简化复杂的文件

### 回滚方案

如果某个阶段出现问题：
```bash
# 回滚到上一个 commit
git reset --hard HEAD~1

# 或者回到备份分支
git checkout backup-before-simplification
```

---

## 🎯 成功标准

简化完成后，项目应该：
- ✅ 代码量减少到 30,000-40,000 行
- ✅ 核心功能正常工作
- ✅ 能够正常运行
- ✅ 代码更容易理解和维护
- ✅ 开发新功能更快速

---

## 📞 下次启动时

1. 打开这个文档：`docs/analysis/PROJECT_SIMPLIFICATION_PLAN.md`
2. 查看进度，找到未完成的步骤
3. 按照清单继续执行
4. 每完成一步，勾选对应的复选框
5. 每完成一个阶段，运行测试确保功能正常

---

**创建时间**: 2026-03-09
**预计完成时间**: 1-2 周（分阶段执行）
**最后更新**: 2026-03-09
