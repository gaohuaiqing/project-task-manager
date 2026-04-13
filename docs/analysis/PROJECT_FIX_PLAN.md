# 项目管理模块修复计划

## 目标
修复代码审查中发现的 P0 和 P1 级别问题

## 优先级定义
- **P0**: 安全与数据一致性问题，必须立即修复
- **P1**: 竞态与并发问题，高优先级修复

---

## 任务列表

### 🔴 P0 - 立即修复

#### P0-1: 后端权限漏洞 [后端] ✅ 已完成
- **文件**: `app/server/src/modules/project/routes.ts`
- **问题**: GET 端点缺少权限验证，存在水平越权
- **修复**: 为以下端点添加权限检查
  - `GET /:id/milestones` ✅
  - `GET /:id/timelines` ✅
  - `GET /timelines/:id/tasks` ✅
  - `GET /:id/members` ✅
  - `GET /:id/stats` ✅
- **修改内容**:
  - 添加 `checkProjectAccess` 辅助函数统一处理权限验证
  - 非管理员必须是指定项目成员才能访问
  - 时间线任务使用 `getTimelineTasksWithAuth` 方法进行权限检查

#### P0-2: 前端TODO实现 [前端] ✅ 已完成
- **文件**: `app/src/features/projects/components/ProjectDetail.tsx`
- **问题**: handleTaskChange 和 handleTaskDelete 只有 console.log，未调用真实 API
- **修复**: 接入 `projectApi.updateTimelineTask` 和 `projectApi.deleteTimelineTask`
- **修改内容**:
  - `handleTaskChange`: 调用 API 后刷新缓存，错误时抛出异常供调用方回滚
  - `handleTaskDelete`: 调用 API 后刷新缓存，保持一致性

#### P0-3: 事务保护 - createProject [后端] ✅ 已完成
- **文件**: `app/server/src/modules/project/service.ts`, `repository.ts`
- **问题**: 创建项目后批量添加成员无事务保护
- **修复**: 使用数据库事务包裹项目创建和成员添加
- **修改内容**:
  - `repository.ts`: 新增 `createProjectWithMembers` 方法，使用事务同时创建项目和批量添加成员
  - `service.ts`: 使用新方法替换原有分步操作

#### P0-4: 事务保护 - deleteTimeline [后端] ✅ 已完成
- **文件**: `app/server/src/modules/project/repository.ts`
- **问题**: 级联删除非原子性
- **修复**: 使用事务包裹子表和父表删除
- **修改内容**:
  - 使用 `getConnection()` 获取连接
  - `beginTransaction()` 开启事务
  - 先删 `timeline_tasks` 再删 `timelines`
  - `commit()`/`rollback()` 确保原子性
  - `finally` 块释放连接

---

### 🟡 P1 - 高优先级修复 (待处理)

#### P1-1: 乐观更新竞态 [前端]
- **文件**: `app/src/features/projects/hooks/useProjectMutations.ts`
- **问题**: 乐观更新可能被并发查询覆盖
- **修复**: 添加防抖或冲突检测机制
- **状态**: ⏳ 待修复

#### P1-2: 里程碑同步事务 [前端]
- **文件**: `app/src/features/projects/components/ProjectForm.tsx`
- **问题**: 串行执行增删改，部分失败导致数据不一致
- **修复**: 添加回滚机制或状态校验
- **状态**: ⏳ 待修复

#### P1-3: 文件导入内存泄漏 [前端]
- **文件**: `app/src/features/projects/components/ProjectList.tsx`
- **问题**: 组件卸载时动态导入和状态更新仍在执行
- **修复**: 添加组件卸载检测和文件大小限制
- **状态**: ⏳ 待修复

---

## 执行记录

| 时间 | 任务 | 状态 |
|------|------|------|
| 2026-04-13 | P0-2 前端TODO实现 | ✅ 完成 |
| 2026-04-13 | P0-4 事务-deleteTimeline | ✅ 完成 |
| 2026-04-13 | P0-3 事务-createProject | ✅ 完成 |
| 2026-04-13 | P0-1 权限验证 | ✅ 完成 |

---

## 错误记录

| 错误 | 尝试 | 解决 |
|------|------|------|
| - | - | - |

---

**计划创建时间**: 2026-04-12
**最后更新**: 2026-04-13
